import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import { initWsServer } from "./utils/wsServer.js";
import { startPayoutReconciliationPoller } from "./utils/payoutReconciliation.js";

const PORT = process.env["PORT"] ?? 4000;

const server = createServer(app);
initWsServer(server);
startPayoutReconciliationPoller();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
