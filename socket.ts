// socket.ts
import { config } from 'dotenv';
config({ path: '.env.production' });
import next from "next";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { parse } from "url";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0"; // ✅ Listen on all network interfaces (important for VPS)
const port = Number(process.env.PORT) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create one HTTP server for both Next.js and Socket.IO
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("❌ Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // ✅ Socket.IO setup
  const io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "http://127.0.0.1:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("✅ Client connected:", socket.id);

    // Handle joining rooms
    socket.on("join-room", ({ area, disposition }) => {
      const room = `area-${area}|disposition-${disposition}`;
      socket.join(room);
      console.log(`📍 ${socket.id} joined: ${room}`);
    });

    // Handle leaving rooms
    socket.on("leave-room", ({ area, disposition }) => {
      const room = `area-${area}|disposition-${disposition}`;
      socket.leave(room);
      console.log(`🚪 ${socket.id} left: ${room}`);
    });

    // ========== WhatsApp Events ==========
    socket.on("join-whatsapp-room", (userId?: string) => {
      socket.join("whatsapp-room");
      if (userId) {
        socket.join(`user-${userId}`);
        console.log(`📱 ${socket.id} joined WhatsApp room + user-${userId}`);
      } else {
        console.log(`📱 ${socket.id} joined WhatsApp room`);
      }
    });

    // Leave WhatsApp room
    socket.on("leave-whatsapp-room", () => {
      socket.leave("whatsapp-room");
      console.log(`📱 ${socket.id} left WhatsApp room`);
    });

    // Join specific conversation room
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation-${conversationId}`);
      console.log(`💬 ${socket.id} joined conversation: ${conversationId}`);
    });

    // Leave specific conversation room
    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation-${conversationId}`);
      console.log(`💬 ${socket.id} left conversation: ${conversationId}`);
    });

    // Typing indicator
    socket.on("whatsapp-typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation-${conversationId}`).emit("whatsapp-typing-update", {
        conversationId,
        isTyping,
        socketId: socket.id,
      });
    });

    // ========== WhatsApp Call Events ==========
    // Join call notification room
    socket.on("join-whatsapp-calls-room", () => {
      socket.join("whatsapp-calls-room");
      console.log(`📞 ${socket.id} joined WhatsApp calls room`);
    });

    // Leave call notification room
    socket.on("leave-whatsapp-calls-room", () => {
      socket.leave("whatsapp-calls-room");
      console.log(`📞 ${socket.id} left WhatsApp calls room`);
    });

    // ========== WhatsApp History & Sync Events ==========
    // Join sync room for history and app state updates
    socket.on("join-whatsapp-sync-room", () => {
      socket.join("whatsapp-sync-room");
      console.log(`🔄 ${socket.id} joined WhatsApp sync room`);
    });

    // Leave sync room
    socket.on("leave-whatsapp-sync-room", () => {
      socket.leave("whatsapp-sync-room");
      console.log(`🔄 ${socket.id} left WhatsApp sync room`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // ✅ Make Socket.IO globally accessible (for Next API routes)
  (global as any).io = io;

  // ✅ Start server
  httpServer.listen(port, hostname, () => {
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log("💬 Socket.IO is running with Next.js");
  });
});
