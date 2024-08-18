import { IJWTPayload } from "./types";
import { JwtPayload, verify } from "jsonwebtoken";
import sha256 from "sha256";
import { signAccessToken } from "./signAccessToken";
import { getNow } from "./time";
import { IPlatform } from "./types";
import { createRefreshToken } from "./createRefreshToken";

interface IParams {
  access_token: string,
  client_key: string,
  client_secret: string,
  os: IPlatform,
  refresh_token: string
  system_expired_at?: number;
}

export interface IVerifiedData extends IJWTPayload {
  newAccessToken?: string;
  newRefreshToken?: string;
}

export function verifyAccessToken(params: IParams) {
  return verifyTool(params, { isAdmin: false })
}

export  function verifyAdminAccessToken(params: IParams) {
  return verifyTool(params, { isAdmin: true })
}

export function verifyAccessTokenIgnoreSystem(params: IParams) {
  return verifyTool(params, { isAdmin: false, ignoreSystem: true })
}

function verifyTool(params: {
  access_token: string,
  client_key: string,
  client_secret: string,
  os: IPlatform,
  refresh_token: string
  system_expired_at?: number;
},
  options?: {
    isAdmin?: boolean;
    refreshToken?: boolean;
    ignoreSystem?: boolean;
  }
): IVerifiedData {
  const { access_token, client_key, refresh_token, client_secret, os, system_expired_at } = params
  if (!access_token) throw new Error('invalid_access_token');
  if (!client_key) throw new Error('invalid_client_key');

  const isAdmin = options?.isAdmin;
  const ignoreSystem = options?.ignoreSystem;

  const authentic_key = (isAdmin
    ? process.env.ADMIN_AUTHENTIC_KEY
    : ['ios', 'android'].includes(os)
      ? process.env.MOBILE_AUTHENTIC_KEY
      : process.env.AUTHENTIC_KEY) || ''

  const payload = verify(access_token, authentic_key, {
    ignoreExpiration: !!refresh_token
  }) as JwtPayload & IJWTPayload;

  if (!payload.email) throw new Error('invalid_access_token');

  if (!options?.refreshToken && payload.exp) {
    const now = Math.round(new Date().valueOf() / 1000);
    if (now > payload.exp) {
      throw new Error('expired_access_token')
    }
  }

  /** compare sha256 keys */
  const providerAuthKey = sha256(client_secret + authentic_key + refresh_token);
  const payloadAuthKey = payload.s;

  if (providerAuthKey !== payloadAuthKey)
    throw new Error('invalid_access_token')

  /** refresh access token */
  let newAccessToken
  let newRefreshToken
  if (options?.refreshToken && refresh_token) {
    newRefreshToken = createRefreshToken();
    newAccessToken = signAccessToken({
      email: payload.email,
      user_id: payload.user_id,
      system_id: payload.system_id,
      client_secret,
      os,
      refresh_token: newRefreshToken
    }, { admin: !!isAdmin })
  }

  if (!payload.user_id) throw new Error('invalid_access_token');

  if (!isAdmin) {
    if (!ignoreSystem && !payload.system_id) throw new Error('invalid_system');

    if (!ignoreSystem &&
      system_expired_at &&
      system_expired_at < getNow()) throw new Error('system_expired');

    return { newAccessToken, newRefreshToken, ...payload }
  }

  return { newAccessToken, newRefreshToken, ...payload }
}

