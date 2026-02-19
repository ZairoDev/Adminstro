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
        "https://adminstro.in",
        "https://www.adminstro.in",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`✅ [SOCKET SERVER] Client connected: ${socket.id} from ${socket.handshake.headers.origin || 'unknown origin'}`);

    // Handle joining rooms
    socket.on("join-room", ({ area, disposition }) => {
      const room = `area-${area}|disposition-${disposition}`;
      socket.join(room);
      console.log(`📍 [SOCKET SERVER] ${socket.id} joined: ${room}`);
      
      // Verify room membership
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`👥 [SOCKET SERVER] Room ${room} now has ${roomSize} socket(s)`);
      
      // Send confirmation back to client
      socket.emit("room-joined", { room, success: true });
    });

    // Handle leaving rooms
    socket.on("leave-room", ({ area, disposition }) => {
      const room = `area-${area}|disposition-${disposition}`;
      socket.leave(room);
      console.log(`🚪 ${socket.id} left: ${room}`);
    });

    // Handle new lead creation - client emits after successful API call
    socket.on("new-lead-created", (data: { lead: Record<string, unknown>; disposition: string; location: string }) => {
      const areaSlug = (data.location || "").trim().toLowerCase().replace(/\s+/g, "-") || "all";
      const disposition = (data.disposition || "fresh").trim().toLowerCase().replace(/\s+/g, "-");
      const event = `lead-${disposition}`;
      const areaRoom = `area-${areaSlug}|disposition-${disposition}`;
      const globalRoom = `area-all|disposition-${disposition}`;

      console.log(`📤 [SOCKET SERVER] new-lead-created from ${socket.id}:`, {
        event, areaRoom, globalRoom,
        leadName: (data.lead as Record<string, unknown>)?.name,
      });

      // Broadcast to rooms (excluding the sender to avoid double-add)
      socket.to(areaRoom).emit(event, data.lead);
      socket.to(globalRoom).emit(event, data.lead);
      // Also send back to sender so their other tabs/pages pick it up
      socket.emit(event, data.lead);

      const areaSize = io.sockets.adapter.rooms.get(areaRoom)?.size || 0;
      const globalSize = io.sockets.adapter.rooms.get(globalRoom)?.size || 0;
      console.log(`✅ [SOCKET SERVER] Broadcasted ${event} - area room: ${areaSize} sockets, global room: ${globalSize} sockets`);
    });

    // Handle disposition change - client emits after successful API call
    socket.on("lead-disposition-changed", (data: {
      lead: Record<string, unknown>;
      oldDisposition: string;
      newDisposition: string;
      location: string;
    }) => {
      const location = (data.location || "").trim().toLowerCase().replace(/\s+/g, "-") || "all";
      const oldDisp = (data.oldDisposition || "").trim().toLowerCase().replace(/\s+/g, "-");
      const newDisp = (data.newDisposition || "").trim().toLowerCase().replace(/\s+/g, "-");

      console.log(`🔄 [SOCKET SERVER] lead-disposition-changed from ${socket.id}:`, {
        oldDisposition: oldDisp, newDisposition: newDisp, location,
        leadName: (data.lead as Record<string, unknown>)?.name,
      });

      // Emit ADD to new disposition rooms
      const addEvent = `lead-${newDisp}`;
      socket.to(`area-${location}|disposition-${newDisp}`).emit(addEvent, data.lead);
      socket.to(`area-all|disposition-${newDisp}`).emit(addEvent, data.lead);
      socket.emit(addEvent, data.lead);

      // Emit REMOVE from old disposition rooms
      if (oldDisp !== newDisp) {
        const removeEvent = `lead-removed-${oldDisp}`;
        const removePayload = { _id: (data.lead as Record<string, unknown>)?._id, newDisposition: newDisp };
        socket.to(`area-${location}|disposition-${oldDisp}`).emit(removeEvent, removePayload);
        socket.to(`area-all|disposition-${oldDisp}`).emit(removeEvent, removePayload);
        socket.emit(removeEvent, removePayload);
      }

      console.log(`✅ [SOCKET SERVER] Disposition change broadcasted`);
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
    
    // Join phone-specific whatsapp room (namespace by businessPhoneId)
    socket.on("join-whatsapp-phone", (phoneId?: string) => {
      if (!phoneId) return;
      const room = `whatsapp-phone-${phoneId}`;
      socket.join(room);
      console.log(`📲 ${socket.id} joined phone room: ${room}`);
    });

    socket.on("leave-whatsapp-phone", (phoneId?: string) => {
      if (!phoneId) return;
      const room = `whatsapp-phone-${phoneId}`;
      socket.leave(room);
      console.log(`📲 ${socket.id} left phone room: ${room}`);
    });
    
    // Join retarget-specific room (Advert/SuperAdmin will join this)
    socket.on("join-whatsapp-retarget", (phoneId?: string) => {
      if (!phoneId) return;
      const room = `whatsapp-retarget-${phoneId}`;
      socket.join(room);
      console.log(`🎯 ${socket.id} joined retarget room: ${room}`);
    });

    socket.on("leave-whatsapp-retarget", (phoneId?: string) => {
      if (!phoneId) return;
      const room = `whatsapp-retarget-${phoneId}`;
      socket.leave(room);
      console.log(`🎯 ${socket.id} left retarget room: ${room}`);
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
