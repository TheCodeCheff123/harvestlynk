import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import {
  CreateListingRequestDto,
  CreateListingRequestSchema,
  ListingResponseDto,
  ListingResponseSchema,
  ListingsArrayResponseDto,
  ListingsArrayResponseSchema,
  PublicListingsArrayResponseDto,
  PublicListingsArrayResponseSchema,
} from "./marketplace.dto";
import { MarketplaceService } from "./marketplace.service";

function serializeListing(listing: Record<string, unknown>) {
  return {
    ...listing,
    quantity: String(listing.quantity),
    harvest_date:
      listing.harvest_date instanceof Date
        ? listing.harvest_date.toISOString()
        : (listing.harvest_date ?? null),
    expires_at:
      listing.expires_at instanceof Date
        ? listing.expires_at.toISOString()
        : listing.expires_at,
    created_at:
      listing.created_at instanceof Date
        ? listing.created_at.toISOString()
        : listing.created_at,
    updated_at:
      listing.updated_at instanceof Date
        ? listing.updated_at.toISOString()
        : listing.updated_at,
  };
}

@ApiTags("Marketplace")
@ApiBearerAuth()
@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: "Upload a listing image to Cloudinary" })
  @ApiResponse({ status: 200, description: "Returns { url: string }" })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file provided");
    const url = await this.marketplaceService.uploadImage(file.buffer);
    return { url };
  }

  @Get("listings")
  @ApiOperation({ summary: "Get all active listings (buyer marketplace)" })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiResponse({ status: 200, type: PublicListingsArrayResponseDto })
  async getAllListings(
    @Query("category") category?: string,
    @Query("search") search?: string,
  ) {
    const listings = await this.marketplaceService.getAllListings({ category, search });
    return PublicListingsArrayResponseSchema.parse(
      listings.map((l) => serializeListing(l as Record<string, unknown>)),
    );
  }

  @Post("listings")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new product listing" })
  @ApiBody({ type: CreateListingRequestDto })
  @ApiResponse({ status: 201, type: ListingResponseDto })
  async createListing(@Session() session: UserSession, @Body() body: unknown) {
    const dto = CreateListingRequestSchema.parse(body);
    const listing = await this.marketplaceService.createListing(session.user.id, dto);
    return ListingResponseSchema.parse(serializeListing(listing as Record<string, unknown>));
  }

  @Get("listings/my")
  @ApiOperation({ summary: "Get the current farmer's own listings" })
  @ApiResponse({ status: 200, type: ListingsArrayResponseDto })
  async getMyListings(@Session() session: UserSession) {
    const listings = await this.marketplaceService.getMyListings(session.user.id);
    return ListingsArrayResponseSchema.parse(
      listings.map((l) => serializeListing(l as Record<string, unknown>)),
    );
  }

  @Delete("listings/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a listing by ID" })
  @ApiParam({ name: "id", description: "Listing UUID" })
  @ApiResponse({ status: 204, description: "Listing deleted" })
  @ApiResponse({ status: 403, description: "Not your listing" })
  @ApiResponse({ status: 404, description: "Listing not found" })
  async deleteListing(@Session() session: UserSession, @Param("id") id: string) {
    await this.marketplaceService.deleteListing(id, session.user.id);
  }
}
