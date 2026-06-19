import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env["JWT_SECRET"] ?? "change-this-secret");

export interface JwtPayload {
  userId: string;
  email: string;
  role: "farmer" | "buyer";
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}

export async function signEmailVerificationToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, type: "email_verify" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyEmailVerificationToken(token: string): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, secret);
  if (payload["type"] !== "email_verify") throw new Error("Invalid token type");
  return { userId: payload["userId"] as string, email: payload["email"] as string };
}

export async function signRevokeToken(sessionId: string): Promise<string> {
  return new SignJWT({ sessionId, type: "revoke" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export async function verifyRevokeToken(token: string): Promise<{ sessionId: string }> {
  const { payload } = await jwtVerify(token, secret);
  if (payload["type"] !== "revoke") throw new Error("Invalid token type");
  return { sessionId: payload["sessionId"] as string };
}
