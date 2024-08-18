export function createRefreshToken(refresh_token?: string) {
  if (!refresh_token) {
    return require('crypto').randomBytes(48).toString('hex') as string;
  }

  return refresh_token
}