import { APP_CLIENT_HEADER, APP_CLIENT_VALUE, APP_PLATFORM_HEADER, APP_VERSION_HEADER } from "@app/shared/api";
import { createApiClient } from "@app/shared/client";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { API_URL } from "./config";

export { ApiError } from "@app/shared/client";

export const APP_VERSION = Constants.expoConfig?.version ?? "";

// The session token lives in SecureStore (session.tsx); this in-memory copy is what requests read.
let token: string | null = null;
export const setApiToken = (t: string | null) => {
  token = t;
};
export const getApiToken = () => token;

const unauthorizedListeners = new Set<(token: string | null) => void>();
export const onUnauthorized = (fn: (token: string | null) => void) => {
  unauthorizedListeners.add(fn);
  return () => void unauthorizedListeners.delete(fn);
};

export const api = createApiClient({
  baseUrl: API_URL,
  getToken: () => token,
  headers: {
    [APP_CLIENT_HEADER]: APP_CLIENT_VALUE,
    [APP_PLATFORM_HEADER]: Platform.OS,
    ...(APP_VERSION ? { [APP_VERSION_HEADER]: APP_VERSION } : {}),
  },
  credentials: "omit",
  onUnauthorized: (t) => unauthorizedListeners.forEach((fn) => fn(t)),
});
