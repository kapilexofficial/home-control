"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { POLLING_INTERVAL } from "@/lib/constants";
import { isInCommandCooldown } from "./useCommand";
import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      // Skip fetch during command cooldown to prevent state revert
      if (isInCommandCooldown()) {
        throw new Error("cooldown");
      }
      const data = await api.devices.list();
      return data.devices;
    },
    refetchInterval: POLLING_INTERVAL,
    retry: (failureCount, error) => {
      // Don't retry cooldown skips
      if (error?.message === "cooldown") return false;
      return failureCount < 3;
    },
  });
}

export function useDevicesByRoom(devices: Device[] | undefined) {
  const roomMap = new Map<string, Device[]>();

  if (devices) {
    for (const device of devices) {
      const roomId = device.roomId || "sem-comodo";
      const existing = roomMap.get(roomId) || [];
      existing.push(device);
      roomMap.set(roomId, existing);
    }
  }

  return roomMap;
}

export function useDevicesByType(devices: Device[] | undefined) {
  const typeMap = new Map<DeviceType, Device[]>();

  if (devices) {
    for (const device of devices) {
      const existing = typeMap.get(device.type) || [];
      existing.push(device);
      typeMap.set(device.type, existing);
    }
  }

  return typeMap;
}
