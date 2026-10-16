// Minimal KLAP (v2) client for new-generation Kasa/Tapo "SMART" devices
// (e.g. HS200 hw 5.x). These devices ignore the legacy port-9999 protocol and
// never show as online in the legacy cloud, so they must be driven locally.
// Protocol reference: python-kasa klaptransport.py
import crypto from "node:crypto";
import http from "node:http";

const toBuf = (x) => (Buffer.isBuffer(x) ? x : Buffer.from(x));
const sha256 = (...parts) =>
  crypto.createHash("sha256").update(Buffer.concat(parts.map(toBuf))).digest();
const sha1 = (x) => crypto.createHash("sha1").update(toBuf(x)).digest();

export function klapAuthHash(username, password) {
  return sha256(sha1(username), sha1(password));
}

// Devices provisioned without a cloud account answer to these built-in accounts
const DEFAULT_CREDENTIALS = [
  ["", ""],
  ["kasa@tp-link.net", "kasaSetup"],
  ["test@tp-link.net", "test"],
];

const TERMINAL_UUID = crypto.randomUUID();
const SESSION_TTL = 20 * 60 * 1000;
const HTTP_TIMEOUT = 5000;

// The devices' tiny HTTP server answers 400 to the header set that global
// fetch (undici) sends, so use node:http with minimal headers instead.
function httpPost(agent, host, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        agent,
        host,
        port: 80,
        path,
        method: "POST",
        headers: { "Content-Length": body.length, ...headers },
        timeout: HTTP_TIMEOUT,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
        );
      }
    );
    req.on("timeout", () => req.destroy(new Error(`timeout after ${HTTP_TIMEOUT}ms`)));
    req.on("error", reject);
    req.end(body);
  });
}

function sessionCookie(headers) {
  const raw = headers["set-cookie"] || [];
  return raw
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("TP_SESSIONID="));
}

// Nicknames are base64 on the device and in the cloud for SMART devices, but
// the cloud may also hold plain stale names ("Plug"), so only decode when the
// text round-trips cleanly.
export function decodeNickname(value) {
  if (!value) return "";
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  try {
    const text = Buffer.from(value, "base64").toString("utf8");
    const roundTrips = Buffer.from(text, "utf8").toString("base64") === value;
    const printable = !/[\u0000-\u0008\u000e-\u001f\ufffd]/.test(text);
    return text && roundTrips && printable ? text : value;
  } catch {
    return value;
  }
}

export class KlapDevice {
  constructor(host, credentials) {
    this.host = host;
    this.authHashes = [
      klapAuthHash(credentials.username || "", credentials.password || ""),
      ...DEFAULT_CREDENTIALS.map(([u, p]) => klapAuthHash(u, p)),
    ];
    this.session = null;
    this._queue = Promise.resolve();
    this._agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  }

  async handshake() {
    const localSeed = crypto.randomBytes(16);
    const r1 = await httpPost(this._agent, this.host, "/app/handshake1", localSeed);
    if (r1.status !== 200) throw new Error(`handshake1 HTTP ${r1.status}`);
    const buf = r1.body;
    if (buf.length < 48) throw new Error("handshake1: short response");

    const remoteSeed = buf.subarray(0, 16);
    const serverHash = buf.subarray(16, 48);
    const authHash = this.authHashes.find((h) =>
      sha256(localSeed, remoteSeed, h).equals(serverHash)
    );
    if (!authHash) throw new Error("KLAP auth failed: credentials do not match device");

    const cookie = sessionCookie(r1.headers);
    if (!cookie) throw new Error("handshake1: no TP_SESSIONID cookie");

    const r2 = await httpPost(
      this._agent,
      this.host,
      "/app/handshake2",
      sha256(remoteSeed, localSeed, authHash),
      { Cookie: cookie }
    );
    if (r2.status !== 200) throw new Error(`handshake2 HTTP ${r2.status}`);

    const ivSeed = sha256("iv", localSeed, remoteSeed, authHash);
    this.session = {
      cookie,
      key: sha256("lsk", localSeed, remoteSeed, authHash).subarray(0, 16),
      iv: ivSeed.subarray(0, 12),
      seq: ivSeed.readInt32BE(28),
      sig: sha256("ldk", localSeed, remoteSeed, authHash).subarray(0, 28),
      expiresAt: Date.now() + SESSION_TTL,
    };
  }

  _seqBuf() {
    const b = Buffer.alloc(4);
    b.writeInt32BE(this.session.seq);
    return b;
  }

  _encrypt(plaintext) {
    const s = this.session;
    s.seq = s.seq >= 0x7fffffff ? -0x80000000 : s.seq + 1;
    const seqBuf = this._seqBuf();
    const cipher = crypto.createCipheriv("aes-128-cbc", s.key, Buffer.concat([s.iv, seqBuf]));
    const ct = Buffer.concat([cipher.update(toBuf(plaintext)), cipher.final()]);
    return { payload: Buffer.concat([sha256(s.sig, seqBuf, ct), ct]), seq: s.seq };
  }

  _decrypt(buf) {
    const s = this.session;
    const decipher = crypto.createDecipheriv(
      "aes-128-cbc",
      s.key,
      Buffer.concat([s.iv, this._seqBuf()])
    );
    return Buffer.concat([decipher.update(buf.subarray(32)), decipher.final()]).toString("utf8");
  }

  // Requests on one device must be sequential (seq counter), so serialize them.
  request(method, params) {
    const run = () => this._request(method, params, true);
    const p = this._queue.then(run, run);
    this._queue = p.catch(() => {});
    return p;
  }

  async _request(method, params, retry) {
    if (!this.session || Date.now() > this.session.expiresAt) await this.handshake();
    const body = JSON.stringify({
      method,
      ...(params ? { params } : {}),
      request_time_milis: Date.now(),
      terminal_uuid: TERMINAL_UUID,
    });
    const { payload, seq } = this._encrypt(body);
    const res = await httpPost(this._agent, this.host, `/app/request?seq=${seq}`, payload, {
      Cookie: this.session.cookie,
    });
    if (res.status === 403 && retry) {
      // Session expired on the device side: handshake again once
      this.session = null;
      return this._request(method, params, false);
    }
    if (res.status !== 200) throw new Error(`request HTTP ${res.status}`);
    const data = JSON.parse(this._decrypt(res.body));
    if (data.error_code !== 0) throw new Error(`KLAP ${method} error_code ${data.error_code}`);
    return data.result ?? {};
  }

  getInfo() {
    return this.request("get_device_info");
  }

  setOn(on) {
    return this.request("set_device_info", { device_on: Boolean(on) });
  }
}
