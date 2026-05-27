import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { isAPIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import type { Request as ExpressRequest, Response } from "express";
import { auth } from "src/auth/auth";
import { prisma } from "src/db";
import { logger } from "src/utils/logger";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { type CompleteOAuthRequest, type SignupRequest, UpdateProfileRequest } from "./users.dto";
import { UsersRepository } from "./users.repository";

interface SignupAuthResponse {
  headers: Headers;
  response: {
    id?: string;
    user?: {
      id: string;
    };
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService<typeof auth>,
  ) {}

  /**
   * Fetch a user profile by ID
   * @param userId - The unique identifier of the user
   * @returns User profile data
   * @throws NotFoundException if user does not exist
   */
  async findOne(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  /**
   * Update user profile information including location and bank details
   * @param userId - The unique identifier of the user
   * @param data - Profile data to update
   * @returns Updated user profile
   */
  async completeOAuthProfile(userId: string, data: CompleteOAuthRequest) {
    const existing = await prisma.wallet.findUnique({ where: { user_id: userId } });
    if (existing) {
      // Returning user — just ensure role is correct
      return prisma.user.update({
        where: { id: userId },
        data: { role: data.role },
        include: { wallet: true },
      });
    }
    // New OAuth user — create wallet and set profile fields
    return this.usersRepository.createWalletAndFetchUser(userId, {
      role: data.role,
      farmName: data.farmName ?? "",
      location: data.location ?? "",
      phoneNumber: data.phoneNumber ?? "",
    });
  }

  updateProfile(userId: string, data: UpdateProfileRequest) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.fullName,
        location_state: data.locationState,
        location_lga: data.locationLga,
        location_village: data.locationVillage,
        bank_name: data.bankName,
        bank_account_number: data.bankAccountNumber,
        bank_account_name: data.bankAccountName,
        preferred_language: data.preferredLanguage,
      },
    });
  }

  /**
   * Finalize a newly created auth user by provisioning persistence records.
   * @param userId - The unique identifier of the newly created user
   * @returns User profile data with wallet relation
   */
  async completeRegistration(
    userId: string,
    signupData: Pick<
      SignupRequest,
      "role" | "phoneNumber" | "farmName" | "location"
    >,
  ) {
    return await this.usersRepository.createWalletAndFetchUser(
      userId,
      signupData,
    );
  }

  /**
   * Register a new user with email and password
   * Handles auth signup, profile completion, and automatic sign-in
   * @param signupData - User registration data
   * @param req - Express request object for headers
   * @param response - Express response object for piping auth response
   * @throws BadRequestException if signup data is invalid
   * @throws ConflictException if email already exists
   * @throws InternalServerErrorException if registration fails
   */
  async signup(
    signupData: SignupRequest,
    req: ExpressRequest,
    response: Response,
  ): Promise<void> {
    try {
      // Step 1: Create user in better-auth
      const signupResult: SignupAuthResponse =
        await this.authService.api.signUpEmail({
          returnHeaders: true,
          headers: fromNodeHeaders(req.headers),
          body: {
            email: signupData.email,
            password: signupData.password,
            name: signupData.fullName,
          },
        });

      const createdUser = signupResult.response.user ?? signupResult.response;
      const createdUserId = createdUser.id;

      if (!createdUserId) {
        throw new InternalServerErrorException(
          "User registration did not return a created user",
        );
      }

      // Step 2: Complete registration with additional user data
      await this.completeRegistration(createdUserId, {
        role: signupData.role,
        phoneNumber: signupData.phoneNumber,
        farmName: signupData.farmName,
        location: signupData.location,
      });

      // Step 3: Automatically sign in the user and forward the session cookie
      const signInResult = await auth.api.signInEmail({
        body: {
          email: signupData.email,
          password: signupData.password,
        },
        asResponse: true,
      });

      // Step 4: Forward only the Set-Cookie header, then end with empty body
      // (avoids stream piping issues that cause truncated JSON on the client)
      const setCookie = signInResult.headers.get("set-cookie");
      if (setCookie) {
        response.setHeader("set-cookie", setCookie);
      }
      response.status(200).end();
    } catch (error) {
      logger.error("Failed to register user", error, {
        email: signupData.email,
        role: signupData.role,
      });

      // Re-throw known HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Handle better-auth API errors
      if (isAPIError(error)) {
        if (error.status === 409) {
          throw new ConflictException(error.message);
        }

        throw new BadRequestException(error.message);
      }

      // Generic error fallback
      throw new InternalServerErrorException("Failed to register user");
    }
  }
}
