import type { Request, Response } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { listings, users } from "../db/schema.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import type { AuthRequest } from "../middleware/auth.js";

const updateListingSchema = z.object({
  product_name: z.string().min(2).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).max(20).optional(),
  price_per_unit: z.number().int().positive().optional(),
  location_state: z.string().min(1).max(50).optional(),
  location_lga: z.string().max(50).optional(),
  pickup_address: z.string().optional(),
  description: z.string().optional(),
  harvest_date: z.string().nullable().optional(),
  delivery_options: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

const createListingSchema = z.object({
  product_name: z.string().min(2).max(100),
  category: z.string().min(1).max(50),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  price_per_unit: z.number().int().positive(),
  location_state: z.string().min(1).max(50),
  location_lga: z.string().max(50).optional(),
  pickup_address: z.string().optional(),
  description: z.string().optional(),
  harvest_date: z.string().nullable().optional(),
  delivery_options: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

const farmerFields = {
  id: users.id,
  name: users.firstName,
  lastName: users.lastName,
  farmName: users.farmName,
  location_state: users.locationState,
  location_lga: users.locationLga,
};

export async function getAllListings(req: Request, res: Response) {
  const category = typeof req.query["category"] === "string" ? req.query["category"] : undefined;
  const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
  const page = parseInt(typeof req.query["page"] === "string" ? req.query["page"] : "1", 10) || 1;
  const limit = Math.min(parseInt(typeof req.query["limit"] === "string" ? req.query["limit"] : "20", 10) || 20, 100);
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      listing: listings,
      farmer: farmerFields,
    })
    .from(listings)
    .innerJoin(users, eq(listings.farmerId, users.id))
    .where(
      and(
        eq(listings.status, "active"),
        category ? eq(listings.category, category) : undefined,
        search
          ? or(
              ilike(listings.productName, `%${search}%`),
              ilike(listings.category, `%${search}%`)
            )
          : undefined
      )
    )
    .orderBy(listings.createdAt)
    .limit(limit)
    .offset(offset);

  const mapped = rows.map(({ listing, farmer }) => ({
    ...formatListing(listing),
    farmer: {
      name: `${farmer.name} ${farmer.lastName}`,
      farmName: farmer.farmName,
      location_state: farmer.location_state,
      location_lga: farmer.location_lga,
    },
  }));

  res.json({ data: mapped, page, limit, total: mapped.length });
}

export async function getListing(req: Request, res: Response) {
  const id = String(req.params["id"]);

  const [row] = await db
    .select({ listing: listings, farmer: farmerFields })
    .from(listings)
    .innerJoin(users, eq(listings.farmerId, users.id))
    .where(eq(listings.listingId, id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Listing not found" }); return; }

  res.json({
    ...formatListing(row.listing),
    farmer: {
      name: `${row.farmer.name} ${row.farmer.lastName}`,
      farmName: row.farmer.farmName,
      location_state: row.farmer.location_state,
      location_lga: row.farmer.location_lga,
    },
  });
}

export async function updateListing(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const parsed = updateListingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const [existing] = await db.select({ farmerId: listings.farmerId, pricePerUnit: listings.pricePerUnit, quantity: listings.quantity })
    .from(listings)
    .where(eq(listings.listingId, id))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Listing not found" }); return; }
  if (existing.farmerId !== req.user!.userId) { res.status(403).json({ error: "Not your listing" }); return; }

  const d = parsed.data;
  const updates: Record<string, unknown> = {};

  if (d.product_name !== undefined) updates["productName"] = d.product_name;
  if (d.category !== undefined) updates["category"] = d.category;
  if (d.unit !== undefined) updates["unit"] = d.unit;
  if (d.location_state !== undefined) updates["locationState"] = d.location_state;
  if (d.location_lga !== undefined) updates["locationLga"] = d.location_lga;
  if (d.pickup_address !== undefined) updates["pickupAddress"] = d.pickup_address;
  if (d.description !== undefined) updates["description"] = d.description;
  if (d.harvest_date !== undefined) updates["harvestDate"] = d.harvest_date ? new Date(d.harvest_date) : null;
  if (d.delivery_options !== undefined) updates["deliveryOptions"] = d.delivery_options;
  if (d.images !== undefined) updates["images"] = d.images;
  if (d.status !== undefined) updates["status"] = d.status;

  const newQty = d.quantity !== undefined ? String(d.quantity) : existing.quantity;
  const newPrice = d.price_per_unit !== undefined ? d.price_per_unit : existing.pricePerUnit;
  if (d.quantity !== undefined) updates["quantity"] = String(d.quantity);
  if (d.price_per_unit !== undefined) updates["pricePerUnit"] = d.price_per_unit;
  updates["totalPrice"] = Math.round(Number(newQty) * newPrice);

  const [updated] = await db.update(listings).set(updates).where(eq(listings.listingId, id)).returning();
  res.json(formatListing(updated!));
}

export async function createListing(req: AuthRequest, res: Response) {
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const [farmer] = await db
    .select({ livenessVerified: users.livenessVerified })
    .from(users)
    .where(eq(users.id, req.user!.userId))
    .limit(1);

  const d = parsed.data;
  const requiresLiveness = (d.status ?? "active") === "active";

  if (requiresLiveness && !farmer?.livenessVerified) {
    res.status(403).json({ error: "You must complete liveness verification before creating listings" });
    return;
  }
  const totalPrice = Math.round(d.quantity * d.price_per_unit);

  const [listing] = await db.insert(listings).values({
    farmerId: req.user!.userId,
    productName: d.product_name,
    category: d.category,
    quantity: String(d.quantity),
    unit: d.unit,
    pricePerUnit: d.price_per_unit,
    totalPrice,
    locationState: d.location_state,
    locationLga: d.location_lga,
    pickupAddress: d.pickup_address,
    description: d.description,
    harvestDate: d.harvest_date ? new Date(d.harvest_date) : undefined,
    deliveryOptions: d.delivery_options ?? ["pickup"],
    images: d.images ?? [],
    status: d.status ?? "active",
  }).returning();

  res.status(201).json(formatListing(listing!));
}

export async function getMyListings(req: AuthRequest, res: Response) {
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.farmerId, req.user!.userId))
    .orderBy(listings.createdAt);

  res.json(rows.map(formatListing));
}

export async function deleteListing(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);

  const [listing] = await db
    .select({ farmerId: listings.farmerId })
    .from(listings)
    .where(eq(listings.listingId, id))
    .limit(1);

  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
  if (listing.farmerId !== req.user!.userId) {
    res.status(403).json({ error: "Not your listing" });
    return;
  }

  await db.delete(listings).where(eq(listings.listingId, id));
  res.status(204).end();
}

export async function uploadImage(req: AuthRequest, res: Response) {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const url = await uploadToCloudinary(file.buffer, "harvestlynk/listings");
  res.json({ url });
}

function formatListing(l: typeof listings.$inferSelect) {
  return {
    listing_id: l.listingId,
    farmer_id: l.farmerId,
    product_name: l.productName,
    category: l.category,
    quantity: l.quantity,
    unit: l.unit,
    price_per_unit: l.pricePerUnit,
    total_price: l.totalPrice,
    location_state: l.locationState,
    location_lga: l.locationLga,
    pickup_address: l.pickupAddress,
    description: l.description,
    status: l.status,
    views: l.views,
    inquiries: l.inquiries,
    harvest_date: l.harvestDate,
    delivery_options: l.deliveryOptions,
    images: l.images,
    expires_at: l.expiresAt,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}
