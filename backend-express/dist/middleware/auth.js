import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { getSupabaseAdmin } from "../utils/supabase.js";
export async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    try {
        const { data, error } = await getSupabaseAdmin().auth.getUser(token);
        if (error || !data.user?.email) {
            res.status(401).json({ error: "Invalid or expired session" });
            return;
        }
        const email = data.user.email.toLowerCase();
        const [localUser] = await db
            .select({ id: users.id, email: users.email, role: users.role, banned: users.banned, banReason: users.banReason })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        if (!localUser) {
            res.status(401).json({ error: "User profile not found" });
            return;
        }
        if (localUser.banned) {
            res.status(403).json({ error: "This account has been suspended", reason: localUser.banReason });
            return;
        }
        req.authToken = token;
        req.user = {
            userId: localUser.id,
            supabaseUserId: data.user.id,
            email: localUser.email,
            role: localUser.role,
        };
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired session" });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map