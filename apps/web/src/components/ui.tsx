// Small UI kit. Restyle these to match your design instead of styling every page by hand.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; busy?: boolean };

export function Button({ variant = "primary", busy, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-slate-50",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        variant === "ghost" && "text-muted hover:text-ink",
        className,
      )}
    >
      {busy ? "Đang xử lý…" : children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputClass, "min-h-24", props.className)} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-line bg-white p-6 shadow-sm", className)}>{children}</div>;
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{children}</p>;
}

/** Long-form text pages (privacy policy, terms…). */
export function Prose({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_p]:leading-7 [&_ul]:mt-3 [&_ul]:space-y-1">
      <h1 className="text-3xl font-bold">{title}</h1>
      {updated && <p className="text-sm text-muted">Cập nhật: {updated}</p>}
      {children}
    </article>
  );
}
