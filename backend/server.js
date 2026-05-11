require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')

const documentRoutes = require('./routes/documents')
const { setupSocketHandlers } = require('./socket/collaboration')

const app = express()
const server = http.createServer(app)

// ── Socket.io setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
})

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

// ── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api/documents', documentRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Socket.io Collaboration ───────────────────────────────────────────────────
setupSocketHandlers(io)

// ── MongoDB + Start Server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

const MONGO_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`)
      console.log(`✅ WebSocket ready on ws://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })
