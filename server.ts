import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import os from "os";

// Structure to track connected clients
interface Client {
  id: string;
  ws: WebSocket;
  clientType: "desktop" | "mobile" | "sim-desktop" | "sim-mobile";
  registeredAt: number;
  isVerified: boolean;
  deviceName?: string;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Track active clients
  const clients = new Map<string, Client>();

  // Secure Pairing Code State
  let currentPairingCode = Math.floor(100000 + Math.random() * 900000).toString(); // Always a clean 6-digit code

  // Determine local IP addresses for display
  function getLocalIPAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const k in interfaces) {
      const netInterface = interfaces[k];
      if (netInterface) {
        for (const k2 in netInterface) {
          const address = netInterface[k2];
          if (address.family === "IPv4" && !address.internal) {
            addresses.push(address.address);
          }
        }
      }
    }
    return addresses.length > 0 ? addresses : ["192.168.1.142"]; // Elegant default if offline
  }

  // Define API routes
  app.get("/api/status", (req, res) => {
    const addresses = getLocalIPAddresses();
    const activeClients = Array.from(clients.values()).map((c) => ({
      id: c.id,
      clientType: c.clientType,
      registeredAt: c.registeredAt,
      isVerified: c.isVerified,
      deviceName: c.deviceName || "Device",
    }));

    res.json({
      status: "online",
      port: 8765, // Relay Link standard default port
      ipAddresses: addresses,
      mainIp: addresses[0] || "192.168.1.142",
      connectionsCount: clients.size,
      verifiedConnectionsCount: activeClients.filter(c => c.isVerified).length,
      activeClients,
      pairingCode: currentPairingCode,
      uptime: process.uptime(),
    });
  });

  // Allow regenerating the pairing code
  app.post("/api/pairing-code/reset", (req, res) => {
    currentPairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[WS Server] Regenerated secure pairing code: ${currentPairingCode}`);
    
    // Broadcast of pairing code reset to anyone already connected
    broadcast({
      type: "sys-update",
      pairingCode: currentPairingCode,
      activeConnections: clients.size,
      clients: Array.from(clients.values()).map(c => ({ id: c.id, clientType: c.clientType, isVerified: c.isVerified }))
    });

    res.json({ success: true, pairingCode: currentPairingCode });
  });

  // Attach native WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade header manually to route properly
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws" || url.pathname === "/socket.io/") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Client counter for naming
  let clientIdCounter = 0;

  wss.on("connection", (ws: WebSocket) => {
    const clientId = `client_${++clientIdCounter}`;
    
    // Create temporary default client record
    const clientRecord: Client = {
      id: clientId,
      ws,
      clientType: "sim-desktop", // default
      registeredAt: Date.now(),
      isVerified: false,
    };
    clients.set(clientId, clientRecord);

    // Keepalive pinging
    let isAlive = true;
    ws.on("pong", () => {
      isAlive = true;
    });

    const interval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 15000);

    console.log(`[WS Server] Client ${clientId} connected`);

    ws.on("message", (messageData) => {
      try {
        const messageString = messageData.toString();
        const msg = JSON.parse(messageString);

        if (msg.type === "register") {
          clientRecord.clientType = msg.clientType;
          clientRecord.deviceName = msg.deviceName || (msg.clientType.includes("desktop") ? "macOS Host" : "Android Tablet");
          
          // Desktop clients are safe hosts; automatically verified, or if simulating, verified instantly
          if (msg.clientType === "desktop" || msg.clientType === "sim-desktop") {
            clientRecord.isVerified = true;
          } else {
            // Mobile devices must provide code, or do explicit verification message
            if (msg.pairingCode === currentPairingCode) {
              clientRecord.isVerified = true;
            }
          }

          console.log(`[WS Server] Client ${clientId} registered as ${msg.clientType}. Verified: ${clientRecord.isVerified}`);
          
          // Acknowledge registration
          ws.send(JSON.stringify({
            type: "registered",
            id: clientId,
            clientType: msg.clientType,
            isVerified: clientRecord.isVerified,
            pairingCode: currentPairingCode,
            serverTime: Date.now(),
          }));

          // Notify all clients of connection update
          broadcast({
            type: "sys-update",
            activeConnections: clients.size,
            pairingCode: currentPairingCode,
            clients: Array.from(clients.values()).map(c => ({ id: c.id, clientType: c.clientType, isVerified: c.isVerified, deviceName: c.deviceName }))
          });
          return;
        }

        // Dedicated Pairing Request Frame
        if (msg.type === "pair") {
          if (msg.code === currentPairingCode) {
            clientRecord.isVerified = true;
            console.log(`[WS Server] Client ${clientId} successfully paired via code.`);
            
            ws.send(JSON.stringify({
              type: "pair-success",
              id: clientId,
            }));

            // Notify all of verification success
            broadcast({
              type: "sys-update",
              activeConnections: clients.size,
              pairingCode: currentPairingCode,
              clients: Array.from(clients.values()).map(c => ({ id: c.id, clientType: c.clientType, isVerified: c.isVerified, deviceName: c.deviceName }))
            });
          } else {
            console.log(`[WS Server] Client ${clientId} failed pairing attempt with code: ${msg.code}`);
            ws.send(JSON.stringify({
              type: "pair-failure",
              message: "Invalid pairing code. Please reconcile and retry."
            }));
          }
          return;
        }

        // Standard KVM layout relaying logic:
        // ONLY ALLOW messages to be processed and broadcasted if client is verified!
        if (msg.type === "mouse" || msg.type === "clipboard" || msg.type === "kvm-status") {
          if (!clientRecord.isVerified) {
            ws.send(JSON.stringify({
              type: "sys-error",
              message: "Access Denied: Unverified device. Please pair first."
            }));
            return;
          }
          // Broadcast to other verified clients
          broadcastVerified(msg, clientId);
        }

      } catch (err) {
        console.error(`[WS Server] Error processing message from ${clientId}:`, err);
      }
    });

    ws.on("close", () => {
      clearInterval(interval);
      clients.delete(clientId);
      console.log(`[WS Server] Client ${clientId} disconnected`);
      
      // Notify remainder
      broadcast({
        type: "sys-update",
        activeConnections: clients.size,
        pairingCode: currentPairingCode,
        clients: Array.from(clients.values()).map(c => ({ id: c.id, clientType: c.clientType, isVerified: c.isVerified, deviceName: c.deviceName }))
      });
    });

    ws.on("error", (error) => {
      console.error(`[WS Server] Client ${clientId} error:`, error);
      clearInterval(interval);
      clients.delete(clientId);
    });
  });

  // Fast broadcast function to verified targets ONLY
  function broadcastVerified(data: any, excludeClientId?: string) {
    const raw = JSON.stringify(data);
    clients.forEach((client) => {
      if (excludeClientId && client.id === excludeClientId) return;
      if (client.isVerified && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    });
  }

  // Quick broadcast function to all connections
  function broadcast(data: any, excludeClientId?: string) {
    const raw = JSON.stringify(data);
    clients.forEach((client) => {
      if (excludeClientId && client.id === excludeClientId) return;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    });
  }

  // Vite middleware setup for Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start HTTP and WebSocket listening on the port
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Relay Link Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
