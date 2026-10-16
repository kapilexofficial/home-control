// Registry of new-generation Kasa switches: which exist (from the Kasa cloud,
// which knows their MACs) and where they are on the LAN (ARP, with a ping
// sweep fallback because DHCP moves them around). State and control go over
// KLAP directly to each device.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { KlapDevice, decodeNickname } from "./kasa-klap.mjs";

const execFileAsync = promisify(execFile);

const CLOUD_URL = "https://wap.tplinkcloud.com";
const CREDENTIALS = {
  username: process.env.KASA_EMAIL || "",
  password: process.env.KASA_PASSWORD || "",
};
const SUBNETS = (process.env.KASA_SUBNETS || "192.168.4,192.168.5,192.168.6,192.168.7")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const CLOUD_TTL = 10 * 60 * 1000;
const STATE_TTL = 3000;
const SWEEP_MIN_INTERVAL = 60 * 1000;

const log = (...args) => console.log("[Kasa]", ...args);

// --- Cloud: list of SMART.* switches with their MACs -----------------------
let cloudCache = { at: 0, list: [] };

async function cloudCall(body, token) {
  const url = token ? `${CLOUD_URL}?token=${token}` : CLOUD_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (data.error_code !== 0) throw new Error(`Kasa cloud ${body.method}: ${JSON.stringify(data)}`);
  return data.result;
}

export async function getCloudSwitches() {
  if (Date.now() - cloudCache.at < CLOUD_TTL) return cloudCache.list;
  try {
    const { token } = await cloudCall({
      method: "login",
      params: {
        appType: "Kasa_Android",
        cloudUserName: CREDENTIALS.username,
        cloudPassword: CREDENTIALS.password,
        terminalUUID: "home-control-local-proxy",
      },
    });
    const { deviceList } = await cloudCall({ method: "getDeviceList" }, token);
    const list = deviceList
      .filter((d) => typeof d.deviceType === "string" && d.deviceType.startsWith("SMART."))
      .map((d) => ({
        deviceId: d.deviceId,
        mac: normMac(d.deviceMac),
        model: d.deviceModel,
        cloudAlias: decodeNickname(d.alias) || d.alias,
      }));
    cloudCache = { at: Date.now(), list };
    log(`cloud lists ${list.length} SMART switch(es)`);
  } catch (err) {
    // Keep serving the last known list if the cloud is down
    log("cloud list failed, using cached list:", err.message);
    cloudCache.at = Date.now() - CLOUD_TTL + 60 * 1000; // retry in a minute
  }
  return cloudCache.list;
}

// --- LAN: MAC -> IP -----------------------------------------------------------
function normMac(mac) {
  return String(mac || "").toLowerCase().replace(/[^0-9a-f]/g, "");
}

// macOS prints unpadded octets ("ec:b:ae:..."), so pad before comparing
function normArpMac(mac) {
  return mac
    .split(":")
    .map((p) => p.padStart(2, "0"))
    .join("");
}

async function readArpTable() {
  const table = new Map();
  let stdout = "";
  try {
    ({ stdout } = await execFileAsync("/usr/sbin/arp", ["-an"], { timeout: 5000 }));
  } catch (err) {
    // macOS arp exits non-zero when some entries are incomplete but still prints the table
    stdout = err.stdout || "";
    if (!stdout) log("arp failed:", err.message);
  }
  for (const line of stdout.split("\n")) {
    const m = line.match(/\((\d+\.\d+\.\d+\.\d+)\) at ([0-9a-f:]+)/i);
    if (m && !m[1].endsWith(".255")) table.set(normArpMac(m[2].toLowerCase()), m[1]);
  }
  return table;
}

let lastSweep = 0;
let sweepPromise = null;

// Ping every host so the ARP table fills up. Only used when a switch cannot be found.
function sweepSubnets() {
  if (sweepPromise) return sweepPromise;
  if (Date.now() - lastSweep < SWEEP_MIN_INTERVAL) return Promise.resolve();
  lastSweep = Date.now();
  log(`sweeping ${SUBNETS.join(", ")} to refresh ARP...`);
  sweepPromise = (async () => {
    const targets = SUBNETS.flatMap((s) => Array.from({ length: 254 }, (_, i) => `${s}.${i + 1}`));
    for (let i = 0; i < targets.length; i += 100) {
      await Promise.allSettled(
        targets
          .slice(i, i + 100)
          .map((ip) => execFileAsync("ping", ["-c", "1", "-t", "1", ip], { timeout: 2500 }))
      );
    }
  })().finally(() => {
    sweepPromise = null;
  });
  return sweepPromise;
}

const ipByMac = new Map();

async function resolveIp(mac, allowSweep) {
  let arp = await readArpTable();
  if (!arp.has(mac) && allowSweep) {
    await sweepSubnets();
    arp = await readArpTable();
  }
  const ip = arp.get(mac) || null;
  if (ip) ipByMac.set(mac, ip);
  return ip;
}

// --- Devices ------------------------------------------------------------------
const klapByIp = new Map();

function klap(ip) {
  if (!klapByIp.has(ip)) klapByIp.set(ip, new KlapDevice(ip, CREDENTIALS));
  return klapByIp.get(ip);
}

function forget(sw, ip) {
  klapByIp.delete(ip);
  if (ipByMac.get(sw.mac) === ip) ipByMac.delete(sw.mac);
}

// Returns a connected KlapDevice for the switch, re-discovering its IP if needed
async function connect(sw) {
  const candidates = [ipByMac.get(sw.mac), () => resolveIp(sw.mac, false), () => resolveIp(sw.mac, true)];
  let lastErr = null;
  for (const c of candidates) {
    const ip = typeof c === "function" ? await c() : c;
    if (!ip) continue;
    try {
      const info = await klap(ip).getInfo();
      if (normMac(info.mac) !== sw.mac) {
        // The IP now belongs to another device
        forget(sw, ip);
        lastErr = new Error(`${ip} is not ${sw.mac}`);
        continue;
      }
      ipByMac.set(sw.mac, ip);
      return { device: klap(ip), ip, info };
    } catch (err) {
      forget(sw, ip);
      lastErr = err;
    }
  }
  throw lastErr || new Error(`switch ${sw.deviceId} not found on LAN`);
}

function toState(sw, ip, info) {
  return {
    deviceId: sw.deviceId,
    mac: sw.mac,
    model: sw.model,
    ip,
    alias: decodeNickname(info.nickname) || sw.cloudAlias,
    on: Boolean(info.device_on),
    online: true,
    rssi: info.rssi,
  };
}

async function queryDevice(sw) {
  try {
    const { ip, info } = await connect(sw);
    return toState(sw, ip, info);
  } catch (err) {
    log(`${sw.cloudAlias} (${sw.mac}) unreachable: ${err.message}`);
    return {
      deviceId: sw.deviceId,
      mac: sw.mac,
      model: sw.model,
      ip: ipByMac.get(sw.mac) || null,
      alias: sw.cloudAlias,
      on: false,
      online: false,
    };
  }
}

let stateCache = { at: 0, promise: null };

export function listSwitches() {
  if (stateCache.promise && Date.now() - stateCache.at < STATE_TTL) return stateCache.promise;
  const promise = getCloudSwitches().then((list) => Promise.all(list.map(queryDevice)));
  stateCache = { at: Date.now(), promise };
  promise.catch(() => {
    stateCache = { at: 0, promise: null };
  });
  return promise;
}

export async function setSwitch(deviceId, on) {
  const list = await getCloudSwitches();
  const sw = list.find((d) => d.deviceId === deviceId);
  if (!sw) {
    const err = new Error(`unknown Kasa switch ${deviceId}`);
    err.status = 404;
    throw err;
  }
  const { device, ip, info } = await connect(sw);
  await device.setOn(on);
  stateCache = { at: 0, promise: null };
  log(`${decodeNickname(info.nickname) || sw.cloudAlias} @${ip} -> ${on ? "ON" : "OFF"}`);
  return { deviceId, on: Boolean(on) };
}
