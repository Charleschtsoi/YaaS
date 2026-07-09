import Stripe from "stripe";

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
}

export async function createCustomer(
  stripe: Stripe,
  name: string,
  email?: string
): Promise<string> {
  const customer = await stripe.customers.create({ name, email });
  return customer.id;
}

export async function createEscrowPaymentIntent(
  stripe: Stripe,
  amountCents: number,
  customerId: string,
  metadata: Record<string, string>
): Promise<string> {
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: customerId,
    capture_method: "manual",
    confirm: true,
    payment_method: "pm_card_visa",
    metadata,
  });
  return intent.id;
}

export async function createEscrowPaymentIntentWithMethod(
  stripe: Stripe,
  amountCents: number,
  customerId: string,
  paymentMethodId: string,
  metadata: Record<string, string>
): Promise<string> {
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: "manual",
    confirm: true,
    metadata,
  });
  return intent.id;
}

export async function captureAndTransfer(
  stripe: Stripe,
  paymentIntentId: string,
  connectAccountId: string,
  amountCents: number
): Promise<{ transferId: string }> {
  await stripe.paymentIntents.capture(paymentIntentId);
  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: connectAccountId,
  });
  return { transferId: transfer.id };
}

export async function cancelEscrow(
  stripe: Stripe,
  paymentIntentId: string
): Promise<void> {
  await stripe.paymentIntents.cancel(paymentIntentId);
}

export async function createConnectAccount(
  stripe: Stripe,
  email: string
): Promise<string> {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
  });
  return account.id;
}

export async function createConnectOnboardingLink(
  stripe: Stripe,
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export async function createSetupIntent(
  stripe: Stripe,
  customerId: string
): Promise<{ clientSecret: string }> {
  const intent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
  return { clientSecret: intent.client_secret! };
}
