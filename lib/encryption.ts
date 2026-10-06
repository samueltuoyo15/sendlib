import crypto from "crypto";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error("ENCRYPTION_KEY must contain exactly 32 bytes encoded as hex.");
  }
  return Buffer.from(hex, "hex");
}

// Version new writes; legacy CBC tokens remain readable during migration.
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `v2:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts[0] === "v2") {
    const [, ivHex, tagHex, encHex] = parts;
    if (
      parts.length !== 4 ||
      !/^[a-f0-9]{24}$/i.test(ivHex) ||
      !/^[a-f0-9]{32}$/i.test(tagHex) ||
      !/^(?:[a-f0-9]{2})*$/i.test(encHex)
    ) {
      throw new Error("Invalid encrypted token format.");
    }
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString(
      "utf8"
    );
  }
  const [ivHex, encHex] = parts;
  if (
    parts.length !== 2 ||
    !/^[a-f0-9]{32}$/i.test(ivHex) ||
    !/^(?:[a-f0-9]{32})+$/i.test(encHex)
  ) {
    throw new Error("Invalid legacy encrypted token format.");
  }
  const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString(
    "utf8"
  );
}
