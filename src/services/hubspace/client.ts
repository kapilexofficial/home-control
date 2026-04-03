const HUBSPACE_REFRESH_TOKEN = process.env.HUBSPACE_REFRESH_TOKEN || "";
const HUBSPACE_ACCOUNT_ID = process.env.HUBSPACE_ACCOUNT_ID || "";

const AUTH_URL =
  "https://accounts.hubspaceconnect.com/auth/realms/thd/protocol/openid-connect/token";
const API_URL = "https://api2.afero.net/v1";

// Token cache - uses refresh token, no re-login needed
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "hubspace_android",
      refresh_token: HUBSPACE_REFRESH_TOKEN,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("HubSpace token refresh failed: " + JSON.stringify(data));
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 100_000,
  };

  return cachedToken.token;
}

export interface HubSpaceDevice {
  deviceId: string;
  friendlyName: string;
  connected: boolean;
  available: boolean;
  powerOn: boolean;
  brightness: number;
}

export async function setHubSpaceAttribute(
  deviceId: string,
  attributeId: number,
  data: string
) {
  const token = await getAccessToken();

  const res = await fetch(
    `${API_URL}/accounts/${HUBSPACE_ACCOUNT_ID}/devices/${deviceId}/actions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "attribute_write",
        attrId: attributeId,
        data,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpace command failed (${res.status}): ${text}`);
  }

  return res.json().catch(() => ({ success: true }));
}

export async function getHubSpaceDevices(): Promise<HubSpaceDevice[]> {
  const token = await getAccessToken();

  const res = await fetch(
    `${API_URL}/accounts/${HUBSPACE_ACCOUNT_ID}/devices?expansions=state,attributes`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("HubSpace devices fetch failed: " + JSON.stringify(data));
  }

  return data.map((d: Record<string, unknown>) => {
    const state = (d.deviceState || {}) as Record<string, unknown>;
    const attributes = (d.attributes || []) as Array<{
      id: number;
      value?: string;
      data?: string;
    }>;

    // Attribute ID 2 = power (value "1" = on, "0" = off)
    const powerAttr = attributes.find((a) => a.id === 2);
    const powerOn = powerAttr?.value === "1" || powerAttr?.data === "01";

    // Attribute ID 50 = brightness
    const briAttr = attributes.find((a) => a.id === 50);
    const brightness = briAttr?.value ? parseInt(briAttr.value, 10) : 0;

    return {
      deviceId: d.deviceId as string,
      friendlyName: (d.friendlyName as string) || "",
      connected: (state.connected as boolean) || false,
      available: (state.available as boolean) || false,
      powerOn,
      brightness,
    };
  });
}
