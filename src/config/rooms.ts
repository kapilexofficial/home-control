export interface RoomConfig {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export const ROOMS: RoomConfig[] = [
  { id: "sala", name: "Sala", icon: "sofa", order: 0 },
  { id: "suite-principal", name: "Suíte Principal", icon: "bed-double", order: 1 },
  { id: "quarto-victoria", name: "Quarto Victoria", icon: "baby", order: 2 },
  { id: "quarto-visitas", name: "Quarto de Visitas", icon: "bed-single", order: 3 },
  { id: "suite-piscina", name: "Suíte Piscina", icon: "bath", order: 4 },
  { id: "piscina", name: "Piscina", icon: "waves", order: 5 },
  { id: "frente", name: "Frente da Casa", icon: "door-open", order: 6 },
  { id: "garagem", name: "Garagem", icon: "car", order: 7 },
  { id: "escritorio", name: "Escritório", icon: "monitor", order: 8 },
];

// Device ID → Room ID mapping
export const DEVICE_ROOM_MAP: Record<string, string> = {
  // Sala
  "hue-2": "sala",                          // Abajur Direito
  "hue-3": "sala",                          // Abajur Esquerdo
  "hue-4": "sala",                          // Luz esquerda da TV
  "hue-5": "sala",                          // Luz direita da TV
  "eb3fc516db76ff2ed5fkf2": "sala",         // Luzes dos Vasos
  "ring-626183295": "sala",                 // Câmera Sala (Ring)

  // Suíte Principal
  "hue-7": "suite-principal",               // Abajur direito do quarto
  "hue-9": "suite-principal",               // Abajur Esquerdo do Quarto
  "ebc7a24cc4778feabeu0jv": "suite-principal", // Temperatura Suíte

  // Quarto Victoria
  "hue-1": "quarto-victoria",              // Abajur
  "eb753fc5d490d52529mge5": "quarto-victoria", // Temperatura Quarto Victoria

  // Quarto de Visitas
  "hue-10": "quarto-visitas",               // Abajur Esquerdo QV
  "hue-11": "quarto-visitas",               // Abajur Direito QV

  // Piscina
  "ring-620964375": "piscina",              // Piscina 01
  "ring-576007110": "piscina",              // Piscina 02

  // Frente da Casa
  "eb5fcc4488f8686397zjy9_ch1": "frente",   // Luzes da Frente
  "eb5fcc4488f8686397zjy9_ch2": "sala",      // Luz da Entrada
  "hue-6": "frente",                        // Entrada (Hue)
  "ring-617236035": "frente",               // Front Door (Ring)
  "kasa-801A64C4BF3C8F40E20CBD715AC4EC9521DDC40F": "frente", // Camera externa
  "hubspace-8417b48a0a0da7da": "piscina",   // Jardim

  // Garagem
  "ring-620431855": "garagem",              // Garagem (Ring)
  "eb204etagqg1ssbw": "garagem",            // Porta da Garagem

  // Escritório
  "eb53e5b6e3dbee763521qa": "escritorio",   // Hub Zigbee X5
};

export function getDeviceRoom(deviceId: string): string | null {
  return DEVICE_ROOM_MAP[deviceId] || null;
}
