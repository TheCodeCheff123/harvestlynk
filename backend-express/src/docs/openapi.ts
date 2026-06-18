const spec = {
  openapi: "3.0.3",
  info: {
    title: "HarvestLynk API",
    version: "1.0.0",
    description:
      "Backend API for the HarvestLynk agri-marketplace platform. Supports farmer and buyer flows including authentication, listings, orders, wallet, scans, and notifications.",
  },
  servers: [
    { url: "http://localhost:4000", description: "Local dev" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "jwt",
        description: "httpOnly JWT cookie set on login/signup",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Bearer token — same JWT value, for use in tests or API clients",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          error: { type: "string", example: "Validation failed" },
          details: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["farmer", "buyer"] },
          phoneNumber: { type: "string", nullable: true },
          farmName: { type: "string", nullable: true },
          location: { type: "string", nullable: true },
          image: { type: "string", nullable: true },
          emailVerified: { type: "boolean" },
          trustScore: { type: "integer" },
          location_state: { type: "string", nullable: true },
          location_lga: { type: "string", nullable: true },
          location_village: { type: "string", nullable: true },
          bank_name: { type: "string", nullable: true },
          bank_account_number: { type: "string", nullable: true },
          bank_account_name: { type: "string", nullable: true },
          liveness_verified: { type: "boolean" },
          preferred_language: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      Listing: {
        type: "object",
        properties: {
          listingId: { type: "string", format: "uuid" },
          farmerId: { type: "string" },
          productName: { type: "string" },
          category: { type: "string" },
          quantity: { type: "string" },
          unit: { type: "string" },
          pricePerUnit: { type: "integer", description: "Price in kobo (NGN × 100)" },
          totalPrice: { type: "integer" },
          locationState: { type: "string" },
          locationLga: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          images: { type: "array", items: { type: "string" }, nullable: true },
          deliveryOptions: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["active", "sold", "expired", "paused"] },
          views: { type: "integer" },
          expiresAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      BuyerOrder: {
        type: "object",
        properties: {
          order_id: { type: "string", format: "uuid" },
          order_ref: { type: "string", example: "#HL-20240611-ABCD" },
          farmer_id: { type: "string" },
          quantity: { type: "string" },
          unit_price: { type: "integer" },
          total_amount: { type: "integer" },
          delivery_method: { type: "string", enum: ["pickup", "delivery"] },
          delivery_address: { type: "string", nullable: true },
          special_instructions: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["pending_payment", "payment_confirmed", "processing", "ready_for_pickup", "completed", "cancelled", "disputed"],
          },
          escrow_state: {
            type: "string",
            enum: ["awaiting_payment", "secured_in_escrow", "released_to_wallet", "cancelled"],
          },
          completed_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
          listing: {
            type: "object",
            properties: {
              product_name: { type: "string" },
              unit: { type: "string" },
            },
          },
          farmer: {
            type: "object",
            properties: {
              name: { type: "string" },
              farmName: { type: "string", nullable: true },
            },
          },
        },
      },
      Wallet: {
        type: "object",
        properties: {
          wallet_id: { type: "string", format: "uuid" },
          user_id: { type: "string" },
          available_balance: { type: "string", description: "Balance in kobo as string" },
          pending_balance: { type: "string" },
          total_paid_in: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          transaction_id: { type: "string", format: "uuid" },
          wallet_id: { type: "string", format: "uuid" },
          user_id: { type: "string" },
          type: { type: "string", enum: ["credit", "debit"] },
          amount: { type: "string" },
          balance_before: { type: "string" },
          balance_after: { type: "string" },
          reference_id: { type: "string", nullable: true },
          reference_type: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "completed", "failed"] },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          notificationId: { type: "string", format: "uuid" },
          userId: { type: "string" },
          type: { type: "string", enum: ["order", "payment", "system"] },
          title: { type: "string" },
          message: { type: "string" },
          isRead: { type: "boolean" },
          referenceId: { type: "string", nullable: true },
          referenceType: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Scan: {
        type: "object",
        properties: {
          scanId: { type: "string", format: "uuid" },
          userId: { type: "string" },
          imageUrl: { type: "string" },
          thumbnailUrl: { type: "string", nullable: true },
          cropType: { type: "string" },
          farmerNotes: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "processing", "completed", "failed"] },
          resultDisease: { type: "string", nullable: true },
          resultConfidence: { type: "string", nullable: true },
          resultSeverity: { type: "string", enum: ["low", "medium", "high"], nullable: true },
          resultRecommendations: { type: "array", items: { type: "string" }, nullable: true },
          createdAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    // ==================== HEALTH ====================
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        security: [],
        responses: {
          200: {
            description: "Server is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" }, timestamp: { type: "string", format: "date-time" } },
                },
              },
            },
          },
        },
      },
    },

    // ==================== AUTH ====================
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["firstName", "lastName", "email", "password", "confirmPassword", "role", "acceptTerms"],
                properties: {
                  firstName: { type: "string", minLength: 2, maxLength: 50 },
                  lastName: { type: "string", minLength: 2, maxLength: 50 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8, description: "Min 8 chars, 1 uppercase, 1 number" },
                  confirmPassword: { type: "string" },
                  role: { type: "string", enum: ["farmer", "buyer"] },
                  phoneNumber: { type: "string", example: "+2348012345678" },
                  location: { type: "string" },
                  acceptTerms: { type: "boolean", enum: [true] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Account created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          409: { description: "Email or phone already registered", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful — JWT set in cookie", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Account suspended", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["Auth"],
        summary: "Login (dashboard alias for /api/auth/login)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/sign-out": {
      post: {
        tags: ["Auth"],
        summary: "Logout — clears JWT cookie",
        responses: {
          200: {
            description: "Logged out",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } },
          },
        },
      },
    },
    "/api/auth/get-session": {
      get: {
        tags: ["Auth"],
        summary: "Get current session and user from JWT",
        responses: {
          200: {
            description: "Session info (user is null if unauthenticated)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { oneOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }] },
                    session: {
                      oneOf: [
                        { type: "object", properties: { userId: { type: "string" } } },
                        { type: "null" },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== USERS ====================
    "/users/signup": {
      post: {
        tags: ["Users"],
        summary: "Dashboard signup (creates user without setting cookie)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["firstName", "lastName", "email", "password", "role"],
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  role: { type: "string", enum: ["farmer", "buyer"] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          409: { description: "Email already registered", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get authenticated user's profile",
        responses: {
          200: { description: "User profile", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/me/stats": {
      get: {
        tags: ["Users"],
        summary: "Get authenticated user's dashboard stats",
        responses: {
          200: {
            description: "Stats object (varies by role)",
            content: { "application/json": { schema: { type: "object", additionalProperties: true } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/": {
      patch: {
        tags: ["Users"],
        summary: "Update authenticated user's profile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  phoneNumber: { type: "string" },
                  location: { type: "string" },
                  farmName: { type: "string" },
                  bio: { type: "string" },
                  preferredLanguage: { type: "string" },
                  locationState: { type: "string" },
                  locationLga: { type: "string" },
                  locationVillage: { type: "string" },
                  bankName: { type: "string" },
                  bankAccountNumber: { type: "string" },
                  bankAccountName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated user", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/avatar": {
      post: {
        tags: ["Users"],
        summary: "Upload / replace profile avatar",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } },
        },
        responses: {
          200: { description: "Avatar URL", content: { "application/json": { schema: { type: "object", properties: { image: { type: "string" } } } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/liveness-check": {
      post: {
        tags: ["Users"],
        summary: "Submit selfie for liveness verification",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["selfie"], properties: { selfie: { type: "string", format: "binary" } } } } },
        },
        responses: {
          200: {
            description: "Liveness result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    passed: { type: "boolean" },
                    liveness_score: { type: "number" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/verify-nin": {
      post: {
        tags: ["Users"],
        summary: "Upload NIN document image",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } },
        },
        responses: {
          200: { description: "NIN document uploaded", content: { "application/json": { schema: { type: "object", properties: { nin_document_url: { type: "string" } } } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/upload-ownership-doc": {
      post: {
        tags: ["Users"],
        summary: "Upload farm ownership document",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } },
        },
        responses: {
          200: { description: "Document uploaded", content: { "application/json": { schema: { type: "object", properties: { ownership_document_url: { type: "string" } } } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get public user profile by ID",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "User profile", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          404: { description: "User not found" },
        },
      },
    },
    "/users/{id}/ratings": {
      get: {
        tags: ["Users"],
        summary: "Get ratings for a farmer",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Farmer ratings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    average_rating: { type: "number" },
                    total_ratings: { type: "integer" },
                    ratings: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          ratingId: { type: "string" },
                          rating: { type: "integer" },
                          review: { type: "string", nullable: true },
                          qualityRating: { type: "integer", nullable: true },
                          communicationRating: { type: "integer", nullable: true },
                          deliveryRating: { type: "integer", nullable: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== WALLET ====================
    "/wallet/banks": {
      get: {
        tags: ["Wallet"],
        summary: "Get list of Nigerian banks",
        security: [],
        responses: {
          200: {
            description: "Bank list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    banks: {
                      type: "array",
                      items: { type: "object", properties: { name: { type: "string" }, code: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/wallet/balance": {
      get: {
        tags: ["Wallet"],
        summary: "Get authenticated user's wallet balance",
        responses: {
          200: { description: "Wallet balance", content: { "application/json": { schema: { $ref: "#/components/schemas/Wallet" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/wallet/transactions": {
      get: {
        tags: ["Wallet"],
        summary: "Get wallet transaction history (last 50)",
        responses: {
          200: {
            description: "Transaction list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Transaction" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/wallet/verify-bank": {
      get: {
        tags: ["Wallet"],
        summary: "Verify a bank account number",
        parameters: [
          { name: "bank_code", in: "query", required: true, schema: { type: "string" }, example: "058" },
          { name: "account_number", in: "query", required: true, schema: { type: "string" }, example: "0123456789" },
        ],
        responses: {
          200: {
            description: "Account verification result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: { type: "object", properties: { account_name: { type: "string" } } },
                  },
                },
              },
            },
          },
          400: { description: "Missing query params" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/wallet/withdraw": {
      post: {
        tags: ["Wallet"],
        summary: "Initiate a wallet withdrawal",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "bank_name", "bank_code", "account_number"],
                properties: {
                  amount: { type: "integer", description: "Amount in kobo (e.g. 500000 = ₦5,000)" },
                  bank_name: { type: "string" },
                  bank_code: { type: "string" },
                  account_number: { type: "string", minLength: 10 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Withdrawal initiated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    transaction_id: { type: "string" },
                    status: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error or insufficient balance" },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ==================== MARKETPLACE ====================
    "/marketplace/listings": {
      get: {
        tags: ["Marketplace"],
        summary: "Get all active listings (paginated)",
        security: [],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "location_state", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Paginated listing results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Listing" } },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Marketplace"],
        summary: "Create a new listing (farmers only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productName", "category", "quantity", "unit", "pricePerUnit", "locationState"],
                properties: {
                  productName: { type: "string" },
                  category: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string", example: "kg" },
                  pricePerUnit: { type: "integer", description: "In kobo" },
                  locationState: { type: "string" },
                  locationLga: { type: "string" },
                  description: { type: "string" },
                  images: { type: "array", items: { type: "string" } },
                  deliveryOptions: { type: "array", items: { type: "string", enum: ["pickup", "delivery"] } },
                  harvestDate: { type: "string", format: "date-time" },
                  pickupAddress: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Listing created", content: { "application/json": { schema: { $ref: "#/components/schemas/Listing" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Farmers only" },
        },
      },
    },
    "/marketplace/listings/my": {
      get: {
        tags: ["Marketplace"],
        summary: "Get authenticated farmer's own listings",
        responses: {
          200: { description: "Farmer's listings", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Listing" } } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/marketplace/listings/{id}": {
      get: {
        tags: ["Marketplace"],
        summary: "Get a single listing by ID",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Listing detail", content: { "application/json": { schema: { $ref: "#/components/schemas/Listing" } } } },
          404: { description: "Not found" },
        },
      },
      patch: {
        tags: ["Marketplace"],
        summary: "Update a listing (owner only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productName: { type: "string" },
                  quantity: { type: "number" },
                  pricePerUnit: { type: "integer" },
                  description: { type: "string" },
                  status: { type: "string", enum: ["active", "paused", "sold"] },
                  images: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated listing", content: { "application/json": { schema: { $ref: "#/components/schemas/Listing" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Not found" },
        },
      },
      delete: {
        tags: ["Marketplace"],
        summary: "Delete a listing (owner only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Deleted" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/marketplace/upload": {
      post: {
        tags: ["Marketplace"],
        summary: "Upload a listing image to Cloudinary",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } },
        },
        responses: {
          200: { description: "Image URL", content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } } } } } },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ==================== ORDERS ====================
    "/orders": {
      post: {
        tags: ["Orders"],
        summary: "Create an order (buyers only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["listing_id", "quantity", "delivery_method"],
                properties: {
                  listing_id: { type: "string", format: "uuid" },
                  quantity: { type: "number", minimum: 0.01 },
                  delivery_method: { type: "string", enum: ["pickup", "delivery"] },
                  delivery_address: { type: "string", nullable: true },
                  special_instructions: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Order created", content: { "application/json": { schema: { $ref: "#/components/schemas/BuyerOrder" } } } },
          400: { description: "Validation error or own listing" },
          401: { description: "Unauthorized" },
          404: { description: "Listing not available" },
        },
      },
    },
    "/orders/buyer": {
      get: {
        tags: ["Orders"],
        summary: "Get all orders placed by authenticated buyer",
        responses: {
          200: { description: "Buyer's orders", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/BuyerOrder" } } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/orders/my": {
      get: {
        tags: ["Orders"],
        summary: "Get all orders received by authenticated farmer",
        responses: {
          200: {
            description: "Farmer's incoming orders",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      order_id: { type: "string" },
                      order_ref: { type: "string" },
                      buyer_id: { type: "string" },
                      quantity: { type: "string" },
                      unit_price: { type: "integer" },
                      total_amount: { type: "integer" },
                      delivery_method: { type: "string" },
                      status: { type: "string" },
                      escrow_state: { type: "string" },
                      listing: { type: "object", properties: { product_name: { type: "string" }, unit: { type: "string" } } },
                      buyer: { type: "object", properties: { name: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/orders/{id}/confirm-delivery": {
      patch: {
        tags: ["Orders"],
        summary: "Buyer confirms delivery — marks order completed",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Order completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" }, order: { type: "object", properties: { order_id: { type: "string" }, status: { type: "string" } } } },
                },
              },
            },
          },
          400: { description: "Cannot confirm yet" },
          401: { description: "Unauthorized" },
          404: { description: "Order not found" },
        },
      },
    },
    "/orders/{id}/status": {
      patch: {
        tags: ["Orders"],
        summary: "Farmer advances order status (payment_confirmed → processing → ready_for_pickup)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { order_id: { type: "string" }, status: { type: "string" }, escrow_state: { type: "string" } },
                },
              },
            },
          },
          400: { description: "Status cannot be advanced" },
          401: { description: "Unauthorized" },
          404: { description: "Order not found" },
        },
      },
    },
    "/orders/{id}/cancel": {
      patch: {
        tags: ["Orders"],
        summary: "Cancel an order (buyer or farmer, only for cancellable statuses)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { reason: { type: "string" } } },
            },
          },
        },
        responses: {
          200: {
            description: "Order cancelled",
            content: { "application/json": { schema: { type: "object", properties: { order_id: { type: "string" }, status: { type: "string" } } } } },
          },
          400: { description: "Cannot cancel at this status" },
          401: { description: "Unauthorized" },
          404: { description: "Order not found" },
        },
      },
    },
    "/orders/{id}/rate": {
      post: {
        tags: ["Orders"],
        summary: "Rate a completed order (buyer rates farmer)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  review: { type: "string" },
                  qualityRating: { type: "integer", minimum: 1, maximum: 5 },
                  communicationRating: { type: "integer", minimum: 1, maximum: 5 },
                  deliveryRating: { type: "integer", minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Rating submitted" },
          400: { description: "Validation error or already rated" },
          401: { description: "Unauthorized" },
          404: { description: "Order not found" },
        },
      },
    },

    // ==================== NOTIFICATIONS ====================
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get all notifications for authenticated user",
        responses: {
          200: {
            description: "Notification list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Notification" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Get count of unread notifications",
        responses: {
          200: {
            description: "Unread count",
            content: { "application/json": { schema: { type: "object", properties: { count: { type: "integer" } } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        responses: {
          200: { description: "All marked read" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark a single notification as read",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Notification marked read" },
          401: { description: "Unauthorized" },
          404: { description: "Notification not found" },
        },
      },
    },

    // ==================== SCANS ====================
    "/scans": {
      post: {
        tags: ["Scans"],
        summary: "Submit a crop image for disease scan",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image", "cropType"],
                properties: {
                  image: { type: "string", format: "binary", description: "Crop image (max 20MB)" },
                  cropType: { type: "string", example: "maize" },
                  farmerNotes: { type: "string" },
                  latitude: { type: "number" },
                  longitude: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Scan submitted", content: { "application/json": { schema: { $ref: "#/components/schemas/Scan" } } } },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/scans/my": {
      get: {
        tags: ["Scans"],
        summary: "Get all scans submitted by authenticated user",
        responses: {
          200: { description: "Scan list", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Scan" } } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
  },
};

export default spec;
