import { WebSocketServer, WebSocket } from "ws";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { getSupabaseAdmin } from "./supabase.js";
const clients = new Map();
export function initWsServer(server) {
    const wss = new WebSocketServer({ server, path: "/ws" });
    wss.on("connection", async (ws, req) => {
        const url = new URL(req.url, "http://localhost");
        const token = url.searchParams.get("token");
        if (!token) {
            ws.close(1008, "Unauthorized");
            return;
        }
        try {
            const { data, error } = await getSupabaseAdmin().auth.getUser(token);
            if (error || !data.user?.email)
                throw new Error("Invalid token");
            const [localUser] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, data.user.email.toLowerCase()))
                .limit(1);
            if (!localUser)
                throw new Error("Profile not found");
            const userId = localUser.id;
            if (!clients.has(userId))
                clients.set(userId, new Set());
            clients.get(userId).add(ws);
            ws.on("close", () => {
                clients.get(userId)?.delete(ws);
                if (clients.get(userId)?.size === 0)
                    clients.delete(userId);
            });
            ws.send(JSON.stringify({ type: "connected" }));
        }
        catch {
            ws.close(1008, "Invalid token");
        }
    });
    return wss;
}
export function pushToUser(userId, data) {
    const userClients = clients.get(userId);
    if (!userClients)
        return;
    const message = JSON.stringify(data);
    for (const ws of userClients) {
        if (ws.readyState === WebSocket.OPEN)
            ws.send(message);
    }
}
//# sourceMappingURL=wsServer.js.map