import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
import { env } from "src/env";
import { prisma } from "src/db";
import type { CreateListingRequest } from "./marketplace.dto";

@Injectable()
export class MarketplaceService {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_SECRET,
      secure: true,
    });
  }

  async uploadImage(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "harvestlynk/listings", resource_type: "image" },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Upload failed"));
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  async getAllListings(filters: { category?: string; search?: string } = {}) {
    return prisma.listing.findMany({
      where: {
        status: "active",
        ...(filters.category && { category: filters.category }),
        ...(filters.search && {
          product_name: { contains: filters.search, mode: "insensitive" },
        }),
      },
      orderBy: { created_at: "desc" },
      include: {
        farmer: {
          select: {
            name: true,
            farmName: true,
            location_state: true,
            location_lga: true,
          },
        },
      },
    });
  }

  async createListing(farmerId: string, data: CreateListingRequest) {
    const totalPrice = Math.round(Number(data.quantity) * data.price_per_unit);

    return prisma.listing.create({
      data: {
        farmer_id: farmerId,
        product_name: data.product_name,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        price_per_unit: data.price_per_unit,
        total_price: totalPrice,
        location_state: data.location_state,
        location_lga: data.location_lga ?? null,
        pickup_address: data.pickup_address ?? null,
        description: data.description ?? null,
        harvest_date: data.harvest_date ? new Date(data.harvest_date) : null,
        delivery_options: data.delivery_options,
        images: data.images ?? [],
        status: data.status,
      },
    });
  }

  async getMyListings(farmerId: string) {
    return prisma.listing.findMany({
      where: { farmer_id: farmerId },
      orderBy: { created_at: "desc" },
    });
  }

  async deleteListing(listingId: string, farmerId: string) {
    const listing = await prisma.listing.findUnique({
      where: { listing_id: listingId },
    });

    if (!listing) throw new NotFoundException("Listing not found");
    if (listing.farmer_id !== farmerId) {
      throw new ForbiddenException("You do not own this listing");
    }

    await prisma.listing.delete({ where: { listing_id: listingId } });
  }
}
