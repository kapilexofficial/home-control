import type { Device } from "@/types/device";

const API_BASE = "/api";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  devices: {
    list: () => fetchAPI<{ devices: Device[] }>("/devices"),

    getStatus: (deviceId: string) =>
      fetchAPI<{ device: Device }>(`/devices/${deviceId}`),

    sendCommand: (
      deviceId: string,
      commands: Array<{ code: string; value: unknown }>
    ) =>
      fetchAPI(`/devices/${deviceId}/command`, {
        method: "POST",
        body: JSON.stringify({ commands }),
      }),

    toggle: (deviceId: string, state: boolean) =>
      fetchAPI(`/devices/${deviceId}/command`, {
        method: "POST",
        body: JSON.stringify({
          commands: [{ code: "switch_led", value: state }],
        }),
      }),

    setBrightness: (deviceId: string, brightness: number) =>
      fetchAPI(`/devices/${deviceId}/command`, {
        method: "POST",
        body: JSON.stringify({
          commands: [
            { code: "bright_value_v2", value: Math.round((brightness / 100) * 1000) },
          ],
        }),
      }),
  },
};
