# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # IronSense Operator Cockpit

  IronSense is a browser-based safety and operations cockpit for a heavy-equipment operator. It combines a deterministic excavator simulation, live machine telemetry, backend safety assessments, task progress, training recommendations, and shift analytics in one interface.

  The current demo is configured for machine `EXC001` (CAT 320), operator `OP1001`, and site `SITE01`. The default backend is the deployed IronSense service; a local backend can be selected from the Director Console.

  ## What It Includes

  - **Today**: shift readiness, live telemetry, active/upcoming tasks, and operator context.
  - **Safety**: backend alerts, proximity targets, incidents, acknowledgements, and incident resolution.
  - **Training**: recommended micro-lessons, quiz completion, backend grading, and instructor booking.
  - **Insights**: anomalies, task predictions, benchmarks, and performance signals.
  - **Digest**: backend-provided shift summaries, trends, incidents, and suggested training.
  - **3D simulation**: an interactive site view with an excavator, people, haul truck, hazards, zones, weather, lighting, and cab telemetry.
  - **Director Console**: backend connection status, session controls, weather, machine state, scenario playback, language, voice alerts, and recording/replay.
  - **Shift ranking**: deterministic safety, fuel, and velocity scoring for the included sample shifts.

  ## Quick Start

  Requirements:

  - Node.js with npm
  - A modern browser with WebSocket and WebGL support for the 3D simulation

  Install dependencies and start the Vite development server:

  ```bash
  npm install
  npm run dev
  ```

  Open the URL printed by Vite, normally `http://localhost:5173`.

  Available commands:

  | Command | Purpose |
  | --- | --- |
  | `npm run dev` | Start Vite with hot module replacement |
  | `npm run build` | Type-check and create a production build in `dist/` |
  | `npm run lint` | Run ESLint across the project |
  | `npm run preview` | Serve the production build locally |
  | `npx vitest run` | Run the Vitest test suite, including scoring tests |

  ## Using The Cockpit

  1. Complete the six-item walkaround checklist on the Today view. Completing it starts the simulated shift and telemetry feed.
  2. Use the left navigation rail to move between Today, Safety, Training, Insights, and Digest. The selected page is stored in the URL hash, so routes such as `/#/safety` can be bookmarked.
  3. Open the Director Console from the left rail, or press `Ctrl+Shift+D` (`Cmd+Shift+D` on macOS).
  4. In the console, choose **Connect** to use backend assessments. Select **Local** when running the backend at `localhost:8000`; the default is the deployed live endpoint.
  5. Toggle the 3D simulation from the shell to inspect the site and cab display. The simulation and dashboard read from the same synchronized state.

  ### Simulation controls

  When autopilot is disabled, the excavator can be controlled with:

  | Key | Action |
  | --- | --- |
  | `I` / `K` | Travel forward / reverse |
  | `J` / `L` | Turn left / right |
  | `U` / `O` | Swing left / right |
  | `Y` / `H` | Raise / lower the boom |
  | `X` | Hard brake |
  | `W` `A` `S` `D` | Move the 3D camera |

  The Director Console supports time scales of `1x`, `5x`, `10x`, `30x`, and `60x`. It also includes twelve reproducible scenarios: blind-spot worker, seatbelt-off travel, operator leaving the cab, long idle, rain, lightning, steep slope, unsafe operation, fuel theft, overheating, fatigue, and manual near-miss reporting.

  ## Data Flow

  The application keeps the simulation, dashboard, cab panel, and Director Console aligned through a single synchronization path:

  ```text
  3D simulation engine ─┐
                        ├─ dashboardSync ─> Zustand operator store ─> React views
  backend telemetry WS ─┤
  backend cab WS ───────┘
  backend REST polling ───────────────────> backend store ───────────┘
  ```

  - The simulation advances on a fixed `0.1` second simulation step and uses a seed for repeatable runs.
  - The telemetry socket sends machine sensor messages to `/ws/telemetry`.
  - The cab socket receives backend `assessment` messages from `/ws/cab/EXC001`.
  - REST polling loads profile, tasks, incidents, digest, training, and readiness history. Slow data refreshes every 60 seconds; incident, digest, and readiness data refresh every 15 seconds.
  - Optional backend endpoints can return `404`; the UI keeps the affected data empty and uses local task/lesson fallbacks where implemented.
  - Outgoing telemetry can be downloaded as `.jsonl` and replayed through the console.

  ## Backend Endpoints

  The endpoint definitions live in `src/sim/protocol.ts`:

  | Target | HTTP | WebSocket |
  | --- | --- | --- |
  | Live | `https://good-question-backend.onrender.com` | `wss://good-question-backend.onrender.com` |
  | Local | `http://localhost:8000` | `ws://localhost:8000` |

  REST requests currently cover:

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

  The telemetry contract is versioned as schema `1.0`. Backend field names are intentionally mirrored in the TypeScript protocol types; changes to that contract should be made in coordination with the backend.

  ## Project Structure

  ```text
  src/
  ├── App.tsx                    Application shell and hash navigation
  ├── components/                Reusable cockpit, simulation, task, safety, and telemetry UI
  ├── views/                     Today, Safety, Training, Insights, Digest, and Simulation screens
  ├── sim/
  │   ├── engine.ts               Deterministic excavator/site simulation
  │   ├── link.ts                 Telemetry and cab WebSocket client, recording, replay
  │   ├── backendApi.ts           REST store and background polling
  │   ├── dashboardSync.ts        Source-to-dashboard state bridge
  │   ├── protocol.ts             Backend message and assessment types
  │   ├── site.ts                 Site geometry, hazards, zones, and entities
  │   └── siteConfig.ts            Machine, operator, site, and operating limits
  ├── store/                     Zustand operator store
  ├── types/                     Shared cockpit domain models
  ├── utils/                     Shift scoring, sample shifts, and local lesson fallback
  └── styles/                    Design tokens and responsive rules
  public/
  ├── models/                    3D model assets
  └── textures/                  3D environment textures
  ```

  ## Architecture Notes

  - React 19 and Vite provide the application runtime and build pipeline.
  - TypeScript is used throughout the application; `npm run build` runs `tsc -b` before Vite builds.
  - Zustand owns UI/session state and the backend stores. The dashboard store is populated by simulation and backend synchronization rather than inventing independent view data.
  - Three.js, React Three Fiber, Drei, postprocessing, and Rapier support the 3D scene and interaction layer.
  - Recharts supplies analytical visualizations and Lucide supplies interface icons.
  - The visual system is defined in `src/styles/tokens.css`, `src/styles/responsive.css`, and component-specific styles in `src/index.css` and `src/App.css`.

  ## Testing And Validation

  The checked-in automated test currently covers the shift scoring and ranking functions in `src/utils/scoring.test.ts`, including insufficient data, safety penalties, fuel efficiency, velocity caps, and ranking tie-breakers.

  For a local validation pass:

  ```bash
  npm run lint
  npx vitest run
  npm run build
  ```

  The 3D simulation and backend WebSocket flows require browser-level verification. If the backend is unavailable, the shell and local simulation still load, but live assessments, server-backed recommendations, and some digest data remain offline or empty.

  ## Configuration

  Machine identity, operator identity, site limits, default proximity zones, and sensor ranges are centralized in `src/sim/siteConfig.ts`. Live/local backend URLs and the telemetry schema are centralized in `src/sim/protocol.ts`. There is currently no `.env`-based configuration layer; changing these values requires a source change and rebuild.
