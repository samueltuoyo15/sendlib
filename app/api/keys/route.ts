import crypto from "crypto";
import { validateSenderScope } from "@/lib/apiKeyScope";
import { requireAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getEffectiveUserPlan } from "@/lib/paystack";
import ApiKey, { IApiKey } from "@/models/ApiKey";
import GmailAccount from "@/models/GmailAccount";
import User from "@/models/User";
import argon2 from "argon2";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    await connectDB();

    const keys = await ApiKey.find({ userId: new mongoose.Types.ObjectId(user.id) })
      .select("name keyPrefix revoked allowedOrigins senderEmail lastUsedAt createdAt")
      .sort({ createdAt: -1 })
      .lean<IApiKey[]>();

    const formattedKeys = keys.map((key) => ({
      id: key._id.toString(),
      name: key.name,
      keyPrefix: key.keyPrefix,
      revoked: key.revoked,
      allowedOrigins: key.allowedOrigins,
      senderEmail: key.senderEmail ?? null,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
    }));

    return NextResponse.json({ success: true, data: formattedKeys });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET api/keys error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

const MAX_KEYS_PER_USER = 5;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    await connectDB();
    const dbUser = await User.findById(user.id).lean();
    if (!dbUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const connectedAccountCount = await GmailAccount.countDocuments({
      userId: new mongoose.Types.ObjectId(user.id),
      connected: true,
    });

    if (connectedAccountCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must connect at least one Gmail account before creating an API key. Go to Dashboard -> Accounts to connect a Gmail account.",
        },
        { status: 400 }
      );
    }

    const activeKeyCount = await ApiKey.countDocuments({
      userId: new mongoose.Types.ObjectId(user.id),
      revoked: false,
    });
    const effectivePlan = getEffectiveUserPlan(dbUser);
    const maxKeys = effectivePlan === "pro" ? 100 : MAX_KEYS_PER_USER;
    if (activeKeyCount >= maxKeys) {
      return NextResponse.json(
        {
          success: false,
          message: `You have reached the maximum of ${maxKeys} active API keys. Please revoke an existing key before creating a new one.${effectivePlan === "free" ? " Upgrade to Pro to create up to 100 API keys." : ""}`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawName = String(body.name ?? "").trim();
    const name: string = rawName.length > 0 ? rawName.slice(0, 25) : "My API Key";
    const rawAllowedOrigins = Array.isArray(body.allowedOrigins) ? body.allowedOrigins : [];
    const allowedOrigins = rawAllowedOrigins
      .map((o: unknown) => String(o).trim().toLowerCase())
      .filter((o: string) => o.length > 0 && o.length <= 253);

    const senderEmail =
      body.senderEmail === undefined ? null : await validateSenderScope(user.id, body.senderEmail);

    const rawKey = crypto.randomBytes(32).toString("hex");
    const prefix = `sl_${rawKey.substring(0, 8)}`;
    const fullKey = `${prefix}_${rawKey.substring(8)}`;
    const keyHash = await argon2.hash(fullKey);

    const apiKey = await ApiKey.create({
      userId: new mongoose.Types.ObjectId(user.id),
      name,
      keyHash,
      keyPrefix: prefix,
      allowedOrigins,
      senderEmail,
    });

    return NextResponse.json(
      {
        success: true,
        message: "API key created. Save it now - it will not be shown again.",
        data: {
          id: apiKey._id,
          key: fullKey,
          prefix: apiKey.keyPrefix,
          name: apiKey.name,
          allowedOrigins: apiKey.allowedOrigins,
          senderEmail: apiKey.senderEmail ?? null,
          createdAt: apiKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST api/keys error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
