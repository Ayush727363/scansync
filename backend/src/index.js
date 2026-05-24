const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY) || 3600;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3002', FRONTEND_URL],
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB for image transfers
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', FRONTEND_URL],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory session store
const sessions = new Map();

// ─── HTTP ROUTES ──────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessions.size, uptime: process.uptime() });
});

// Create a new session
app.post('/api/sessions/create', (req, res) => {
  const sessionId = uuidv4().substring(0, 8).toUpperCase();
  sessions.set(sessionId, {
    id: sessionId,
    created: Date.now(),
    images: [],
    clients: new Set()
  });
  console.log(`[SESSION] Created: ${sessionId}`);
  res.json({
    success: true,
    sessionId,
    mobileUrl: `http://localhost:3002?sessionId=${sessionId}`,
    expiresIn: SESSION_EXPIRY
  });
});

// Check if session exists (for mobile to validate before loading)
app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found or expired' });
  res.json({
    success: true,
    id: session.id,
    imageCount: session.images.length,
    expiresAt: session.created + SESSION_EXPIRY * 1000
  });
});

// Delete session manually
app.delete('/api/sessions/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  console.log(`[SESSION] Deleted: ${req.params.sessionId}`);
  res.json({ success: true });
});

// ─── WEBSOCKET ────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.id}`);

  socket.on('join-session', (sessionId) => {
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('error', { message: 'Session not found or expired' });
      return;
    }
    socket.join(sessionId);
    socket.sessionId = sessionId;
    session.clients.add(socket.id);
    console.log(`[WS] ${socket.id} joined session ${sessionId} (${session.clients.size} clients)`);
    // Send existing images to the joining client (in case PC reconnects)
    if (session.images.length > 0) {
      socket.emit('images-received', { images: session.images, count: session.images.length });
    }
    io.to(sessionId).emit('client-count', { count: session.clients.size });
  });

  // Mobile uploads a batch of images
  socket.on('upload-images', (data) => {
    const { sessionId, images } = data;
    if (!sessionId || !Array.isArray(images) || images.length === 0) return;
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('error', { message: 'Session expired' });
      return;
    }
    session.images.push(...images);
    console.log(`[WS] ${images.length} images uploaded to ${sessionId}. Total: ${session.images.length}`);
    io.to(sessionId).emit('images-received', {
      images: session.images,
      count: session.images.length
    });
    socket.emit('upload-success', { count: images.length, total: session.images.length });
  });

  // PC can delete all images from the session
  socket.on('clear-images', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.images = [];
      io.to(sessionId).emit('images-received', { images: [], count: 0 });
    }
  });

  socket.on('disconnect', () => {
    if (socket.sessionId) {
      const session = sessions.get(socket.sessionId);
      if (session) {
        session.clients.delete(socket.id);
        io.to(socket.sessionId).emit('client-count', { count: session.clients.size });
      }
    }
    console.log(`[WS] Disconnected: ${socket.id}`);
  });
});

// ─── CLEANUP ─────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.created > SESSION_EXPIRY * 1000) {
      sessions.delete(id);
      io.to(id).emit('session-expired');
      console.log(`[CLEANUP] Expired session: ${id}`);
    }
  }
}, 5 * 60 * 1000);

// ─── START ────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n✅ ScanSync Backend running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket ready`);
  console.log(`✅ Session expiry: ${SESSION_EXPIRY}s\n`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
