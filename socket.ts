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
