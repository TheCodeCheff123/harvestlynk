import type { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        supabaseUserId?: string;
        email: string;
        role: "farmer" | "buyer";
    };
    authToken?: string;
}
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(...roles: Array<"farmer" | "buyer">): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map