# Module 10 — Unified Maps Architecture

Single entry point: `@/modules/maps`

## Operational (Google Maps)

| Export | Purpose |
|---|---|
| `GoogleMapContainer` | Real interactive map (`AdvancedMarkerElement`, `mapId`). |
| `InteractiveMap` | Location picker + reverse geocoding for forms. |
| `MapLocationPicker` | Modal/dialog around `InteractiveMap`. |
| `GooglePlacesAutocomplete` | Address search input. |
| `GoogleLocationInput` | Lightweight numeric lat/lng input (renamed from misleading `GoogleMap`). |

## Popups
`TechnicianMapPopup`, `BranchMapPopup`.

## Promotional only (Mapbox)
`Globe3D` — homepage hero. **Never use for operational flows.**

## Loaders & config
`loadGoogleMaps`, `getGoogleMapsId`, `resetGoogleMapsLoader`, `loadMapbox`, `getMapboxToken`, `isMapboxLoaded`, `MAPS_CONFIG`.

## Migration notes
- `GoogleMap` (in `@/components/maps/GoogleMap`) was misleading: it never rendered a map, only two lat/lng inputs. Renamed → `GoogleLocationInput`.
- A backwards-compat alias `GoogleMap` still re-exports from `@/components/maps` to avoid breaking older imports, but new code must import from `@/modules/maps`.
- `Mapbox` may NOT be used in maintenance, technician routing, ETA, or request intake flows. Google Maps only.

## Conventions
1. All new map UIs import from `@/modules/maps`.
2. Use `MAPS_CONFIG.defaultCenter` (Cairo) and `MAPS_CONFIG.libraries` instead of hardcoded values.
3. Always go through `loadGoogleMaps()` — never inject `<script>` tags directly.
4. For markers in `GoogleMapContainer`, use `AdvancedMarkerElement` (handled internally).
5. For request intake forms, prefer `InteractiveMap` (auto reverse-geocode) over `GoogleLocationInput`.

## Phase rollout (completed)
- **Phase 1** — `QuickRequestFromMap` persists `client_latitude`, `client_longitude`, `assigned_technician_id` through `submit-public-request` → `maintenance-gateway`.
- **Phase 2** — `useVendorRouting` computes ETA before submission; `route_info` snapshot saved in `source_metadata.map_intake.route`. Marker clustering enabled in `ServiceMap`.
- **Phase 3** — Unified `src/modules/maps/` entry point + renamed `GoogleMap` → `GoogleLocationInput` with backwards-compat alias.