/**
 * Maps Components - مكونات الخرائط
 * 
 * Google Maps: للاستخدام الفعلي في التطبيق
 * Mapbox: للعرض الترويجي فقط (Globe 3D)
 */

// Google Maps Components (للاستخدام الفعلي)
export { GoogleMapContainer } from './GoogleMapContainer';
export type { MapMarker } from './GoogleMapContainer';
export { GoogleLocationInput } from './GoogleLocationInput';
// Backwards-compat alias — old name was misleading (it is a numeric lat/lng input, not a map)
export { GoogleLocationInput as GoogleMap } from './GoogleLocationInput';
export { MapLocationPicker } from './MapLocationPicker';
export { InteractiveMap } from './InteractiveMap';
export { GooglePlacesAutocomplete } from './GooglePlacesAutocomplete';

// Map Popups
export { TechnicianMapPopup } from './TechnicianMapPopup';
export { BranchMapPopup } from './BranchMapPopup';

// Globe 3D (Mapbox - للترويج فقط)
export { Globe3D } from './Globe3D';

// Loaders
export { loadGoogleMaps, resetGoogleMapsLoader, getGoogleMapsId } from '@/lib/googleMapsLoader';
export { loadMapbox, getMapboxToken, isMapboxLoaded, mapboxLoader } from '@/lib/mapboxLoader';
