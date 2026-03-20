# Auto-Commentary Generator

Automatically generates realistic live commentary for sports matches, making the demo self-sustaining without manual intervention.

## Features

- **Realistic Event Generation**: Uses weighted probability templates for different event types
- **Multi-Sport Support**: Football, Cricket, Basketball (easily extensible)
- **Automatic Score Updates**: Goals/points automatically update match scores
- **WebSocket Integration**: Commentary broadcasts in real-time to connected clients
- **Match Progression**: Simulates match flow with periods, halftime, and match end
- **Dynamic Player Names**: Generates diverse, realistic player names

## Architecture

```text
simulator/
├── commentary-templates.js  # Event templates per sport
├── player-names.js          # Player name generator
├── match-simulator.js       # Core simulation engine
└── README.md                # This file
```

## Usage

### Automatic (On Server Start)
The simulator automatically starts for all matches with `status: "live"`:

```bash
npm run dev
# [SimulatorManager] Auto-started 2 live matches
```

### Manual Control via API

#### Start simulation for a match
```bash
POST /simulator/start/:matchId
```

**Example:**
```bash
curl -X POST http://localhost:8000/simulator/start/1
```

**Response:**
```json
{
  "message": "Simulation started",
  "matchId": 1
}
```

#### Stop simulation for a match
```bash
POST /simulator/stop/:matchId
```

**Example:**
```bash
curl -X POST http://localhost:8000/simulator/stop/1
```

#### Stop all simulations
```bash
POST /simulator/stop-all
```

#### Get simulator status
```bash
GET /simulator/status
```

**Response:**
```json
{
  "active": true,
  "activeSimulations": 2
}
```

## How It Works

### 1. Event Generation
Each sport has weighted event templates:

```javascript
// Football example
{
  eventType: 'goal',
  weight: 5,        // 5% probability
  messages: [
    'Goal! A composed finish from close range.',
    'What a strike! Back of the net!',
  ],
  scoreDelta: { home: 0, away: 0 }
}
```

### 2. Match Progression
- Events generated at sport-specific intervals (5-8 seconds)
- Match time progresses (not every event = 1 minute)
- Automatic halftime period switching
- Match finalizes when time expires

### 3. Real-time Broadcasting
Commentary is:
1. Saved to database
2. Broadcast via WebSocket to subscribed clients
3. Includes scores, actors, event types, and metadata

## Configuration

### Event Timing (per sport)
Edit `getSportConfig()` in `match-simulator.js`:

```javascript
case 'football':
  return {
    totalMinutes: 90,
    halftimeMinute: 45,
    periods: ['1st half', '2nd half'],
    eventIntervalMs: 8000  // Adjust speed here
  };
```

### Event Probabilities
Edit templates in `commentary-templates.js`:

```javascript
{
  eventType: 'goal',
  weight: 5,  // Increase for more goals
  messages: [/* ... */]
}
```

## Testing

### Test with a live match
1. Create a match with `status: "live"`:
```bash
POST /matches
{
  "sport": "football",
  "homeTeam": "Team A",
  "awayTeam": "Team B",
  "status": "live",
  "startTime": "2026-03-17T15:00:00Z",
  "endTime": "2026-03-17T16:45:00Z"
}
```

2. Start simulator:
```bash
POST /simulator/start/1
```

3. Connect WebSocket client:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    matchId: 1
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New commentary:', data);
};
```

4. Watch commentary flow in console and client

### Expected Output
```text
[Simulator] Starting match 1: Team A vs Team B
[Simulator] Match 1 - Min 1: pass
[Simulator] Match 1 - Min 2: shot
[Simulator] Match 1 - Min 3: goal
[Simulator] Match 1 - Min 5: foul
...
[Simulator] Match 1 finished: 2-1
```

## Extending

### Add New Sport
1. Add templates in `commentary-templates.js`:
```javascript
export const rugbyTemplates = [
  { eventType: 'try', weight: 8, messages: [...] }
];
```

2. Add case in `getTemplatesForSport()`:
```javascript
case 'rugby':
  return rugbyTemplates;
```

3. Add config in `getSportConfig()`:
```javascript
case 'rugby':
  return { totalMinutes: 80, ... };
```

### Add Custom Events
Add to sport template array:
```javascript
{
  eventType: 'penalty',
  weight: 10,
  messages: ['Penalty awarded!'],
  scoreDelta: { home: 0, away: 0 } // If scoring event
}
```

## Notes

- Simulator runs in memory (state is lost on restart)
- Each match runs independently with isolated state
- Score updates persist to database
- Commentary is persisted to database
- WebSocket broadcasts happen in real-time
- Finished matches automatically stop simulation
