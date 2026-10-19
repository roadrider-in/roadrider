import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "./src/state/AppState";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
