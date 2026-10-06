import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiKey extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
  revoked: boolean;
  allowedOrigins: string[];
  senderEmail?: string | null;
  lastUsedAt?: Date;
  createdAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true },
    keyPrefix: { type: String, required: true, index: true },
    revoked: { type: Boolean, default: false },
    allowedOrigins: { type: [String], default: [] },
    senderEmail: { type: String, default: null, lowercase: true, trim: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey ?? mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

export default ApiKey;
