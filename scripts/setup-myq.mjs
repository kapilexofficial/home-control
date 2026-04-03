/**
 * MyQ Refresh Token Setup
 *
 * Este script obtém o refresh token do MyQ usando o fluxo OAuth2 + PKCE,
 * emulando o comportamento do app oficial.
 *
 * Uso: node scripts/setup-myq.mjs
 */

import crypto from "node:crypto";
import http from "node:http";
import { URL } from "node:url";
import readline from "node:readline";

const MYQ_CLIENT_ID = "IOS_CGI_MYQ";
const MYQ_REDIRECT_URI = "com.myqops://ios";
const MYQ_AUTH_URL = "https://partner-identity.myq-cloud.com";
const MYQ_SCOPE = "MyQ_Residential offline_access";

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  console.log("=== MyQ Refresh Token Setup ===\n");

  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  // Step 1: Build the authorization URL
  const authUrl = new URL(`${MYQ_AUTH_URL}/connect/authorize`);
  authUrl.searchParams.set("client_id", MYQ_CLIENT_ID);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("redirect_uri", MYQ_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", MYQ_SCOPE);
  authUrl.searchParams.set("state", state);

  console.log("Abra este link no navegador e faça login com sua conta MyQ:\n");
  console.log(authUrl.toString());
  console.log("\nApós o login, o navegador vai redirecionar para uma página que não carrega.");
  console.log('Copie a URL completa da barra de endereço (começa com "com.myqops://ios?code=...").\n');

  const redirectUrl = await ask("Cole a URL de redirecionamento aqui: ");

  // Step 2: Extract the authorization code
  let code;
  try {
    // The redirect URL uses a custom scheme, so we parse it manually
    const urlStr = redirectUrl.replace("com.myqops://ios", "http://localhost");
    const parsed = new URL(urlStr);
    code = parsed.searchParams.get("code");
  } catch {
    console.error("URL inválida. Tente novamente.");
    process.exit(1);
  }

  if (!code) {
    console.error("Código de autorização não encontrado na URL.");
    process.exit(1);
  }

  console.log("\nCódigo obtido! Trocando por tokens...\n");

  // Step 3: Exchange code for tokens
  const tokenRes = await fetch(`${MYQ_AUTH_URL}/connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "myQ/290.0.56121 CFNetwork/3860.100.1 Darwin/25.0.0",
    },
    body: new URLSearchParams({
      client_id: MYQ_CLIENT_ID,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: MYQ_REDIRECT_URI,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Erro ao trocar código por token:", tokenRes.status, err);
    process.exit(1);
  }

  const tokens = await tokenRes.json();

  console.log("✅ Tokens obtidos com sucesso!\n");
  console.log("Refresh Token:");
  console.log(tokens.refresh_token);
  console.log("\nAdicione ao seu .env.local:");
  console.log(`MYQ_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log("\nEste refresh token será renovado automaticamente pelo dashboard.");
}

main().catch(console.error);
