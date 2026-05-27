import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "generated/prisma";
import { env } from "src/env";

export const prisma = new PrismaClient({
  adapter: new PrismaPg(env.DATABASE_URL),
});
