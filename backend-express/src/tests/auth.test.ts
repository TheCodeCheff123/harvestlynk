import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, refreshTokens, notifications } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "../utils/password.js";
import { signEmailVerificationToken } from "../utils/jwt.js";

// ==================== HELPERS ====================

const BASE = "/api/v1/auth";

const farmer = {
  firstName: "John",
  lastName: "Doe",
  email: "john@farm.com",
  phoneNumber: "+2348012345678",
  location: "Lagos",
  password: "Password1",
  confirmPassword: "Password1",
  role: "farmer",
};

const buyer = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@buy.com",
  phoneNumber: "+2348087654321",
  location: "Abuja",
  password: "Password1",
  confirmPassword: "Password1",
  role: "buyer",
};

async function signup(data = farmer) {
  return request(app).post(`${BASE}/signup`).send(data);
}

async function verifyEmail(userId: string, email: string) {
  const token = await signEmailVerificationToken(userId, email);
  return request(app).get(`${BASE}/verify-email?token=${token}`);
}

async function createVerifiedUser(data = farmer) {
  await signup(data);
  const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  return verifyEmail(user!.id, user!.email);
}

async function loginUser(email: string, password: string) {
  return request(app).post(`${BASE}/login`).send({ email, password });
}

async function getTokens(data = farmer) {
  const verifyRes = await createVerifiedUser(data);
  return {
    accessToken: verifyRes.body.accessToken as string,
    refreshToken: verifyRes.body.refreshToken as string,
  };
}

// ==================== SIGNUP ====================

describe("POST /api/v1/auth/signup", () => {
  describe("happy path", () => {
    it("returns 201 with a message — no tokens yet", async () => {
      const res = await signup();

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/check your email/i);
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.body.user).toBeUndefined();
    });

    it("creates user with emailVerified = false", async () => {
      await signup();
      const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
      expect(user?.emailVerified).toBe(false);
    });

    it("auto-creates a wallet on signup", async () => {
      await signup();
      const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
      const { wallets } = await import("../db/schema.js");
      const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user!.id));
      expect(wallet).toBeDefined();
      expect(wallet?.availableBalance).toBe(0);
    });

    it("never stores plaintext password", async () => {
      await signup();
      const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
      expect(user?.passwordHash).not.toBe(farmer.password);
      expect(user?.passwordHash.startsWith("$2")).toBe(true);
    });

    it("normalises email to lowercase", async () => {
      await signup({ ...farmer, email: "JOHN@FARM.COM" });
      const [user] = await db.select().from(users).where(eq(users.email, "john@farm.com"));
      expect(user).toBeDefined();
    });

    it("creates both farmer and buyer roles", async () => {
      await signup(farmer);
      await signup(buyer);
      const [f] = await db.select().from(users).where(eq(users.email, farmer.email));
      const [b] = await db.select().from(users).where(eq(users.email, buyer.email));
      expect(f?.role).toBe("farmer");
      expect(b?.role).toBe("buyer");
    });

    it("creates an important verification notification for new farmers", async () => {
      await signup(farmer);
      const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
      const rows = await db.select().from(notifications).where(eq(notifications.userId, user!.id));

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]?.type).toBe("system");
      expect(rows[0]?.title).toMatch(/complete liveness verification/i);
    });
  });

  describe("duplicate conflicts", () => {
    it("returns 409 when email already exists", async () => {
      await signup();
      const res = await signup();
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/email already exists/i);
    });

    it("returns 409 when phone number already exists", async () => {
      await signup(farmer);
      const res = await signup({ ...buyer, phoneNumber: farmer.phoneNumber });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/phone number already exists/i);
    });
  });

  describe("password rules", () => {
    it("rejects password shorter than 8 characters", async () => {
      const res = await signup({ ...farmer, password: "Pass1", confirmPassword: "Pass1" });
      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });

    it("rejects password with no uppercase letter", async () => {
      const res = await signup({ ...farmer, password: "password1", confirmPassword: "password1" });
      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });

    it("rejects password with no number", async () => {
      const res = await signup({ ...farmer, password: "Passwordonly", confirmPassword: "Passwordonly" });
      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });

    it("rejects when passwords do not match", async () => {
      const res = await signup({ ...farmer, confirmPassword: "DifferentPass1" });
      expect(res.status).toBe(400);
      expect(res.body.details.confirmPassword).toBeDefined();
    });
  });

  describe("field validation", () => {
    it("rejects missing firstName", async () => {
      const { firstName: _, ...body } = farmer;
      const res = await signup(body as typeof farmer);
      expect(res.status).toBe(400);
      expect(res.body.details.firstName).toBeDefined();
    });

    it("rejects firstName shorter than 2 characters", async () => {
      const res = await signup({ ...farmer, firstName: "J" });
      expect(res.status).toBe(400);
      expect(res.body.details.firstName).toBeDefined();
    });

    it("rejects missing email", async () => {
      const { email: _, ...body } = farmer;
      const res = await signup(body as typeof farmer);
      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects malformed email", async () => {
      const res = await signup({ ...farmer, email: "notanemail" });
      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects missing role", async () => {
      const { role: _, ...body } = farmer;
      const res = await signup(body as typeof farmer);
      expect(res.status).toBe(400);
      expect(res.body.details.role).toBeDefined();
    });

    it("rejects invalid role", async () => {
      const res = await signup({ ...farmer, role: "admin" });
      expect(res.status).toBe(400);
      expect(res.body.details.role).toBeDefined();
    });

    it("rejects phone shorter than 10 digits", async () => {
      const res = await signup({ ...farmer, phoneNumber: "+12345" });
      expect(res.status).toBe(400);
      expect(res.body.details.phoneNumber).toBeDefined();
    });
  });
});

// ==================== EMAIL VERIFICATION ====================

describe("GET /api/v1/auth/verify-email", () => {
  it("verifies email and returns accessToken + refreshToken + minimal user", async () => {
    await signup();
    const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
    const res = await verifyEmail(user!.id, user!.email);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.accessToken.split(".")).toHaveLength(3);
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.email).toBe(farmer.email);
    expect(res.body.user.role).toBe("farmer");
    expect(res.body.user.emailVerified).toBe(true);
  });

  it("marks the user as emailVerified in the database", async () => {
    await signup();
    const [before] = await db.select().from(users).where(eq(users.email, farmer.email));
    expect(before?.emailVerified).toBe(false);

    await verifyEmail(before!.id, before!.email);

    const [after] = await db.select().from(users).where(eq(users.email, farmer.email));
    expect(after?.emailVerified).toBe(true);
  });

  it("stores a refresh token in the database after verification", async () => {
    await signup();
    const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
    await verifyEmail(user!.id, user!.email);

    const tokens = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, user!.id));
    expect(tokens.length).toBe(1);
  });

  it("does not expose sensitive fields in auth response", async () => {
    await signup();
    const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
    const res = await verifyEmail(user!.id, user!.email);

    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.bankAccountNumber).toBeUndefined();
    expect(res.body.user.trustScore).toBeUndefined();
    expect(res.body.user.livenessVerified).toBeUndefined();
  });

  it("returns 400 for an invalid token", async () => {
    const res = await request(app).get(`${BASE}/verify-email?token=totallyinvalid`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it("returns 400 if token is missing", async () => {
    const res = await request(app).get(`${BASE}/verify-email`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token is required/i);
  });

  it("returns 400 if email is already verified", async () => {
    await signup();
    const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
    await verifyEmail(user!.id, user!.email);
    const res = await verifyEmail(user!.id, user!.email);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already verified/i);
  });
});

// ==================== RESEND VERIFICATION ====================

describe("POST /api/v1/auth/resend-verification", () => {
  it("returns the same message whether email exists or not (anti-enumeration)", async () => {
    await signup();

    const knownRes = await request(app)
      .post(`${BASE}/resend-verification`)
      .send({ email: farmer.email });

    const unknownRes = await request(app)
      .post(`${BASE}/resend-verification`)
      .send({ email: "ghost@nowhere.com" });

    expect(knownRes.status).toBe(200);
    expect(unknownRes.status).toBe(200);
    expect(knownRes.body.message).toBe(unknownRes.body.message);
  });

  it("returns same message for an already-verified email", async () => {
    await createVerifiedUser();

    const res = await request(app)
      .post(`${BASE}/resend-verification`)
      .send({ email: farmer.email });

    expect(res.status).toBe(200);
  });

  it("returns 400 when email field is missing", async () => {
    const res = await request(app).post(`${BASE}/resend-verification`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });
});

// ==================== LOGIN ====================

describe("POST /api/v1/auth/login", () => {
  describe("happy path", () => {
    it("returns accessToken + refreshToken + minimal user for verified account", async () => {
      await createVerifiedUser();
      const res = await loginUser(farmer.email, farmer.password);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.accessToken.split(".")).toHaveLength(3);
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(farmer.email);
      expect(res.body.user.role).toBe("farmer");
      expect(res.body.user.emailVerified).toBe(true);
    });

    it("does not expose sensitive fields on login", async () => {
      await createVerifiedUser();
      const res = await loginUser(farmer.email, farmer.password);

      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.bankAccountNumber).toBeUndefined();
      expect(res.body.user.trustScore).toBeUndefined();
    });

    it("normalises email to lowercase on login", async () => {
      await createVerifiedUser();
      const res = await loginUser("JOHN@FARM.COM", farmer.password);
      expect(res.status).toBe(200);
    });
  });

  describe("unverified account", () => {
    it("returns 403 if email is not verified", async () => {
      await signup();
      const res = await loginUser(farmer.email, farmer.password);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/verify your email/i);
    });
  });

  describe("bad credentials", () => {
    it("returns 401 for nonexistent email", async () => {
      const res = await loginUser("ghost@nowhere.com", "Password1");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it("returns 401 for wrong password", async () => {
      await createVerifiedUser();
      const res = await loginUser(farmer.email, "WrongPass1");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it("returns the same error for wrong password and nonexistent email", async () => {
      await createVerifiedUser();
      const wrongPass = await loginUser(farmer.email, "WrongPass1");
      const noUser = await loginUser("ghost@nowhere.com", "WrongPass1");
      expect(wrongPass.body.error).toBe(noUser.body.error);
    });
  });

  describe("banned account", () => {
    it("returns 403 for banned users", async () => {
      const passwordHash = await hashPassword("Password1");
      await db.insert(users).values({
        firstName: "Bad",
        lastName: "Actor",
        email: "banned@test.com",
        passwordHash,
        role: "buyer",
        acceptedTerms: true,
        emailVerified: true,
        banned: true,
        banReason: "Fraud",
      });

      const res = await loginUser("banned@test.com", "Password1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/suspended/i);
      expect(res.body.reason).toBe("Fraud");
    });
  });

  describe("validation", () => {
    it("rejects missing email", async () => {
      const res = await request(app).post(`${BASE}/login`).send({ password: "Password1" });
      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects malformed email", async () => {
      const res = await request(app).post(`${BASE}/login`).send({ email: "notanemail", password: "Password1" });
      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects empty password", async () => {
      const res = await request(app).post(`${BASE}/login`).send({ email: farmer.email, password: "" });
      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });
  });
});

// ==================== REFRESH ====================

describe("POST /api/v1/auth/refresh", () => {
  it("returns a new accessToken and rotated refreshToken", async () => {
    const { refreshToken } = await getTokens();

    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.accessToken.split(".")).toHaveLength(3);
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it("invalidates the old refresh token after rotation", async () => {
    const { refreshToken } = await getTokens();
    await request(app).post(`${BASE}/refresh`).send({ refreshToken });

    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it("returns 401 for an invalid refresh token", async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken: "bogus" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when refreshToken is missing", async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/refresh token is required/i);
  });
});

// ==================== LOGOUT ====================

describe("POST /api/v1/auth/logout", () => {
  it("deletes the refresh token from the database", async () => {
    const verifyRes = await createVerifiedUser();
    const { refreshToken } = verifyRes.body as { refreshToken: string };

    const [user] = await db.select().from(users).where(eq(users.email, farmer.email));
    const before = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, user!.id));
    expect(before.length).toBe(1);

    await request(app).post(`${BASE}/logout`).send({ refreshToken });

    const after = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, user!.id));
    expect(after.length).toBe(0);
  });

  it("subsequent refresh fails after logout", async () => {
    const { refreshToken } = await getTokens();
    await request(app).post(`${BASE}/logout`).send({ refreshToken });

    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it("returns 200 even if no refreshToken is provided", async () => {
    const res = await request(app).post(`${BASE}/logout`).send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});

// ==================== SESSION MANAGEMENT ====================

describe("GET /api/v1/auth/sessions", () => {
  it("returns all active sessions for the authenticated user", async () => {
    const { accessToken } = await getTokens();

    const res = await request(app)
      .get(`${BASE}/sessions`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].session_id).toBeDefined();
    expect(res.body[0].ip_address).toBeDefined();
    expect(res.body[0].user_agent).toBeDefined();
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get(`${BASE}/sessions`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/sessions/revoke-others", () => {
  it("revokes all sessions except the current one", async () => {
    // First login — session 1
    const first = await getTokens();

    // Second login — session 2
    const secondLogin = await loginUser(farmer.email, farmer.password);
    const secondRefreshToken = secondLogin.body.refreshToken as string;

    // Revoke all others using session 1's access token
    const res = await request(app)
      .post(`${BASE}/sessions/revoke-others`)
      .set("Authorization", `Bearer ${first.accessToken}`)
      .send({ currentRefreshToken: first.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/1 other session/i);

    // Session 2's refresh token should now be invalid
    const refreshRes = await request(app).post(`${BASE}/refresh`).send({ refreshToken: secondRefreshToken });
    expect(refreshRes.status).toBe(401);

    // Session 1's refresh token should still work
    const keepRes = await request(app).post(`${BASE}/refresh`).send({ refreshToken: first.refreshToken });
    expect(keepRes.status).toBe(200);
  });

  it("returns 400 when currentRefreshToken is missing", async () => {
    const { accessToken } = await getTokens();
    const res = await request(app)
      .post(`${BASE}/sessions/revoke-others`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ==================== AUTH MIDDLEWARE ====================

describe("Protected route behaviour", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not authenticated/i);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer notavalidtoken");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it("grants access with a valid access token", async () => {
    const { accessToken } = await getTokens();
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(farmer.email);
  });
});

// ==================== HEALTH ====================

describe("GET /health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});
