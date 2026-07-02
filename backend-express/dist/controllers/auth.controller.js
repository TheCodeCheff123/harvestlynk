import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets } from "../db/schema.js";
import { signupSchema, loginSchema, googleAuthSchema } from "../validators/auth.validator.js";
import { getAuthRedirectUrl, getSupabaseAdmin, getSupabaseUserNameParts, isSupabaseEmailVerified, } from "../utils/supabase.js";
import { verifyEmailVerificationToken } from "../utils/jwt.js";
// Minimal shape returned in auth responses (login, signup, verify)
export const authUser = (user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role,
    image: user.image,
    emailVerified: user.emailVerified,
});
// Full shape returned when the user explicitly fetches their own profile
export const safeUser = (user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    farmName: user.farmName,
    location: user.location,
    image: user.image,
    emailVerified: user.emailVerified,
    trustScore: user.trustScore,
    location_state: user.locationState,
    location_lga: user.locationLga,
    location_village: user.locationVillage,
    bank_name: user.bankName,
    bank_account_number: user.bankAccountNumber,
    bank_account_name: user.bankAccountName,
    liveness_verified: user.livenessVerified,
    preferred_language: user.preferredLanguage,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});
function getSessionResponse(session, user) {
    return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        user: authUser(user),
    };
}
async function createWalletIfMissing(userId) {
    await db.insert(wallets).values({
        userId,
        availableBalance: 0,
        pendingBalance: 0,
        totalPaidIn: 0,
        totalPaidOut: 0,
    }).onConflictDoNothing();
}
async function findLocalUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return user;
}
async function createOrUpdateLocalProfile(opts) {
    const email = opts.email.toLowerCase();
    const existing = await findLocalUserByEmail(email);
    if (existing) {
        const [updated] = await db
            .update(users)
            .set({
            emailVerified: opts.emailVerified || existing.emailVerified,
            image: opts.image ?? existing.image,
            lastActiveAt: new Date(),
        })
            .where(eq(users.id, existing.id))
            .returning();
        await createWalletIfMissing(existing.id);
        return updated;
    }
    if (!opts.role) {
        throw new Error("Role is required to create a HarvestLynk profile");
    }
    const [created] = await db.insert(users).values({
        id: opts.supabaseUserId,
        firstName: opts.firstName ?? "HarvestLynk",
        lastName: opts.lastName ?? "User",
        email,
        passwordHash: "supabase-auth",
        role: opts.role,
        phoneNumber: opts.phoneNumber,
        location: opts.location,
        image: opts.image,
        emailVerified: opts.emailVerified,
        acceptedTerms: true,
        lastActiveAt: new Date(),
    }).returning();
    if (!created)
        throw new Error("Failed to create local profile");
    await createWalletIfMissing(created.id);
    return created;
}
export async function signup(req, res) {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
        return;
    }
    const { firstName, lastName, email, password, phoneNumber, location, role } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
    }
    if (phoneNumber) {
        const [existingPhone] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, phoneNumber)).limit(1);
        if (existingPhone) {
            res.status(409).json({ error: "An account with this phone number already exists" });
            return;
        }
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
            emailRedirectTo: getAuthRedirectUrl("/verify-email"),
            data: {
                firstName,
                lastName,
                phoneNumber,
                location,
                role,
            },
        },
    });
    if (error || !data.user) {
        res.status(error?.status ?? 400).json({ error: error?.message ?? "Failed to create account" });
        return;
    }
    await createOrUpdateLocalProfile({
        supabaseUserId: data.user.id,
        email: normalizedEmail,
        emailVerified: isSupabaseEmailVerified(data.user),
        role,
        firstName,
        lastName,
        phoneNumber,
        location,
    });
    res.status(201).json({ message: "Account created. Please check your email to verify your account." });
}
export async function login(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
        return;
    }
    const { email, password } = parsed.data;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user?.email) {
        const message = error?.message?.toLowerCase().includes("email not confirmed")
            ? "Please verify your email before logging in"
            : "Invalid email or password";
        res.status(error?.status === 400 ? 401 : error?.status ?? 401).json({ error: message });
        return;
    }
    const localUser = await createOrUpdateLocalProfile({
        supabaseUserId: data.user.id,
        email: data.user.email,
        emailVerified: isSupabaseEmailVerified(data.user),
    });
    if (localUser.banned) {
        res.status(403).json({ error: "This account has been suspended", reason: localUser.banReason });
        return;
    }
    res.json(getSessionResponse(data.session, localUser));
}
export async function googleAuth(req, res) {
    const parsed = googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
        return;
    }
    const { idToken, role } = parsed.data;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
    });
    if (error || !data.session || !data.user?.email) {
        res.status(error?.status ?? 401).json({ error: error?.message ?? "Invalid Google token" });
        return;
    }
    const existing = await findLocalUserByEmail(data.user.email);
    if (!existing && !role) {
        await supabase.auth.admin.signOut(data.session.access_token, "global").catch(() => { });
        res.status(404).json({ error: "No HarvestLynk profile found for this Google account. Please choose a role and sign up first." });
        return;
    }
    const { firstName, lastName } = getSupabaseUserNameParts(data.user);
    const avatar = typeof data.user.user_metadata?.["avatar_url"] === "string"
        ? data.user.user_metadata["avatar_url"]
        : typeof data.user.user_metadata?.["picture"] === "string"
            ? data.user.user_metadata["picture"]
            : null;
    const localUser = await createOrUpdateLocalProfile({
        supabaseUserId: data.user.id,
        email: data.user.email,
        emailVerified: isSupabaseEmailVerified(data.user),
        role,
        firstName,
        lastName,
        image: avatar,
    });
    if (localUser.banned) {
        res.status(403).json({ error: "This account has been suspended", reason: localUser.banReason });
        return;
    }
    res.json(getSessionResponse(data.session, localUser));
}
export async function verifyEmail(req, res) {
    const token = typeof req.query["token"] === "string" ? req.query["token"] : null;
    const refreshToken = typeof req.query["refreshToken"] === "string" ? req.query["refreshToken"] : null;
    if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user?.email) {
        const localUser = await createOrUpdateLocalProfile({
            supabaseUserId: data.user.id,
            email: data.user.email,
            emailVerified: isSupabaseEmailVerified(data.user),
        });
        if (!localUser.emailVerified) {
            res.status(400).json({ error: "Email is not verified yet. Please use the latest link from your inbox." });
            return;
        }
        res.json({
            accessToken: token,
            refreshToken: refreshToken ?? "",
            user: authUser(localUser),
        });
        return;
    }
    // Backward-compatible fallback for older local verification links.
    try {
        const { userId } = await verifyEmailVerificationToken(token);
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const [updated] = await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId)).returning();
        res.json({ accessToken: "", refreshToken: "", user: authUser(updated) });
    }
    catch {
        res.status(400).json({ error: "Invalid or expired verification link. Please request a new one." });
    }
}
export async function resendVerification(req, res) {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
    }
    const { error } = await getSupabaseAdmin().auth.resend({
        type: "signup",
        email: email.toLowerCase().trim(),
        options: { emailRedirectTo: getAuthRedirectUrl("/verify-email") },
    });
    if (error) {
        res.status(error.status ?? 400).json({ error: error.message });
        return;
    }
    res.json({ message: "If that email exists and is unverified, a new link has been sent." });
}
export async function refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ error: "Refresh token is required" });
        return;
    }
    const { data, error } = await getSupabaseAdmin().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user?.email) {
        res.status(error?.status ?? 401).json({ error: error?.message ?? "Invalid or expired refresh token" });
        return;
    }
    const localUser = await createOrUpdateLocalProfile({
        supabaseUserId: data.user.id,
        email: data.user.email,
        emailVerified: isSupabaseEmailVerified(data.user),
    });
    if (localUser.banned) {
        res.status(401).json({ error: "User not found or suspended" });
        return;
    }
    res.json({ accessToken: data.session.access_token, refreshToken: data.session.refresh_token });
}
export async function logout(req, res) {
    const header = req.headers.authorization;
    const accessToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (accessToken) {
        const { error } = await getSupabaseAdmin().auth.admin.signOut(accessToken, "local");
        if (error) {
            res.status(error.status ?? 400).json({ error: error.message });
            return;
        }
    }
    res.json({ message: "Logged out" });
}
export async function revokeSession(_req, res) {
    res.status(410).json({ error: "Session revoke links are managed by Supabase Auth now." });
}
export async function getSessions(_req, res) {
    res.json([]);
}
export async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
    }
    const { error } = await getSupabaseAdmin().auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: getAuthRedirectUrl("/reset-password"),
    });
    if (error) {
        res.status(error.status ?? 400).json({ error: error.message });
        return;
    }
    res.json({ message: "If that email exists and is verified, a reset link has been sent." });
}
export async function resetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) {
        res.status(400).json({ error: "Token and password are required" });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
        return;
    }
    const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password });
    if (updateError) {
        res.status(updateError.status ?? 400).json({ error: updateError.message });
        return;
    }
    res.json({ message: "Password updated. Please log in with your new password." });
}
export async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "currentPassword and newPassword are required" });
        return;
    }
    if (newPassword.length < 8) {
        res.status(400).json({ error: "New password must be at least 8 characters" });
        return;
    }
    if (currentPassword === newPassword) {
        res.status(400).json({ error: "New password must be different from your current password" });
        return;
    }
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    const supabase = getSupabaseAdmin();
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    });
    if (signInError) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
    }
    const supabaseUserId = req.user.supabaseUserId;
    if (!supabaseUserId) {
        res.status(400).json({ error: "Supabase user id not found for current session" });
        return;
    }
    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUserId, { password: newPassword });
    if (updateError) {
        res.status(updateError.status ?? 400).json({ error: updateError.message });
        return;
    }
    res.json({ message: "Password changed successfully" });
}
export async function revokeOtherSessions(req, res) {
    const token = req.authToken;
    if (!token) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    const { error } = await getSupabaseAdmin().auth.admin.signOut(token, "others");
    if (error) {
        res.status(error.status ?? 400).json({ error: error.message });
        return;
    }
    res.json({ message: "Other sessions revoked" });
}
//# sourceMappingURL=auth.controller.js.map