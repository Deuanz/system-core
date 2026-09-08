import type { WsClientMessage } from "@system-core/shared-types";
import {
  createRoom,
  deleteRoom,
  generateRoomId,
  getOrCreateRoom,
  listRooms,
  resolveRoom,
  type RoomSocketData,
} from "./rooms";
import { serveStatic } from "./static";
import { resolveYouTubeVideo, searchYouTube } from "./youtube";

const PORT = Number(process.env.PORT ?? 3001);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (roomMatch?.[1] && req.method === "GET") {
      const identifier = decodeURIComponent(roomMatch[1]);
      const room = resolveRoom(identifier);
      if (!room) {
        return json({ error: "Room not found" }, 404);
      }
      return json({ roomId: room.id, name: room.name, isPrivate: room.isPrivate });
    }

    if (roomMatch?.[1] && req.method === "DELETE") {
      const identifier = decodeURIComponent(roomMatch[1]);
      const result = deleteRoom(identifier);
      if (!result.ok) {
        return json({ error: result.message }, result.status);
      }
      return json({ ok: true });
    }

    if (url.pathname === "/api/rooms" && req.method === "POST") {
      const payload = (await req.json().catch(() => ({}))) as {
        name?: string;
        isPrivate?: boolean;
        accessCode?: string;
      };
      const name = payload.name?.trim();
      if (!name) {
        return json({ error: "Room name is required" }, 400);
      }
      if (resolveRoom(name)) {
        return json({ error: "A room with this name already exists" }, 409);
      }
      const roomId = generateRoomId();
      const isPrivate = Boolean(payload.isPrivate);
      const accessCode = payload.accessCode?.trim();
      if (isPrivate && !accessCode) {
        return json({ error: "Private rooms require an access code" }, 400);
      }
      try {
        createRoom(roomId, name, isPrivate, accessCode);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not create room";
        return json({ error: message }, 409);
      }
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
    if (wsMatch?.[1]) {
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
    open() {},
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
          if (parsed.clientId !== clientId) break;
          {
            const result = room.addClient(ws, clientId, parsed.requestedBy, parsed.accessCode);
            if (!result.ok) {
              ws.send(JSON.stringify({ type: "error", message: result.message }));
            }
          }
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
        case "remove_from_queue":
          if (!room.removeFromQueue(clientId, parsed.itemId)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Only the DJ can remove tracks from the queue",
              }),
            );
          }
          break;
        case "become_host":
          if (!room.becomeHost(clientId, parsed.requestedBy)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Could not request DJ role",
              }),
            );
          }
          break;
        case "respond_host_request":
          if (!room.respondHostRequest(clientId, parsed.approved)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Only the current DJ can approve or deny requests",
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
