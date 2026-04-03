import { RingApi } from "ring-client-api";
import * as readline from "readline";
import * as fs from "fs";

const EMAIL = "luquinhas@icloud.com";
const PASSWORD = "Luc@s123!";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("=== Ring Setup ===");
  console.log("Isso vai enviar um código 2FA para seu email/telefone.\n");

  try {
    const ringApi = new RingApi({
      email: EMAIL,
      password: PASSWORD,
      // This will trigger 2FA
    });

    ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
      console.log("\n✅ Refresh token obtido!");
      console.log(`Token: ${newRefreshToken.substring(0, 30)}...`);

      // Save to .env.local
      const envPath = ".env.local";
      let envContent = fs.readFileSync(envPath, "utf-8");
      if (envContent.includes("RING_REFRESH_TOKEN=")) {
        envContent = envContent.replace(
          /RING_REFRESH_TOKEN=.*/,
          `RING_REFRESH_TOKEN=${newRefreshToken}`
        );
      } else {
        envContent += `\nRING_REFRESH_TOKEN=${newRefreshToken}\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Token salvo no .env.local");
    });

    // Get devices to trigger auth
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

          const envPath = ".env.local";
          let envContent = fs.readFileSync(envPath, "utf-8");
          if (envContent.includes("RING_REFRESH_TOKEN=")) {
            envContent = envContent.replace(
              /RING_REFRESH_TOKEN=.*/,
              `RING_REFRESH_TOKEN=${newRefreshToken}`
            );
          } else {
            envContent += `\nRING_REFRESH_TOKEN=${newRefreshToken}\n`;
          }
          fs.writeFileSync(envPath, envContent);
          console.log("✅ Token salvo no .env.local");
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
