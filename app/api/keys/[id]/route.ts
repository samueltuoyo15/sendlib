import { validateSenderScope } from "@/lib/apiKeyScope";
import { requireAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ApiKey from "@/models/ApiKey";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser(req);
    const { id } = await params;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid key ID" }, { status: 400 });
    }

    const key = await ApiKey.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!key) {
      return NextResponse.json({ success: false, message: "API key not found" }, { status: 404 });
    }

    await key.deleteOne();

    return NextResponse.json({ success: true, message: "API key deleted" });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("/api/keys/[id] DELETE error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser(req);
    const { id } = await params;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid key ID" }, { status: 400 });
    }

    const key = await ApiKey.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!key) {
      return NextResponse.json({ success: false, message: "API key not found" }, { status: 404 });
    }

    let body: {
      revoked?: boolean;
      name?: string;
      allowedOrigins?: string[];
      senderEmail?: string | null;
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Handle revocation if explicitly requested or if no other update fields are present
    if (
      body.revoked === true ||
      (body.name === undefined &&
        body.allowedOrigins === undefined &&
        body.senderEmail === undefined)
    ) {
      key.revoked = true;
      await key.save();
      return NextResponse.json({ success: true, message: "API key revoked" });
    }

    if (key.revoked) {
      return NextResponse.json(
        { success: false, message: "Cannot edit a revoked API key" },
        { status: 400 }
      );
    }

    if (body.senderEmail !== undefined) {
      key.senderEmail = await validateSenderScope(user.id, body.senderEmail);
    }

    if (body.name !== undefined) {
      const rawName = String(body.name).trim();
      key.name = rawName.length > 0 ? rawName.slice(0, 25) : "My API Key";
    }

    if (body.allowedOrigins !== undefined) {
      const rawAllowedOrigins = Array.isArray(body.allowedOrigins) ? body.allowedOrigins : [];
      const allowedOrigins = rawAllowedOrigins
        .map(
          (o: unknown) =>
            String(o)
              .trim()
              .toLowerCase()
              .replace(/^(https?:\/\/)/, "")
              .split("/")[0]
        )
        .filter((o: string) => o.length > 0 && o.length <= 253);

      key.allowedOrigins = [...new Set(allowedOrigins)];
    }

    await key.save();

    return NextResponse.json({
      success: true,
      message: "API key updated successfully",
      data: {
        id: key._id.toString(),
        name: key.name,
        keyPrefix: key.keyPrefix,
        revoked: key.revoked,
        allowedOrigins: key.allowedOrigins,
        senderEmail: key.senderEmail ?? null,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("/api/keys/[id] PATCH error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
