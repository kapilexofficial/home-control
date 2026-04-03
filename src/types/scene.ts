export interface SceneAction {
  deviceId: string;
  commands: { code: string; value: unknown }[];
}

export interface Scene {
  id: string;
  name: string;
  icon: string;
  actions: SceneAction[];
}
