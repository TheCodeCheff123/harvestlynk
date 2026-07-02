import { type SupabaseClient, type User as SupabaseUser } from "@supabase/supabase-js";
export declare function getSupabaseAdmin(): SupabaseClient;
export declare function getAuthRedirectUrl(path: string): string;
export declare function isSupabaseEmailVerified(user: SupabaseUser): boolean;
export declare function getSupabaseUserNameParts(user: SupabaseUser): {
    firstName: string;
    lastName: string;
};
//# sourceMappingURL=supabase.d.ts.map