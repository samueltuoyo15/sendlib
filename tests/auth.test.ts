import { clearAuthCookies, setAuthCookies, setPendingAuthCookies } from "@/lib/auth";
import { validateEmail, validatePassword } from "@/lib/auth/passwords";
import {
  formatRecoveryCode,
  generateRecoveryCodes,
  verifyRecoveryCode,
} from "@/lib/auth/twoFactor";
import { IUser } from "@/models/User";
import { hashToken } from "@/lib/auth/utils";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type RecoveryCodeTestUser = {
  twoFactor: {
    recoveryCodes: Array<{ hash: string; usedAt?: Date }>;
  };
  save: ReturnType<typeof vi.fn>;
};

describe("password validation", () => {
  it("accepts a strong password", () => {
    expect(validatePassword("CorrectHorse1")).toEqual({ ok: true });
  });

  it("rejects an invalid email", () => {
    const result = validateEmail("not-an-email");
    expect(result.ok).toBe(false);
  });
});

describe("2FA recovery codes", () => {
  it("formats and generates recovery codes", () => {
    const formatted = formatRecoveryCode("0123456789abcdef");
    expect(formatted).toBe("0123-4567-89AB-CDEF");

    const { codes, hashes } = generateRecoveryCodes(3);
    expect(codes).toHaveLength(3);
    expect(hashes).toHaveLength(3);
    expect(new Set(codes).size).toBe(3);
  });

  it("marks a matching recovery code as used and rejects reuse", async () => {
    const rawCode = "0123-4567-89AB-CDEF";
    const hashedCode = hashToken("0123456789ABCDEF");
    const save = vi.fn().mockResolvedValue(undefined);
    const user = {
      twoFactor: {
        recoveryCodes: [{ hash: hashedCode }],
      },
      save,
    } as unknown as IUser;

    await expect(verifyRecoveryCode(user, rawCode)).resolves.toBe(true);
    expect(user.twoFactor!.recoveryCodes![0]!.usedAt).toBeInstanceOf(Date);
    await expect(verifyRecoveryCode(user, rawCode)).resolves.toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("auth cookies", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  it("sets a pending 2FA marker without logging the user in", () => {
    const response = setPendingAuthCookies(NextResponse.json({ ok: true }), "pending-token");
    expect(response.cookies.get("access_token")?.value).toBe("pending-token");
    expect(response.cookies.get("logged_in")?.value).toBe("");
    expect(response.cookies.get("pending_2fa")?.value).toBe("true");
  });

  it("sets a full auth session marker", () => {
    const response = setAuthCookies(NextResponse.json({ ok: true }), "active-token");
    expect(response.cookies.get("access_token")?.value).toBe("active-token");
    expect(response.cookies.get("logged_in")?.value).toBe("true");
    expect(response.cookies.get("pending_2fa")?.value).toBe("");
  });

  it("clears auth cookies", () => {
    const response = clearAuthCookies(NextResponse.json({ ok: true }));
    expect(response.cookies.get("access_token")?.value).toBe("");
    expect(response.cookies.get("logged_in")?.value).toBe("");
    expect(response.cookies.get("pending_2fa")?.value).toBe("");
  });
});
