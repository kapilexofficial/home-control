import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const CACHE_FILE = join(process.cwd(), ".kasa-cam-ip");

let cachedIp: string | null = null;

export async function getCameraIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const fileIp = (await readFile(CACHE_FILE, "utf-8")).trim();
    if (fileIp) {
      cachedIp = fileIp;
      return fileIp;
    }
  } catch {
    // file doesn't exist yet
  }
  cachedIp = process.env.KASA_CAMERA_IP || "";
  return cachedIp;
}

export async function setCameraIp(ip: string): Promise<void> {
  cachedIp = ip;
  await writeFile(CACHE_FILE, ip, "utf-8");
}
