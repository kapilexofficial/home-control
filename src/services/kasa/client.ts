import { randomUUID } from "crypto";
import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";

const KASA_EMAIL = process.env.KASA_EMAIL || "";
const KASA_PASSWORD = process.env.KASA_PASSWORD || "";
const CLOUD_URL = "https://wap.tplinkcloud.com";

// Local proxy (scripts/local-proxy.mjs) that talks KLAP to new-generation
// switches on the LAN. In the cloud deploy this is the Cloudflare Tunnel URL.
const KASA_PROXY_URL = (process.env.KASA_PROXY_URL || "http://localhost:3002").replace(/\/$/, "");
const KASA_PROXY_SECRET = process.env.KASA_PROXY_SECRET || "";

// The legacy cloud keeps one session per terminalUUID: logging in again with the
// same UUID revokes the previous token ("Account login in other places", -20675).
// Production, preview and local dev used to share one fixed UUID and kept kicking
// each other out, so every process now gets its own.
const TERMINAL_UUID = `home-control-${process.env.VERCEL_ENV || "local"}-${randomUUID()}`;

// Cloud error codes that mean "this token is no longer valid, log in again"
const TOKEN_REVOKED_CODES = new Set([-20675, -20651]);

let cachedToken: { token: string; expiresAt: number } | null = null;

async function login(): Promise<string> {
  const res = await fetch(CLOUD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "login",
      params: {
        appType: "Kasa_Android",
        cloudUserName: KASA_EMAIL,
        cloudPassword: KASA_PASSWORD,
        terminalUUID: TERMINAL_UUID,
      },
    }),
  });

  const data = await res.json();
  if (data.error_code !== 0 || !data.result?.token) {
    throw new Error("Kasa login failed: " + JSON.stringify(data));
  }

  cachedToken = {
    token: data.result.token,
    // Cache for 30 minutes
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  return cachedToken.token;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  return login();
}

interface KasaCloudResponse<T> {
  error_code: number;
  msg?: string;
  result?: T;
}

async function postWithToken<T>(token: string, method: string): Promise<KasaCloudResponse<T>> {
  const res = await fetch(`${CLOUD_URL}?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method }),
  });
  return res.json();
}

// Calls the cloud with the cached token; if the token was revoked, logs in once more and retries.
async function cloudCall<T>(method: string): Promise<T> {
  let data = await postWithToken<T>(await getToken(), method);

  if (TOKEN_REVOKED_CODES.has(data.error_code)) {
    console.warn(`[Kasa] token revoked (${data.error_code}), logging in again`);
    cachedToken = null;
    data = await postWithToken<T>(await login(), method);
  }

  if (data.error_code !== 0 || data.result === undefined) {
    throw new Error(`Kasa ${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

interface KasaCloudDevice {
  alias: string;
  deviceModel: string;
  deviceId: string;
  deviceMac?: string;
  status: number; // 1 = online (legacy protocol devices only)
  deviceType: string; // "IOT.*" legacy, "SMART.*" new generation (KLAP)
}

interface KasaLocalSwitch {
  deviceId: string;
  alias: string;
  on: boolean;
  online: boolean;
  ip: string | null;
  model: string;
  rssi?: number;
}

// New-generation devices return their name base64-encoded through the legacy cloud
function decodeAlias(alias: string): string {
  if (!alias || alias.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(alias)) return alias;
  try {
    const text = Buffer.from(alias, "base64").toString("utf8");
    const roundTrips = Buffer.from(text, "utf8").toString("base64") === alias;
    const printable = !/[\u0000-\u0008\u000e-\u001f�]/.test(text);
    if (text && roundTrips && printable) return text;
  } catch {
    // fall through
  }
  return alias;
}

async function getLocalSwitches(): Promise<Map<string, KasaLocalSwitch>> {
  const res = await fetch(`${KASA_PROXY_URL}/kasa/devices`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Kasa proxy returned ${res.status}`);
  const data = (await res.json()) as { devices: KasaLocalSwitch[] };
  return new Map(data.devices.map((d) => [d.deviceId, d]));
}

export async function getKasaDevices(): Promise<Device[]> {
  const { deviceList } = await cloudCall<{ deviceList?: KasaCloudDevice[] }>("getDeviceList");
  if (!deviceList) {
    throw new Error("Kasa device list failed: response has no deviceList");
  }

  const list = deviceList;
  const isSmart = (d: KasaCloudDevice) => d.deviceType?.startsWith("SMART.");

  // The legacy cloud always reports SMART.* devices as offline; ask the local proxy
  const local = list.some(isSmart)
    ? await getLocalSwitches().catch((err: Error) => {
        console.warn("[Kasa] local proxy unavailable:", err.message);
        return null;
      })
    : null;

  return list.map((d) => {
    const isCamera =
      d.deviceModel?.toLowerCase().includes("kc") ||
      d.deviceType?.toLowerCase().includes("camera");

    const localInfo = local?.get(d.deviceId);
    const name = localInfo?.alias || decodeAlias(d.alias);
    const online = localInfo ? localInfo.online : d.status === 1;
    const isOn = localInfo ? localInfo.on : d.status === 1;

    const type = isCamera
      ? DeviceType.CAMERA
      : /ventilador|\bfan\b/i.test(name)
        ? DeviceType.FAN
        : DeviceType.SWITCH;

    return {
      id: `kasa-${d.deviceId}`,
      name,
      type,
      state: !online ? "unavailable" : isCamera || isOn ? "on" : "off",
      roomId: null,
      attributes: {
        model: d.deviceModel,
        ...(localInfo?.ip ? { ip: localInfo.ip } : {}),
        ...(localInfo?.rssi !== undefined ? { rssi: localInfo.rssi } : {}),
      },
      online,
      lastUpdated: new Date().toISOString(),
      platform: "kasa" as const,
    } satisfies Device;
  });
}

export async function setKasaSwitch(deviceId: string, on: boolean): Promise<void> {
  const res = await fetch(`${KASA_PROXY_URL}/kasa/devices/${encodeURIComponent(deviceId)}/set`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(KASA_PROXY_SECRET ? { "x-proxy-key": KASA_PROXY_SECRET } : {}),
    },
    body: JSON.stringify({ on }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kasa proxy set failed: ${res.status} ${text}`);
  }
}
