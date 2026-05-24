---
name: Maps Unified Module
description: Single entry @/modules/maps; GoogleMap renamed to GoogleLocationInput; Mapbox is promotional only
type: architecture
---
All map components MUST be imported from `@/modules/maps`. The legacy `@/components/maps/GoogleMap` was a misleading lat/lng numeric input — renamed to `GoogleLocationInput` with a backwards-compat alias. Operational flows (requests, technicians, ETA, routing) use Google Maps only. Mapbox (`Globe3D`) is restricted to the homepage hero/promotional sections. See `docs/modules/10_MAPS_UNIFIED.md`.