// Uses the Ring REST API directly to get refresh token
import https from "https";

const EMAIL = "luquinhas@icloud.com";
const PASSWORD = "Luc@s123!";
const CODE_2FA = process.argv[2] || "";

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

  // Remove undefined headers
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

    // Save to .env.local
    const fs = await import("fs");
    const envPath = ".env.local";
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("RING_REFRESH_TOKEN=")) {
      envContent = envContent.replace(
        /RING_REFRESH_TOKEN=.*/,
        `RING_REFRESH_TOKEN=${result.data.refresh_token}`
      );
    } else {
      envContent += `\n# Ring\nRING_REFRESH_TOKEN=${result.data.refresh_token}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Salvo no .env.local");
  } else if (result.status === 412) {
    console.log("\n📧 Código 2FA enviado para seu email/telefone!");
    console.log("Rode novamente com: node scripts/setup-ring-2fa.mjs <CODIGO>");
  } else {
    console.log("\nResposta:", JSON.stringify(result.data, null, 2));
  }
}

main().catch(console.error);
