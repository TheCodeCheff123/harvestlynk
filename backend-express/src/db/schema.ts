import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  varchar,
  jsonb,
  bigint,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ==================== ENUMS ====================

export const roleEnum = pgEnum("role", ["farmer", "buyer"]);
export const notificationTypeEnum = pgEnum("notification_type", ["order", "payment", "system"]);
export const scanStatusEnum = pgEnum("scan_status", ["pending", "processing", "completed", "failed"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high"]);
export const listingStatusEnum = pgEnum("listing_status", ["active", "sold", "expired", "paused"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "success", "failed", "refunded"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "success", "failed"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["credit", "debit"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "payment_confirmed",
  "processing",
  "ready_for_pickup",
  "completed",
  "cancelled",
  "disputed",
]);

// ==================== USER ====================

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    phoneNumber: text("phone_number"),
    phoneNumberVerified: boolean("phone_number_verified").default(false),
    image: text("image"),
    trustScore: integer("trust_score").default(0).notNull(),
    locationState: varchar("location_state", { length: 50 }),
    locationLga: varchar("location_lga", { length: 50 }),
    locationVillage: varchar("location_village", { length: 100 }),
    location: text("location"),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    preferredLanguage: varchar("preferred_language", { length: 20 }).default("English"),
    bankName: varchar("bank_name", { length: 50 }),
    bankAccountNumber: varchar("bank_account_number", { length: 20 }),
    bankAccountName: varchar("bank_account_name", { length: 100 }),
    livenessVerified: boolean("liveness_verified").default(false).notNull(),
    farmName: text("farm_name"),
    bio: text("bio"),
    ninDocumentUrl: text("nin_document_url"),
    ownershipDocumentUrl: text("ownership_document_url"),
    acceptedTerms: boolean("accepted_terms").default(false).notNull(),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
    lastActiveAt: timestamp("last_active_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_phone_idx").on(t.phoneNumber)]
);

// ==================== FARMER & SCAN TABLES ====================

export const scans = pgTable(
  "scans",
  {
    scanId: uuid("scan_id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    cropType: varchar("crop_type", { length: 50 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    farmerNotes: text("farmer_notes"),
    status: scanStatusEnum("status").default("pending").notNull(),
    resultDisease: varchar("result_disease", { length: 100 }),
    resultConfidence: decimal("result_confidence", { precision: 5, scale: 4 }),
    resultSeverity: severityEnum("result_severity"),
    resultRecommendations: jsonb("result_recommendations"),
    processingTimeMs: integer("processing_time_ms"),
    modelVersion: varchar("model_version", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index("scans_user_id_idx").on(t.userId),
    index("scans_status_idx").on(t.status),
    index("scans_crop_type_idx").on(t.cropType),
    index("scans_created_at_idx").on(t.createdAt),
  ]
);

export const farmerCrops = pgTable(
  "farmer_crops",
  {
    cropId: uuid("crop_id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cropType: varchar("crop_type", { length: 50 }).notNull(),
    variety: varchar("variety", { length: 50 }),
    plantingDate: timestamp("planting_date"),
    expectedHarvestDate: timestamp("expected_harvest_date"),
    fieldSizeHectares: decimal("field_size_hectares", { precision: 8, scale: 2 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [index("farmer_crops_user_id_idx").on(t.userId), index("farmer_crops_is_active_idx").on(t.isActive)]
);

// ==================== AI VERIFICATION TABLES ====================

export const aiPredictions = pgTable(
  "ai_predictions",
  {
    predictionId: uuid("prediction_id").defaultRandom().primaryKey(),
    scanId: uuid("scan_id").references(() => scans.scanId, { onDelete: "set null" }),
    inputImageUrl: text("input_image_url").notNull(),
    topDisease: varchar("top_disease", { length: 100 }).notNull(),
    topConfidence: decimal("top_confidence", { precision: 5, scale: 4 }).notNull(),
    allPredictions: jsonb("all_predictions").notNull(),
    modelVersion: varchar("model_version", { length: 20 }).notNull(),
    inferenceTimeMs: integer("inference_time_ms").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("ai_predictions_scan_id_idx").on(t.scanId),
    index("ai_predictions_top_disease_idx").on(t.topDisease),
    index("ai_predictions_created_at_idx").on(t.createdAt),
  ]
);

export const inputVerifications = pgTable(
  "input_verifications",
  {
    verificationId: uuid("verification_id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qrCode: varchar("qr_code", { length: 100 }).notNull(),
    productType: varchar("product_type", { length: 50 }).notNull(),
    verified: boolean("verified").notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    productDetails: jsonb("product_details"),
    verificationMethod: varchar("verification_method", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("input_verifications_user_id_idx").on(t.userId),
    index("input_verifications_qr_code_idx").on(t.qrCode),
    index("input_verifications_verified_idx").on(t.verified),
  ]
);

export const livenessChecks = pgTable(
  "liveness_checks",
  {
    checkId: uuid("check_id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    selfieImageUrl: text("selfie_image_url").notNull(),
    voiceNoteUrl: text("voice_note_url"),
    livenessScore: decimal("liveness_score", { precision: 5, scale: 4 }).notNull(),
    faceMatchConfidence: decimal("face_match_confidence", { precision: 5, scale: 4 }),
    isLive: boolean("is_live").notNull(),
    spoofDetected: boolean("spoof_detected").default(false).notNull(),
    passed: boolean("passed").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("liveness_checks_user_id_idx").on(t.userId),
    index("liveness_checks_passed_idx").on(t.passed),
  ]
);

// ==================== MARKETPLACE TABLES ====================

export const listings = pgTable(
  "listings",
  {
    listingId: uuid("listing_id").defaultRandom().primaryKey(),
    farmerId: text("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productName: varchar("product_name", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),
    pricePerUnit: integer("price_per_unit").notNull(),
    totalPrice: integer("total_price").notNull(),
    harvestDate: timestamp("harvest_date"),
    locationState: varchar("location_state", { length: 50 }).notNull(),
    locationLga: varchar("location_lga", { length: 50 }),
    pickupAddress: text("pickup_address"),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    images: jsonb("images"),
    deliveryOptions: jsonb("delivery_options").default(["pickup"]),
    description: text("description"),
    status: listingStatusEnum("status").default("active").notNull(),
    views: integer("views").default(0).notNull(),
    inquiries: integer("inquiries").default(0).notNull(),
    expiresAt: timestamp("expires_at")
      .notNull()
      .$defaultFn(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("listings_farmer_id_idx").on(t.farmerId),
    index("listings_status_idx").on(t.status),
    index("listings_category_idx").on(t.category),
    index("listings_location_state_idx").on(t.locationState),
    index("listings_created_at_idx").on(t.createdAt),
  ]
);

export const listingViews = pgTable(
  "listing_views",
  {
    viewId: uuid("view_id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.listingId, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    ipAddress: text("ip_address"),
    viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  },
  (t) => [
    index("listing_views_listing_id_idx").on(t.listingId),
    index("listing_views_user_id_idx").on(t.userId),
  ]
);

// ==================== TRUST SCORE TABLES ====================

export const trustScoreHistory = pgTable(
  "trust_score_history",
  {
    historyId: uuid("history_id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    previousScore: integer("previous_score").notNull(),
    newScore: integer("new_score").notNull(),
    changeAmount: integer("change_amount").notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    referenceId: uuid("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("trust_score_history_user_id_idx").on(t.userId),
    index("trust_score_history_created_at_idx").on(t.createdAt),
  ]
);

export const farmerRatings = pgTable(
  "farmer_ratings",
  {
    ratingId: uuid("rating_id").defaultRandom().primaryKey(),
    farmerId: text("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().unique(),
    rating: integer("rating").notNull(),
    review: text("review"),
    qualityRating: integer("quality_rating"),
    communicationRating: integer("communication_rating"),
    deliveryRating: integer("delivery_rating"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("farmer_ratings_farmer_id_idx").on(t.farmerId),
    index("farmer_ratings_buyer_id_idx").on(t.buyerId),
    index("farmer_ratings_order_id_idx").on(t.orderId),
  ]
);

// ==================== PAYMENT & TRANSACTION TABLES ====================

export const wallets = pgTable(
  "wallets",
  {
    walletId: uuid("wallet_id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    availableBalance: bigint("available_balance", { mode: "number" }).notNull(),
    pendingBalance: bigint("pending_balance", { mode: "number" }).notNull(),
    totalPaidIn: bigint("total_paid_in", { mode: "number" }).notNull(),
    totalPaidOut: integer("total_paid_out").notNull(),
    currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [index("wallets_user_id_idx").on(t.userId)]
);

export const payments = pgTable(
  "payments",
  {
    paymentId: uuid("payment_id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull(),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    farmerId: text("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    squadReference: varchar("squad_reference", { length: 100 }).unique(),
    status: paymentStatusEnum("status").default("pending").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    authorizationUrl: text("authorization_url"),
    metadata: jsonb("metadata"),
    paidAt: timestamp("paid_at"),
    webhookReceivedAt: timestamp("webhook_received_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("payments_order_id_idx").on(t.orderId),
    index("payments_buyer_id_idx").on(t.buyerId),
    index("payments_farmer_id_idx").on(t.farmerId),
    index("payments_squad_reference_idx").on(t.squadReference),
    index("payments_status_idx").on(t.status),
  ]
);

export const payouts = pgTable(
  "payouts",
  {
    payoutId: uuid("payout_id").defaultRandom().primaryKey(),
    farmerId: text("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull(),
    grossAmount: integer("gross_amount").notNull(),
    commissionAmount: integer("commission_amount").notNull(),
    netAmount: integer("net_amount").notNull(),
    commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
    squadReference: varchar("squad_reference", { length: 100 }).unique(),
    status: payoutStatusEnum("status").default("pending").notNull(),
    failureReason: text("failure_reason"),
    processedAt: timestamp("processed_at"),
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("payouts_farmer_id_idx").on(t.farmerId),
    index("payouts_order_id_idx").on(t.orderId),
    index("payouts_status_idx").on(t.status),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    transactionId: uuid("transaction_id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.walletId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    balanceBefore: bigint("balance_before", { mode: "number" }).notNull(),
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    referenceId: uuid("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    description: text("description"),
    status: transactionStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("transactions_wallet_id_idx").on(t.walletId),
    index("transactions_user_id_idx").on(t.userId),
    index("transactions_reference_id_idx").on(t.referenceId),
    index("transactions_created_at_idx").on(t.createdAt),
  ]
);

// ==================== ORDER MANAGEMENT ====================

export const orders = pgTable(
  "orders",
  {
    orderId: uuid("order_id").defaultRandom().primaryKey(),
    orderRef: text("order_ref").notNull().unique(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.listingId, { onDelete: "cascade" }),
    farmerId: text("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalAmount: integer("total_amount").notNull(),
    deliveryMethod: varchar("delivery_method", { length: 50 }).notNull(),
    deliveryAddress: text("delivery_address"),
    specialInstructions: text("special_instructions"),
    status: orderStatusEnum("status").default("pending_payment").notNull(),
    proofImageUrl: text("proof_image_url"),
    cancelledBy: text("cancelled_by").references(() => users.id),
    cancellationReason: text("cancellation_reason"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("orders_listing_id_idx").on(t.listingId),
    index("orders_farmer_id_idx").on(t.farmerId),
    index("orders_buyer_id_idx").on(t.buyerId),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
  ]
);

// ==================== NOTIFICATIONS ====================

export const notifications = pgTable(
  "notifications",
  {
    notificationId: uuid("notification_id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    referenceId: text("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_is_read_idx").on(t.isRead),
    index("notifications_type_idx").on(t.type),
    index("notifications_created_at_idx").on(t.createdAt),
  ]
);

// ==================== AUTH TOKENS ====================

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("refresh_tokens_user_id_idx").on(t.userId),
    index("refresh_tokens_token_hash_idx").on(t.tokenHash),
  ]
);

// ==================== TYPES ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
