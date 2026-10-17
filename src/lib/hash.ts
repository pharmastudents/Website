// Demo-only password hashing (salted SHA-256 via WebCrypto).
// In production this must be replaced by a server-side auth service
// (Lovable Cloud / Supabase) with bcrypt/argon2 hashing.
const SALT = "student-pharma-demo-salt";

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}
