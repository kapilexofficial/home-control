// Uses the Ring REST API directly to get refresh token
import https from "https";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(SCRIPT_DIR, "..", ".env.local");

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(ENV_PATH, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

loadEnvLocal();

const EMAIL = process.env.RING_EMAIL;
const PASSWORD = process.env.RING_PASSWORD;
const CODE_2FA = process.argv[2] || "";

if (!EMAIL || !PASSWORD) {
  console.error(
    "❌ RING_EMAIL e/ou RING_PASSWORD não estão definidos no .env.local"
  );
  process.exit(1);
}

async function getRefreshToken() {
  const body = JSON.stringify({
    client_id: "ring_official_android",
    grant_type: "password",
    password: PASSWORD,
    scope: "client",
    username: EMAIL,
  });

  const headers = {
    "Content-Type": "application/json",
    "2fa-support": "true",
    "2fa-code": CODE_2FA || undefined,
    "User-Agent": "android:com.ringapp",
    hardware_id: "home-control-dashboard",
  };

  if (!CODE_2FA) delete headers["2fa-code"];

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "oauth.ring.com",
        path: "/oauth/token",
        method: "POST",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!CODE_2FA) {
    console.log("Passo 1: Solicitando código 2FA...\n");
  } else {
    console.log(`Passo 2: Usando código 2FA: ${CODE_2FA}\n`);
  }

  const result = await getRefreshToken();
  console.log(`Status: ${result.status}`);

  if (result.data?.refresh_token) {
    console.log(`\n✅ Refresh token obtido!`);
    console.log(`Token: ${result.data.refresh_token.substring(0, 40)}...`);

    let envContent = readFileSync(ENV_PATH, "utf8");
    if (envContent.includes("RING_REFRESH_TOKEN=")) {
      envContent = envContent.replace(
        /RING_REFRESH_TOKEN=.*/,
        `RING_REFRESH_TOKEN=${result.data.refresh_token}`
      );
    } else {
      envContent += `\n# Ring\nRING_REFRESH_TOKEN=${result.data.refresh_token}\n`;
    }
    writeFileSync(ENV_PATH, envContent);
    console.log("✅ Salvo no .env.local");
  } else if (result.status === 412) {
    console.log("\n📧 Código 2FA enviado para seu email/telefone!");
    console.log("Rode novamente com: node scripts/setup-ring-2fa.mjs <CODIGO>");
  } else {
    console.log("\nResposta:", JSON.stringify(result.data, null, 2));
  }
}

main().catch(console.error);
