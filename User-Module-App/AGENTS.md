# RoadRider User App — React Native & Expo

Full native mobile application built with **React Native 0.86** + **Expo 57** + **React Navigation 7** + **Supabase**.

## Running the Application

Start the Expo development server:
```bash
npx expo start
```
or
```bash
npm start
```

### Options:
- Press `a` in terminal to open in Android Emulator
- Press `i` to open in iOS Simulator
- Scan the displayed QR code with **Expo Go** on physical Android or iOS device
- Run `npm run tunnel` to launch an ngrok tunnel for external network testing

## Build & Release with EAS Build

Ensure EAS CLI is installed: `npm install -g eas-cli`

### 1. Standalone Android APK (Direct phone install / testing):
```bash
eas build --platform android --profile preview
```

### 2. Android App Bundle (AAB for Google Play Store):
```bash
eas build --platform android --profile production
```

### 3. iOS TestFlight / App Store Release:
```bash
eas build --platform ios --profile production
```

## Project Architecture

- `App.tsx` - App entry wrapped with `SafeAreaProvider`, `I18nProvider`, and `AppStateProvider`
- `src/navigation/RootNavigator.tsx` - Stack and Tab navigators for 30+ native screens
- `src/screens/` - Native screens (Auth, Home verticals, Cart, Orders, Live Tracking, Support)
- `src/state/AppState.tsx` - Central reactive app state with AsyncStorage persistence and Supabase synchronization
- `src/lib/i18n.tsx` - Multi-language translation engine (English & Hindi)
- `src/lib/supabase.ts` - Supabase client with real-time channels
- `src/components/` - Native UI components (`Icon`, `Button`, `Logo`, `GoogleMap`, `CancelOrderModal`, `ReviewModal`)
- `app.json` / `app.config.js` - Dynamic Expo config with location permissions and Google Maps API keys
- `eas.json` - Multi-environment build profiles for development, preview APK, and production app bundle
