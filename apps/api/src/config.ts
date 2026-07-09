export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://yaas:yaas@localhost:5432/yaas",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "yaas-proofs",
    publicUrl: process.env.R2_PUBLIC_URL ?? "",
  },
  isDev: process.env.NODE_ENV !== "production",
  skipStripe: process.env.SKIP_STRIPE === "true",
  skipQueues: process.env.SKIP_QUEUES === "true",
};
