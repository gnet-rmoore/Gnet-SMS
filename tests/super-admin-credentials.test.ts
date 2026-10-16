/**
 * Super Admin credential services (pure units: crypto, validation, capabilities).
 * Run: npm run test:super-admin-credentials
 */
import {
  CREDENTIAL_ENC_PREFIX,
  encryptCredentialSecret,
  decryptCredentialSecret,
  isEncryptedCredentialSecret,
} from "../services/identity/src/lib/credentialCrypto.ts";
import { credentialCreateSchema } from "../services/identity/src/validation/schemas.ts";
import {
  saHasCapability,
  capabilitiesForSaRole,
  assertSaCapability,
  SaCapabilityDeniedError,
  SA_PLATFORM_ROLES,
} from "../services/identity/src/domain/saCapabilities.ts";
import { createAssert } from "./helpers/assert.ts";

const { assert, summary } = createAssert();

// Deterministic key material: dev runs use the built-in dev key; production-mode
// runs (NODE_ENV=production) must still exercise crypto, so pin a test key when
// neither env key is present. getCredentialKey() reads env at call time.
if (
  process.env.NODE_ENV === "production" &&
  !process.env.CREDENTIAL_ENCRYPTION_KEY &&
  !process.env.MFA_ENCRYPTION_KEY
) {
  process.env.CREDENTIAL_ENCRYPTION_KEY = "dGVzdC1jcmVkZW50aWFsLWtleS0zMi1ieXRlcyEhISEhIQ==";
}

function assertThrows(fn: () => void, msg: string, check?: (err: unknown) => boolean) {
  try {
    fn();
    assert(false, msg);
  } catch (err) {
    assert(!check || check(err), msg);
  }
}

console.log("=========================================");
console.log(" SUPER ADMIN CREDENTIAL SERVICES");
console.log("=========================================\n");

// --- Encryption at rest -----------------------------------------------------
const secret = "sk_live_super_secret_value_1234567890";
const enc = encryptCredentialSecret(secret);
assert(isEncryptedCredentialSecret(enc), "encrypted value carries enc prefix");
assert(enc.startsWith(CREDENTIAL_ENC_PREFIX), "encrypted value uses versioned prefix");
assert(decryptCredentialSecret(enc) === secret, "encryption round-trips plaintext");
assert(enc !== encryptCredentialSecret(secret), "random IV yields distinct ciphertext");

assert(decryptCredentialSecret(null) === null, "null decrypt is null");
assert(decryptCredentialSecret(undefined) === null, "undefined decrypt is null");
assert(
  decryptCredentialSecret("legacy-plaintext") === "legacy-plaintext",
  "legacy plaintext passes through unchanged"
);
assert(
  !isEncryptedCredentialSecret("legacy-plaintext"),
  "legacy plaintext is not detected as encrypted"
);

// Tamper detection (AES-GCM auth tag).
const payload = Buffer.from(enc.slice(CREDENTIAL_ENC_PREFIX.length), "base64");
payload[payload.length - 1] ^= 0xff;
const tampered = CREDENTIAL_ENC_PREFIX + payload.toString("base64");
assertThrows(
  () => decryptCredentialSecret(tampered),
  "tampered ciphertext fails authentication"
);

// --- Key derivation paths ---------------------------------------------------
const savedEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY,
  MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY,
};

function restoreEnv() {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

// Explicit >=32-byte utf8 key is used verbatim (first 32 bytes). The trailing
// "!" fails the base64 charset check so the key is taken as utf8, not decoded.
delete process.env.MFA_ENCRYPTION_KEY;
process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef!";
const withExplicitKey = encryptCredentialSecret(secret);
assert(decryptCredentialSecret(withExplicitKey) === secret, "explicit 32-byte utf8 key round-trips");

// A digits-only 32-char key matches the base64 charset, is decoded to 24 bytes,
// and therefore falls through to SHA-256 derivation — still round-trips.
process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
const derivedFromBase64Charset = encryptCredentialSecret(secret);
assert(
  decryptCredentialSecret(derivedFromBase64Charset) === secret,
  "base64-charset short-after-decode key is derived and round-trips"
);

// Short key is SHA-256 derived.
process.env.CREDENTIAL_ENCRYPTION_KEY = "short";
const withShortKey = encryptCredentialSecret(secret);
assert(decryptCredentialSecret(withShortKey) === secret, "short key is derived and round-trips");

// Base64-encoded key is decoded before use.
process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const withBase64Key = encryptCredentialSecret(secret);
assert(decryptCredentialSecret(withBase64Key) === secret, "base64 key round-trips");

// Ciphertext from one key must not decrypt under another key.
process.env.CREDENTIAL_ENCRYPTION_KEY = "another-key";
assertThrows(
  () => decryptCredentialSecret(withExplicitKey),
  "wrong key fails GCM authentication"
);

// MFA_ENCRYPTION_KEY is honored as a fallback when the credential key is unset.
delete process.env.CREDENTIAL_ENCRYPTION_KEY;
process.env.MFA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef!";
const viaMfaFallback = encryptCredentialSecret(secret);
assert(decryptCredentialSecret(viaMfaFallback) === secret, "MFA_ENCRYPTION_KEY fallback works");

// Production refuses to encrypt with no configured key.
delete process.env.CREDENTIAL_ENCRYPTION_KEY;
delete process.env.MFA_ENCRYPTION_KEY;
process.env.NODE_ENV = "production";
assertThrows(
  () => encryptCredentialSecret(secret),
  "production without keys throws on encrypt",
  (err) => err instanceof Error && (err as Error).message.includes("CREDENTIAL_ENCRYPTION_KEY")
);
assertThrows(
  () => decryptCredentialSecret(withExplicitKey),
  "production without keys throws on decrypt of encrypted value"
);
assert(
  decryptCredentialSecret("legacy-plaintext") === "legacy-plaintext",
  "legacy plaintext passthrough needs no key in production"
);
restoreEnv();

// --- Input validation -------------------------------------------------------
const okParse = credentialCreateSchema.safeParse({
  name: "  Stripe prod  ",
  key: "  pk_live_123  ",
  provider: "STRIPE",
  secret: "sk_live_123",
});
assert(okParse.success, "valid credential payload parses");
assert(okParse.success && okParse.data.name === "Stripe prod", "name is trimmed");
assert(okParse.success && okParse.data.key === "pk_live_123", "key is trimmed");

assert(
  credentialCreateSchema.safeParse({ key: "k" }).success === false,
  "missing name is rejected"
);
assert(
  credentialCreateSchema.safeParse({ name: "n" }).success === false,
  "missing key is rejected"
);
assert(
  credentialCreateSchema.safeParse({ name: "   ", key: "k" }).success === false,
  "blank name is rejected"
);
assert(
  credentialCreateSchema.safeParse({ name: "n", key: "k" }).success,
  "secret and provider are optional"
);
assert(
  credentialCreateSchema.safeParse({ name: "n".repeat(121), key: "k" }).success === false,
  "over-long name is rejected"
);
assert(
  credentialCreateSchema.safeParse({ name: "n", key: "k", secret: "x".repeat(2001) }).success ===
    false,
  "over-long secret is rejected"
);

// --- Capability matrix ------------------------------------------------------
for (const role of SA_PLATFORM_ROLES) {
  assert(capabilitiesForSaRole(role).length > 0, `${role} has a capability set`);
}
assert(saHasCapability("OWNER", "credentials.manage"), "OWNER can manage credentials");
assert(!saHasCapability("SUPPORT", "credentials.manage"), "SUPPORT cannot manage credentials");
assert(!saHasCapability("BILLING", "credentials.manage"), "BILLING cannot manage credentials");
assert(!saHasCapability("ANALYST", "credentials.manage"), "ANALYST cannot manage credentials");

assert(saHasCapability("OWNER", "users.password_reset"), "OWNER can reset passwords");
assert(saHasCapability("SUPPORT", "users.password_reset"), "SUPPORT can reset passwords");
assert(!saHasCapability("BILLING", "users.password_reset"), "BILLING cannot reset passwords");
assert(!saHasCapability("ANALYST", "users.password_reset"), "ANALYST cannot reset passwords");

assert(saHasCapability("OWNER", "operators.manage"), "OWNER can manage operators");
assert(!saHasCapability("SUPPORT", "operators.manage"), "SUPPORT cannot manage operators");
assert(!saHasCapability("BILLING", "operators.manage"), "BILLING cannot manage operators");

assert(
  saHasCapability(null, "credentials.manage"),
  "unset platform role defaults to OWNER (full access)"
);

// settings.manage gates email-provider secrets + database maintenance.
assert(saHasCapability("OWNER", "settings.manage"), "OWNER can manage settings");
assert(!saHasCapability("SUPPORT", "settings.manage"), "SUPPORT cannot manage settings");
assert(!saHasCapability("BILLING", "settings.manage"), "BILLING cannot manage settings");
assert(!saHasCapability("ANALYST", "settings.manage"), "ANALYST cannot manage settings");

assertThrows(
  () => assertSaCapability("SUPPORT", "credentials.manage"),
  "SUPPORT denied credentials.manage",
  (err) => err instanceof SaCapabilityDeniedError && (err as SaCapabilityDeniedError).status === 403
);
assertThrows(
  () => assertSaCapability("BILLING", "users.password_reset"),
  "BILLING denied users.password_reset",
  (err) => err instanceof SaCapabilityDeniedError
);

summary("super-admin-credentials");
