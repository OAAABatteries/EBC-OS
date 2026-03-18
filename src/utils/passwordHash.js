import bcrypt from "bcryptjs";

const COST = 10;
const legacyHash = (str) => btoa(encodeURIComponent(str));

export function isBcryptHash(hash) {
  return typeof hash === "string" && hash.startsWith("$2");
}

export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, COST);
}

export function hashPasswordSync(plaintext) {
  return bcrypt.hashSync(plaintext, COST);
}

/** Verify password against stored hash (bcrypt or legacy Base64). */
export async function verifyPassword(plaintext, storedHash) {
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(plaintext, storedHash);
  }
  return legacyHash(plaintext) === storedHash;
}

/**
 * Verify and auto-migrate legacy Base64 hashes to bcrypt.
 * Returns { match: boolean, newHash: string|null }
 * If newHash is non-null, caller should persist it.
 */
export async function verifyAndMigrate(plaintext, storedHash) {
  if (isBcryptHash(storedHash)) {
    return { match: await bcrypt.compare(plaintext, storedHash), newHash: null };
  }
  // Legacy Base64
  const match = legacyHash(plaintext) === storedHash;
  if (match) {
    return { match: true, newHash: await bcrypt.hash(plaintext, COST) };
  }
  return { match: false, newHash: null };
}
