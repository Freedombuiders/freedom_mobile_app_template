import { createApiClient } from "@app/shared/client";

export { ApiError } from "@app/shared/client";

// Same origin as the page: the Worker serves /api next to this app, the session is an HttpOnly cookie.
export const api = createApiClient({ credentials: "same-origin" });
