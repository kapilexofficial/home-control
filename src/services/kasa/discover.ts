import { execFile } from "child_process";
import { promisify } from "util";
import { networkInterfaces } from "os";
import net from "net";

const execFileAsync = promisify(execFile);

function getCameraMac(): string {
  return (process.env.KASA_CAMERA_MAC || "3C:52:A1:D1:E4:FC")
    .replace(/:/g, "")
    .toLowerCase();
}

function getLocalSubnet(): string | null {
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        const parts = iface.address.split(".");
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
    }
  }
  return null;
}

function checkPort(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const fail = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(timeoutMs);
    socket.once("error", fail);
    socket.once("timeout", fail);
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

/**
 * Scans the local subnet for the Kasa camera by MAC and returns its current IP,
 * or null if not found / unreachable on the stream port.
 */
export async function discoverCameraIp(): Promise<string | null> {
  const subnet = getLocalSubnet();
  if (!subnet) return null;

  // Populate ARP via parallel ping sweep
  const pings: Promise<unknown>[] = [];
  for (let i = 1; i < 255; i++) {
    pings.push(
      execFileAsync("ping", ["-c", "1", "-W", "200", `${subnet}.${i}`]).catch(() => {})
    );
  }
  await Promise.all(pings);

  // Lookup MAC in arp table
  const { stdout } = await execFileAsync("arp", ["-a"]);
  const targetMac = getCameraMac();
  const candidates: string[] = [];
  for (const line of stdout.split("\n")) {
    // Format: ? (192.168.7.10) at 3c:52:a1:d1:e4:fc on en1 ifscope [ethernet]
    const match = line.match(/\(([\d.]+)\) at ([0-9a-f:]+)/i);
    if (!match) continue;
    const ip = match[1];
    const mac = match[2].replace(/:/g, "").toLowerCase();
    if (mac === targetMac) candidates.push(ip);
  }

  // Stale ARP entries are common — verify the stream port is reachable
  for (const ip of candidates) {
    if (await checkPort(ip, 19443)) return ip;
  }
  return null;
}
