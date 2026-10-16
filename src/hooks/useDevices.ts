"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type DevicesResponse } from "@/services/api";
import { POLLING_INTERVAL } from "@/lib/constants";
import { isInCommandCooldown } from "./useCommand";
import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";

export function useDevices() {
  const query = useQuery<DevicesResponse, Error>({
    queryKey: ["devices"],
    queryFn: async () => {
      // Skip fetch during command cooldown to prevent state revert
      if (isInCommandCooldown()) {
        throw new Error("cooldown");
      }
      return api.devices.list();
    },
    refetchInterval: POLLING_INTERVAL,
    retry: (failureCount, error) => {
      // Don't retry cooldown skips
      if (error?.message === "cooldown") return false;
      return failureCount < 3;
    },
  });

  // "cooldown" is a deliberate skip, not a real failure
  const fetchError =
    query.error && query.error.message !== "cooldown" ? query.error.message : null;

  return {
    ...query,
    data: query.data?.devices,
    /** Platforms that failed in the last response, e.g. "Tuya: IoT Core expired". */
    platformErrors: query.data?.errors ?? [],
    /** Set when the whole /api/devices request failed (network, 500...). */
    fetchError,
  };
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
