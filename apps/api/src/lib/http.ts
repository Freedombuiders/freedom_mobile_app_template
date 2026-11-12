import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import { firstError } from "@app/shared/schemas";

/** Stops the request with `{ error: message }` and the given status (handled in index.ts onError). */
export function fail(status: ContentfulStatusCode, message: string): never {
  throw new HTTPException(status, { message });
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

/** Parses the JSON body with a shared zod schema; answers 400 with the first message when it does not match. */
export async function readBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    fail(400, "Dữ liệu gửi lên không phải JSON hợp lệ.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) fail(400, firstError(parsed.error));
  return parsed.data;
}
