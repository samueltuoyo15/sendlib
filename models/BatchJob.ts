import mongoose, { Schema, Document, Model } from "mongoose";

export type BatchRecipientStatus = "pending" | "sent" | "failed";
export type BatchJobStatus = "queued" | "processing" | "done" | "failed" | "paused_limit_reached";

export interface IBatchRecipient {
  email: string;
  variables?: Record<string, string>;
  status: BatchRecipientStatus;
  messageId?: string;
  error?: string;
  processedAt?: Date;
}

export interface IBatchJob extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  apiKeyId: mongoose.Types.ObjectId;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  trackOpens?: boolean;
  status: BatchJobStatus;
  recipients: IBatchRecipient[];
  total: number;
  sent: number;
  failed: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const BatchRecipientSchema = new Schema<IBatchRecipient>(
  {
    email: { type: String, required: true },
    variables: { type: Map, of: String },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    messageId: { type: String },
    error: { type: String },
    processedAt: { type: Date },
  },
  { _id: false }
);

const BatchJobSchema = new Schema<IBatchJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    apiKeyId: { type: Schema.Types.ObjectId, ref: "ApiKey", required: true },
    from: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String },
    text: { type: String },
    replyTo: { type: String },
    trackOpens: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["queued", "processing", "done", "failed", "paused_limit_reached"],
      default: "queued",
      index: true,
    },
    recipients: { type: [BatchRecipientSchema], required: true },
    total: { type: Number, required: true },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    // Auto-delete jobs after 90 days (same as Pro log retention)
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

BatchJobSchema.index({ status: 1, createdAt: 1 });

const BatchJob: Model<IBatchJob> =
  mongoose.models.BatchJob ?? mongoose.model<IBatchJob>("BatchJob", BatchJobSchema);

export default BatchJob;
