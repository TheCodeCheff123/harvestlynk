declare const spec: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        url: string;
        description: string;
    }[];
    components: {
        securitySchemes: {
            cookieAuth: {
                type: string;
                in: string;
                name: string;
                description: string;
            };
            bearerAuth: {
                type: string;
                scheme: string;
                bearerFormat: string;
                description: string;
            };
        };
        schemas: {
            Error: {
                type: string;
                properties: {
                    error: {
                        type: string;
                    };
                };
            };
            ValidationError: {
                type: string;
                properties: {
                    error: {
                        type: string;
                        example: string;
                    };
                    details: {
                        type: string;
                        additionalProperties: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                };
            };
            User: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    firstName: {
                        type: string;
                    };
                    lastName: {
                        type: string;
                    };
                    email: {
                        type: string;
                        format: string;
                    };
                    role: {
                        type: string;
                        enum: string[];
                    };
                    phoneNumber: {
                        type: string;
                        nullable: boolean;
                    };
                    farmName: {
                        type: string;
                        nullable: boolean;
                    };
                    location: {
                        type: string;
                        nullable: boolean;
                    };
                    image: {
                        type: string;
                        nullable: boolean;
                    };
                    emailVerified: {
                        type: string;
                    };
                    trustScore: {
                        type: string;
                    };
                    location_state: {
                        type: string;
                        nullable: boolean;
                    };
                    location_lga: {
                        type: string;
                        nullable: boolean;
                    };
                    location_village: {
                        type: string;
                        nullable: boolean;
                    };
                    bank_name: {
                        type: string;
                        nullable: boolean;
                    };
                    bank_account_number: {
                        type: string;
                        nullable: boolean;
                    };
                    bank_account_name: {
                        type: string;
                        nullable: boolean;
                    };
                    liveness_verified: {
                        type: string;
                    };
                    preferred_language: {
                        type: string;
                        nullable: boolean;
                    };
                    bio: {
                        type: string;
                        nullable: boolean;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            AuthResponse: {
                type: string;
                properties: {
                    token: {
                        type: string;
                    };
                    user: {
                        $ref: string;
                    };
                };
            };
            Listing: {
                type: string;
                properties: {
                    listingId: {
                        type: string;
                        format: string;
                    };
                    farmerId: {
                        type: string;
                    };
                    productName: {
                        type: string;
                    };
                    category: {
                        type: string;
                    };
                    quantity: {
                        type: string;
                    };
                    unit: {
                        type: string;
                    };
                    pricePerUnit: {
                        type: string;
                        description: string;
                    };
                    totalPrice: {
                        type: string;
                    };
                    locationState: {
                        type: string;
                    };
                    locationLga: {
                        type: string;
                        nullable: boolean;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                    };
                    images: {
                        type: string;
                        items: {
                            type: string;
                        };
                        nullable: boolean;
                    };
                    deliveryOptions: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    views: {
                        type: string;
                    };
                    expiresAt: {
                        type: string;
                        format: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            BuyerOrder: {
                type: string;
                properties: {
                    order_id: {
                        type: string;
                        format: string;
                    };
                    order_ref: {
                        type: string;
                        example: string;
                    };
                    farmer_id: {
                        type: string;
                    };
                    quantity: {
                        type: string;
                    };
                    unit_price: {
                        type: string;
                    };
                    total_amount: {
                        type: string;
                    };
                    delivery_method: {
                        type: string;
                        enum: string[];
                    };
                    delivery_address: {
                        type: string;
                        nullable: boolean;
                    };
                    special_instructions: {
                        type: string;
                        nullable: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    escrow_state: {
                        type: string;
                        enum: string[];
                    };
                    completed_at: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                    created_at: {
                        type: string;
                        format: string;
                    };
                    updated_at: {
                        type: string;
                        format: string;
                    };
                    listing: {
                        type: string;
                        properties: {
                            product_name: {
                                type: string;
                            };
                            unit: {
                                type: string;
                            };
                        };
                    };
                    farmer: {
                        type: string;
                        properties: {
                            name: {
                                type: string;
                            };
                            farmName: {
                                type: string;
                                nullable: boolean;
                            };
                        };
                    };
                };
            };
            Wallet: {
                type: string;
                properties: {
                    wallet_id: {
                        type: string;
                        format: string;
                    };
                    user_id: {
                        type: string;
                    };
                    available_balance: {
                        type: string;
                        description: string;
                    };
                    pending_balance: {
                        type: string;
                    };
                    total_paid_in: {
                        type: string;
                    };
                    created_at: {
                        type: string;
                        format: string;
                    };
                    updated_at: {
                        type: string;
                        format: string;
                    };
                };
            };
            Transaction: {
                type: string;
                properties: {
                    transaction_id: {
                        type: string;
                        format: string;
                    };
                    wallet_id: {
                        type: string;
                        format: string;
                    };
                    user_id: {
                        type: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                    };
                    amount: {
                        type: string;
                    };
                    balance_before: {
                        type: string;
                    };
                    balance_after: {
                        type: string;
                    };
                    reference_id: {
                        type: string;
                        nullable: boolean;
                    };
                    reference_type: {
                        type: string;
                        nullable: boolean;
                    };
                    description: {
                        type: string;
                        nullable: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    created_at: {
                        type: string;
                        format: string;
                    };
                };
            };
            Notification: {
                type: string;
                properties: {
                    notificationId: {
                        type: string;
                        format: string;
                    };
                    userId: {
                        type: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                    };
                    title: {
                        type: string;
                    };
                    message: {
                        type: string;
                    };
                    isRead: {
                        type: string;
                    };
                    referenceId: {
                        type: string;
                        nullable: boolean;
                    };
                    referenceType: {
                        type: string;
                        nullable: boolean;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            Scan: {
                type: string;
                properties: {
                    scanId: {
                        type: string;
                        format: string;
                    };
                    userId: {
                        type: string;
                    };
                    imageUrl: {
                        type: string;
                    };
                    thumbnailUrl: {
                        type: string;
                        nullable: boolean;
                    };
                    cropType: {
                        type: string;
                    };
                    farmerNotes: {
                        type: string;
                        nullable: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    resultDisease: {
                        type: string;
                        nullable: boolean;
                    };
                    resultConfidence: {
                        type: string;
                        nullable: boolean;
                    };
                    resultSeverity: {
                        type: string;
                        enum: string[];
                        nullable: boolean;
                    };
                    resultRecommendations: {
                        type: string;
                        items: {
                            type: string;
                        };
                        nullable: boolean;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    completedAt: {
                        type: string;
                        format: string;
                        nullable: boolean;
                    };
                };
            };
        };
    };
    security: ({
        cookieAuth: never[];
        bearerAuth?: undefined;
    } | {
        bearerAuth: never[];
        cookieAuth?: undefined;
    })[];
    paths: {
        "/health": {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        status: {
                                            type: string;
                                            example: string;
                                        };
                                        timestamp: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/auth/google": {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    idToken: {
                                        type: string;
                                        description: string;
                                    };
                                    role: {
                                        type: string;
                                        enum: string[];
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    403: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    404: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/auth/signup": {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    firstName: {
                                        type: string;
                                        minLength: number;
                                        maxLength: number;
                                    };
                                    lastName: {
                                        type: string;
                                        minLength: number;
                                        maxLength: number;
                                    };
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    password: {
                                        type: string;
                                        minLength: number;
                                        description: string;
                                    };
                                    confirmPassword: {
                                        type: string;
                                    };
                                    role: {
                                        type: string;
                                        enum: string[];
                                    };
                                    phoneNumber: {
                                        type: string;
                                        example: string;
                                    };
                                    location: {
                                        type: string;
                                    };
                                    acceptTerms: {
                                        type: string;
                                        enum: boolean[];
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    409: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/auth/login": {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    password: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    403: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/auth/sign-in/email": {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    password: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/auth/sign-out": {
            post: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        message: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/auth/get-session": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        user: {
                                            oneOf: ({
                                                $ref: string;
                                                type?: undefined;
                                            } | {
                                                type: string;
                                                $ref?: undefined;
                                            })[];
                                        };
                                        session: {
                                            oneOf: ({
                                                type: string;
                                                properties: {
                                                    userId: {
                                                        type: string;
                                                    };
                                                };
                                            } | {
                                                type: string;
                                                properties?: undefined;
                                            })[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/users/signup": {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    firstName: {
                                        type: string;
                                    };
                                    lastName: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                        format: string;
                                    };
                                    password: {
                                        type: string;
                                    };
                                    role: {
                                        type: string;
                                        enum: string[];
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    409: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/users/me": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/me/stats": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    additionalProperties: boolean;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/": {
            patch: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                properties: {
                                    firstName: {
                                        type: string;
                                    };
                                    lastName: {
                                        type: string;
                                    };
                                    phoneNumber: {
                                        type: string;
                                    };
                                    location: {
                                        type: string;
                                    };
                                    farmName: {
                                        type: string;
                                    };
                                    bio: {
                                        type: string;
                                    };
                                    preferredLanguage: {
                                        type: string;
                                    };
                                    locationState: {
                                        type: string;
                                    };
                                    locationLga: {
                                        type: string;
                                    };
                                    locationVillage: {
                                        type: string;
                                    };
                                    bankName: {
                                        type: string;
                                    };
                                    bankAccountNumber: {
                                        type: string;
                                    };
                                    bankAccountName: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/avatar": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    file: {
                                        type: string;
                                        format: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        image: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/liveness-check": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    selfie: {
                                        type: string;
                                        format: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        passed: {
                                            type: string;
                                        };
                                        liveness_score: {
                                            type: string;
                                        };
                                        message: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/verify-nin": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    file: {
                                        type: string;
                                        format: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        nin_document_url: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/upload-ownership-doc": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    file: {
                                        type: string;
                                        format: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        ownership_document_url: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/{id}": {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/users/{id}/ratings": {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        average_rating: {
                                            type: string;
                                        };
                                        total_ratings: {
                                            type: string;
                                        };
                                        ratings: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    ratingId: {
                                                        type: string;
                                                    };
                                                    rating: {
                                                        type: string;
                                                    };
                                                    review: {
                                                        type: string;
                                                        nullable: boolean;
                                                    };
                                                    qualityRating: {
                                                        type: string;
                                                        nullable: boolean;
                                                    };
                                                    communicationRating: {
                                                        type: string;
                                                        nullable: boolean;
                                                    };
                                                    deliveryRating: {
                                                        type: string;
                                                        nullable: boolean;
                                                    };
                                                    createdAt: {
                                                        type: string;
                                                        format: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/wallet/banks": {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        banks: {
                                            type: string;
                                            items: {
                                                type: string;
                                                properties: {
                                                    name: {
                                                        type: string;
                                                    };
                                                    code: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/v1/wallet/balance": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/wallet/transactions": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    items: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/wallet/verify-bank": {
            get: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                    example: string;
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        message: {
                                            type: string;
                                        };
                                        data: {
                                            type: string;
                                            properties: {
                                                account_name: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/wallet/withdraw": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    amount: {
                                        type: string;
                                        description: string;
                                    };
                                    bank_name: {
                                        type: string;
                                    };
                                    bank_code: {
                                        type: string;
                                    };
                                    account_number: {
                                        type: string;
                                        minLength: number;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        success: {
                                            type: string;
                                        };
                                        message: {
                                            type: string;
                                        };
                                        transaction_id: {
                                            type: string;
                                        };
                                        status: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/marketplace/listings": {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        default: number;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        default?: undefined;
                    };
                })[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        data: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                        page: {
                                            type: string;
                                        };
                                        limit: {
                                            type: string;
                                        };
                                        total: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    productName: {
                                        type: string;
                                    };
                                    category: {
                                        type: string;
                                    };
                                    quantity: {
                                        type: string;
                                    };
                                    unit: {
                                        type: string;
                                        example: string;
                                    };
                                    pricePerUnit: {
                                        type: string;
                                        description: string;
                                    };
                                    locationState: {
                                        type: string;
                                    };
                                    locationLga: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    images: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    deliveryOptions: {
                                        type: string;
                                        items: {
                                            type: string;
                                            enum: string[];
                                        };
                                    };
                                    harvestDate: {
                                        type: string;
                                        format: string;
                                    };
                                    pickupAddress: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                    403: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/marketplace/listings/my": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    items: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/marketplace/listings/{id}": {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    404: {
                        description: string;
                    };
                };
            };
            patch: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                properties: {
                                    productName: {
                                        type: string;
                                    };
                                    quantity: {
                                        type: string;
                                    };
                                    pricePerUnit: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    status: {
                                        type: string;
                                        enum: string[];
                                    };
                                    images: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                    403: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
            delete: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/marketplace/upload": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    file: {
                                        type: string;
                                        format: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        url: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/orders": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    listing_id: {
                                        type: string;
                                        format: string;
                                    };
                                    quantity: {
                                        type: string;
                                        minimum: number;
                                    };
                                    delivery_method: {
                                        type: string;
                                        enum: string[];
                                    };
                                    delivery_address: {
                                        type: string;
                                        nullable: boolean;
                                    };
                                    special_instructions: {
                                        type: string;
                                        nullable: boolean;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/orders/buyer": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    items: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/orders/my": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    items: {
                                        type: string;
                                        properties: {
                                            order_id: {
                                                type: string;
                                            };
                                            order_ref: {
                                                type: string;
                                            };
                                            buyer_id: {
                                                type: string;
                                            };
                                            quantity: {
                                                type: string;
                                            };
                                            unit_price: {
                                                type: string;
                                            };
                                            total_amount: {
                                                type: string;
                                            };
                                            delivery_method: {
                                                type: string;
                                            };
                                            status: {
                                                type: string;
                                            };
                                            escrow_state: {
                                                type: string;
                                            };
                                            listing: {
                                                type: string;
                                                properties: {
                                                    product_name: {
                                                        type: string;
                                                    };
                                                    unit: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                            buyer: {
                                                type: string;
                                                properties: {
                                                    name: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/orders/{id}/confirm-delivery": {
            patch: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        message: {
                                            type: string;
                                        };
                                        order: {
                                            type: string;
                                            properties: {
                                                order_id: {
                                                    type: string;
                                                };
                                                status: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/orders/{id}/status": {
            patch: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        order_id: {
                                            type: string;
                                        };
                                        status: {
                                            type: string;
                                        };
                                        escrow_state: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/orders/{id}/cancel": {
            patch: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                properties: {
                                    reason: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        order_id: {
                                            type: string;
                                        };
                                        status: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/orders/{id}/rate": {
            post: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    rating: {
                                        type: string;
                                        minimum: number;
                                        maximum: number;
                                    };
                                    review: {
                                        type: string;
                                    };
                                    qualityRating: {
                                        type: string;
                                        minimum: number;
                                        maximum: number;
                                    };
                                    communicationRating: {
                                        type: string;
                                        minimum: number;
                                        maximum: number;
                                    };
                                    deliveryRating: {
                                        type: string;
                                        minimum: number;
                                        maximum: number;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/notifications": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    items: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/notifications/unread-count": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        count: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/notifications/read-all": {
            patch: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/notifications/{id}/read": {
            patch: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/scans": {
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    image: {
                                        type: string;
                                        format: string;
                                        description: string;
                                    };
                                    cropType: {
                                        type: string;
                                        example: string;
                                    };
                                    farmerNotes: {
                                        type: string;
                                    };
                                    latitude: {
                                        type: string;
                                    };
                                    longitude: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        "/api/v1/scans/my": {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    200: {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    items: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
    };
};
export default spec;
//# sourceMappingURL=openapi.d.ts.map