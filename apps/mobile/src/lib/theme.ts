// Design tokens for the app. Keep in step with apps/web/src/styles.css (@theme) and your design (docs/design/).
export const colors = {
  brand: "#2563eb",
  brandDark: "#1d4ed8",
  brandSoft: "#eff6ff",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
  danger: "#dc2626",
  success: "#15803d",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16 } as const;
export const font = { body: 16, small: 14, title: 24, heading: 18 } as const;
