import http from "http";
import os from "os";
import process from "process";

const HEALTH_PORT = process.env.HEALTH_PORT || 5001;

// Very small, fast, and dependency-free health server
const server = http.createServer((req, res) => {
  // Only respond to GET /health to keep logic minimal
  if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
    const payload = {
      status: "OK",
      message: "iBarangay health check",
      pid: process.pid,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }

  // Keep other responses minimal
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(HEALTH_PORT, () => {
  // Use a concise log message; this server should be extremely lightweight
  // and not import/initialize any other modules.
  console.log(`Health server ready at http://localhost:${HEALTH_PORT}/health`);
});

// Ensure the health server won't exit when the parent exits on some platforms
server.on("error", (err) => {
  console.error("Health server error:", err);
});

export default server;
