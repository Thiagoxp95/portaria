import express from "express";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { handleMCPRequest } from "./mcp-handler.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy headers (required for Render, Railway, etc.)
app.set("trust proxy", true);

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "portaria-mcp-server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint - show available tools
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Portaria MCP Server is running",
    version: "1.0.0",
    protocol: "MCP 2024-11-05",
    transport: "SSE",
    endpoints: {
      sse: `${req.protocol}://${req.get("host")}/sse`,
      message: `${req.protocol}://${req.get("host")}/message?sessionId=<generated>`,
      health: `${req.protocol}://${req.get("host")}/health`,
    },
    tools: [
      "get_phone_by_apartment",
      "start_whatsapp_consent",
      "get_consent_status",
    ],
    instructions: {
      "For ElevenLabs": "Use the SSE endpoint URL as your server URL",
      "Test SSE": `curl -N ${req.protocol}://${req.get("host")}/sse`,
      "Test Initialize": `curl -X POST "${req.protocol}://${req.get("host")}/message?sessionId=test" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'`,
    },
  });
});

// SSE endpoint - establishes persistent connection
app.get("/sse", (req, res) => {
  // Generate unique session ID for this connection
  const sessionId = randomUUID();

  console.log(`[SSE] Connection attempt from ${req.ip}, sessionId: ${sessionId}`);
  console.log(`[SSE] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[SSE] Protocol: ${req.protocol}, Secure: ${req.secure}`);

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send endpoint event with sessionId (required by MCP spec)
  const sseEndpoint = `${req.protocol}://${req.get("host")}/message?sessionId=${sessionId}`;
  console.log(`[SSE] Sending endpoint: ${sseEndpoint}`);
  res.write(`event: endpoint\n`);
  res.write(`data: ${sseEndpoint}\n\n`);

  console.log(`[SSE] Client connected successfully from ${req.ip}`);

  // Send periodic pings to keep connection alive
  const pingInterval = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(pingInterval);
    console.log(`[SSE] Client disconnected from ${req.ip}`);
  });
});

// Message endpoint - handles MCP protocol messages
app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId;
  try {
    console.log(
      `[MCP] Received request (sessionId: ${sessionId}):`,
      JSON.stringify(req.body, null, 2),
    );

    const response = await handleMCPRequest(req.body);

    console.log(`[MCP] Sending response:`, JSON.stringify(response, null, 2));

    res.json(response);
  } catch (error) {
    console.error("[MCP] Error handling request:", error);

    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body?.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Portaria MCP Server running on port ${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`📨 Message endpoint: http://localhost:${PORT}/message`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
