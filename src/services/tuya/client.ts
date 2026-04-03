import crypto from "crypto";
import { tuyaTokenManager } from "./token";

const TUYA_ENDPOINT = process.env.TUYA_ENDPOINT || "https://openapi.tuyaus.com";
const TUYA_CLIENT_ID = process.env.TUYA_CLIENT_ID || "";
const TUYA_CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || "";

interface TuyaRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  requiresToken?: boolean;
}

function generateSign(
  clientId: string,
  secret: string,
  timestamp: string,
  accessToken: string,
  nonce: string,
  method: string,
  path: string,
  body: string
): string {
  const contentHash = crypto
    .createHash("sha256")
    .update(body || "")
    .digest("hex");

  const stringToSign = [method, contentHash, "", path].join("\n");
  const signStr = clientId + accessToken + timestamp + nonce + stringToSign;

  return crypto
    .createHmac("sha256", secret)
    .update(signStr)
    .digest("hex")
    .toUpperCase();
}

export async function tuyaRequest<T>({
  method,
  path,
  body,
  requiresToken = true,
}: TuyaRequestOptions): Promise<T> {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const accessToken = requiresToken
    ? await tuyaTokenManager.getToken()
    : "";
  const bodyStr = body ? JSON.stringify(body) : "";

  const sign = generateSign(
    TUYA_CLIENT_ID,
    TUYA_CLIENT_SECRET,
    timestamp,
    accessToken,
    nonce,
    method,
    path,
    bodyStr
  );

  const headers: Record<string, string> = {
    client_id: TUYA_CLIENT_ID,
    sign,
    t: timestamp,
    sign_method: "HMAC-SHA256",
    nonce,
  };

  if (accessToken) {
    headers.access_token = accessToken;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${TUYA_ENDPOINT}${path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  if (!response.ok) {
    throw new Error(`Tuya API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Tuya API error: ${data.code} - ${data.msg}`);
  }

  return data;
}

export interface TuyaDeviceRaw {
  id: string;
  name: string;
  category: string;
  online: boolean;
  status: Array<{ code: string; value: unknown }>;
  product_name: string;
  update_time: number;
  owner_id?: string;
  icon?: string;
}

export async function getDevices(): Promise<TuyaDeviceRaw[]> {
  // Use the associated-users endpoint which works with Smart Home projects
  const data = await tuyaRequest<{
    result: {
      devices: TuyaDeviceRaw[];
      has_more: boolean;
      last_row_key: string;
    };
  }>({
    method: "GET",
    path: `/v1.0/iot-01/associated-users/devices?last_row_key=`,
  });

  return data.result.devices;
}

export async function getDeviceStatus(deviceId: string) {
  const data = await tuyaRequest<{
    result: Array<{ code: string; value: unknown }>;
  }>({
    method: "GET",
    path: `/v1.0/devices/${deviceId}/status`,
  });

  return data.result;
}

export async function sendCommand(
  deviceId: string,
  commands: Array<{ code: string; value: unknown }>
) {
  return tuyaRequest({
    method: "POST",
    path: `/v1.0/devices/${deviceId}/commands`,
    body: { commands },
  });
}
