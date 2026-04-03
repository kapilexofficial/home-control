// HubSpace OAuth2 PKCE setup - run ONCE to get refresh token
import crypto from "crypto";
import fs from "fs";

const USERNAME = "luquinhas@icloud.com";
const PASSWORD = "Desio123";

// OAuth2 PKCE helpers
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}
function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

async function main() {
  console.log("=== HubSpace OAuth2 PKCE Setup ===\n");

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Step 1: Get authorization code
  console.log("Step 1: Autenticando com PKCE...");

  const authRes = await fetch("https://accounts.hubspaceconnect.com/auth/realms/thd/protocol/openid-connect/auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      response_type: "code",
      client_id: "hubspace_android",
      redirect_uri: "hubspace-app://loginredirect",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "openid offline_access",
      username: USERNAME,
      password: PASSWORD,
    }),
    redirect: "manual",
  });

  // Check if we got a redirect with code
  const location = authRes.headers.get("location");

  if (!location) {
    // Try direct token approach with offline_access scope
    console.log("Tentando abordagem direta com refresh token...\n");

    const tokenRes = await fetch("https://accounts.hubspaceconnect.com/auth/realms/thd/protocol/openid-connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "hubspace_android",
        username: USERNAME,
        password: PASSWORD,
        scope: "openid offline_access",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.refresh_token) {
      console.log("✅ Refresh token obtido!");
      console.log(`Access token: ${tokenData.access_token?.substring(0, 30)}...`);
      console.log(`Refresh token: ${tokenData.refresh_token.substring(0, 30)}...`);
      console.log(`Expires in: ${tokenData.expires_in}s\n`);

      // Save to .env.local
      const envPath = ".env.local";
      let envContent = fs.readFileSync(envPath, "utf-8");

      // Update or add HUBSPACE_REFRESH_TOKEN
      if (envContent.includes("HUBSPACE_REFRESH_TOKEN=")) {
        envContent = envContent.replace(/HUBSPACE_REFRESH_TOKEN=.*/, `HUBSPACE_REFRESH_TOKEN=${tokenData.refresh_token}`);
      } else {
        envContent += `\n# HubSpace (refresh token - sem flood de email)\nHUBSPACE_REFRESH_TOKEN=${tokenData.refresh_token}\nHUBSPACE_ACCOUNT_ID=a148ce4d-3bb8-4aeb-ac78-cf2979e0fd05\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Salvo no .env.local");

      // Test: list devices
      console.log("\nTestando listagem de dispositivos...");
      const devRes = await fetch("https://api2.afero.net/v1/accounts/a148ce4d-3bb8-4aeb-ac78-cf2979e0fd05/devices?expansions=state", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const devices = await devRes.json();
      if (Array.isArray(devices)) {
        console.log(`\n📱 ${devices.length} dispositivo(s):`);
        for (const d of devices) {
          const name = d.friendlyName || "(sem nome)";
          const connected = d.deviceState?.connected ? "online" : "offline";
          console.log(`  - ${name} | ${connected}`);
        }
      }
    } else {
      console.log("Resposta:", JSON.stringify(tokenData, null, 2));
    }
    return;
  }

  // Extract code from redirect URL
  const code = new URL(location).searchParams.get("code");
  if (!code) {
    console.error("Sem código na redirect URL:", location);
    return;
  }

  console.log("Step 2: Trocando código por tokens...");

  const tokenRes = await fetch("https://accounts.hubspaceconnect.com/auth/realms/thd/protocol/openid-connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "hubspace_android",
      code,
      redirect_uri: "hubspace-app://loginredirect",
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.refresh_token) {
    console.log("\n✅ Refresh token obtido!");
    const envPath = ".env.local";
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("HUBSPACE_REFRESH_TOKEN=")) {
      envContent = envContent.replace(/HUBSPACE_REFRESH_TOKEN=.*/, `HUBSPACE_REFRESH_TOKEN=${tokenData.refresh_token}`);
    } else {
      envContent += `\nHUBSPACE_REFRESH_TOKEN=${tokenData.refresh_token}\nHUBSPACE_ACCOUNT_ID=a148ce4d-3bb8-4aeb-ac78-cf2979e0fd05\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Salvo no .env.local");
  } else {
    console.log("Resposta:", JSON.stringify(tokenData, null, 2));
  }
}

main().catch(console.error);
