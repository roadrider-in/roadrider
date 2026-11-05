import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "./src/state/AppState";
import { I18nProvider } from "./src/lib/i18n";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppStateProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AppStateProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
