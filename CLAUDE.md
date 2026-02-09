# AdU ED Mapping Platform

## Project Overview
Environmental data monitoring and digital twin floor plan editor for Adamson University Engineering Department. Sensor nodes collect temperature, humidity, pressure, eCO2, TVOC, and PM2.5 data, visualized as heatmaps on interactive floor plan canvases.

## Architecture
- **Backend**: Express 5 (CommonJS) + MariaDB on Raspberry Pi
- **Frontend**: React 19 SPA (Vite + Tailwind v4) in `client/`
- **Canvas**: Raw HTML5 Canvas 2D (not Konva/SVG)
- **Process Manager**: PM2 (NOT systemd)
- **Reverse Proxy**: nginx port 80 → 3000
- **User/Group**: `aduedmapping`

## Key Commands
```bash
# Build frontend
npm run build                    # from project root

# Deploy (restart server)
sudo -u aduedmapping pm2 restart aduedmapping

# Dev server (frontend only)
cd client && npm run dev

# View logs
sudo -u aduedmapping pm2 logs aduedmapping
```

## File Structure
```
server.js                  # Express app, mounts routes, serves SPA
db.js                      # MariaDB connection pool
schema.sql                 # Database schema
routes/
  auth.js                  # Login/logout/session
  nodes.js                 # CRUD sensor nodes
  walls.js                 # CRUD walls
  canvases.js              # CRUD canvases
  canvas-elements.js       # CRUD shapes/text/icons
  readings.js              # Sensor readings (latest + historical)
  ingest.js                # Sensor data ingestion endpoint
middleware/
  requireAuth.js           # Auth guard (returns 401 JSON)
client/src/
  main.jsx                 # Entry point (ThemeProvider + AuthProvider + Router)
  index.css                # Tailwind v4 imports + dark mode config
  pages/
    DigitalTwinPage.jsx    # Main digital twin orchestrator
    DashboardPage.jsx      # Overview dashboard
    DataTablePage.jsx      # Tabular data view
    NodesPage.jsx          # Node management
    LoginPage.jsx          # Authentication
  components/
    Layout.jsx             # App shell with sidebar + dark mode toggle
    ProtectedRoute.jsx     # Auth guard component
    digital-twin/
      FloorCanvas.jsx      # Core canvas renderer (1050+ lines)
      CanvasToolbar.jsx    # Mode/tool selection toolbar
      CanvasManager.jsx    # Canvas CRUD dropdown
      PropertiesPanel.jsx  # Selected item inspector
      HeatmapSettings.jsx  # Heatmap config controls
      SensorSelector.jsx   # Sensor type dropdown
    NodeFormModal.jsx       # Create/edit node dialog
    CanvasFormModal.jsx     # Create/edit canvas dialog
  hooks/
    useTheme.jsx           # Dark mode context (localStorage persisted)
    useAuth.jsx            # Auth state context
    useNodes.js            # Nodes CRUD hook
    useWalls.js            # Walls CRUD hook (scoped to canvas)
    useCanvases.js         # Canvases CRUD hook
    useCanvasElements.js   # Elements CRUD hook (scoped to canvas)
    useLatestReadings.js   # Polls latest readings every 30s
  utils/
    heatmap.js             # IDW interpolation, grid rendering, color mapping
    icons.js               # Floor plan icon draw functions
  api/
    client.js              # Fetch wrapper (GET/POST/PUT/DELETE)
```

## Important Conventions

### Express 5
- Wildcard routes use `{*path}` syntax (path-to-regexp v8), NOT `*`

### Tailwind v4
- Uses `@import "tailwindcss"` (not `@tailwind` directives)
- Uses `@tailwindcss/vite` plugin
- Dark mode: class-based via `@custom-variant dark (&:where(.dark, .dark *))`
- Always include `dark:` variants when adding styled elements

### JSX Files
- Files containing JSX MUST use `.jsx` extension (Vite requirement)

### Canvas Rendering
- All drawing in FloorCanvas.jsx uses raw Canvas 2D API
- Coordinate system: meters (0 to floorWidth/floorHeight)
- `canvasToMeters()` converts screen coords to floor coords
- Uses `requestAnimationFrame` with dirty flag (`needsRedrawRef`)
- Heatmap computed on offscreen canvas, composited into main canvas

### State Management
- No Redux/Context for data — custom hooks per resource type
- Each hook: `{ items[], create(), update(), remove() }`
- Theme via React Context (`useTheme` hook)
- Auth via React Context (`useAuth` hook)

### API Patterns
- All routes behind `requireAuth` middleware
- Response format: `{ ok: true, resource }` or `{ ok: false, error }`
- API client throws on non-2xx status

## Database Tables
- `users` — authentication
- `canvases` — floor plan containers (name, width, height)
- `nodes` — sensor devices (device_id, name, x, y, canvas_id, coverage_radius, point_size)
- `readings` — sensor measurements (node_id, ts, battery, temp, humidity, pressure, eco2, tvoc, pm25)
- `walls` — line segments (canvas_id, x1, y1, x2, y2)
- `canvas_elements` — shapes/text/icons (canvas_id, type, position, dimensions, colors, rotation)

## Digital Twin Features
- Zoom/pan (Ctrl+scroll zoom, scroll pan, +/-/Reset buttons)
- Lock per canvas (prevents editing)
- Drawing modes: wall, rect, circle, triangle, text, icon
- Element rotation with snap (15 degrees)
- Wall rotation around midpoint
- Movable walls (drag to reposition)
- Node placement and dragging
- Unplace nodes (remove from canvas, keep in DB)
- Canvas-independent nodes (each canvas shows only its nodes)
- Heatmap overlay with IDW interpolation + wall occlusion
- Heatmap settings (toggle, opacity, power, radius, min/max)
- Area inspection (drag rectangle to average sensor values)
- Node label toggle
- Wall font size control
- Fullscreen mode (F key or button)
- Dark mode (persisted to localStorage)
