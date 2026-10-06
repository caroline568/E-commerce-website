import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_COST = 16_384;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELIZATION = 1;
const PASSWORD_KEY_LENGTH = 64;
const SESSION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_COST,
    r: PASSWORD_BLOCK_SIZE,
    p: PASSWORD_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${PASSWORD_COST}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password, encodedHash) {
  const [algorithm, cost, saltHex, keyHex] = encodedHash.split("$");
  if (algorithm !== "scrypt" || Number(cost) !== PASSWORD_COST) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  if (salt.length !== 16 || expectedKey.length !== PASSWORD_KEY_LENGTH) {
    return false;
  }

  const actualKey = await scrypt(password, salt, expectedKey.length, {
    N: PASSWORD_COST,
    r: PASSWORD_BLOCK_SIZE,
    p: PASSWORD_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(actualKey, expectedKey);
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest();
}

export function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_LIFETIME_MS);
}

export const sessionLifetimeSeconds = SESSION_LIFETIME_MS / 1000;

export function readSessionCookie(cookieHeader, cookieName) {
  const item = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`));
  return item ? item.slice(cookieName.length + 1) : null;
}
