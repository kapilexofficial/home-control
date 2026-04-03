import crypto from "crypto";

const CLIENT_ID = "3rwnprpfqhdfjtdm5jsf";
const CLIENT_SECRET = "17751a903871459489f5f0ba1b089d43";
const ENDPOINT = "https://openapi.tuyaus.com";

function generateSign(clientId, secret, timestamp, nonce, method, path, accessToken = "", body = "") {
  const contentHash = crypto.createHash("sha256").update(body).digest("hex");
  const stringToSign = [method, contentHash, "", path].join("\n");
  const signStr = clientId + accessToken + timestamp + nonce + stringToSign;
  return crypto.createHmac("sha256", secret).update(signStr).digest("hex").toUpperCase();
}

async function request(method, path, accessToken, body = "") {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const sign = generateSign(CLIENT_ID, CLIENT_SECRET, timestamp, nonce, method, path, accessToken, body);

  const headers = {
    client_id: CLIENT_ID,
    sign,
    t: timestamp,
    sign_method: "HMAC-SHA256",
    nonce,
  };
  if (accessToken) headers.access_token = accessToken;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    body: body || undefined,
  });
  return res.json();
}

async function main() {
  console.log("Testing Tuya API connection...\n");

  // Get token
  const tokenRes = await request("GET", "/v1.0/token?grant_type=1", "");
  if (!tokenRes.success) {
    console.error("Token failed:", tokenRes);
    return;
  }
  const token = tokenRes.result.access_token;
  const uid = tokenRes.result.uid;
  console.log(`UID: ${uid}`);
  console.log(`Token OK\n`);

  // Try multiple device listing endpoints
  console.log("=== Try 1: /v1.0/users/{uid}/devices ===");
  const r1 = await request("GET", `/v1.0/users/${uid}/devices`, token);
  console.log(JSON.stringify(r1, null, 2));

  console.log("\n=== Try 2: /v1.0/iot-01/associated-users/devices ===");
  const r2 = await request("GET", `/v1.0/iot-01/associated-users/devices?last_row_key=`, token);
  console.log(JSON.stringify(r2, null, 2));

  console.log("\n=== Try 3: /v2.0/cloud/thing/device ===");
  const r3 = await request("GET", `/v2.0/cloud/thing/device?page_size=20`, token);
  console.log(JSON.stringify(r3, null, 2));

  console.log("\n=== Try 4: /v1.0/iot-03/devices (Smart Home) ===");
  const r4 = await request("GET", `/v1.0/iot-03/devices?source_type=tuyaUser&source_id=${uid}`, token);
  console.log(JSON.stringify(r4, null, 2));
}

main().catch(console.error);
