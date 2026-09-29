# IronSense Operator Cockpit

IronSense is a browser-based operations and safety cockpit for heavy-equipment work. The project combines a React dashboard, a deterministic excavator simulation, live telemetry, backend safety assessments, task tracking, operator training, and shift analytics.

The demo is configured for:

- Machine: `EXC001` / CAT 320 excavator
- Operator: `OP1001` / Site Operator
- Site: `SITE01`
- Default backend: `good-question-backend.onrender.com`

The frontend can run without a connected backend. In that mode the local simulation, shell, local task definitions, and fallback lesson content remain available while backend-derived assessments and history stay offline or empty.

## Product Areas

| Area | Purpose |
| --- | --- |
| Today | Start-of-shift walkaround, readiness, live telemetry, active task, queued work, and recommended training. |
| Safety | Proximity radar, dynamic danger/caution zones, safety events, acknowledgements, and incident reporting. |
| Training | Backend-recommended lessons, quiz questions, server-side completion, and instructor booking. |
| Insights | Backend anomalies, evidence, recommended actions, task predictions, and performance benchmarks. |
| Digest | Shift summary, profile trends, fuel and idle measures, incident history, and suggested training. |
| Simulation | Interactive 3D site view with the excavator, workers, trucks, hazards, zones, weather, and cab telemetry. |
| Director Console | Backend links, simulation controls, machine toggles, scenarios, language, voice alerts, and recording/replay. |

## Frontend

### Application shell

`src/App.tsx` renders the active page inside `AppShell`. The shell provides:

- A persistent navigation rail for Today, Safety, Training, Insights, and Digest.
- A machine/operator status header and live telemetry strip.
- Weather, lighting, backend, and simulation status indicators.
- A critical safety banner for active unacknowledged backend alerts.
- The Director Console toggle and the 3D simulation toggle.
- URL-hash navigation such as `/#/today` and `/#/safety` for refreshable, bookmarkable views.
- The `Ctrl+Shift+D` or `Cmd+Shift+D` shortcut for opening the Director Console.

### Dashboard views

#### Today

The Today view is the operator's shift starting point. It contains the six-item walkaround checklist, active task progress, the upcoming task queue, the readiness instrument, the safety protocol stack, live telemetry, anomaly prompts, and a link into the recommended training lesson. Completing every walkaround item starts the simulated shift.

#### Safety

Safety presents the machine as the center of a top-down proximity radar. The frontend scales sensor range, caution radius, and danger radius into concentric zones and places workers, vehicles, hazards, and structures around the machine. It also shows weather-adjusted zone explanations, visibility, tilt limits, proximity multipliers, safety events, backend incidents, and the incident drawer with notes, voice-memo, photo-proof, acknowledgement, and resolution actions.

#### Training

Training displays modules recommended by the backend from active anomalies and safety signals, followed by the rest of the backend catalogue. If a module's question endpoint is unavailable, the UI can use the local lesson bank in `src/sim/lessonBank.ts`. Quiz completion is posted to the backend when available, and modules can be booked with an instructor.

#### Insights

Insights turns backend anomaly and task-prediction data into reviewable evidence. Anomaly records include severity, model or rule identity, explanation, evidence, score, active state, and a recommended action. Task benchmarks compare predicted ranges with actual or in-progress duration and identify the primary adjustment factor.

#### Digest

Digest consumes the backend's operator summary, including profile score and trend, baseline measures, task history, alerts by severity, anomaly counts, idle time, fuel use, seatbelt compliance, recent incidents, and suggested training. Empty or unavailable backend fields are represented as an offline/empty state rather than fabricated dashboard values.

#### Simulation

Simulation uses React Three Fiber and Three.js to render the site. It includes a CAT 320 model, site zones, haul trucks, bulldozers, workers, roaming people, safety rings, labels, a free-fly camera, pointer-lock camera movement, selectable vehicles, loading progress, and WebGL context-loss recovery. Selecting a vehicle opens a live vehicle panel with type, state, speed, and route progress.

### Frontend design system

The interface uses an industrial cockpit visual language defined in `src/styles/tokens.css`, `src/App.css`, and `src/index.css`:

- Graphite and black surfaces with high-contrast white text.
- Caterpillar-inspired safety yellow for primary machine and action signals.
- Green, amber, and red semantic colors for readiness and safety state.
- Compact status bars, dense operational panels, telemetry strips, radar visualizations, and monospace machine readouts.
- Lucide icons for navigation, safety, training, weather, telemetry, and control actions.
- CSS variables for colors, dimensions, borders, typography, touch targets, and transitions.

Responsive behavior is defined in `src/styles/responsive.css`:

- Below `1024px`, the vertical navigation rail becomes a horizontal bar and two-column views stack.
- Below `768px`, navigation labels collapse to icons, telemetry items stack vertically, and wide tables can scroll horizontally.
- The 3D canvas remains full-height within the simulation view and includes loading and context-loss feedback.

## User Workflow

1. Open the application and complete the six-item walkaround on Today.
2. Completing the walkaround starts the local shift simulation and telemetry feed.
3. Navigate between the dashboard views using the shell rail.
4. Open the Director Console and select **Connect** for backend assessments, or select **Local** for a backend at `localhost:8000`.
5. Open Simulation to inspect the 3D site and the shared cab state.
6. Review safety events and report or resolve incidents when required.
7. Complete recommended training and review anomaly or task insights.

## Simulation Controls

When autopilot is disabled, the excavator uses these controls:

| Key | Action |
| --- | --- |
| `I` / `K` | Travel forward / reverse |
| `J` / `L` | Turn left / right |
| `U` / `O` | Swing left / right |
| `Y` / `H` | Raise / lower the boom |
| `X` | Hard brake |
| `W` `A` `S` `D` | Move the free-fly camera |
| `Esc` | Release selection or pointer lock |

The Director Console supports simulation speeds of `1x`, `5x`, `10x`, `30x`, and `60x`, seeded sessions, autopilot, engine, seatbelt, operator-seat, parking-brake, hydraulic-lockout, break, refuelling, weather, and lighting controls.

### Scenarios

The simulation includes twelve reproducible scenarios:

1. Worker in a blind spot
2. Seatbelt off while moving
3. Operator leaves the seat with the engine running
4. Delayed truck and long idle
5. Rain starts
6. Lightning nearby
7. Steep slope
8. Unsafe swing and travel operation
9. Fuel theft
10. Overheating
11. Fatigue after continuous operation
12. Manual near-miss report

## Quick Start

### Requirements

- Node.js and npm
- A modern browser with WebSocket and WebGL support for the full experience

### Install and run

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with hot module replacement. |
| `npm run build` | Run TypeScript project builds and create the production bundle in `dist/`. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run preview` | Serve the production build locally. |
| `npx vitest run` | Run the checked-in Vitest tests. |

## Architecture And Data Flow

```text
                        +-----------------------------+
                        | React frontend              |
                        | AppShell + views + components|
                        +--------------+--------------+
                                       | reads/actions
                        +--------------v--------------+
                        | Zustand stores               |
                        | operator + backend + link   |
                        +--------------+--------------+
                                       | dashboardSync
             +-------------------------+-------------------------+
             |                         |                         |
      Local sim engine          Telemetry WebSocket       Backend REST/API
      sensors + site state      cab assessments            profile + history
             |                         |                         |
             +-------------------------+-------------------------+
```

The simulation advances on a fixed `0.1` second simulation step. A seed and the same Director inputs produce repeatable runs. `dashboardSync.ts` reshapes simulation snapshots, cab assessments, backend REST results, alert logs, and anomaly logs into the shared operator store so the dashboard and simulation do not maintain separate values.

### State ownership

- `src/store/useOperatorStore.ts` owns navigation, walkaround, session, telemetry, tasks, safety, training, insights, readiness, and user actions.
- `src/sim/backendApi.ts` owns REST state and background polling.
- `src/sim/link.ts` owns WebSocket state, alert lifecycle, reconnect behavior, language, voice, recording, and replay.
- `src/sim/dashboardSync.ts` is the one-way bridge from simulation/backend sources into the dashboard store.
- `src/types/cockpit.ts` defines shared frontend domain models.

## Backend Integration

Backend URLs are defined in `src/sim/protocol.ts`:

| Target | HTTP | WebSocket |
| --- | --- | --- |
| Live | `https://good-question-backend.onrender.com` | `wss://good-question-backend.onrender.com` |
| Local | `http://localhost:8000` | `ws://localhost:8000` |

The frontend uses:

- `GET /api/health`
- `GET /api/operators/{operator_id}/profile`
- `GET /api/tasks/today?operator_id={operator_id}`
- `GET /api/incidents?operator_id={operator_id}`
- `GET /api/digest/{operator_id}`
- `GET /api/training/recommendations/{operator_id}`
- `GET /api/training/modules/{module_id}`
- `GET /api/readiness/history?machine_id={machine_id}`
- `POST /api/incidents`
- `POST /api/training/book`
- `POST /api/training/complete`
- WebSocket `/ws/telemetry` for outgoing simulation telemetry and backend replies.
- WebSocket `/ws/cab/EXC001` for backend assessment messages and alert acknowledgements.

REST polling starts in `src/main.tsx`. Profile, task, and training data refresh every 60 seconds; incidents, digest, and readiness history refresh every 15 seconds. The telemetry protocol is versioned as schema `1.0` and its field names must remain aligned with the backend contract.

The Director Console can download sent telemetry as `.jsonl`. A previously recorded file can be replayed over the telemetry connection for repeatable investigation and demos.

## Repository Structure

```text
src/
├── App.tsx                    Root view selection and hash navigation
├── main.tsx                   React bootstrap and polling startup
├── components/
│   ├── director/              Director Console integration
│   ├── readiness/             Readiness score instrument
│   ├── safety/                Safety protocol and proximity stack
│   ├── shell/                 Navigation, header, status, and global alerts
│   ├── sim/                   3D site, cab display, models, and simulation console
│   ├── task/                  Active task and task progress UI
│   └── telemetry/             Live machine telemetry strip
├── views/                     Dashboard and simulation screens
├── sim/
│   ├── engine.ts              Deterministic excavator and site simulation
│   ├── site.ts                Site geometry, hazards, zones, and entities
│   ├── link.ts                WebSocket client, reconnect, recording, replay
│   ├── backendApi.ts           REST store and polling
│   ├── dashboardSync.ts        Source-to-dashboard state bridge
│   ├── protocol.ts             Backend contract and assessment types
│   ├── lessonBank.ts           Local training fallback questions
│   └── siteConfig.ts            Machine, operator, site, and safety limits
├── store/                     Zustand stores
├── types/                     Shared cockpit TypeScript models
├── utils/                     Shift scoring, sample shifts, and tests
└── styles/                    Design tokens and responsive rules
public/
├── models/                    3D model assets
└── textures/                  3D environment textures
```

## Technology Stack

- React 19 and React DOM
- TypeScript 6
- Vite 8
- Zustand for state management
- Three.js, React Three Fiber, Drei, postprocessing, and Rapier for 3D
- Recharts for analytical charts
- Lucide React for interface icons
- ESLint, TypeScript, and Vitest for quality checks

## Scoring Logic

`src/utils/scoring.ts` ranks sample shifts using:

- Safety: 50% of the overall score, reduced by violations and near misses.
- Fuel: 30%, based on expected versus actual fuel and idle penalty.
- Velocity: 20%, based on target versus actual cycle time.
- Unsafe shifts cannot receive a velocity bonus.
- Shifts shorter than one hour or with fewer than two cycles are marked insufficient and excluded from ranking.

## Configuration And Limitations

Machine identity, operator identity, site limits, default safety zones, and sensor ranges are centralized in `src/sim/siteConfig.ts`. Backend URLs and the telemetry schema are centralized in `src/sim/protocol.ts`.

There is currently no `.env` configuration layer. Changing the active machine, operator, site, backend URLs, or operating limits requires a source change and rebuild. The included sample shift data is intended for the leaderboard and scoring experience, while operational dashboard values are populated by the simulation and backend synchronization path.

## Testing And Validation

The checked-in Vitest suite covers shift scoring and ranking, including safety penalties, fuel efficiency, velocity caps, insufficient data, and deterministic tie-breakers.

Run the standard validation pass:

```bash
npm run lint
npx vitest run
npm run build
```

Browser-level testing is still needed for WebGL rendering, pointer-lock interaction, WebSocket connectivity, backend responses, and responsive layouts. If the backend is unavailable, the frontend should still load the shell and local simulation, but live assessments, server-backed recommendations, and some digest data will be unavailable.
