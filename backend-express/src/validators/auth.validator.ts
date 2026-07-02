import { z } from "zod";

export const signupSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters").max(50).trim(),
    lastName: z.string().min(2, "Last name must be at least 2 characters").max(50).trim(),
    email: z.email("Invalid email address").toLowerCase().trim(),
    phoneNumber: z
      .string()
      .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number")
      .optional(),
    location: z.string().min(2, "Location is required").max(100).trim().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    role: z.enum(["farmer", "buyer"], { error: "Role must be farmer or buyer" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
  role: z.enum(["farmer", "buyer"]).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
