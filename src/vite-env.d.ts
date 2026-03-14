/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_MAPBOX_TOKEN?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const google: any

interface Window {
  google?: any
}
