/**
 * Google Maps Configuration
 * مركزية إعدادات الخرائط في جميع أنحاء التطبيق
 */

export const MAPS_CONFIG = {
  // Default map settings
  defaultCenter: { lat: 30.0444, lng: 31.2357 }, // Cairo, Egypt
  defaultZoom: 12,
  
  // Map options
  defaultOptions: {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    mapId: 'cbebd74833941bfb8b76b91b',
    clickableIcons: true,
    gestureHandling: 'greedy',
  },
  
  // Libraries to load
  libraries: ['places', 'geometry', 'marker'] as const,
  
  // Marker icons
  markerIcons: {
    vendor: '/placeholder.svg',
    branch: '/placeholder.svg',
    property: '/placeholder.svg',
    technician: '/placeholder.svg',
  },
} as const;
