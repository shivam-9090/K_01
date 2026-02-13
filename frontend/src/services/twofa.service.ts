import { api } from "./api";

export const twoFAService = {
  async generateSecret() {
    const response = await api.get("/2fa/generate");
    return response.data;
  },

  async enable2FA(secret: string, code: string, password: string) {
    const response = await api.post("/2fa/enable", { secret, code, password });
    return response.data;
  },

  async disable2FA(code: string, password: string) {
    const response = await api.post("/2fa/disable", { code, password });
    return response.data;
  },

  async verify2FALogin(token: string, code: string) {
    const response = await api.post("/2fa/verify-login", { token, code });
    return response.data;
  },

  async getStatus() {
    const response = await api.get("/2fa/status");
    return response.data;
  },

  async regenerateBackupCodes(code: string) {
    const response = await api.post("/2fa/regenerate-backup-codes", { code });
    return response.data;
  },
};
