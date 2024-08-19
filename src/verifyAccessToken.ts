import { IJWTPayload } from "./types";
import { JwtPayload, verify } from "jsonwebtoken";
import sha256 from "sha256";
import { signAccessToken } from "./signAccessToken";
import { getNow } from "./time";
import { IPlatform } from "./types";

interface IParams {
  access_token: string,
  client_key: string,
  client_secret: string,
  refresh_token?: string;
  os: IPlatform;
  getInfo: (payload: IJWTPayload) => Promise<{
    refresh_token: string
    system_expired_at?: number;
  }>
}

export interface IVerifiedData extends IJWTPayload {
  newAccessToken?: string;
}

export async function verifyAccessToken(params: IParams) {
  return verifyTool(params, { isAdmin: false })
}

export async function verifyAdminAccessToken(params: IParams) {
  return verifyTool(params, { isAdmin: true })
}

export async function verifyAccessTokenIgnoreSystem(params: IParams) {
  return verifyTool(params, { isAdmin: false, ignoreSystem: true })
}

async function verifyTool(
  params: IParams,
  options?: {
    isAdmin?: boolean;
    ignoreSystem?: boolean;
  }
): Promise<IVerifiedData> {
  const { access_token, client_key,  client_secret,  getInfo, refresh_token, os} = params
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

  const info = await getInfo(payload);

  if (!refresh_token && payload.exp) {
    const now = Math.round(new Date().valueOf() / 1000);
    if (now > payload.exp) {
      throw new Error('expired_access_token')
    }
  }

  /** compare sha256 keys */
  const providerAuthKey = sha256(client_secret + authentic_key + info.refresh_token);
  const payloadAuthKey = payload.s;

  if (providerAuthKey !== payloadAuthKey)
    throw new Error('invalid_access_token')

  /** refresh access token */
  let newAccessToken
  if (refresh_token) {
    if (info.refresh_token !== refresh_token)
      throw new Error('invalid_refresh_token')

    newAccessToken = signAccessToken({
      email: payload.email,
      user_id: payload.user_id,
      system_id: payload.system_id,
      client_secret,
      os,
      refresh_token,
    }, { admin: !!isAdmin })
  }

  if (!payload.user_id) throw new Error('invalid_access_token');

  if (!isAdmin) {
    if (!ignoreSystem && !payload.system_id) throw new Error('invalid_system');

    if (!ignoreSystem &&
      info.system_expired_at &&
      info.system_expired_at < getNow()) throw new Error('system_expired');

    return { newAccessToken, ...payload }
  }

  return { newAccessToken, ...payload }
}

