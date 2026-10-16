import { RingApi } from "ring-client-api";
import * as readline from "readline";
import * as fs from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(SCRIPT_DIR, "..", ".env.local");

function loadEnvLocal() {
  let raw;
  try {
    raw = fs.readFileSync(ENV_PATH, "utf8");
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

if (!EMAIL || !PASSWORD) {
  console.error(
    "❌ RING_EMAIL e/ou RING_PASSWORD não estão definidos no .env.local"
  );
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function saveToken(newRefreshToken) {
  let envContent = fs.readFileSync(ENV_PATH, "utf8");
  if (envContent.includes("RING_REFRESH_TOKEN=")) {
    envContent = envContent.replace(
      /RING_REFRESH_TOKEN=.*/,
      `RING_REFRESH_TOKEN=${newRefreshToken}`
    );
  } else {
    envContent += `\nRING_REFRESH_TOKEN=${newRefreshToken}\n`;
  }
  fs.writeFileSync(ENV_PATH, envContent);
  console.log("✅ Token salvo no .env.local");
}

async function main() {
  console.log("=== Ring Setup ===");
  console.log("Isso vai enviar um código 2FA para seu email/telefone.\n");

  try {
    const ringApi = new RingApi({
      email: EMAIL,
      password: PASSWORD,
    });

    ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
      console.log("\n✅ Refresh token obtido!");
      console.log(`Token: ${newRefreshToken.substring(0, 30)}...`);
      saveToken(newRefreshToken);
    });

    const devices = await ringApi.getCameras();
    console.log(`\n📹 ${devices.length} câmera(s) encontrada(s):`);
    for (const cam of devices) {
      console.log(`  - ${cam.name} (${cam.deviceType})`);
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    if (error.message?.includes("Verification Code")) {
      const code = await ask(
        "\n📧 Código 2FA enviado! Digite o código recebido: "
      );

      try {
        const ringApi = new RingApi({
          email: EMAIL,
          password: PASSWORD,
          twofactorCode: code.trim(),
        });

        ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
          console.log("\n✅ Refresh token obtido!");
          saveToken(newRefreshToken);
        });

        const devices = await ringApi.getCameras();
        console.log(`\n📹 ${devices.length} câmera(s) encontrada(s):`);
        for (const cam of devices) {
          console.log(`  - ${cam.name} (${cam.deviceType})`);
        }
      } catch (e) {
        console.error("Erro:", e.message);
      }
    } else {
      console.error("Erro:", error.message);
    }

    rl.close();
    process.exit(0);
  }
}

main();
