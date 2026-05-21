import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/contexts/AppContext";

function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.replace(/\/$/, "").split("/").pop() ?? "";
    const readable = slug.replace(/[-_]/g, " ").replace(/\.\w+$/, "").trim();
    return readable || u.hostname;
  } catch {
    return url.slice(0, 60);
  }
}

function ShareHandler() {
  const { addSavedArticle } = useApp();

  function ingest(raw: string) {
    const match = raw.match(/https?:\/\/[^\s"'>)]+/);
    if (!match) return;
    const url = match[0].replace(/[.,;!?)]+$/, "");
    addSavedArticle({ url, title: titleFromUrl(url) });
  }

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) ingest(url);
    });
    const sub = Linking.addEventListener("url", ({ url }) => ingest(url));
    return () => sub.remove();
  }, []);

  return null;
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="vault-chat/[id]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Vault",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F8FAFC" },
        }}
      />
      <Stack.Screen
        name="mains-result/[id]"
        options={{
          headerShown: true,
          headerTitle: "Evaluation",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F8FAFC" },
        }}
      />
      <Stack.Screen
        name="quiz-session"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="weak-areas"
        options={{
          headerShown: true,
          headerTitle: "Weak Areas",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F8FAFC" },
          headerTitleStyle: {
            fontFamily: "Inter_700Bold",
            fontSize: 17,
          },
        }}
      />
      <Stack.Screen
        name="pdf-quiz"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <ShareHandler />
                <StatusBar style="dark" />
                <RootLayoutNav />
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
