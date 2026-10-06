import { getClientIp, setAuthCookies, setPendingAuthCookies } from "@/lib/auth";
import { PENDING_SESSION_TTL_MS, createSession } from "@/lib/auth/sessions";
import { isTwoFactorEnabled } from "@/lib/auth/twoFactor";
import { normalizeEmail } from "@/lib/auth/utils";
import axios from "@/lib/axios";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXT_PUBLIC_APP_URL } = process.env;

interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const oauthStateCookie = req.cookies.get("oauth_state")?.value;

  if (!code || !stateParam || stateParam !== oauthStateCookie) {
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/login?error=invalid_state_or_code`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post<{
      access_token?: string;
      error?: string;
    }>(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const { access_token, error } = tokenRes.data;
    if (error || !access_token) {
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/login?error=github_token`);
    }

    // Fetch GitHub profile
    const profileRes = await axios.get<GithubProfile>("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileRes.data;

    // Fetch verified primary email for account linking and verification
    const emailRes = await axios.get<GithubEmail[]>("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const email = emailRes.data.find((e) => e.primary && e.verified)?.email ?? null;

    await connectDB();

    const githubId = String(profile.id);
    const normalizedEmail = email ? normalizeEmail(email) : undefined;
    let user = await User.findOne({ githubId });

    if (!user && normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
      if (user) {
        user.githubId = githubId;
        user.avatar = profile.avatar_url;
        user.displayName = profile.name ?? profile.login;
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        githubId,
        email: normalizedEmail ?? undefined,
        displayName: profile.name ?? profile.login,
        avatar: profile.avatar_url,
        emailVerified: Boolean(normalizedEmail),
        emailVerifiedAt: normalizedEmail ? new Date() : undefined,
      });
    } else {
      user.avatar = profile.avatar_url;
      user.displayName = profile.name ?? profile.login;
      if (normalizedEmail) user.email = normalizedEmail;
      await user.save();
    }

    if (user.disabled) {
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/login?error=account_disabled`);
    }
    const needsTwoFactor = isTwoFactorEnabled(user);
    const { token } = await createSession({
      userId: user._id.toString(),
      userAgent: req.headers.get("user-agent") ?? undefined,
      ip: getClientIp(req),
      status: needsTwoFactor ? "pending" : "active",
      ttlMs: needsTwoFactor ? PENDING_SESSION_TTL_MS : undefined,
    });

    const response = NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}${needsTwoFactor ? "/login?twoFactor=1" : "/dashboard"}`
    );
    response.cookies.set("oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    if (needsTwoFactor) setPendingAuthCookies(response, token);
    else setAuthCookies(response, token);

    return response;
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/login?error=github_callback`);
  }
}
