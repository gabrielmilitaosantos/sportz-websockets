# Sportz

Real-time sports match commentary platform. The backend simulates live match events and broadcasts them via WebSocket. The dashboard allows managing matches, controlling simulations, and watching scores update in real time.

## Project structure

```
sportz/
├── config/
│   └── arcjet.js               # Rate limiting and security middleware
├── src/
│   ├── db/
│   │   ├── db.js               # Neon/Drizzle connection
│   │   └── schema.js           # Database schema (matches, commentary)
│   ├── middleware/
│   │   └── requireAuth.js      # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js             # Login and token verification
│   │   ├── matches.js          # Match CRUD and score updates
│   │   ├── commentary.js       # Commentary read/write
│   │   └── simulator.js        # Simulation control
│   ├── simulator/
│   │   ├── match-simulator.js  # Simulation engine and scheduler
│   │   ├── commentary-templates.js
│   │   └── player-names.js
│   ├── utils/
│   │   ├── datetime.js         # Brazil timezone helpers
│   │   └── match-status.js
│   ├── validation/
│   │   ├── matches.js          # Zod schemas for match routes
│   │   └── commentary.js
│   ├── ws/
│   │   └── server.js           # WebSocket server
│   └── index.js                # Entry point
├── dashboard/                  # React frontend (Vite)
├── drizzle/                    # Generated migrations
├── .env
└── package.json
```

## Requirements

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database

## Backend setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment variables**

Create a `.env` file in the project root:

```env
DATABASE_URL=postgres://...
JWT_SECRET=                  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password_here
PORT=8000
FRONTEND_URL=http://localhost:5173
```

**3. Run database migrations**

```bash
npm run db:migrate
```

**4. Start the server**

```bash
# Development (watch mode)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:8000` and the WebSocket on `ws://localhost:8000/ws`.

## Dashboard setup

```bash
cd dashboard
npm install
```

Create `dashboard/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

```bash
npm run dev
```

The dashboard is available at `http://localhost:5173`. Sign in with the credentials defined in the backend `.env`.

## API reference

All routes except `/auth/*` require a `Authorization: Bearer <token>` header.

### Auth

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/login` | Returns a JWT token (8h expiry) |
| POST | `/auth/verify` | Checks whether a stored token is still valid |

**Login request:**
```json
POST /auth/login
{ "username": "admin", "password": "your_password_here" }
```

**Login response:**
```json
{ "token": "eyJ..." }
```

### Matches

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/matches` | List matches (newest first) |
| POST | `/matches` | Create a new match |
| PATCH | `/matches/:id/score` | Update the score of a match |

**Create match body:**
```json
{
  "sport": "football",
  "homeTeam": "Corinthians",
  "awayTeam": "Palmeiras",
  "startTime": "2026-04-20T19:00:00-03:00",
  "endTime": "2026-04-20T20:45:00-03:00"
}
```

Supported sports: `football`, `basketball`, `cricket`.

Times must be ISO 8601 strings with a timezone offset. The `-03:00` suffix (Brasília) is accepted directly.

The `status` field is computed automatically from the current time:
- `scheduled` — before `startTime`
- `live` — between `startTime` and `endTime`
- `finished` — after `endTime`

### Commentary

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/matches/:id/commentary` | Fetch commentary for a match |
| POST | `/matches/:id/commentary` | Add a commentary entry manually |

### Simulator

The simulator generates realistic match events automatically and updates scores in real time.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/simulator/status` | Returns active simulation count and match IDs |
| POST | `/simulator/start/:matchId` | Start simulation for a specific match |
| POST | `/simulator/stop/:matchId` | Stop simulation for a specific match |
| POST | `/simulator/stop-all` | Stop all active simulations |

**Status response:**
```json
{
  "active": true,
  "activeSimulations": 2,
  "activeMatchIds": [3, 7]
}
```

The simulator starts automatically on server boot for any match already marked as `live`. Scheduled matches are promoted to `live` automatically every 15 seconds when their `startTime` arrives.

## WebSocket

The WebSocket endpoint is public — no token required.

**Connect:**
```javascript
const ws = new WebSocket("ws://localhost:8000/ws");
```

**Subscribe to a match** (start receiving commentary for that match):
```javascript
ws.onopen = () => {
  ws.send(JSON.stringify({ type: "subscribe", matchId: 3 }));
};
```

**Unsubscribe:**
```javascript
ws.send(JSON.stringify({ type: "unsubscribe", matchId: 3 }));
```

**Incoming message types:**

`welcome` — sent once on connection:
```json
{ "type": "welcome" }
```

`subscribed` / `unsubscribed` — acknowledgement:
```json
{ "type": "subscribed", "matchId": 3 }
```

`commentary` — a new match event (only received after subscribing to that match):
```json
{
  "type": "commentary",
  "data": {
    "id": 412,
    "matchId": 3,
    "minute": 34,
    "period": "2nd half",
    "eventType": "goal",
    "actor": "Carlos Silva",
    "team": "Flamengo",
    "message": "Clinical finish! The crowd erupts! (Flamengo)",
    "metadata": {
      "scoreDelta": { "home": 1, "away": 0 },
      "currentScore": { "home": 2, "away": 1 }
    },
    "tags": ["goal"],
    "createdAt": "2026-04-20T22:10:44.000Z"
  }
}
```

`match_created` — broadcast to all connected clients when a new match is created:
```json
{
  "type": "match_created",
  "data": { ...match }
}
```

**Minimal working example:**
```javascript
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "subscribe", matchId: 3 }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "commentary") {
    console.log(`[${msg.data.minute}'] ${msg.data.message}`);
  }
};
```

## How the simulator works

Each sport has a set of weighted event templates defined in `commentary-templates.js`. Every few seconds (5–8s depending on the sport), the simulator picks a random event, assigns it to a player and team, persists the commentary row, and — if the event has a score delta (goal, basket, etc.) — updates the match score in a single transaction before broadcasting.

Match time progresses independently of real time: not every event advances the clock, which gives a natural feel without requiring the simulation to run for 90 real minutes.

When the simulated minute counter exceeds the sport's `totalMinutes`, the match is marked as `finished` and the simulator stops.

### Extending with a new sport

**1.** Add templates in `src/simulator/commentary-templates.js`:
```javascript
export const rugbyTemplates = [
  { eventType: "try", weight: 8, messages: ["Try scored!", "Over the line!"], scoreDelta: { home: 0, away: 0 } },
  { eventType: "lineout", weight: 20, messages: ["Lineout won cleanly."] },
];
```

**2.** Register the sport in `getTemplatesForSport()`:
```javascript
case "rugby":
  return rugbyTemplates;
```

**3.** Add timing config in `getSportConfig()`:
```javascript
case "rugby":
  return { totalMinutes: 80, halftimeMinute: 40, periods: ["1st half", "2nd half"], eventIntervalMs: 7000 };
```

**4.** Add the sport to the dashboard form in `dashboard/src/components/MatchForm.jsx`:
```javascript
const SPORTS = ["football", "basketball", "cricket", "rugby"];
```