export function createClientKey(params: {
  device_id: string,
  authentic: string,
  timestamp: string,
  os: 'android' | 'ios' | 'web';
},
  secret_authentic_key: string,) {
  const { device_id, authentic, timestamp, os } = params;
  const md5 = require("md5");
  const key = md5(device_id + "&" + os + "&" + timestamp + "&" + secret_authentic_key);

  const isValidAuthenticKey = key === authentic;
  /* check of timestamp is number */
  if (isNaN(parseInt(timestamp))) throw new Error('invalid_timestamp');

  if (isValidAuthenticKey) {
    const client_key = require('uuid').v4();
    const client_secret = require('crypto').randomBytes(48).toString('hex');
    const safeTimestamp = new Date(parseInt(timestamp) * 1000).valueOf() / 1000

    return {
      client_key,
      client_secret,
      device_id,
      os,
      since: safeTimestamp
    }
  }

  throw new Error('invalid_authentic_key');
}