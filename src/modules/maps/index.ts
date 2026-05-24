/**
 * Unified Maps Module — Single source of truth for all map components.
 *
 * Operational (Google Maps):
 *   - GoogleMapContainer  → main interactive map (AdvancedMarkerElement)
 *   - InteractiveMap      → reusable location picker + reverse geocoding
 *   - MapLocationPicker   → modal/dialog wrapper around InteractiveMap
 *   - GooglePlacesAutocomplete → address search
 *   - GoogleLocationInput → lightweight lat/lng numeric input (was misnamed `GoogleMap`)
 *
 * Popups:
 *   - TechnicianMapPopup, BranchMapPopup
 *
 * Promotional only (Mapbox):
 *   - Globe3D — homepage hero, NOT for operational flows.
 *
 * Hooks & loaders:
 *   - loadGoogleMaps / getGoogleMapsId / resetGoogleMapsLoader
 *   - loadMapbox / getMapboxToken / isMapboxLoaded
 */

export { GoogleMapContainer } from '@/components/maps/GoogleMapContainer';
export type { MapMarker } from '@/components/maps/GoogleMapContainer';
export { InteractiveMap } from '@/components/maps/InteractiveMap';
export { MapLocationPicker } from '@/components/maps/MapLocationPicker';
export { GooglePlacesAutocomplete } from '@/components/maps/GooglePlacesAutocomplete';
export { GoogleLocationInput } from '@/components/maps/GoogleLocationInput';

export { TechnicianMapPopup } from '@/components/maps/TechnicianMapPopup';
export { BranchMapPopup } from '@/components/maps/BranchMapPopup';

// Promotional only
export { Globe3D } from '@/components/maps/Globe3D';

// Loaders & config
export {
  loadGoogleMaps,
  resetGoogleMapsLoader,
  getGoogleMapsId,
} from '@/lib/googleMapsLoader';
export {
  loadMapbox,
  getMapboxToken,
  isMapboxLoaded,
  mapboxLoader,
} from '@/lib/mapboxLoader';
export { MAPS_CONFIG } from '@/config/maps';

// Shared types
export type {
  TechnicianMapData,
  BranchMapData,
  MapPin,
} from '@/modules/map/types';