import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  AllowAnonymous,
  Session,
  type UserSession,
} from "@thallesp/nestjs-better-auth";
import type { Request as ExpressRequest, Response } from "express";
import {
  CompleteOAuthRequestDto,
  CompleteOAuthRequestSchema,
  GetUserResponseDto,
  GetUserResponseSchema,
  SignupRequestDto,
  UpdateProfileRequestDto,
  UpdateProfileRequestSchema,
  UpdateProfileResponseDto,
  UpdateProfileResponseSchema,
} from "./users.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("signup")
  @AllowAnonymous()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({
    type: SignupRequestDto,
    description: "User signup data",
  })
  @ApiResponse({
    status: 201,
    description: "User registered successfully and automatically signed in",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid signup data",
  })
  @ApiResponse({
    status: 409,
    description: "A user with this email already exists",
  })
  async signUp(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() body: SignupRequestDto,
  ): Promise<void> {
    await this.usersService.signup(body, req, response);
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({
    name: "id",
    type: "string",
    description: "User ID",
  })
  @ApiResponse({
    status: 200,
    description: "User retrieved successfully",
    type: GetUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  async getUser(@Param("id") id: string) {
    const result = await this.usersService.findOne(id);
    return GetUserResponseSchema.decode(result);
  }

  @Post("complete-oauth")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete profile for Google OAuth user" })
  @ApiBody({ type: CompleteOAuthRequestDto })
  @ApiResponse({ status: 200, description: "Profile completed", type: GetUserResponseDto })
  async completeOAuthProfile(@Session() session: UserSession, @Body() body: unknown) {
    const data = CompleteOAuthRequestSchema.parse(body);
    const result = await this.usersService.completeOAuthProfile(session.user.id, data);
    return GetUserResponseSchema.decode(result);
  }

  @Patch("/")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiBody({
    type: UpdateProfileRequestDto,
    description: "User profile update data",
  })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    type: UpdateProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid update data",
  })
  async updateUser(@Session() session: UserSession, @Body() body: unknown) {
    const updateData = UpdateProfileRequestSchema.parse(body);
    const result = await this.usersService.updateProfile(
      session.user.id,
      updateData,
    );
    return UpdateProfileResponseSchema.decode(result);
  }
}
