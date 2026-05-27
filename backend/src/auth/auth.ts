/*
 * Email OTP: https://better-auth.com/docs/plugins/email-otp
 * Route Protection: https://better-auth.com/docs/integrations/nestjs?utm_source=chatgpt.com#3-route-protection
 * Role Based Access Control: https://github.com/ThallesP/nestjs-better-auth#role-based-access-control
 * Phone Number setup: https://better-auth.com/docs/plugins/phone-number
 * */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, createAccessControl, phoneNumber } from "better-auth/plugins";
import { prisma } from "src/db";
import { env } from "src/env";

// eslint-disable-next-line no-restricted-syntax
const statement = {
  // project: ["create", "share", "update", "delete"],
  // sale: ["create", "read", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

const farmer = ac.newRole({});
const buyer = ac.newRole({});

// @ts-ignore
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "https://harvestlynk.vercel.app",
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      updateUserInfoOnLink: true,
    },
  },
  plugins: [
    admin({
      defaultRole: "buyer",
      ac,
      roles: {
        farmer,
        buyer,
      },
    }),
    phoneNumber({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sendOTP: ({ phoneNumber, code }, ctx) => {
        // Implement sending OTP code via SMS
      },
    }),
    // emailOTP({
    //   // eslint-disable-next-line require-await, @typescript-eslint/no-unused-vars
    //   async sendVerificationOTP({ email, otp, type }) {
    //     if (type === "sign-in") {
    //       // Send the OTP for sign in
    //     } else if (type === "email-verification") {
    //       // Send the OTP for email verification
    //     } else {
    //       // Send the OTP for password reset
    //     }
    //   },
    // }),
  ],
});
