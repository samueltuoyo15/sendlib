import { connectDB } from "@/lib/db";
import { sendAuthEmail } from "@/lib/email/authEmail";
import { appBaseUrl } from "@/lib/email/templates";
import {
  buildPasswordChangedEmailHtml,
  buildPasswordResetEmailHtml,
  buildResendVerificationEmailHtml,
  buildTwoFactorDisabledEmailHtml,
  buildTwoFactorEnabledEmailHtml,
  buildVerifyEmailHtml,
  buildWelcomeEmailHtml,
  formatExpiryLabel,
} from "@/lib/email/templates.builders";
import User, { IUser } from "@/models/User";
import { AuthErrors } from "./errors";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  validateEmail,
  validatePassword,
  verifyPassword,
} from "./passwords";
import { recordSecurityEvent } from "./securityEvents";
import {
  MAX_TWO_FACTOR_ATTEMPTS,
  PENDING_SESSION_TTL_MS,
  activateSession,
  createSession,
  findSessionByToken,
  incrementTwoFactorFailure,
  revokeAllSessionsForUser,
  revokeSession,
} from "./sessions";
import {
  checkLoginThrottle,
  clearAttempts,
  clearLoginFailures,
  incrementAndCheckAttempt,
  recordLoginFailure,
} from "./throttle";
import {
  TOKEN_TTL_MS,
  consumeVerificationToken,
  consumeVerificationTokenAllForKind,
  createVerificationToken,
  findUserByEmail,
} from "./tokens";
import {
  confirmTwoFactorSetup as confirm2fa,
  disableTwoFactor as disable2fa,
  isTwoFactorEnabled,
  startTwoFactorSetup as start2fa,
  verifyTwoFactorLogin,
  verifyTwoFactorTotp,
} from "./twoFactor";
import { displayNameFromEmail, hashToken, normalizeEmail } from "./utils";

type DeviceInfo = { ip?: string; userAgent?: string };

export interface PublicUser {
  id: string;
  email: string | null;
  displayName: string;
  avatar: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  plan: "free" | "pro";
  subscriptionStatus?: string;
  createdAt: Date;
}

export function toPublicUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email ?? null,
    displayName: user.displayName,
    avatar: user.avatar ?? null,
    emailVerified: user.emailVerified,
    hasPassword: Boolean(user.passwordHash),
    twoFactorEnabled: isTwoFactorEnabled(user),
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    createdAt: user.createdAt,
  };
}

async function sendVerificationEmail(user: IUser, kind: "initial" | "resend"): Promise<boolean> {
  try {
    const rawToken = await createVerificationToken({
      userId: user._id.toString(),
      kind: "email_verification",
    });
    const url = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const label = formatExpiryLabel(TOKEN_TTL_MS.email_verification);
    await sendAuthEmail({
      to: user.email!,
      subject: kind === "resend" ? "Verify your email address" : "Confirm your Sendlib account",
      html:
        kind === "resend"
          ? buildResendVerificationEmailHtml(user.displayName, url, label)
          : buildVerifyEmailHtml(user.displayName, url, label),
      text: `Verify your email address at ${url}. This link expires in ${label}.`,
    });
    return true;
  } catch (err) {
    console.error("Verification email failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

export interface SignupInput extends DeviceInfo {
  email: string;
  password: string;
}

export interface SignupResult {
  user: PublicUser;
  sessionToken: string;
  verificationPending: boolean;
  verificationEmailSent: boolean;
}

export async function signup(input: SignupInput): Promise<SignupResult> {
  const emailResult = validateEmail(input.email);
  if (!emailResult.ok) throw AuthErrors.invalidInput(emailResult.error);
  const email = normalizeEmail(emailResult.value);

  const pwResult = validatePassword(input.password);
  if (!pwResult.ok) throw AuthErrors.weakPassword(pwResult.error);

  await connectDB();

  const existing = await findUserByEmail(email);
  if (existing) throw AuthErrors.emailAlreadyExists();

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    email,
    displayName: displayNameFromEmail(email),
    passwordHash,
    emailVerified: false,
    disabled: false,
  });

  const verificationEmailSent = await sendVerificationEmail(user, "initial");
  await sendAuthEmail({
    to: email,
    subject: `Welcome to Sendlib, ${user.displayName}!`,
    html: buildWelcomeEmailHtml(user.displayName),
    text: "Your Sendlib account is ready. Visit the dashboard to connect a Gmail account and create your first API key.",
  }).catch((err) => console.error("Welcome email failed:", err));

  const { token } = await createSession({
    userId: user._id.toString(),
    userAgent: input.userAgent,
    ip: input.ip,
    status: "active",
  });

  await recordSecurityEvent({ userId: user._id.toString(), type: "signup", ...input });
  if (verificationEmailSent) {
    await recordSecurityEvent({
      userId: user._id.toString(),
      type: "verification_email_sent",
      ...input,
    });
  }

  return {
    user: toPublicUser(user),
    sessionToken: token,
    verificationPending: true,
    verificationEmailSent,
  };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginInput extends DeviceInfo {
  email: string;
  password: string;
}

export interface LoginResult {
  needsTwoFactor: boolean;
  sessionToken: string | null;
  user: PublicUser | null;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const emailResult = validateEmail(input.email);
  if (!emailResult.ok) throw AuthErrors.invalidCredentials();
  const email = normalizeEmail(emailResult.value);

  await connectDB();

  const throttled = await checkLoginThrottle(email, input.ip ?? "unknown");
  if (throttled.blocked) throw AuthErrors.tooManyAttempts();

  const user = await findUserByEmail(email);
  if (!user) {
    await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
    await recordLoginFailure(email, input.ip ?? "unknown");
    throw AuthErrors.invalidCredentials();
  }

  if (!user.passwordHash) {
    await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
    await recordLoginFailure(email, input.ip ?? "unknown");
    throw AuthErrors.invalidCredentials();
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    await recordLoginFailure(email, input.ip ?? "unknown");
    throw AuthErrors.invalidCredentials();
  }
  await clearLoginFailures(email, input.ip ?? "unknown");

  if (user.disabled) throw AuthErrors.accountDisabled();

  if (isTwoFactorEnabled(user)) {
    const { token } = await createSession({
      userId: user._id.toString(),
      userAgent: input.userAgent,
      ip: input.ip,
      status: "pending",
      ttlMs: PENDING_SESSION_TTL_MS,
    });
    return { needsTwoFactor: true, sessionToken: token, user: null };
  }

  const { token } = await createSession({
    userId: user._id.toString(),
    userAgent: input.userAgent,
    ip: input.ip,
    status: "active",
  });
  await recordSecurityEvent({ userId: user._id.toString(), type: "login", ...input });

  return { needsTwoFactor: false, sessionToken: token, user: toPublicUser(user) };
}
// ---------------------------------------------------------------------------
// 2FA step of login
// ---------------------------------------------------------------------------

export interface CompleteTwoFactorInput extends DeviceInfo {
  sessionToken: string;
  code: string;
}

export async function completeTwoFactorLogin(
  input: CompleteTwoFactorInput
): Promise<{ user: PublicUser; sessionToken: string }> {
  await connectDB();

  const session = await findSessionByToken(input.sessionToken);
  const sessionUsable =
    session &&
    session.status === "pending" &&
    !session.revokedAt &&
    session.expiresAt.getTime() > Date.now();
  if (!sessionUsable) throw AuthErrors.invalidOrExpiredToken();

  const user = await User.findById(session?.userId);
  if (!user || user.disabled || !isTwoFactorEnabled(user)) throw AuthErrors.invalidCredentials();

  if (session?.failedTwoFactorAttempts >= MAX_TWO_FACTOR_ATTEMPTS) {
    await revokeSession(input.sessionToken);
    throw AuthErrors.tooManyAttempts();
  }

  const throttle = await incrementAndCheckAttempt(`2fa:${user._id.toString()}`, 10);
  if (throttle.blocked) throw AuthErrors.tooManyAttempts();

  const result = await verifyTwoFactorLogin(user, input.code);
  if (!result.ok) {
    await incrementTwoFactorFailure(session!);
    await recordSecurityEvent({
      userId: user._id.toString(),
      type: "two_factor_failed",
      ip: input.ip,
      userAgent: input.userAgent,
    });
    throw AuthErrors.invalidTwoFactorCode();
  }

  await activateSession(session!);
  await clearAttempts(`2fa:${user._id.toString()}`);
  await recordSecurityEvent({
    userId: user._id.toString(),
    type: result.method === "recovery" ? "login_recovery_code" : "login_2fa",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { user: toPublicUser(user), sessionToken: input.sessionToken };
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export interface VerifyEmailInput {
  token: string;
}

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function verifyEmail(input: VerifyEmailInput): Promise<VerifyEmailResult> {
  await connectDB();
  const result = await consumeVerificationToken(input.token, "email_verification");
  if (!result.ok) return { ok: false, reason: result.reason };

  await User.updateOne(
    { _id: result.userId },
    { emailVerified: true, emailVerifiedAt: new Date() }
  );
  // Any residual verification links for this user are dead now.
  await consumeVerificationTokenAllForKind(result.userId, "email_verification").catch(
    () => undefined
  );
  await recordSecurityEvent({ userId: result.userId, type: "email_verified" });
  return { ok: true };
}

export async function resendVerificationEmail(input: {
  userId: string;
  email: string;
  displayName: string;
}): Promise<{ emailSent: boolean }> {
  await connectDB();
  const user = await User.findById(input.userId);
  if (!user) throw AuthErrors.invalidOrExpiredToken();
  if (user.emailVerified) return { emailSent: false };
  const sent = await sendVerificationEmail(user, "resend");
  if (sent) {
    await recordSecurityEvent({
      userId: user._id.toString(),
      type: "verification_email_sent",
    });
  }
  return { emailSent: sent };
}
// ---------------------------------------------------------------------------
// Forgotten password
// ---------------------------------------------------------------------------

export interface ForgotPasswordInput extends DeviceInfo {
  email: string;
}

/** Always returns a generic outcome: never reveals whether an account exists. */
export async function requestPasswordReset(
  input: ForgotPasswordInput
): Promise<{ emailSent: boolean }> {
  const emailResult = validateEmail(input.email);
  if (!emailResult.ok) return { emailSent: false };
  const email = normalizeEmail(emailResult.value);

  await connectDB();
  const user = await findUserByEmail(email);
  if (!user) return { emailSent: false };

  try {
    const rawToken = await createVerificationToken({
      userId: user._id.toString(),
      kind: "password_reset",
    });
    const url = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const label = formatExpiryLabel(TOKEN_TTL_MS.password_reset);
    await sendAuthEmail({
      to: email,
      subject: "Reset your Sendlib password",
      html: buildPasswordResetEmailHtml(user.displayName, url, label),
      text: `Reset your password at ${url}. This link expires in ${label}.`,
    });
    await recordSecurityEvent({
      userId: user._id.toString(),
      type: "password_reset_requested",
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return { emailSent: true };
  } catch (err) {
    console.error("Password reset email failed:", err);
    return { emailSent: false };
  }
}

export async function resetPassword(
  input: {
    token: string;
    newPassword: string;
  } & DeviceInfo
): Promise<void> {
  const pwResult = validatePassword(input.newPassword);
  if (!pwResult.ok) throw AuthErrors.weakPassword(pwResult.error);

  await connectDB();
  const consumed = await consumeVerificationToken(input.token, "password_reset");
  if (!consumed.ok) throw AuthErrors.invalidOrExpiredToken();

  const user = await User.findById(consumed.userId);
  if (!user) throw AuthErrors.invalidOrExpiredToken();

  const sameAsOld = user.passwordHash
    ? await verifyPassword(user.passwordHash, input.newPassword)
    : false;
  if (sameAsOld)
    throw AuthErrors.invalidInput("New password must be different from the current one.");

  const passwordHash = await hashPassword(input.newPassword);
  user.passwordHash = passwordHash;
  user.disabled = false;
  await user.save();

  // A compromised session must not survive a password reset.
  await revokeAllSessionsForUser(user._id.toString());
  await consumeVerificationTokenAllForKind(user._id.toString(), "password_reset").catch(
    () => undefined
  );
  await recordSecurityEvent({
    userId: user._id.toString(),
    type: "password_reset",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await sendAuthEmail({
    to: user.email!,
    subject: "Your password was changed",
    html: buildPasswordChangedEmailHtml(),
    text: "Your Sendlib password was changed. If you didn't do this, reset it immediately.",
  }).catch((err) => console.error("Password changed notification email failed:", err));
}

// ---------------------------------------------------------------------------
// Password change (authenticated)
// ---------------------------------------------------------------------------

export async function changePassword(
  input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    code?: string;
    keepSessionToken?: string;
  } & DeviceInfo
): Promise<void> {
  const pwResult = validatePassword(input.newPassword);
  if (!pwResult.ok) throw AuthErrors.weakPassword(pwResult.error);

  await connectDB();
  const user = await User.findById(input.userId);
  if (!user) throw AuthErrors.invalidCredentials();
  if (!user.passwordHash) throw AuthErrors.noPasswordSet();

  const valid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!valid) throw AuthErrors.invalidCurrentPassword();

  if (isTwoFactorEnabled(user)) {
    if (!input.code) throw AuthErrors.invalidInput("Two-factor authentication code is required.");
    const valid2fa = await verifyTwoFactorLogin(user, input.code);
    if (!valid2fa.ok) throw AuthErrors.invalidTwoFactorCode();
  }

  const sameAsOld = await verifyPassword(user.passwordHash, input.newPassword);
  if (sameAsOld)
    throw AuthErrors.invalidInput("New password must be different from the current one.");

  const passwordHash = await hashPassword(input.newPassword);
  user.passwordHash = passwordHash;
  await user.save();

  // Keep the current session, kill everything else.
  await revokeAllSessionsForUser(user._id.toString(), input.keepSessionToken);
  await recordSecurityEvent({
    userId: user._id.toString(),
    type: "password_changed",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await sendAuthEmail({
    to: user.email!,
    subject: "Your password was changed",
    html: buildPasswordChangedEmailHtml(),
    text: "Your Sendlib password was changed. If you didn't do this, reset it immediately.",
  }).catch((err) => console.error("Password changed notification email failed:", err));
}
// ---------------------------------------------------------------------------
// Two-factor authentication management (authenticated)
// ---------------------------------------------------------------------------

export interface BeginTwoFactorInput extends DeviceInfo {
  userId: string;
}

export interface BeginTwoFactorResult {
  secret: string;
  otpauthUri: string;
  recoveryCodes: string[];
  expiresAt: Date;
}

const TWO_FACTOR_SETUP_TTL_MS = 15 * 60 * 1000;

export async function beginTwoFactorSetup(
  input: BeginTwoFactorInput
): Promise<BeginTwoFactorResult> {
  await connectDB();
  const user = await User.findById(input.userId);
  if (!user) throw AuthErrors.invalidCredentials();

  const result = await start2fa(user);
  await recordSecurityEvent({
    userId: user._id.toString(),
    type: "two_factor_setup_started",
    ip: input.ip,
    userAgent: input.userAgent,
  });
  return {
    ...result,
    expiresAt: new Date(Date.now() + TWO_FACTOR_SETUP_TTL_MS),
  };
}

export interface ConfirmTwoFactorInput extends DeviceInfo {
  userId: string;
  code: string;
}

export async function confirmTwoFactorSetup(input: ConfirmTwoFactorInput): Promise<PublicUser> {
  await connectDB();
  const user = await User.findById(input.userId);
  if (!user) throw AuthErrors.invalidCredentials();

  await confirm2fa(user, input.code);

  // Setup under way > 15 minutes is rejected by confirm2fa via token freshness
  // (the secret is the same; callers control the UI flow). Send notification.
  await recordSecurityEvent({
    userId: user._id.toString(),
    type: "two_factor_enabled",
    ip: input.ip,
    userAgent: input.userAgent,
  });
  await sendAuthEmail({
    to: user.email!,
    subject: "Two-factor authentication enabled",
    html: buildTwoFactorEnabledEmailHtml(),
    text: "Two-factor authentication is now active on your Sendlib account.",
  }).catch((err) => console.error("2FA enabled notification email failed:", err));

  return toPublicUser(user);
}

export interface DisableTwoFactorInput extends DeviceInfo {
  userId: string;
  /** Re-authentication: either the account password or a valid TOTP code. */
  password?: string;
  code?: string;
}

export async function disableTwoFactor(input: DisableTwoFactorInput): Promise<PublicUser> {
  await connectDB();
  const user = await User.findById(input.userId);
  if (!user) throw AuthErrors.invalidCredentials();
  if (!isTwoFactorEnabled(user)) throw AuthErrors.twoFactorNotEnabled();

  // Re-authentication is mandatory before removing a second factor.
  if (input.password) {
    if (!user.passwordHash) throw AuthErrors.noPasswordSet();
    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) throw AuthErrors.invalidCurrentPassword();
  } else if (typeof input.code === "string" && input.code.length > 0) {
    const valid = verifyTwoFactorTotp(user, input.code);
    if (!valid) throw AuthErrors.invalidTwoFactorCode();
  } else {
    throw AuthErrors.invalidInput(
      "Re-enter your password or provide a valid authenticator code to disable 2FA."
    );
  }

  await disable2fa(user);
  await recordSecurityEvent({
    userId: user._id.toString(),
    type: "two_factor_disabled",
    ip: input.ip,
    userAgent: input.userAgent,
  });
  await sendAuthEmail({
    to: user.email!,
    subject: "Two-factor authentication disabled",
    html: buildTwoFactorDisabledEmailHtml(),
    text: "Two-factor authentication is no longer active on your Sendlib account.",
  }).catch((err) => console.error("2FA disabled notification email failed:", err));

  return toPublicUser(user);
}
