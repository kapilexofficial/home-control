import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";

const KASA_EMAIL = process.env.KASA_EMAIL || "";
const KASA_PASSWORD = process.env.KASA_PASSWORD || "";
const CLOUD_URL = "https://wap.tplinkcloud.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(CLOUD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "login",
      params: {
        appType: "Kasa_Android",
        cloudUserName: KASA_EMAIL,
        cloudPassword: KASA_PASSWORD,
        terminalUUID: "home-control-dashboard",
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

interface KasaCloudDevice {
  alias: string;
  deviceModel: string;
  deviceId: string;
  status: number; // 1 = online
  deviceType: string;
}

export async function getKasaDevices(): Promise<Device[]> {
  const token = await getToken();

  const res = await fetch(`${CLOUD_URL}?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method: "getDeviceList" }),
  });

  const data = await res.json();
  if (data.error_code !== 0 || !data.result?.deviceList) {
    throw new Error("Kasa device list failed: " + JSON.stringify(data));
  }

  return data.result.deviceList.map((d: KasaCloudDevice) => {
    const isCamera = d.deviceModel?.toLowerCase().includes("kc") ||
      d.deviceType?.toLowerCase().includes("camera");

    return {
      id: `kasa-${d.deviceId}`,
      name: d.alias,
      type: isCamera ? DeviceType.CAMERA : DeviceType.SWITCH,
      state: d.status === 1 ? "on" : "unavailable",
      roomId: null,
      attributes: {
        model: d.deviceModel,
      },
      online: d.status === 1,
      lastUpdated: new Date().toISOString(),
      platform: "kasa" as const,
    } satisfies Device;
  });
}
