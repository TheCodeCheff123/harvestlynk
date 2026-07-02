import { z } from "zod";
export declare const signupSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodEmail;
    phoneNumber: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    role: z.ZodEnum<{
        farmer: "farmer";
        buyer: "buyer";
    }>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const googleAuthSchema: z.ZodObject<{
    idToken: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<{
        farmer: "farmer";
        buyer: "buyer";
    }>>;
}, z.core.$strip>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
//# sourceMappingURL=auth.validator.d.ts.map