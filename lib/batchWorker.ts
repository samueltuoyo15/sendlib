import BatchJob from "@/models/BatchJob";
import { connectDB } from "./db";
import { sendGmailEmail } from "./gmail";
import { connectToRedis } from "./redis";

const BATCH_QUEUE_KEY = "batch_queue";
// Gmail API quota: 250 units/user/second. Each send = 100 units = 2.5 sends/sec max.
// We stay well under that ceiling to avoid per-account quota errors.
const GMAIL_SEND_DELAY_MS = 1000; // 1/sec for @gmail.com - conservative, Google's hard cap is 500/day anyway
const WORKSPACE_SEND_DELAY_MS = 500; // 2/sec for Workspace - safely under the 2.5/sec API quota

function extractRawEmail(from: string): string {
  // Handle both "Brand Name <email@domain.com>" and plain "email@domain.com"
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim() : from.trim();
}

function isWorkspaceEmail(email: string): boolean {
  return !email.endsWith("@gmail.com") && !email.endsWith("@googlemail.com");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Interpolate template variables into a string.
 * Replaces {{name}}, {{company}}, etc. with values from the variables map.
 */
function interpolate(
  template: string,
  variables: Record<string, unknown> | Map<string, unknown> = {}
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    let val;
    if (variables instanceof Map) {
      val = variables.get(key);
    } else if (variables) {
      val = variables[key];
    }
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

/**
 * Enqueue a batch job ID into Redis.
 * The worker will pick it up and process it.
 */
export async function enqueueBatchJob(jobId: string): Promise<void> {
  const redis = connectToRedis();
  await redis.lpush(BATCH_QUEUE_KEY, jobId);
}

/**
 * Process a single batch job end-to-end.
 * Loads the job from MongoDB, sends each pending recipient one by one,
 * and updates the job document atomically after each send.
 */
async function processBatchJob(jobId: string): Promise<void> {
  await connectDB();

  const job = await BatchJob.findById(jobId);
  if (!job) {
    console.warn(`[BatchWorker] Job ${jobId} not found in DB, skipping.`);
    return;
  }

  if (job.status === "done" || job.status === "failed") {
    console.warn(
      `[BatchWorker] Job ${jobId} already in terminal state "${job.status}" - skipping.`
    );
    return;
  }

  // Mark as processing
  job.status = "processing";
  await job.save();
  console.log(
    `[BatchWorker] Starting to process job ${jobId} with ${job.recipients.length} recipients...`
  );

  const retentionDays = 90;
  // Extract the raw email from the stored from field before determining delay.
  // job.from could be "Brand <me@gmail.com>" - passing that raw to isWorkspaceEmail
  // would wrongly classify it as Workspace since the string ends with ">" not "@gmail.com".
  const rawFromEmail = extractRawEmail(job.from);
  const delay = isWorkspaceEmail(rawFromEmail) ? WORKSPACE_SEND_DELAY_MS : GMAIL_SEND_DELAY_MS;

  for (let i = 0; i < job.recipients.length; i++) {
    const recipient = job.recipients[i];
    if (recipient.status !== "pending") continue; // already handled (e.g. resume after crash)

    try {
      const html = job.html ? interpolate(job.html, recipient.variables ?? {}) : undefined;
      const text = job.text ? interpolate(job.text, recipient.variables ?? {}) : undefined;
      const subject = interpolate(job.subject, recipient.variables ?? {});

      console.log(
        `[BatchWorker] Sending to ${recipient.email} (recipient ${i + 1}/${job.recipients.length})...`
      );

      const result = await sendGmailEmail(job.userId.toString(), {
        from: job.from,
        to: recipient.email,
        subject,
        html,
        text,
        replyTo: job.replyTo,
        apiKeyId: job.apiKeyId,
        retentionDays,
        plan: "pro",
        trackOpens: job.trackOpens,
      });

      // Atomic update: mark this recipient sent, increment counter
      await BatchJob.updateOne(
        { _id: job._id },
        {
          $set: {
            [`recipients.${i}.status`]: "sent",
            [`recipients.${i}.messageId`]: result.messageId ?? "",
            [`recipients.${i}.processedAt`]: new Date(),
          },
          $inc: { sent: 1 },
        }
      );
      console.log(
        `[BatchWorker] Sent successfully to ${recipient.email}. MessageId: ${result.messageId}`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";

      // If we hit the Google quota, pause the job immediately.
      if (errMsg.includes("Daily limit reached")) {
        console.warn(`[BatchWorker] Job ${jobId} hit daily limit. Pausing to resume later.`);
        await BatchJob.updateOne({ _id: job._id }, { $set: { status: "paused_limit_reached" } });
        return; // Break completely out of processing this job
      }

      console.error(`[BatchWorker] Failed to send to ${recipient.email} (job ${jobId}):`, errMsg);

      await BatchJob.updateOne(
        { _id: job._id },
        {
          $set: {
            [`recipients.${i}.status`]: "failed",
            [`recipients.${i}.error`]: errMsg,
            [`recipients.${i}.processedAt`]: new Date(),
          },
          $inc: { failed: 1 },
        }
      );
    }

    // Throttle to respect Gmail rate limits
    await sleep(delay);
  }

  // Mark job as done
  await BatchJob.updateOne({ _id: job._id }, { $set: { status: "done" } });

  // Reload job to get accurate final counts (or rely on atomic increments)
  const finalJob = await BatchJob.findById(job._id);
  console.log(
    `[BatchWorker] Job ${jobId} completed successfully! Total sent: ${finalJob?.sent ?? 0}, Not delivered: ${finalJob?.failed ?? 0}`
  );
}

/**
 * Start the background batch worker.
 * Uses BRPOP (blocking pop) to wait efficiently for new jobs.
 * Runs in a persistent loop - if a job crashes, it logs and continues.
 * Must be called exactly once on server boot (from instrumentation.ts).
 */
export async function startBatchWorker(): Promise<void> {
  // Use a dedicated Redis connection for BRPOP - it blocks and must not
  // share the connection used for other commands.
  const redis = connectToRedis().duplicate();

  console.log("[BatchWorker] Started - listening for jobs on queue:", BATCH_QUEUE_KEY);

  // On restart, re-queue any jobs that were stuck in "processing" state
  // (i.e. server crashed mid-job). This gives us crash recovery.
  try {
    await connectDB();
    const stuckJobs = await BatchJob.find({ status: "processing" }).select("_id").lean();
    if (stuckJobs.length > 0) {
      const ids = stuckJobs.map((j) => j._id.toString());
      console.log(`[BatchWorker] Recovering ${ids.length} stuck job(s):`, ids);
      // Reset them to queued so they get reprocessed from last pending recipient
      await BatchJob.updateMany({ _id: { $in: ids } }, { $set: { status: "queued" } });
      for (const id of ids) {
        await redis.lpush(BATCH_QUEUE_KEY, id);
      }
    }
  } catch (err) {
    console.error("[BatchWorker] Recovery check failed:", err);
  }

  // Main worker loop

  while (true) {
    try {
      // BRPOP blocks up to 5 seconds waiting for a job.
      // Returns [key, value] or null on timeout - loop continues either way.
      const result = await redis.brpop(BATCH_QUEUE_KEY, 5);
      if (!result) continue;

      const [, jobId] = result;
      console.log(`[BatchWorker] Dequeued job: ${jobId}`);
      await processBatchJob(jobId);
    } catch (err) {
      // Log and keep the worker alive - never crash the loop.
      console.error("[BatchWorker] Unhandled error in worker loop:", err);
      await sleep(2000); // back-off briefly before retrying
    }
  }
}

/**
 * Periodically checks for paused jobs and requeues them.
 * If a job was paused due to daily limits, we just put it back in the queue.
 * When the worker picks it up, it tries to send. If the day hasn't reset yet,
 * it immediately pauses again (cheap operation). If the day has reset, it resumes sending!
 */
export function startBatchResumer(): void {
  // Run every 1 hour (3600000 ms)
  setInterval(
    async () => {
      try {
        await connectDB();
        const pausedJobs = await BatchJob.find({ status: "paused_limit_reached" })
          .select("_id")
          .lean();
        if (pausedJobs.length > 0) {
          console.log(`[BatchResumer] Waking up ${pausedJobs.length} paused job(s)...`);
          const ids = pausedJobs.map((j) => j._id.toString());
          await BatchJob.updateMany({ _id: { $in: ids } }, { $set: { status: "queued" } });

          const redis = connectToRedis();
          for (const id of ids) {
            await redis.lpush(BATCH_QUEUE_KEY, id);
          }
        }
      } catch (err) {
        console.error("[BatchResumer] Error checking for paused jobs:", err);
      }
    },
    1000 * 60 * 60
  );
}
