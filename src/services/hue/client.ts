const HUE_BRIDGE_IP = process.env.HUE_BRIDGE_IP || "";
const HUE_BRIDGE_URL = process.env.HUE_BRIDGE_URL || "";
const HUE_API_KEY = process.env.HUE_API_KEY || "";

function getBaseUrl() {
  const host = HUE_BRIDGE_URL || `http://${HUE_BRIDGE_IP}`;
  return `${host}/api/${HUE_API_KEY}`;
}

export interface HueLight {
  id: string;
  name: string;
  state: {
    on: boolean;
    bri: number; // 1-254
    hue?: number;
    sat?: number;
    ct?: number;
    reachable: boolean;
    colormode?: string;
  };
  type: string;
  productname: string;
  modelid: string;
  uniqueid: string;
}

export interface HueGroup {
  id: string;
  name: string;
  type: string;
  lights: string[];
}

export async function getHueLights(): Promise<HueLight[]> {
  const res = await fetch(`${getBaseUrl()}/lights`);
  const data = await res.json();

  return Object.entries(data).map(([id, light]) => ({
    id,
    ...(light as Omit<HueLight, "id">),
  }));
}

export async function getHueGroups(): Promise<HueGroup[]> {
  const res = await fetch(`${getBaseUrl()}/groups`);
  const data = await res.json();

  return Object.entries(data)
    .filter(([, group]) => (group as { type: string }).type === "Room")
    .map(([id, group]) => ({
      id,
      ...(group as Omit<HueGroup, "id">),
    }));
}

export async function setHueLightState(
  lightId: string,
  state: Record<string, unknown>
) {
  const res = await fetch(`${getBaseUrl()}/lights/${lightId}/state`, {
    method: "PUT",
    body: JSON.stringify(state),
  });
  return res.json();
}
