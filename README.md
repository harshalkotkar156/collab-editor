# CollabDocs — Real-time Collaborative Editor

A Google Docs-style collaborative text editor built with:
- **Backend**: Node.js + Express + Socket.io + MongoDB + Yjs (CRDT)
- **Frontend**: React + Vite + Tailwind CSS + Yjs

Supports up to 5+ concurrent users with live syncing, conflict resolution via CRDTs, presence indicators, and cursor tracking.

---

## Architecture

```
Browser (User 1)     Browser (User 2)     Browser (User 3)
   Yjs Doc              Yjs Doc              Yjs Doc
      │                    │                    │
      └──────── Socket.io WebSocket Server ─────┘
                       Node.js + Express
                            │
                         MongoDB
                  (Yjs binary state + metadata)
```

**How conflict resolution works:**
- Every user has a local Yjs document (CRDT)
- Changes are encoded as tiny binary diffs and sent via Socket.io
- The server applies every update to its own Yjs doc (source of truth)
- Broadcasts the update to all other clients
- Yjs merges concurrent edits mathematically — no data loss, ever

---

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongod`) OR a MongoDB Atlas connection string

---

## Step 1 — Start MongoDB

```bash
# If installed locally:
mongod

# Or use Docker:
docker run -d -p 27017:27017 --name mongo mongo:7
```

---

## Step 2 — Set up the Backend

```bash
cd backend
npm install
```

Copy the env file:
```bash
cp .env.example .env
```

Contents of `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/collab-editor
CLIENT_URL=http://localhost:5173
```

Start the server:
```bash
npm run dev      # development (nodemon)
# or
npm start        # production
```

You should see:
```
✅ MongoDB connected
✅ Server running on http://localhost:5000
✅ WebSocket ready on ws://localhost:5000
```

---

## Step 3 — Set up the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Step 4 — Test Collaboration

1. Open http://localhost:5173
2. Click **New Document**
3. Copy the URL (e.g. `http://localhost:5173/doc/abc-123`)
4. Open the same URL in 2–3 more browser tabs or different browsers
5. Type in any tab — changes appear instantly in all others
6. Each user gets a unique name and color shown in the header

---

## Project Structure

```
collab-editor/
├── backend/
│   ├── models/
│   │   └── Document.js          # Mongoose schema
│   ├── routes/
│   │   └── documents.js         # REST API (CRUD)
│   ├── socket/
│   │   └── collaboration.js     # Socket.io + Yjs sync logic
│   ├── server.js                # Express + Socket.io entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── hooks/
    │   │   └── useCollaboration.js   # All Yjs + Socket.io logic
    │   ├── pages/
    │   │   ├── Home.jsx              # Document list
    │   │   └── Editor.jsx            # Collaborative editor UI
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## REST API Reference

| Method | Endpoint                     | Description              |
|--------|------------------------------|--------------------------|
| GET    | /api/documents               | List all documents        |
| GET    | /api/documents/:id           | Get or create document    |
| POST   | /api/documents               | Create new document       |
| PATCH  | /api/documents/:id/title     | Update document title     |
| DELETE | /api/documents/:id           | Delete document           |
| GET    | /health                      | Health check              |

---

## Socket.io Events Reference

| Event            | Direction          | Payload                              | Description                        |
|------------------|--------------------|--------------------------------------|------------------------------------|
| join-document    | Client → Server    | { documentId, user }                 | Join a document room               |
| sync-state       | Server → Client    | { update: Uint8Array }               | Full Yjs state on join             |
| yjs-update       | Both directions    | { documentId, update: Uint8Array }   | Incremental CRDT update            |
| cursor-update    | Client → Server    | { documentId, cursor }               | Cursor position                    |
| cursor-update    | Server → Clients   | { userId, name, color, cursor }      | Broadcast cursor to others         |
| presence-update  | Server → Clients   | { users: [] }                        | Who is currently in the room       |
| title-update     | Both directions    | { documentId, title }                | Document title changed             |

---

## How Yjs CRDT Works (Simple Explanation)

Traditional approach (needs central server to order operations):
- User 1 types "A" at position 5
- User 2 types "B" at position 5 simultaneously
- Without coordination: conflict. Who wins?

Yjs CRDT approach:
- Every character has a unique ID (clientId + clock)
- "A" is inserted AFTER character with ID #45
- "B" is also inserted AFTER character with ID #45
- Yjs resolves this deterministically by comparing client IDs
- Both "A" and "B" end up in the document, in consistent order everywhere
- No data lost, no server round-trip needed for conflict resolution

---

## Scaling to Production

### For higher load (100+ concurrent users):

**1. Use Redis for cross-instance sync:**
```bash
npm install y-redis ioredis
```
Then use `y-redis` adapter so multiple Node instances share Yjs state via Redis pub/sub.

**2. Scale Socket.io with Redis adapter:**
```bash
npm install @socket.io/redis-adapter
```

**3. Use MongoDB Atlas** instead of local MongoDB for managed persistence.

**4. Add authentication** — wrap socket events with JWT verification:
```js
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  // verify JWT, attach user to socket
  next()
})
```

---

## Common Issues

**"MongoDB connection failed"**
→ Make sure `mongod` is running: `brew services start mongodb-community` or `sudo systemctl start mongod`

**Changes not syncing between tabs**
→ Check browser console for WebSocket connection errors. Make sure backend is running on port 5000.

**"Cannot find module 'yjs'"**
→ Run `npm install` in the backend folder.
