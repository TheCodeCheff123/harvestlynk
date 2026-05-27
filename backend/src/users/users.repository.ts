import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma";
import { prisma } from "src/db";
import { logger } from "src/utils/logger";

@Injectable()
export class UsersRepository {
  async createWalletAndFetchUser(
    userId: string,
    signupData: {
      role: "farmer" | "buyer";
      phoneNumber: string;
      farmName: string;
      location: string;
    },
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.wallet.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            total_paid_in: BigInt(0),
            available_balance: BigInt(0),
            pending_balance: BigInt(0),
            total_paid_out: 0,
          },
          update: {},
        });

        await tx.user.update({
          where: { id: userId },
          data: {
            role: signupData.role,
            farmName: signupData.farmName,
            location: signupData.location,
            phoneNumber: signupData.phoneNumber,
          },
        });

        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { wallet: true },
        });

        if (!user) {
          throw new NotFoundException("User not found");
        }

        return user;
      });
    } catch (error) {
      logger.error("Failed to create wallet for newly registered user", error, {
        userId,
        role: signupData.role,
        phoneNumber: signupData.phoneNumber,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const fieldMap: Record<string, string> = {
          phoneNumber: "Phone number",
          phone_number: "Phone number",
          email: "Email address",
          farmName: "Farm name",
          farm_name: "Farm name",
        };
        // meta.target can be string[] (field names) or a string (constraint name)
        const target = error.meta?.target;
        let fields: string[] = [];
        if (Array.isArray(target)) {
          fields = target as string[];
        } else if (typeof target === "string") {
          // e.g. "user_phoneNumber_key" → extract known field names from it
          fields = Object.keys(fieldMap).filter((f) =>
            (target as string).toLowerCase().includes(f.toLowerCase()),
          );
        }
        const readable = fields.map((f) => fieldMap[f] ?? f).join(", ");
        throw new ConflictException(
          `${readable || "One of the provided values"} is already linked to another account.`,
        );
      }

      throw new InternalServerErrorException(
        "Failed to complete user registration",
      );
    }
  }
}
