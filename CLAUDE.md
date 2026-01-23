# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173) - serves at /map/ base path
npm run build     # Production build to /dist
npm run preview   # Preview production build locally
npm run studio    # Run Sanity Studio CMS (cd sanity && sanity dev)
```

## Architecture Overview

Interactive 3D venue map for Live Nation built with React 19, Three.js (via React Three Fiber), and Sanity CMS. Deployed to Netlify.

### Tech Stack
- **React 19.2.0** with React Router DOM 7.9.4
- **Three.js 0.180.0** / **@react-three/fiber 9.3.0** / **@react-three/drei 10.7.6**
- **Vite 7.1.9** as build tool (base path: `/map/`)
- **Sanity** headless CMS (studio in `/sanity/`, dataset: `production`)
- **Netlify** for deployment with SPA routing

### Application Structure

**Entry Flow**: `src/main.jsx` → `src/App.jsx` (BrowserRouter with `basename="/map"`)

**Routes**:
- `/` → MapPage: 3D interactive US map (desktop) or accordion list (mobile)
- `/venue/:slug` → VenuePage: Hero with SVG animation, gallery, about module

**Data Flow**:
1. App.jsx fetches all venues on mount via `fetchMapPoints()` in `src/services/mapPoints.js`
2. GROQ query returns mapPoint documents with resolved image assets and metadata
3. `mapToRenderable()` transforms lat/lng to 3D coordinates via `latLonTo3D()`
4. Data passed to pages as props: `mapPoints`, `pointsLoading`, `pointsError`

---

## Directory Structure

```
src/
├── pages/
│   ├── MapPage.jsx          # 3D map canvas, splash screen, selection overlay
│   └── VenuePage.jsx        # Hero section, gallery, about module
├── components/
│   ├── MobileMapView.jsx    # Static map + regional accordions for mobile
│   ├── RegionAccordion.jsx  # Collapsible venue list by region
│   └── ResponsiveImage.jsx  # Sanity image with srcset, LQIP blur loading
├── modules/
│   ├── SiteHeader.jsx       # Fixed header with scroll-hide behavior
│   ├── VenueAboutModule.jsx # Video, description, services, partners, crew
│   └── VenueGalleryModule.jsx # Staggered gallery layout (absolute/flex)
├── hooks/
│   ├── useViewportWidth.js  # Viewport tracking hook (SSR-safe)
│   └── useScrollDirection.js # Returns 'up'/'down' for header visibility
├── services/
│   └── mapPoints.js         # GROQ query, data normalization, coordinate transform
├── lib/
│   ├── sanityClient.js      # Sanity client config (CDN, token, perspective)
│   └── imageUrl.js          # urlFor() image URL builder
├── constants/
│   └── theme.js             # Colors, breakpoints, z-index, animations, spacing
├── assets/                  # Static SVGs (arrows, icons)
│
├── USMap.jsx                # 3D extruded US map from GeoJSON
├── MapPoint.jsx             # 3D venue markers (3-ring system)
├── CameraController.jsx     # Animated camera transitions (3s, easeInOutCubic)
├── FlashlightPlane.jsx      # Custom GLSL shader for logo sweep effect
├── ShaderText.jsx           # Gradient text with flashlight highlight
├── ShaderTester.jsx         # Dev tool for shader parameter testing
├── usStates.js              # US_BOUNDS constants + latLonTo3D() projection
├── useFlashlightGUI.js      # lil-gui debug controls for ShaderText gradient
└── useFlashlightPlaneGUI.js # lil-gui debug controls for FlashlightPlane shader

sanity/
├── sanity.config.ts         # Studio config (deskTool, visionTool)
├── sanity.cli.ts            # CLI config for deployment
└── schemas/
    └── mapPoint.ts          # Single document type with all venue fields

public/
├── _redirects               # Netlify routing rules
├── fonts/                   # Typeface JSON for Three.js text
├── images/                  # Static images (logos, mobile map)
└── models/                  # GLB/GLTF 3D models
```

---

## Sanity CMS Integration

### Environment Variables (`.env`)
```
VITE_SANITY_PROJECT_ID=<your-project-id>
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2024-05-01
VITE_SANITY_READ_TOKEN=<your-read-token>
VITE_SANITY_USE_CDN=true
```

### Schema: `mapPoint` Document Type

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Venue name (required) |
| `slug` | slug | URL identifier, auto-generated from title |
| `state` | string | US state (dropdown, 50 options) |
| `city` | string | City name |
| `region` | string | 'west', 'central', or 'east' (required) |
| `location` | geopoint | Lat/lng coordinates (required) |
| `heroImage` | image | Main hero image with hotspot (required) |
| `heroLineAnimation` | image | SVG for line drawing animation |
| `logoTexture` | image | Logo for flashlight reveal effect |
| `gallery` | array | Up to 12 gallery items with position metadata |
| `aboutModule` | object | Video, videoPoster, description, services, partners, crew |
| `description` | text | Short text description at document level |

### GROQ Query Pattern (mapPoints.js)
```groq
*[_type == "mapPoint"] | order(title asc) {
  _id, title, "slug": slug.current, state, city, region, location, description,
  "heroImage": heroImage{ asset->{ _id, url, metadata{ lqip, dimensions } }, hotspot, crop },
  "heroLineSvgUrl": heroLineAnimation.asset->url,
  "logoData": { "url": logoTexture.asset->url, "dimensions": logoTexture.asset->metadata.dimensions },
  gallery[]{ _key, title, position, "image": image{ asset->{ _id, url, metadata } } },
  aboutModule{
    "videoUrl": video.asset->url,
    "videoType": video.asset->mimeType,
    "videoPoster": videoPoster{ asset->{ _id, url, metadata }, hotspot, crop },
    description, services, partners[]{ name, title }, crew[]{ name, title }
  }
}
```

---

## 3D Rendering Architecture

### Coordinate System
- **Projection**: Normalized Mercator-like (lat/lng → 3D world coordinates)
- **US Bounds**: Lon [-125, -66] → X [-300, 300], Lat [24, 49] → Y [-200, 200]
- **Function**: `latLonTo3D(lon, lat)` returns `[x, y]` for 2D plane at Z=0
- **MapPoint Z-offset**: Markers positioned at `z=12.5` above map surface

### Canvas Setup (MapPage.jsx)
```jsx
<Canvas>
  <PerspectiveCamera position={[164.3, 221.38, 270.94]} rotation={[-0.724, 0.286, 0.245]} />
  <ambientLight intensity={0.5} />
  <directionalLight position={[100, 200, 100]} intensity={1} castShadow />
  <USMap />
  <group rotation={[-Math.PI / 2, 0, 0]}>
    {spacedPoints.map(point => <MapPoint key={point._id} ... />)}
  </group>
  {cameraTarget && <CameraController targetPosition={cameraTarget} onComplete={...} />}
</Canvas>
```

### Key 3D Components

**USMap.jsx** - Extruded US map from GeoJSON
- Parses `us-states.json` with Polygon/MultiPolygon support
- ExtrudeGeometry (depth: 4, bevel: 0.2)
- Materials: black top/bottom, white emissive edges
- EdgesGeometry for outline at `renderOrder={1}`

**MapPoint.jsx** - 3-ring venue markers
- Outer ring (r=13, opacity 0.75), middle ring (r=8.5), core disk (r=4.5)
- Invisible hit area (r=14.5) for pointer detection
- Scale: 0.8 (idle) → 0.95 (active)
- Projects world position to screen via `useFrame` + `onProject` callback

**CameraController.jsx** - Animated camera transitions
- Duration: ~3 seconds (progress += delta * 0.33)
- Easing: `easeInOutCubic(t)`
- Lerps camera position and controls.target
- Triggers `onComplete` callback when done

**FlashlightPlane.jsx** - Custom GLSL shader
- Uniforms: `uPointer`, `uRadius`, `uFeather`, `uIntensity`, `uAmbient`, `uTime`
- Ping-pong sweep animation across texture
- Fragment shader calculates distance-based spotlight blend

### Point Spacing Algorithm (MapPage.jsx)
`resolveSpacedPoints()` prevents marker overlap:
- 8 iterations of force-directed positioning
- Pushes overlapping points apart by overlap distance
- Clamps to US_BOUNDS to keep markers visible
- Dynamic `minDistance` based on viewport width

### Memory Management
All components dispose geometries/materials in `useEffect` cleanup:
```javascript
useEffect(() => () => {
  geometry.dispose();
  material.dispose();
}, [geometry, material]);
```

---

## Styling System

### Design Tokens (`src/constants/theme.js`)

**Colors**:
- `BACKGROUND_DARK`: #000000
- `TEXT_WHITE`: #fff (with 70%, 85% opacity variants)
- `ACCENT_RED`: #ff2b2b
- `GRID_RED`: rgba(200, 0, 0, 0.12)
- `BORDER_WHITE_*`: 8%, 15%, 30% opacity variants

**Breakpoints**:
- `MOBILE`: 768px (3D canvas vs accordion list)
- `TABLET`: 900px (gallery layout switch)
- `DESKTOP`: 1024px (about module grid)

**Z-Index Scale**:
- `CURSOR`: 90, `SELECTION_OVERLAY`: 130, `HEADER`: 200, `SPLASH`: 9999

**Animations**:
- `QUICK`: 0.2s, `STANDARD`: 0.3s, `SLOW`: 0.4s
- `SPLASH_DURATION`: 2000ms

### Global CSS (`src/global.css`)
- CSS custom properties: `--font-display`, `--font-body`, `--color-accent`
- Font: Poppins (Typekit) - 700 weight for headings, 500 for body
- Typography: uppercase headings with 0.1em letter-spacing
- Focus styles: 2px solid white outline with 2px offset
- `.sr-only` class for screen reader text

### Styling Patterns
- **Inline styles** (React style objects) - no CSS-in-JS library
- **Responsive**: `clamp()` for fluid spacing, conditional rendering at breakpoints
- **Grid background**: linear-gradient pattern at 40px intervals
- **LQIP loading**: 20px blur placeholder → fade to full image
- **Animations**: CSS transitions, SVG stroke-dasharray for line drawing

---

## Build & Deployment

### Vite Configuration (`vite.config.js`)
- Base path: `/map/`
- Plugins: `@vitejs/plugin-react`, custom redirect middleware (/ → /map/)
- Assets: Includes GLSL files via `assetsInclude: ['**/*.glsl']`

### Netlify Routing (`public/_redirects`)
```
/map/assets/*  /assets/:splat  200
/              /map/           301
/map/*         /index.html    200
```

### Build Output (`/dist`)
- Main bundle: ~1.3MB (Three.js + R3F)
- CSS: ~1KB
- Fonts: 175KB (typeface JSON)
- Models: ~1.4MB (GLB/GLTF)

---

## Key Patterns

### Responsive Design
- Mobile detection: `useViewportWidth()` < 768px
- Desktop: Full 3D canvas with MapPoint selection + SelectionOverlay
- Mobile: MobileMapView with static map image + RegionAccordion components
- Gallery: Absolute positioning (desktop) vs flex with alternating alignment (mobile)

### Data Fetching
- Single fetch on App mount with cancellation token
- Error boundary with graceful degradation (empty array on failure)
- Loading states passed to child pages

### Animation Patterns
- `useFrame` for Three.js animations (camera, shader uniforms, position projection)
- CSS transitions for UI (opacity, height, transform)
- SVG line drawing: stroke-dasharray + stroke-dashoffset animation
- Staggered delays for sequential reveals

### Performance Optimizations
- Geometry/material disposal on unmount
- `useMemo` for expensive calculations (spacing algorithm, coordinate transforms)
- Lazy loading images with responsive srcset
- `depthWrite={false}` on transparent objects
- Mobile fallback eliminates 3D rendering overhead

---

## Component Reference

### Pages
| Component | Purpose | Key Features |
|-----------|---------|--------------|
| MapPage | Main 3D map view | Canvas, splash screen, selection overlay, cursor follower |
| VenuePage | Venue detail page | Hero with SVG animation, flashlight logo reveal, gallery, about |

### Modules
| Component | Purpose | Key Features |
|-----------|---------|--------------|
| SiteHeader | Fixed navigation | Scroll-hide behavior, responsive grid layout |
| VenueGalleryModule | Image gallery | Staggered absolute layout (desktop), flex (mobile) |
| VenueAboutModule | Venue info | Video player, rich text, services/partners/crew lists |

### 3D Components
| Component | Purpose | Key Features |
|-----------|---------|--------------|
| USMap | 3D extruded map | GeoJSON parsing, ExtrudeGeometry, edge lines |
| MapPoint | Venue markers | 3-ring system, hover/select states, screen projection |
| CameraController | Camera animation | 3s transitions, easeInOutCubic, lerp position/target |
| FlashlightPlane | Shader effect | GLSL spotlight sweep, ping-pong animation |

### Hooks
| Hook | Returns | Purpose |
|------|---------|---------|
| useViewportWidth | number | Current viewport width (SSR-safe, default 1440) |
| useScrollDirection | 'up' \| 'down' | Scroll direction with threshold (40px default) |

---

## Environment Setup

1. Clone repository
2. Copy `.env.example` to `.env` (or create with Sanity credentials)
3. `npm install`
4. `npm run dev` → http://localhost:5173/map/

For Sanity Studio:
1. `cd sanity && npm install`
2. `npm run dev` → http://localhost:3333/
