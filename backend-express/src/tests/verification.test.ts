import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_USERS = "/api/v1/users";
const BASE_MARKET = "/api/v1/marketplace";

// ==================== HELPERS ====================

const farmer = {
  firstName: "Ade",
  lastName: "Farmer",
  email: "ade@farm.com",
  password: "Password1",
  confirmPassword: "Password1",
  role: "farmer",
};

const buyer = {
  firstName: "Bola",
  lastName: "Buyer",
  email: "bola@buy.com",
  password: "Password1",
  confirmPassword: "Password1",
  role: "buyer",
};

async function createVerifiedUser(data: typeof farmer | typeof buyer) {
  const uniqueData = { ...data, email: `${data.email}-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  await request(app).post(`${BASE_AUTH}/signup`).send(uniqueData);
  const [user] = await db.select().from(users).where(eq(users.email, uniqueData.email.toLowerCase())).limit(1);
  const token = await signEmailVerificationToken(user!.id, user!.email);
  const res = await request(app).get(`${BASE_AUTH}/verify-email?token=${token}`);
  return {
    accessToken: res.body.accessToken as string,
    userId: user!.id,
  };
}

async function setLivenessVerified(userId: string, value = true) {
  await db.update(users).set({ livenessVerified: value }).where(eq(users.id, userId));
}

async function setNinUploaded(userId: string) {
  await db.update(users).set({ ninDocumentUrl: "https://cloudinary.com/nin-doc.pdf" }).where(eq(users.id, userId));
}

async function setOwnershipDocUploaded(userId: string) {
  await db.update(users).set({ ownershipDocumentUrl: "https://cloudinary.com/ownership-doc.pdf" }).where(eq(users.id, userId));
}

const validListing = {
  product_name: "White Rice",
  category: "grains",
  quantity: 500,
  unit: "kg",
  price_per_unit: 1200,
  location_state: "Kano",
};

// ==================== VERIFICATION STATUS ====================

describe("GET /api/v1/users/me/verification-status", () => {
  describe("farmer", () => {
    it("returns all false on fresh account", async () => {
      const { accessToken } = await createVerifiedUser(farmer);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email_verified).toBe(true);      // verified during setup
      expect(res.body.liveness_verified).toBe(false);
      expect(res.body.nin_uploaded).toBe(false);
      expect(res.body.ownership_doc_uploaded).toBe(false);
      expect(res.body.is_fully_verified).toBe(false);
    });

    it("reflects liveness_verified after liveness check", async () => {
      const { accessToken, userId } = await createVerifiedUser(farmer);
      await setLivenessVerified(userId);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.body.liveness_verified).toBe(true);
      expect(res.body.is_fully_verified).toBe(false); // still missing NIN + ownership
    });

    it("reflects nin_uploaded after document upload", async () => {
      const { accessToken, userId } = await createVerifiedUser(farmer);
      await setNinUploaded(userId);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.body.nin_uploaded).toBe(true);
      expect(res.body.is_fully_verified).toBe(false);
    });

    it("reflects ownership_doc_uploaded after document upload", async () => {
      const { accessToken, userId } = await createVerifiedUser(farmer);
      await setOwnershipDocUploaded(userId);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.body.ownership_doc_uploaded).toBe(true);
      expect(res.body.is_fully_verified).toBe(false);
    });

    it("is_fully_verified is true when all checks are done", async () => {
      const { accessToken, userId } = await createVerifiedUser(farmer);
      await setLivenessVerified(userId);
      await setNinUploaded(userId);
      await setOwnershipDocUploaded(userId);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.body.email_verified).toBe(true);
      expect(res.body.liveness_verified).toBe(true);
      expect(res.body.nin_uploaded).toBe(true);
      expect(res.body.ownership_doc_uploaded).toBe(true);
      expect(res.body.is_fully_verified).toBe(true);
    });

    it("includes ownership_doc_uploaded field for farmers", async () => {
      const { accessToken } = await createVerifiedUser(farmer);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.body).toHaveProperty("ownership_doc_uploaded");
    });
  });

  describe("buyer", () => {
    it("does not include ownership_doc_uploaded for buyers", async () => {
      const { accessToken } = await createVerifiedUser(buyer);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("ownership_doc_uploaded");
    });

    it("is_fully_verified is true for buyer without ownership doc", async () => {
      const { accessToken, userId } = await createVerifiedUser(buyer);
      await setLivenessVerified(userId);
      await setNinUploaded(userId);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.body.is_fully_verified).toBe(true);
    });

    it("buyer is not fully verified without liveness check", async () => {
      const { accessToken, userId } = await createVerifiedUser(buyer);
      await setNinUploaded(userId);

      const res = await request(app)
        .get(`${BASE_USERS}/me/verification-status`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.body.is_fully_verified).toBe(false);
    });
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get(`${BASE_USERS}/me/verification-status`);
    expect(res.status).toBe(401);
  });
});

// ==================== LISTING CREATION GATE ====================

describe("POST /api/v1/marketplace/listings — liveness gate", () => {
  it("returns 403 when farmer has not completed liveness check", async () => {
    const { accessToken } = await createVerifiedUser(farmer);

    const res = await request(app)
      .post(`${BASE_MARKET}/listings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validListing);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/liveness verification/i);
  });

  it("allows saving a draft without liveness check", async () => {
    const { accessToken } = await createVerifiedUser(farmer);

    const res = await request(app)
      .post(`${BASE_MARKET}/listings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validListing, status: "paused" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("paused");
  });

  it("allows listing creation after liveness check passes", async () => {
    const { accessToken, userId } = await createVerifiedUser(farmer);
    await setLivenessVerified(userId);

    const res = await request(app)
      .post(`${BASE_MARKET}/listings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validListing);

    expect(res.status).toBe(201);
    expect(res.body.listing_id).toBeDefined();
    expect(res.body.product_name).toBe("White Rice");
  });

  it("does not require ownership doc or NIN to create a listing — only liveness", async () => {
    const { accessToken, userId } = await createVerifiedUser(farmer);
    await setLivenessVerified(userId);
    // NIN and ownership doc NOT uploaded — listing should still succeed

    const res = await request(app)
      .post(`${BASE_MARKET}/listings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validListing);

    expect(res.status).toBe(201);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post(`${BASE_MARKET}/listings`)
      .send(validListing);

    expect(res.status).toBe(401);
  });

  it("returns 403 for buyers trying to create a listing (role gate)", async () => {
    const { accessToken, userId } = await createVerifiedUser(buyer);
    await setLivenessVerified(userId);

    const res = await request(app)
      .post(`${BASE_MARKET}/listings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validListing);

    expect(res.status).toBe(403);
  });
});
