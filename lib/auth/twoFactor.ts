import { decrypt, encrypt } from "@/lib/encryption";
import User, { IUser } from "@/models/User";
import { AuthError } from "./errors";
import { buildOtpauthUri, generateTotpSecret, verifyTotp } from "./totp";
import { generateSecureToken, hashToken, safeEqual } from "./utils";

export const RECOVERY_CODE_COUNT = 10;

/** Format a raw 16-char hex recovery code into UPPER-XXXX-XXXX-XXXX-XXXX. */
export function formatRecoveryCode(raw: string): string {
  const upper = raw.toUpperCase();
  return `${upper.slice(0, 4)}-${upper.slice(4, 8)}-${upper.slice(8, 12)}-${upper.slice(12, 16)}`;
}

/** Canonical form used for hashing/verification (no separators). */
function canonicalizeCode(input: string): string {
  return input.replace(/[- ]/g, "").toUpperCase();
}

/**
 * Generate recovery codes. Each 16-hex-char code carries 64 bits of entropy
 * and is stored only as a SHA-256 digest.
 */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): {
  codes: string[];
  hashes: { hash: string }[];
} {
  const codes: string[] = [];
  const hashes: { hash: string }[] = [];
  for (let i = 0; i < count; i++) {
    const raw = generateSecureToken(8, "hex");
    const formatted = formatRecoveryCode(raw);
    codes.push(formatted);
    hashes.push({ hash: hashToken(canonicalizeCode(formatted)) });
  }
  return { codes, hashes };
}

export function isTwoFactorEnabled(user: Pick<IUser, "twoFactor">): boolean {
  return Boolean(user.twoFactor?.enabled && user.twoFactor?.secret);
}

export interface TwoFactorSetupResult {
  secret: string;
  otpauthUri: string;
  recoveryCodes: string[];
}

/** Step 1: generate a TOTP secret + recovery codes and persist (unconfirmed). */
export async function startTwoFactorSetup(user: IUser): Promise<TwoFactorSetupResult> {
  if (isTwoFactorEnabled(user)) {
    throw new AuthError(
      "Two-factor authentication is already enabled.",
      "2fa_already_enabled",
      400
    );
  }

  const secret = generateTotpSecret(20);
  const otpauthUri = buildOtpauthUri({
    secret,
    accountName: user.email ?? user._id.toString(),
    issuer: "Sendlib",
  });
  const { codes, hashes } = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  const now = new Date();

  user.twoFactor = {
    enabled: false,
    pendingSecret: encrypt(secret),
    pendingRecoveryCodes: hashes,
    createdAt: now,
    updatedAt: now,
  };
  await user.save();

  return { secret, otpauthUri, recoveryCodes: codes };
}

/** Step 2: confirm a valid authenticator code; persist secret + recovery codes. */
export async function confirmTwoFactorSetup(user: IUser, code: string): Promise<void> {
  const pendingSecret = user.twoFactor?.pendingSecret;
  if (!pendingSecret) {
    throw new AuthError(
      "No pending 2FA setup found. Start setup again.",
      "2fa_no_pending_setup",
      400
    );
  }

  const secret = decrypt(pendingSecret);
  if (!verifyTotp(secret, code)) {
    throw new AuthError("The code is invalid or has expired.", "invalid_2fa_code", 400);
  }

  user.twoFactor = {
    ...user.twoFactor,
    enabled: true,
    secret: pendingSecret,
    recoveryCodes: user.twoFactor?.pendingRecoveryCodes ?? [],
    pendingSecret: undefined,
    pendingRecoveryCodes: [],
    createdAt: user.twoFactor?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };
  await user.save();
  void secret; // the decrypted secret was only needed transiently
}

/** Verify a TOTP code against the enabled secret. */
export function verifyTwoFactorTotp(user: Pick<IUser, "twoFactor">, code: string): boolean {
  if (!user.twoFactor?.secret) return false;
  const secret = decrypt(user.twoFactor.secret);
  return verifyTotp(secret, code);
}

/**
 * Verify a recovery code. Returns true and marks the code used on success;
 * reused codes (already usedAt) are rejected.
 */
export async function verifyRecoveryCode(user: IUser, code: string): Promise<boolean> {
  const codes = user.twoFactor?.recoveryCodes;
  if (!codes || codes.length === 0) return false;

  const canonical = canonicalizeCode(code);
  const candidateHash = hashToken(canonical);

  for (const entry of codes) {
    if (!safeEqual(entry.hash, candidateHash)) continue;
    if (entry.usedAt) return false; // replay protection: single-use
    const usedAt = new Date();
    const result = await User.updateOne(
      {
        _id: user._id,
        "twoFactor.recoveryCodes": {
          $elemMatch: { hash: candidateHash, usedAt: { $exists: false } },
        },
      },
      { $set: { "twoFactor.recoveryCodes.$.usedAt": usedAt } }
    );
    if (result.modifiedCount !== 1) return false;
    entry.usedAt = usedAt;
    return true;
  }
  return false;
}

/** Combined TOTP-or-recovery verification used during 2FA login. */
export async function verifyTwoFactorLogin(
  user: IUser,
  code: string
): Promise<{ ok: true; method: "totp" | "recovery" } | { ok: false }> {
  if (verifyTwoFactorTotp(user, code)) return { ok: true, method: "totp" };
  const usedRecovery = await verifyRecoveryCode(user, code);
  if (usedRecovery) return { ok: true, method: "recovery" };
  return { ok: false };
}

/** Clear all 2FA state. Caller is responsible for re-auth checks. */
export async function disableTwoFactor(user: IUser): Promise<void> {
  user.twoFactor = undefined;
  await user.save();
  void User;
}
