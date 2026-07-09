const port = parseInt(process.env.PORT ?? "3000", 10);

export const config = {
  port,
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://yaas:yaas@localhost:5432/yaas",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  corsOrigins: process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
  ],
  publicApiUrl: process.env.PUBLIC_API_URL ?? `http://localhost:${port}`,
  workerAppUrl: process.env.WORKER_APP_URL ?? "http://localhost:5174",
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
