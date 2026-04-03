import crypto from "crypto";

const TUYA_ENDPOINT = process.env.TUYA_ENDPOINT || "https://openapi.tuyaus.com";
const TUYA_CLIENT_ID = process.env.TUYA_CLIENT_ID || "";
const TUYA_CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || "";

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expireTime: number;
  obtainedAt: number;
}

class TuyaTokenManager {
  private tokenData: TokenData | null = null;

  private generateSign(timestamp: string, nonce: string, path: string): string {
    const contentHash = crypto
      .createHash("sha256")
      .update("")
      .digest("hex");

    const stringToSign = ["GET", contentHash, "", path].join("\n");
    const signStr = TUYA_CLIENT_ID + timestamp + nonce + stringToSign;

    return crypto
      .createHmac("sha256", TUYA_CLIENT_SECRET)
      .update(signStr)
      .digest("hex")
      .toUpperCase();
  }

  async getToken(): Promise<string> {
    if (this.tokenData && !this.isExpired()) {
      return this.tokenData.accessToken;
    }

    if (this.tokenData?.refreshToken) {
      try {
        return await this.refreshToken();
      } catch {
        // If refresh fails, get a new token
      }
    }

    return this.fetchNewToken();
  }

  private isExpired(): boolean {
    if (!this.tokenData) return true;
    const elapsed = Date.now() - this.tokenData.obtainedAt;
    // Refresh 5 minutes before expiry
    return elapsed >= (this.tokenData.expireTime - 300) * 1000;
  }

  private async fetchNewToken(): Promise<string> {
    const path = "/v1.0/token?grant_type=1";
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const sign = this.generateSign(timestamp, nonce, path);

    const response = await fetch(`${TUYA_ENDPOINT}${path}`, {
      method: "GET",
      headers: {
        client_id: TUYA_CLIENT_ID,
        sign,
        t: timestamp,
        sign_method: "HMAC-SHA256",
        nonce,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to get Tuya token: ${data.code} - ${data.msg}`);
    }

    this.tokenData = {
      accessToken: data.result.access_token,
      refreshToken: data.result.refresh_token,
      expireTime: data.result.expire_time,
      obtainedAt: Date.now(),
    };

    return this.tokenData.accessToken;
  }

  private async refreshToken(): Promise<string> {
    if (!this.tokenData) throw new Error("No token to refresh");

    const path = `/v1.0/token/${this.tokenData.refreshToken}`;
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const sign = this.generateSign(timestamp, nonce, path);

    const response = await fetch(`${TUYA_ENDPOINT}${path}`, {
      method: "GET",
      headers: {
        client_id: TUYA_CLIENT_ID,
        sign,
        t: timestamp,
        sign_method: "HMAC-SHA256",
        nonce,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to refresh Tuya token: ${data.code} - ${data.msg}`);
    }

    this.tokenData = {
      accessToken: data.result.access_token,
      refreshToken: data.result.refresh_token,
      expireTime: data.result.expire_time,
      obtainedAt: Date.now(),
    };

    return this.tokenData.accessToken;
  }
}

export const tuyaTokenManager = new TuyaTokenManager();
