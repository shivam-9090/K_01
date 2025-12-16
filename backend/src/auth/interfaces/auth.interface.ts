export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isTwoFAEnabled: boolean;
  };
}

export interface TwoFAAuthResponse {
  token: string; // temporary token for 2FA verification
  requiresTwoFA: boolean;
}
