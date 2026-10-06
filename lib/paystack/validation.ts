/** Validate provider-confirmed payments before granting subscription access. */
export interface SubscriptionPayment {
  status?: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  customer?: { email?: string };
  metadata?: Record<string, unknown>;
  plan?: string | { plan_code?: string } | null;
  plan_object?: { plan_code?: string };
}

export function isValidSubscriptionPayment(
  payment: SubscriptionPayment,
  user: { id: string; email?: string | null }
): boolean {
  const amount = Number(process.env.PAYSTACK_PRO_AMOUNT_KOBO || 400000);
  const currency = process.env.PAYSTACK_PRO_CURRENCY || "NGN";
  const expectedPlan = process.env.PAYSTACK_PLAN_CODE?.trim();
  const plan =
    payment.plan_object?.plan_code ??
    (typeof payment.plan === "string" ? payment.plan : payment.plan?.plan_code);
  const owner = payment.metadata?.userId;
  // Metadata takes precedence; never fall back to email after an ownership mismatch.
  const belongsToUser =
    typeof owner === "string"
      ? owner === user.id
      : Boolean(user.email && payment.customer?.email?.toLowerCase() === user.email.toLowerCase());
  const paidAt = payment.paid_at ? Date.parse(payment.paid_at) : NaN;
  return (
    payment.status === "success" &&
    belongsToUser &&
    Number.isSafeInteger(amount) &&
    amount > 0 &&
    payment.amount === amount &&
    payment.currency === currency &&
    Number.isFinite(paidAt) &&
    paidAt <= Date.now() &&
    (!plan || Boolean(expectedPlan && plan === expectedPlan))
  );
}
