import { IJWTPayload, IPlatform } from "./types"
import { sign } from "jsonwebtoken"
import sha256 from "sha256";

interface ISignAccessToken {
  email: string;
  user_id: number;
  system_id: number;
  client_secret: string;
  refresh_token: string;
  os: IPlatform;
}

export function signAccessToken({
  email,
  user_id,
  system_id,
  client_secret,
  refresh_token,
  os,
}: ISignAccessToken, options: { admin: boolean }) {

  const authentic_key = (options.admin
    ? process.env.ADMIN_AUTHENTIC_KEY
    : ['ios', 'android'].includes(os)
      ? process.env.MOBILE_AUTHENTIC_KEY
      : process.env.AUTHENTIC_KEY) || ''

  const data: IJWTPayload = {
    email: email,
    user_id: user_id,
    system_id: system_id,
    s: sha256(client_secret + authentic_key + refresh_token)
  }

  return sign(
    data,
    authentic_key,
    {
      algorithm: 'HS256',
      expiresIn: ['ios', 'android'].includes(os) ? '9999y' : '1h'
    }
  )
}
