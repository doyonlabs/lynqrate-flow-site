import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET!);
const ALG = 'HS256';

export async function issueSession(passId: string, maxAgeSec = 60*60*24*30) {
  const iat = Math.floor(Date.now()/1000);
  return await new SignJWT({ scope:'pass', pass_id: passId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(iat)
    .setExpirationTime(iat + maxAgeSec)
    .sign(secret);
}

export async function verifySession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    if (payload.scope !== 'pass' || typeof payload.pass_id !== 'string') return null;
    return { passId: payload.pass_id as string };
  } catch { return null; }
}