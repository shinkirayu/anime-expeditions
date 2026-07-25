import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails
} from 'amazon-cognito-identity-js'
import {
  getSettings,
  getStoredToken,
  getPassword,
  setTokenAuth,
  setPasswordAuth
} from '../settings'
import type { Settings } from './types'

/**
 * Two ways to obtain an Eldorado IdToken:
 *  - token mode:    the user pastes an IdToken copied from a normal browser
 *                   session (works with Google login; expires ~hourly).
 *  - password mode: headless AWS Cognito SRP sign-in (no browser, no Cloudflare).
 *
 * Cognito constants are from Eldorado's public API docs (seller bot app).
 */
const POOL_ID = 'us-east-2_MlnzCFgHk'
const CLIENT_ID = '1956req5ro9drdtbf5i6kis4la'

const userPool = new CognitoUserPool({ UserPoolId: POOL_ID, ClientId: CLIENT_ID })

interface JwtClaims {
  exp?: number
  email?: string
  token_use?: string
  'cognito:username'?: string
}

/** Decodes a JWT payload without verifying (only to read exp/email). */
export function parseJwt(jwt: string): JwtClaims | null {
  const parts = jwt.trim().split('.')
  if (parts.length !== 3) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')) as JwtClaims
  } catch {
    return null
  }
}

// ---- password-mode SRP cache ----
interface CachedToken {
  idToken: string
  expiresAt: number
  email: string
}
let cache: CachedToken | null = null

function srpSignIn(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool })
    const details = new AuthenticationDetails({ Username: email, Password: password })
    user.setAuthenticationFlowType('USER_SRP_AUTH')
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session.getIdToken().getJwtToken()),
      onFailure: (err) => reject(new Error(err?.message || 'Authentication failed.')),
      newPasswordRequired: () =>
        reject(new Error('This account requires a password change before it can be used.'))
    })
  })
}

/** Validates and stores a pasted IdToken (token mode). Returns updated settings. */
export function saveToken(rawToken: string): Settings {
  const token = rawToken.trim().replace(/^Bearer\s+/i, '')
  const claims = parseJwt(token)
  if (!claims) throw new Error('That does not look like a valid token (expected a JWT).')
  if (!claims.exp) throw new Error('Token has no expiry claim; it may be the wrong value.')
  const now = Math.floor(Date.now() / 1000)
  if (claims.exp <= now) throw new Error('That token has already expired. Copy a fresh one.')
  const email = claims.email || claims['cognito:username'] || ''
  return setTokenAuth(token, email, claims.exp)
}

/** Stores email + password and verifies them with one SRP sign-in (password mode). */
export async function savePassword(email: string, password: string): Promise<Settings> {
  if (!email.trim() || !password) throw new Error('Email and password are required.')
  const idToken = await srpSignIn(email.trim(), password) // throws on bad credentials
  const claims = parseJwt(idToken)
  cache = { idToken, expiresAt: claims?.exp ?? 0, email: email.trim() }
  return setPasswordAuth(email, password)
}

/** Returns a valid IdToken for the active auth mode, or throws with guidance. */
export async function getIdToken(): Promise<string> {
  const settings = getSettings()
  const now = Math.floor(Date.now() / 1000)

  if (settings.authMode === 'token') {
    const token = getStoredToken()
    const claims = token ? parseJwt(token) : null
    if (!token || !claims?.exp) throw new Error('No session token set. Paste one in Settings.')
    if (claims.exp - 30 <= now)
      throw new Error('Your session token has expired. Paste a fresh one in Settings.')
    return token
  }

  // password mode
  if (cache && cache.email === settings.email && cache.expiresAt - 60 > now) return cache.idToken
  const password = getPassword()
  if (!settings.email || !password) throw new Error('No credentials set. Add them in Settings.')
  const idToken = await srpSignIn(settings.email, password)
  cache = { idToken, expiresAt: parseJwt(idToken)?.exp ?? 0, email: settings.email }
  return idToken
}

export function clearTokenCache(): void {
  cache = null
}
