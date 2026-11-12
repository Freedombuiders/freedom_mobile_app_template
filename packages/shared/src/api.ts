// The API contract: response shapes shared by apps/api, apps/web and apps/mobile.
// Request bodies are described by the zod schemas in schemas.ts.

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

/** What the native app gets from sign-in/sign-up: a bearer token (the web gets an HttpOnly cookie instead). */
export type AppSession = {
  token: string;
  user: User;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Health = { ok: true; env: string; time: string };

/** Every error response: `{ error: "<message for people>" }` with a 4xx/5xx status. */
export type ApiErrorBody = { error: string };

// The native app identifies itself with this header (it has no cookies). The API then answers sign-in with an
// AppSession and expects `Authorization: Bearer <token>` afterwards. Browsers always send Origin on POST, so a
// browser can never be mistaken for the app (see apps/api/src/lib/auth.ts).
export const APP_CLIENT_HEADER = "X-App-Client";
export const APP_CLIENT_VALUE = "mobile";
export const APP_PLATFORM_HEADER = "X-App-Platform"; // "ios" | "android"
export const APP_VERSION_HEADER = "X-App-Version"; // app.json expo.version
