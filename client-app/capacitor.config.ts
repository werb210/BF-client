import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boreal.client',
  appName: 'Boreal Financial',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  ios: { contentInset: 'always' },
  android: {},
  plugins: {
    // BF_CLIENT_SPLASH_RECURSION_v1
    // See BI-Client v096. splash-screen 8.0.2 observes the parent view's
    // frame/bounds then assigns viewController.view.frame, re-entering
    // updateSplashImageBounds() until the stack overflows. There was no
    // plugins block here, so the default non-zero duration ran showOnLaunch()
    // -- the same path. Latent rather than fixed.
    SplashScreen: { launchAutoHide: true, launchShowDuration: 0 },
  }
};

export default config;
