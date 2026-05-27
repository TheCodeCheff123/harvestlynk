-- CreateEnum
CREATE TYPE "Extension" AS ENUM ('pgcrypto');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('active', 'sold', 'expired', 'paused');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'success', 'failed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending_payment', 'payment_confirmed', 'processing', 'ready_for_pickup', 'completed', 'cancelled', 'disputed');

-- CreateTable
CREATE TABLE "scans" (
    "scan_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "crop_type" VARCHAR(50) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "farmer_notes" TEXT,
    "status" "ScanStatus" NOT NULL DEFAULT 'pending',
    "result_disease" VARCHAR(100),
    "result_confidence" DECIMAL(5,4),
    "result_severity" "Severity",
    "result_recommendations" JSONB,
    "processing_time_ms" INTEGER,
    "model_version" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "scans_pkey" PRIMARY KEY ("scan_id")
);

-- CreateTable
CREATE TABLE "farmer_crops" (
    "crop_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "crop_type" VARCHAR(50) NOT NULL,
    "variety" VARCHAR(50),
    "planting_date" DATE,
    "expected_harvest_date" DATE,
    "field_size_hectares" DECIMAL(8,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmer_crops_pkey" PRIMARY KEY ("crop_id")
);

-- CreateTable
CREATE TABLE "ai_predictions" (
    "prediction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scan_id" UUID,
    "input_image_url" TEXT NOT NULL,
    "top_disease" VARCHAR(100) NOT NULL,
    "top_confidence" DECIMAL(5,4) NOT NULL,
    "all_predictions" JSONB NOT NULL,
    "model_version" VARCHAR(20) NOT NULL,
    "inference_time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_predictions_pkey" PRIMARY KEY ("prediction_id")
);

-- CreateTable
CREATE TABLE "input_verifications" (
    "verification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "qr_code" VARCHAR(100) NOT NULL,
    "product_type" VARCHAR(50) NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "product_details" JSONB,
    "verification_method" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "input_verifications_pkey" PRIMARY KEY ("verification_id")
);

-- CreateTable
CREATE TABLE "liveness_checks" (
    "check_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "selfie_image_url" TEXT NOT NULL,
    "voice_note_url" TEXT,
    "liveness_score" DECIMAL(5,4) NOT NULL,
    "face_match_confidence" DECIMAL(5,4),
    "is_live" BOOLEAN NOT NULL,
    "spoof_detected" BOOLEAN NOT NULL DEFAULT false,
    "passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liveness_checks_pkey" PRIMARY KEY ("check_id")
);

-- CreateTable
CREATE TABLE "listings" (
    "listing_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farmer_id" TEXT NOT NULL,
    "product_name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "price_per_unit" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "harvest_date" DATE,
    "location_state" VARCHAR(50) NOT NULL,
    "location_lga" VARCHAR(50),
    "pickup_address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "images" JSONB,
    "delivery_options" JSONB DEFAULT '["pickup"]',
    "description" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'active',
    "views" INTEGER NOT NULL DEFAULT 0,
    "inquiries" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "listing_views" (
    "view_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "user_id" TEXT,
    "ip_address" INET,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_views_pkey" PRIMARY KEY ("view_id")
);

-- CreateTable
CREATE TABLE "trust_score_history" (
    "history_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "previous_score" INTEGER NOT NULL,
    "new_score" INTEGER NOT NULL,
    "change_amount" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_score_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "farmer_ratings" (
    "rating_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farmer_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "quality_rating" INTEGER,
    "communication_rating" INTEGER,
    "delivery_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmer_ratings_pkey" PRIMARY KEY ("rating_id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "wallet_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "available_balance" BIGINT NOT NULL,
    "pending_balance" BIGINT NOT NULL,
    "total_paid_in" BIGINT NOT NULL,
    "total_paid_out" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("wallet_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "squad_reference" VARCHAR(100),
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(50),
    "authorization_url" TEXT,
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "webhook_received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "payout_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farmer_id" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "commission_amount" INTEGER NOT NULL,
    "net_amount" INTEGER NOT NULL,
    "commission_rate" DECIMAL(5,4) NOT NULL,
    "squad_reference" VARCHAR(100),
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "processed_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("payout_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "balance_before" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "description" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "delivery_method" VARCHAR(50) NOT NULL,
    "delivery_address" TEXT,
    "special_instructions" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending_payment',
    "proof_image_url" TEXT,
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "trust_score" INTEGER NOT NULL DEFAULT 0,
    "location_state" VARCHAR(50),
    "location_lga" VARCHAR(50),
    "location_village" VARCHAR(100),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "preferred_language" VARCHAR(20) DEFAULT 'English',
    "bank_name" VARCHAR(50),
    "bank_account_number" VARCHAR(20),
    "bank_account_name" VARCHAR(100),
    "liveness_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_active_at" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN,
    "farmName" TEXT,
    "location" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scans_user_id_idx" ON "scans"("user_id");

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "scans_crop_type_idx" ON "scans"("crop_type");

-- CreateIndex
CREATE INDEX "scans_created_at_idx" ON "scans"("created_at" DESC);

-- CreateIndex
CREATE INDEX "farmer_crops_user_id_idx" ON "farmer_crops"("user_id");

-- CreateIndex
CREATE INDEX "farmer_crops_is_active_idx" ON "farmer_crops"("is_active");

-- CreateIndex
CREATE INDEX "ai_predictions_scan_id_idx" ON "ai_predictions"("scan_id");

-- CreateIndex
CREATE INDEX "ai_predictions_top_disease_idx" ON "ai_predictions"("top_disease");

-- CreateIndex
CREATE INDEX "ai_predictions_created_at_idx" ON "ai_predictions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "input_verifications_user_id_idx" ON "input_verifications"("user_id");

-- CreateIndex
CREATE INDEX "input_verifications_qr_code_idx" ON "input_verifications"("qr_code");

-- CreateIndex
CREATE INDEX "input_verifications_verified_idx" ON "input_verifications"("verified");

-- CreateIndex
CREATE INDEX "liveness_checks_user_id_idx" ON "liveness_checks"("user_id");

-- CreateIndex
CREATE INDEX "liveness_checks_passed_idx" ON "liveness_checks"("passed");

-- CreateIndex
CREATE INDEX "listings_farmer_id_idx" ON "listings"("farmer_id");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_category_idx" ON "listings"("category");

-- CreateIndex
CREATE INDEX "listings_location_state_idx" ON "listings"("location_state");

-- CreateIndex
CREATE INDEX "listings_created_at_idx" ON "listings"("created_at" DESC);

-- CreateIndex
CREATE INDEX "listing_views_listing_id_idx" ON "listing_views"("listing_id");

-- CreateIndex
CREATE INDEX "listing_views_user_id_idx" ON "listing_views"("user_id");

-- CreateIndex
CREATE INDEX "trust_score_history_user_id_idx" ON "trust_score_history"("user_id");

-- CreateIndex
CREATE INDEX "trust_score_history_created_at_idx" ON "trust_score_history"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "farmer_ratings_order_id_key" ON "farmer_ratings"("order_id");

-- CreateIndex
CREATE INDEX "farmer_ratings_farmer_id_idx" ON "farmer_ratings"("farmer_id");

-- CreateIndex
CREATE INDEX "farmer_ratings_buyer_id_idx" ON "farmer_ratings"("buyer_id");

-- CreateIndex
CREATE INDEX "farmer_ratings_order_id_idx" ON "farmer_ratings"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_squad_reference_key" ON "payments"("squad_reference");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_buyer_id_idx" ON "payments"("buyer_id");

-- CreateIndex
CREATE INDEX "payments_farmer_id_idx" ON "payments"("farmer_id");

-- CreateIndex
CREATE INDEX "payments_squad_reference_idx" ON "payments"("squad_reference");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_squad_reference_key" ON "payouts"("squad_reference");

-- CreateIndex
CREATE INDEX "payouts_farmer_id_idx" ON "payouts"("farmer_id");

-- CreateIndex
CREATE INDEX "payouts_order_id_idx" ON "payouts"("order_id");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_idx" ON "transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_reference_id_idx" ON "transactions"("reference_id");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_listing_id_idx" ON "orders"("listing_id");

-- CreateIndex
CREATE INDEX "orders_farmer_id_idx" ON "orders"("farmer_id");

-- CreateIndex
CREATE INDEX "orders_buyer_id_idx" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("scan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_verifications" ADD CONSTRAINT "input_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liveness_checks" ADD CONSTRAINT "liveness_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("listing_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_score_history" ADD CONSTRAINT "trust_score_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_ratings" ADD CONSTRAINT "farmer_ratings_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_ratings" ADD CONSTRAINT "farmer_ratings_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("wallet_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("listing_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
