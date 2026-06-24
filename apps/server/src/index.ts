import type { WsClientMessage } from "@system-core/shared-types";
import {
  generateRoomId,
  getOrCreateRoom,
  listRooms,
  type RoomSocketData,
} from "./rooms";
import { serveStatic } from "./static";
import { resolveYouTubeVideo, searchYouTube } from "./youtube";

const PORT = Number(process.env.PORT ?? 3001);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Bun.serve<RoomSocketData>({
  port: PORT,
  fetch: async (req, server) => {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/rooms" && req.method === "GET") {
      return json({ rooms: listRooms() });
    }

    if (url.pathname === "/api/rooms" && req.method === "POST") {
      const roomId = generateRoomId();
      getOrCreateRoom(roomId);
      return json({ roomId });
    }

    const searchMatch = url.pathname.match(/^\/api\/youtube\/search$/);
    if (searchMatch && req.method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      return searchYouTube(q)
        .then((results) => json({ results }))
        .catch((err: Error) => json({ error: err.message }, 502));
    }

    const resolveMatch = url.pathname.match(/^\/api\/youtube\/resolve$/);
    if (resolveMatch && req.method === "GET") {
      const urlParam = url.searchParams.get("url") ?? "";
      return resolveYouTubeVideo(urlParam)
        .then((video) =>
          video ? json({ video }) : json({ error: "Invalid YouTube URL" }, 400),
        )
        .catch((err: Error) => json({ error: err.message }, 502));
    }

    const wsMatch = url.pathname.match(/^\/ws\/rooms\/([^/]+)$/);
    if (wsMatch) {
      const roomId = wsMatch[1];
      const clientId = url.searchParams.get("clientId") ?? crypto.randomUUID();

      if (server.upgrade(req, { data: { roomId, clientId } })) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    const staticResponse = await serveStatic(url.pathname, req.method);
    if (staticResponse) return staticResponse;

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      const { roomId, clientId } = ws.data;
      const room = getOrCreateRoom(roomId);
      room.addClient(ws, clientId, "Guest");
    },
    message(ws, message) {
      const { roomId, clientId } = ws.data;
      const room = getOrCreateRoom(roomId);

      let parsed: WsClientMessage;
      try {
        parsed = JSON.parse(String(message)) as WsClientMessage;
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
        return;
      }

      switch (parsed.type) {
        case "join":
          room.addClient(ws, clientId, parsed.requestedBy);
          break;
        case "add_to_queue":
          if (parsed.clientId !== clientId) break;
          room.addToQueue(parsed.video, parsed.requestedBy);
          break;
        case "track_ended":
          if (!room.onTrackEnded(clientId)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Only the host can control playback",
              }),
            );
          }
          break;
        case "skip":
          if (!room.skipTrack(clientId)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Only the host can skip tracks",
              }),
            );
          }
          break;
        case "become_host":
          if (!room.becomeHost(clientId)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Could not become host",
              }),
            );
          }
          break;
      }
    },
    close(ws) {
      const { roomId, clientId } = ws.data;
      getOrCreateRoom(roomId).removeClient(clientId);
    },
  },
});

console.log(`i Queuez server running on http://localhost:${PORT}`);
