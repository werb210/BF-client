import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boreal.client',
  appName: 'Boreal Financial',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  // BF_CLIENT_PHONE_POLISH_v751 - the page pads itself with env(safe-area-inset-*) (viewport-fit=cover); 'always'
  // added the same inset again, leaving a blank band above the header and under the tab bar.
  ios: { contentInset: 'never' },
  android: {},
  plugins: {
    // BF_CLIENT_PHONE_TABS_v752 - resize the app above the keyboard so the tab bar stays visible on Chat.
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
  }
};

export default config;
