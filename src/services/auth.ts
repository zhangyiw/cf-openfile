import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../types/env'
import { getEnvVar } from '../utils/response'

export interface SessionPayload {
  roomKey: string
}

async function getSecret(env: Env): Promise<Uint8Array> {
  const secret = getEnvVar(env, 'SESSION_SECRET')
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(
  env: Env,
  payload: SessionPayload,
  ttlSeconds: number
): Promise<string> {
  const secret = await getSecret(env)
  return new SignJWT({ roomKey: payload.roomKey })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret)
}

export async function verifySessionToken(
  env: Env,
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = await getSecret(env)
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    const roomKey = payload.roomKey
    if (typeof roomKey !== 'string') {
      return null
    }
    return { roomKey }
  } catch {
    return null
  }
}
