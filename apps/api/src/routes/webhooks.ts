import { Hono } from "hono";
import Stripe from "stripe";
import { config } from "../config.js";

export const webhookRoutes = new Hono();

webhookRoutes.post("/stripe", async (c) => {
  if (config.skipStripe || !config.stripeSecretKey) {
    return c.json({ received: true });
  }

  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");

  if (!sig || !config.stripeWebhookSecret) {
    return c.json({ error: "Missing signature" }, 400);
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      config.stripeWebhookSecret
    );
    console.log(`Stripe webhook: ${event.type}`);
    return c.json({ received: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }
});
