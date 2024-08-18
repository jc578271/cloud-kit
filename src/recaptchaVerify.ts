import axios from "axios";

export async function recaptchaVerify({ response, version = 3 }: { response: string, version: 2 | 3 }) {
  const secretKey = version === 3
    ? process.env.RECAPTCHA_V3_SECRET_KEY
    : process.env.RECAPTCHA_V2_SECRET_KEY

  const { data } = await axios.post<string>(
    'https://www.google.com/recaptcha/api/siteverify?'
    + `secret=${secretKey}&response=${response}`,
    undefined,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  )

  return data
}