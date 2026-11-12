import { APP_INFO } from "@app/shared/app-info";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Where the app finds the API (apps/api).
// - Dev (`npm run mobile`): the same computer that runs Metro, port 8787 (`npm run dev` starts `wrangler dev --ip 0.0.0.0`).
//   Metro's address (hostUri) works for the iOS simulator, the Android emulator and a real phone on the same Wi-Fi.
// - Release builds: APP_INFO.webUrl (packages/shared/src/app-info.ts) — the Worker serves /api on the web's origin.
// - EXPO_PUBLIC_API_URL overrides both (e.g. point a dev build at production, or set it per EAS build profile).
function devApiUrl() {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:8787`;
  return Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787";
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? devApiUrl() : APP_INFO.webUrl)).replace(/\/$/, "");

/** Public web pages (privacy policy, terms, support…) always open on the production site. */
export const WEB_URL = APP_INFO.webUrl.replace(/\/$/, "");
