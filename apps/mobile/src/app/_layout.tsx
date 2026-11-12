import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

// Root navigator. Stack.Protected decides which screens exist: signed-in users only see the (app) group,
// visitors only see login/signup — Expo Router redirects automatically when the session changes.
function RootNavigator() {
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null; // the native splash stays up until the stored session is checked

  return (
    <Stack screenOptions={{ headerTintColor: colors.brand, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ title: "Tạo tài khoản", headerBackTitle: "Quay lại" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}
