import { randomBytes } from 'node:crypto'

export function newToken(): string {
  return randomBytes(12).toString('base64url')
}
