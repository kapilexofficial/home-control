import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sendCommand as sendTuyaCommand } from "@/services/tuya/client";
import { setHueLightState, activateHueScene, setHueGroupState } from "@/services/hue/client";
import { setHubSpaceAttribute } from "@/services/hubspace/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;

  try {
    const body = await request.json();
    const { commands } = body;

    if (!commands || !Array.isArray(commands)) {
      return NextResponse.json(
        { error: "Commands array is required" },
        { status: 400 }
      );
    }

    // Hue button - activate scene or turn off group
    if (deviceId.startsWith("hue-btn-")) {
      for (const cmd of commands) {
        if (cmd.code === "scene") {
          await activateHueScene("82", cmd.value as string);
        }
        if (cmd.code === "off") {
          await setHueGroupState("82", { on: false });
        }
      }
      return NextResponse.json({ success: true });
    }

    // Route to correct platform based on device ID prefix
    if (deviceId.startsWith("hue-")) {
      const hueId = deviceId.replace("hue-", "");
      const hueState: Record<string, unknown> = {};

      for (const cmd of commands) {
        if (cmd.code === "switch_led" || cmd.code === "on") {
          hueState.on = cmd.value;
        }
        if (cmd.code === "bright_value_v2" || cmd.code === "bri") {
          // Convert from 0-1000 or 0-100 to Hue 1-254
          const val = Number(cmd.value);
          hueState.bri = val > 254 ? Math.round((val / 1000) * 254) : Math.round((val / 100) * 254);
        }
      }

      await setHueLightState(hueId, hueState);
      return NextResponse.json({ success: true });
    }

    // HubSpace device
    if (deviceId.startsWith("hubspace-")) {
      const hubId = deviceId.replace("hubspace-", "");

      for (const cmd of commands) {
        if (cmd.code === "switch_led" || cmd.code === "on") {
          // Attribute ID 2 = power, hex "01" = on, "00" = off
          await setHubSpaceAttribute(hubId, 2, cmd.value ? "01" : "00");
        }
        if (cmd.code === "bright_value_v2" || cmd.code === "brightness") {
          // Attribute ID 50 = brightness (0-100 as 2-byte hex)
          const val = Number(cmd.value);
          const bri = val > 100 ? Math.round((val / 1000) * 100) : val;
          const hex = bri.toString(16).padStart(4, "0");
          await setHubSpaceAttribute(hubId, 50, hex);
        }
      }

      return NextResponse.json({ success: true });
    }

    // Tuya device (handle multi-channel IDs like "deviceId_ch1")
    if (!process.env.TUYA_CLIENT_ID) {
      return NextResponse.json({ success: true, mock: true });
    }

    const channelMatch = deviceId.match(/^(.+)_ch(\d+)$/);
    if (channelMatch) {
      const realDeviceId = channelMatch[1];
      const channelNum = channelMatch[2];
      // Remap switch_led to the correct channel switch code
      const channelCommands = commands.map((cmd: { code: string; value: unknown }) => {
        if (cmd.code === "switch_led") {
          return { code: `switch_${channelNum}`, value: cmd.value };
        }
        return cmd;
      });
      await sendTuyaCommand(realDeviceId, channelCommands);
    } else {
      await sendTuyaCommand(deviceId, commands);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to send command to ${deviceId}:`, error);
    return NextResponse.json(
      { error: "Failed to send command" },
      { status: 500 }
    );
  }
}
