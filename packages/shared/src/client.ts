// Fetch wrapper for the /api contract, shared by the web app (same-origin cookie) and the native app
// (absolute base URL + bearer token).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type ApiClientOptions = {
  /** "" on the web (same origin) · "https://api.example.com" or "http://192.168.1.10:8787" in the app. */
  baseUrl?: string;
  /** App only: the session token, sent as `Authorization: Bearer`. */
  getToken?: () => string | null;
  /** Extra headers on every request. */
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  /** Any 401, with the token that request carried (null on the web). */
  onUnauthorized?: (token: string | null) => void;
  /** A hung request fails with the network message instead of spinning forever (default 15 s). */
  timeoutMs?: number;
};

const NETWORK_ERROR = "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";

export function createApiClient(opts: ApiClientOptions = {}) {
  async function request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    const token = opts.getToken?.() ?? null;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), opts.timeoutMs ?? 15_000);
    let res: Response;
    let data: unknown;
    try {
      res = await fetch((opts.baseUrl ?? "") + path, {
        method,
        signal: abort.signal,
        credentials: opts.credentials,
        headers: {
          Accept: "application/json",
          ...opts.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
    } catch {
      throw new ApiError(0, NETWORK_ERROR);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      if (res.status === 401) opts.onUnauthorized?.(token);
      throw new ApiError(res.status, (data as { error?: string }).error || "Có lỗi xảy ra, vui lòng thử lại.");
    }
    return data as T;
  }

  return {
    request,
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
    del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
