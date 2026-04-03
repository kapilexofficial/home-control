import {
  Lightbulb,
  Power,
  Thermometer,
  Eye,
  Camera,
  Blinds,
  Tv,
  Lock,
  Fan,
  type LucideIcon,
} from "lucide-react";
import { DeviceType } from "@/types/device";

export const DEVICE_TYPE_ICONS: Record<DeviceType, LucideIcon> = {
  [DeviceType.LIGHT]: Lightbulb,
  [DeviceType.SWITCH]: Power,
  [DeviceType.CLIMATE]: Thermometer,
  [DeviceType.SENSOR]: Eye,
  [DeviceType.CAMERA]: Camera,
  [DeviceType.COVER]: Blinds,
  [DeviceType.MEDIA_PLAYER]: Tv,
  [DeviceType.LOCK]: Lock,
  [DeviceType.FAN]: Fan,
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  [DeviceType.LIGHT]: "Luzes",
  [DeviceType.SWITCH]: "Interruptores",
  [DeviceType.CLIMATE]: "Climatização",
  [DeviceType.SENSOR]: "Sensores",
  [DeviceType.CAMERA]: "Câmeras",
  [DeviceType.COVER]: "Cortinas",
  [DeviceType.MEDIA_PLAYER]: "Media",
  [DeviceType.LOCK]: "Fechaduras",
  [DeviceType.FAN]: "Ventiladores",
};

export const ROOM_ICONS: Record<string, string> = {
  sala: "sofa",
  quarto: "bed-double",
  cozinha: "cooking-pot",
  banheiro: "bath",
  escritorio: "monitor",
  garagem: "car",
  varanda: "sun",
  jardim: "tree-pine",
  lavanderia: "washing-machine",
  corredor: "door-open",
};

export const POLLING_INTERVAL = 5000; // 5 seconds
