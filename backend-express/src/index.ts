import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import { initWsServer } from "./utils/wsServer.js";
import { startPayoutReconciliationPoller } from "./utils/payoutReconciliation.js";
import { startMessageCleanupJob } from "./utils/messageCleanup.js";

const PORT = process.env["PORT"] ?? 4000;

const server = createServer(app);
initWsServer(server);
startPayoutReconciliationPoller();
startMessageCleanupJob();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
