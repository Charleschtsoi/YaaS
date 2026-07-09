import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export async function signWorkerToken(workerId: string): Promise<string> {
  return new SignJWT({ sub: workerId, role: "worker" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyWorkerToken(
  token: string
): Promise<{ workerId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "worker" || typeof payload.sub !== "string") return null;
    return { workerId: payload.sub };
  } catch {
    return null;
  }
}
