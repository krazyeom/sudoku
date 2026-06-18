import http from 'node:http';
import { randomUUID } from 'node:crypto';
import next from 'next';
import wsPkg from 'ws';
const { Server: WebSocketServer } = wsPkg;
import {
  applyRoomMove,
  buildViewerSnapshot,
  createRoomState,
  disconnectParticipant,
  registerParticipant,
  resetRoom,
} from './lib/shared-room.js';

const dev = process.env.NODE_ENV !== 'production';
const port = Number.parseInt(process.env.PORT ?? '6767', 10);
const app = next({ dev, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();

const rooms = new Map();
const socketState = new Map();

function send(socket, payload) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(roomId, payload) {
  for (const [socket, state] of socketState.entries()) {
    if (state.roomId !== roomId) continue;
    send(socket, payload);
  }
}

function snapshotFor(room, participantId) {
  return buildViewerSnapshot(room, participantId);
}

function normalizeDifficulty(value) {
  return value === 'easy' || value === 'hard' ? value : 'medium';
}

function getRoom(roomId) {
  return rooms.get(roomId) ?? null;
}

function attachSocket(socket, roomId, participantId) {
  socketState.set(socket, { roomId, participantId });
}

function syncRoom(room) {
  for (const [socket, state] of socketState.entries()) {
    if (state.roomId !== room.roomId) continue;
    send(socket, {
      type: 'room_snapshot',
      snapshot: snapshotFor(room, state.participantId),
    });
  }
}

await app.prepare();

const server = http.createServer((req, res) => {
  handle(req, res);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
  socketState.set(socket, { roomId: null, participantId: null });

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      send(socket, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    const current = socketState.get(socket) ?? { roomId: null, participantId: null };

    try {
      if (message.type === 'create_room') {
        const difficulty = normalizeDifficulty(message.difficulty);
        const roomId = typeof message.roomId === 'string' && message.roomId.trim() ? message.roomId.trim() : randomUUID();
        const participantId =
          typeof message.participantId === 'string' && message.participantId.trim() ? message.participantId.trim() : randomUUID();
        const room = createRoomState({ roomId, difficulty, hostId: participantId });
        rooms.set(room.roomId, room);
        attachSocket(socket, room.roomId, participantId);
        send(socket, {
          type: 'room_created',
          roomId: room.roomId,
          participantId,
          snapshot: snapshotFor(room, participantId),
        });
        return;
      }

      if (message.type === 'join_room') {
        const roomId = typeof message.roomId === 'string' && message.roomId.trim() ? message.roomId.trim() : '';
        const room = getRoom(roomId);
        if (!room) throw new Error('Room not found');
        const participantId =
          typeof message.participantId === 'string' && message.participantId.trim() ? message.participantId.trim() : randomUUID();
        const participant = registerParticipant(room, participantId);
        attachSocket(socket, room.roomId, participant.id);
        send(socket, {
          type: 'room_joined',
          roomId: room.roomId,
          participantId: participant.id,
          snapshot: snapshotFor(room, participant.id),
        });
        syncRoom(room);
        return;
      }

      if (message.type === 'request_snapshot') {
        const room = current.roomId ? getRoom(current.roomId) : null;
        if (!room) throw new Error('Not in a room');
        send(socket, {
          type: 'room_snapshot',
          snapshot: snapshotFor(room, current.participantId),
        });
        return;
      }

      if (message.type === 'move') {
        const room = current.roomId ? getRoom(current.roomId) : null;
        if (!room) throw new Error('Not in a room');
        const event = applyRoomMove(room, current.participantId, {
          row: message.row,
          col: message.col,
          value: message.value,
        });
        broadcast(room.roomId, {
          type: 'room_event',
          event,
          snapshot: snapshotFor(room, current.participantId),
        });
        syncRoom(room);
        return;
      }

      if (message.type === 'reset_room') {
        const room = current.roomId ? getRoom(current.roomId) : null;
        if (!room) throw new Error('Not in a room');
        const participant = room.participants.get(current.participantId);
        if (!participant || participant.role !== 'host') throw new Error('Only the host can reset the room');
        resetRoom(room, { difficulty: normalizeDifficulty(message.difficulty) });
        syncRoom(room);
        broadcast(room.roomId, { type: 'room_reset', snapshot: snapshotFor(room, current.participantId) });
        return;
      }

      if (message.type === 'leave_room') {
        const room = current.roomId ? getRoom(current.roomId) : null;
        if (room && current.participantId) {
          disconnectParticipant(room, current.participantId);
          syncRoom(room);
        }
        socketState.set(socket, { roomId: null, participantId: null });
        send(socket, { type: 'left_room' });
        return;
      }

      throw new Error(`Unknown message type: ${message.type}`);
    } catch (error) {
      send(socket, { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('close', () => {
    const current = socketState.get(socket);
    if (current?.roomId && current.participantId) {
      const room = getRoom(current.roomId);
      if (room) {
        disconnectParticipant(room, current.participantId);
        syncRoom(room);
      }
    }
    socketState.delete(socket);
  });
});

server.listen(port, () => {
  console.log(`> Sudoku server ready on http://localhost:${port}`);
});
