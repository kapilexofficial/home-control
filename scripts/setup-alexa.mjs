// Alexa authentication setup
// Uses alexa-remote2 to get cookie/token
import Alexa from "alexa-remote2";
import fs from "fs";
import path from "path";

const COOKIE_FILE = path.join(process.cwd(), "alexa-cookie.json");

const alexa = new Alexa();

const config = {
  acceptLanguage: "pt-BR",
  amazonPage: "amazon.com",
  alexaServiceHost: "alexa.amazon.com",
  cookie: fs.existsSync(COOKIE_FILE)
    ? JSON.parse(fs.readFileSync(COOKIE_FILE, "utf-8")).cookie
    : undefined,
  proxyOwnIp: "localhost",
  proxyPort: 3456,
  proxyLogLevel: "warn",
};

console.log("=== Alexa Setup ===\n");

if (config.cookie) {
  console.log("Cookie salvo encontrado, tentando reutilizar...\n");
}

alexa.init(config, (err) => {
  if (err) {
    if (err.message?.includes("proxy")) {
      console.log("\n🌐 Abra no navegador: http://localhost:3456");
      console.log("Faça login com sua conta Amazon e depois volte aqui.\n");
      console.log("Esperando login...");
      return;
    }
    console.error("Erro:", err.message);
    return;
  }

  console.log("✅ Alexa autenticado!\n");

  // Save cookie
  const cookieData = alexa.cookieData;
  if (cookieData) {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookieData, null, 2));
    console.log("✅ Cookie salvo em alexa-cookie.json\n");
  }

  // List devices
  alexa.getDevices((err, devices) => {
    if (err) {
      console.error("Erro ao listar:", err.message);
      process.exit(1);
    }

    console.log(`📱 ${devices.length} dispositivo(s) Alexa:\n`);
    for (const d of devices) {
      const family = d.deviceFamily || "";
      const type = d.deviceType || "";
      console.log(
        `  ${d.accountName?.padEnd(35)} | ${family.padEnd(15)} | ${type}`
      );
    }

    process.exit(0);
  });
});
