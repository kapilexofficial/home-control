"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Device } from "@/types/device";

// Track when the last command was sent to suppress polling refetches
let lastCommandTime = 0;
const COMMAND_COOLDOWN = 8000; // 8 seconds

export function isInCommandCooldown() {
  return Date.now() - lastCommandTime < COMMAND_COOLDOWN;
}

export function useCommand() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      deviceId,
      commands,
    }: {
      deviceId: string;
      commands: Array<{ code: string; value: unknown }>;
    }) => {
      return api.devices.sendCommand(deviceId, commands);
    },
    onMutate: async ({ deviceId, commands }) => {
      // Mark command time to suppress polling
      lastCommandTime = Date.now();

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["devices"] });

      // Snapshot previous state
      const previousDevices = queryClient.getQueryData<Device[]>(["devices"]);

      // Optimistically update
      if (previousDevices) {
        queryClient.setQueryData<Device[]>(["devices"], (old) =>
          old?.map((device) => {
            if (device.id !== deviceId) return device;

            const updated = { ...device, attributes: { ...device.attributes } };

            for (const cmd of commands) {
              if (cmd.code === "switch_led" || cmd.code === "switch" || cmd.code === "switch_1") {
                updated.state = cmd.value ? "on" : "off";
              }
              if (cmd.code === "bright_value_v2") {
                updated.attributes.brightness = Math.round(
                  (Number(cmd.value) / 1000) * 100
                );
              }
              if (cmd.code === "temp_set") {
                updated.attributes.temperature = Number(cmd.value);
              }
              if (cmd.code === "percent_control") {
                updated.attributes.position = Number(cmd.value);
              }
            }

            return updated;
          })
        );
      }

      return { previousDevices };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousDevices) {
        queryClient.setQueryData(["devices"], context.previousDevices);
      }
    },
    onSettled: () => {
      // Wait before refetching to give the API time to update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["devices"] });
      }, COMMAND_COOLDOWN);
    },
  });

  const toggle = (deviceId: string, newState: boolean) => {
    mutation.mutate({
      deviceId,
      commands: [{ code: "switch_led", value: newState }],
    });
  };

  const setBrightness = (deviceId: string, brightness: number) => {
    mutation.mutate({
      deviceId,
      commands: [
        { code: "bright_value_v2", value: Math.round((brightness / 100) * 1000) },
      ],
    });
  };

  const sendCommand = (deviceId: string, code: string, value: unknown) => {
    mutation.mutate({
      deviceId,
      commands: [{ code, value }],
    });
  };

  return { toggle, setBrightness, sendCommand, isLoading: mutation.isPending };
}
