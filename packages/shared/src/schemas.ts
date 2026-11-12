// Request validation shared by the API (authoritative) and the clients (instant form feedback).
// Add a schema here for every new write endpoint, then use it on both sides.
import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ.").max(254));
export const passwordSchema = z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(200);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên.").max(80),
  email: emailSchema,
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên.").max(80),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  /** Accounts with a password must confirm it before everything is erased. */
  password: z.string().max(200).optional(),
});

// ---- Example resource: notes (replace with your own domain) ----
const noteTitle = z.string().trim().min(1, "Vui lòng nhập tiêu đề.").max(200);
const noteBody = z.string().trim().max(10_000);

export const noteInputSchema = z.object({
  title: noteTitle,
  body: noteBody.default(""),
});
export type NoteInput = z.input<typeof noteInputSchema>;

// No defaults here: a field left out of a PATCH must stay unchanged (a default would overwrite it).
export const notePatchSchema = z.object({
  title: noteTitle.optional(),
  body: noteBody.optional(),
  done: z.boolean().optional(),
});
export type NotePatch = z.input<typeof notePatchSchema>;

/** First validation message, for showing under a form. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}
