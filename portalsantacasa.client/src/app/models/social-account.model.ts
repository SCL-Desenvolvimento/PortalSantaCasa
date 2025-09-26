export interface SocialAccount {
  id: number;
  provider: string;
  accountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface AuthToken {
  id: number;
  provider: string;
  accountId: string;
  accountName?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAtUtc: Date;
  createdAtUtc: Date;
  lastRefreshedAtUtc?: Date;
  scopes?: string[];
  isActive: boolean;
  errorMessage?: string;
  refreshAttempts: number;
  providerMetadata?: any;
}
