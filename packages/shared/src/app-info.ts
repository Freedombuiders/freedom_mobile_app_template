// Facts about the product shown on the web, in the app and in the API. One place to change them.
// `npm run init:project` rewrites the placeholder values below for a new project; edit by hand afterwards.

export const APP_INFO = {
  /** Display name (web title, app screens, emails). The installed app's name lives in apps/mobile/app.json `expo.name`. */
  name: "Freedom App",
  /** One-line description for the landing page and store listings. */
  tagline: "Ứng dụng mẫu của Freedom Builders",
  /** Public support address: required by App Store (Support URL page) and Google Play (contact email). */
  supportEmail: "support@example.com",
  /** Person or company that operates the service (privacy policy, terms). Should match the seller name in the stores. */
  operator: "Freedom Builders",
  /** Production web address, no trailing slash. The app opens legal pages from here. */
  webUrl: "https://freedom-app.example.com",
} as const;

/** Public pages both stores ask for (privacy policy, support, account deletion). Served by apps/web. */
export const LEGAL_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  support: "/support",
  deleteAccount: "/delete-account",
} as const;
