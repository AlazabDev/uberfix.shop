import { CapacitorConfig } from '@capacitor/cli';

// التحقق من بيئة التطوير أو الإنتاج
const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'shop.uberfix.app',
  appName: 'UberFix',
  webDir: 'dist',
  
  // Server configuration - only for development
  ...(isProduction ? {} : {
    server: {
      url: 'https://c6adaf51-0eef-43e8-bf45-d65ac7ebe1aa.lovableproject.com?forceHideBadge=true',
      cleartext: true
    }
  }),
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0b1e36",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#ffb900",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0b1e36',
    },
    App: {
      launchUrl: '/',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  
  // Android specific settings for Google Play
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: !isProduction,
    backgroundColor: '#0b1e36',
  },
  
  // iOS specific settings
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
};

export default config;
