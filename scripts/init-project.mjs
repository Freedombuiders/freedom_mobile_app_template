#!/usr/bin/env node
// Turn this template into a new product: app name, slug, bundle id, domain, support email, operator, tagline.
// Zero dependencies, works on macOS / Linux / Windows.
//
//   npm run init:project                     # asks a few questions
//   npm run init:project -- --name "My App" --slug my-app --bundle-id com.company.myapp \
//     --domain myapp.com --support-email hi@myapp.com --operator "Company" --tagline "..." --yes
//
// Files it rewrites: apps/mobile/app.json, apps/api/wrangler.jsonc, packages/shared/src/app-info.ts,
// apps/web/index.html, package.json (+ the root name in package-lock.json).
// The current values are read from those files and swapped by exact string, so comments and formatting survive.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZERO_ID = "00000000-0000-0000-0000-000000000000";
const BUNDLE_PREFIX = "com.freedombuilders";
/** Values the untouched template ships with: only used to tell "fresh template" from "already initialised". */
const TEMPLATE = {
  name: "Freedom App",
  slug: "freedom-app",
  bundleId: "com.freedombuilders.freedomapp",
  worker: "freedom-app",
  tagline: "Ứng dụng mẫu của Freedom Builders",
};
const autoTagline = (name, operator) => `${name} – ứng dụng của ${operator}`;

const F = {
  appJson: "apps/mobile/app.json",
  wrangler: "apps/api/wrangler.jsonc",
  appInfo: "packages/shared/src/app-info.ts",
  html: "apps/web/index.html",
  pkg: "package.json",
  lock: "package-lock.json",
};

const HELP = `Khởi tạo dự án mới từ template (đổi tên app, slug, bundle id, tên miền...).

Cách dùng:
  npm run init:project                       hỏi từng câu
  npm run init:project -- --name "My App" --yes   không hỏi (dùng giá trị mặc định cho phần còn thiếu)

Tham số:
  --name "Tên App"          tên hiển thị (bắt buộc khi dùng --yes)
  --slug my-app             mặc định: suy ra từ tên (chữ thường, không dấu, gạch ngang); --force: giữ slug hiện tại
  --scheme myapp            deep link scheme, mặc định: slug bỏ gạch ngang
  --bundle-id com.x.myapp   iOS bundleIdentifier + Android package, mặc định: ${BUNDLE_PREFIX}.<scheme>; --force: giữ nguyên
  --domain myapp.com        tên miền production (để trống nếu chưa có)
  --support-email hi@x.com  email hỗ trợ (mặc định: support@<domain>)
  --operator "Công ty"      người/công ty vận hành (chính sách, điều khoản)
  --tagline "..."           mô tả một dòng (landing page, thẻ meta)
  --yes, -y                 không hỏi, áp dụng luôn
  --force                   chạy lại trên dự án đã khởi tạo
  --dry-run                 chỉ in thay đổi, không ghi tệp
  --help, -h                in hướng dẫn này`;

// ---------------------------------------------------------------- small helpers

const abs = (rel) => path.join(ROOT, rel);
const exists = (rel) => fs.existsSync(abs(rel));
const read = (rel) => fs.readFileSync(abs(rel), "utf8");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescHtml = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function fail(message) {
  console.error(`\nLỗi: ${message}`);
  process.exit(1);
}

/** Vietnamese-safe ASCII slug: "Học Toán Vui!" -> "hoc-toan-vui". Always starts with a letter. */
function slugify(text) {
  let s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (/^[0-9]/.test(s)) s = `app-${s}`;
  return s.slice(0, 40).replace(/-+$/, "");
}

/** JSONC -> object (comments and trailing commas removed, string contents untouched). */
function parseJsonc(text) {
  let out = "";
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (c === ",") {
      let j = i + 1;
      while (/\s/.test(text[j] ?? "")) j++;
      if (text[j] !== "}" && text[j] !== "]") out += c;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return JSON.parse(out);
}

/** Write JSON the way the file already looks (indent + line endings). */
function stringifyLike(original, data) {
  const indent = /^[ \t]+(?=")/m.exec(original)?.[0] ?? "  ";
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const body = JSON.stringify(data, null, indent).replace(/\n/g, eol);
  return original.endsWith("\n") ? body + eol : body;
}

/** Replace the first `"key": "old"` with `"key": "new"` (JSON/JSONC text). Returns null when not found. */
function swapJsonString(text, key, oldValue, newValue) {
  const re = new RegExp(`("${escRe(key)}"\\s*:\\s*)${escRe(JSON.stringify(oldValue))}`);
  if (!re.test(text)) return null;
  return text.replace(re, (_, lead) => lead + JSON.stringify(newValue));
}

// ---------------------------------------------------------------- read what the files say today

function readCurrent() {
  const cur = { missing: [] };

  if (exists(F.appJson)) {
    const json = JSON.parse(read(F.appJson));
    const e = json.expo ?? {};
    cur.app = {
      name: e.name,
      slug: e.slug,
      scheme: Array.isArray(e.scheme) ? e.scheme[0] : e.scheme,
      bundleId: e.ios?.bundleIdentifier,
      androidPackage: e.android?.package,
      owner: e.owner,
      projectId: e.extra?.eas?.projectId,
    };
  } else cur.missing.push(F.appJson);

  if (exists(F.wrangler)) {
    const cfg = parseJsonc(read(F.wrangler));
    const db = (cfg.d1_databases ?? []).find((d) => d.binding === "DB") ?? cfg.d1_databases?.[0];
    cur.wrangler = { name: cfg.name, accountId: cfg.account_id, dbName: db?.database_name, dbId: db?.database_id };
  } else cur.missing.push(F.wrangler);

  if (exists(F.appInfo)) {
    const block = appInfoBlock(read(F.appInfo));
    if (block) {
      cur.info = {};
      for (const field of ["name", "tagline", "supportEmail", "operator", "webUrl"]) {
        const m = appInfoField(block.text, field);
        if (m) cur.info[field] = m.value;
      }
    }
  } else cur.missing.push(F.appInfo);

  if (exists(F.pkg)) cur.pkg = JSON.parse(read(F.pkg));
  else cur.missing.push(F.pkg);

  return cur;
}

function appInfoBlock(text) {
  const start = text.search(/export const APP_INFO\s*=\s*\{/);
  if (start < 0) return null;
  const end = text.indexOf("} as const", start);
  const stop = end < 0 ? text.indexOf("};", start) : end;
  if (stop < 0) return null;
  return { start, end: stop, text: text.slice(start, stop) };
}

function appInfoField(blockText, field) {
  const m = new RegExp(`(\\n\\s*${field}\\s*:\\s*)("(?:[^"\\\\\\n]|\\\\.)*")`).exec(blockText);
  if (!m) return null;
  return { lead: m[1], literal: m[2], value: JSON.parse(m[2]) };
}

// ---------------------------------------------------------------- answers: flags, prompts, defaults, validation

const JAVA_KEYWORDS = new Set(
  "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null".split(
    " ",
  ),
);

const validate = {
  name: (v) => (v.trim() ? null : "Tên app không được để trống."),
  slug: (v) =>
    /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(v) && v.length >= 2 && v.length <= 40
      ? null
      : "Slug: 2–40 ký tự a-z, 0-9 và gạch ngang, bắt đầu bằng chữ (vd: my-app).",
  scheme: (v) => (/^[a-z][a-z0-9+.-]*$/.test(v) ? null : "Scheme: chữ thường, bắt đầu bằng chữ (vd: myapp)."),
  bundleId: (v) => {
    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(v))
      return "Bundle ID: dạng com.congty.tenapp — chữ thường và số, mỗi phần bắt đầu bằng chữ, không gạch ngang/gạch dưới.";
    const bad = v.split(".").find((p) => JAVA_KEYWORDS.has(p));
    return bad ? `Bundle ID không được chứa từ khoá Java "${bad}" (Android sẽ từ chối).` : null;
  },
  domain: (v) =>
    !v || /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(v)
      ? null
      : "Tên miền không hợp lệ (vd: myapp.com — không có https://).",
  supportEmail: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Email không hợp lệ."),
  operator: (v) => (v.trim() ? null : "Đơn vị vận hành không được để trống."),
  tagline: (v) => (v.trim() ? null : "Tagline không được để trống."),
};

const normalize = {
  name: (v) => v.trim().replace(/\s+/g, " "),
  slug: (v) => v.trim().toLowerCase(),
  scheme: (v) => v.trim().toLowerCase(),
  bundleId: (v) => v.trim().toLowerCase(),
  domain: (v) =>
    v
      .trim()
      .toLowerCase()
      .replace(/^[a-z]+:\/\//, "")
      .replace(/\/.*$/, ""),
  supportEmail: (v) => v.trim(),
  operator: (v) => v.trim().replace(/\s+/g, " "),
  tagline: (v) => v.trim().replace(/\s+/g, " "),
};

const QUESTIONS = [
  ["name", "Tên app (hiện trên điện thoại và web)"],
  ["slug", "Slug (tên Worker, Expo slug; chữ thường, gạch ngang)"],
  ["bundleId", "Bundle ID iOS / Android package"],
  ["domain", "Tên miền production (Enter nếu chưa có)"],
  ["supportEmail", "Email hỗ trợ (hiện trên store và trang Support)"],
  ["operator", "Người/công ty vận hành (chính sách, điều khoản)"],
  ["tagline", "Mô tả một dòng (tagline)"],
];

/** Default for each field, computed from the answers so far. */
function defaultFor(field, a, cur) {
  // Re-run (--force): slug, scheme and bundle id keep their current values unless asked, because changing them
  // means a new Worker + empty D1 database, and a different app in the stores.
  const curSlug = cur.app?.slug && cur.app.slug !== TEMPLATE.slug ? cur.app.slug : null;
  const curBundle = cur.app?.bundleId && cur.app.bundleId !== TEMPLATE.bundleId ? cur.app.bundleId : null;
  const scheme = a.slug ? (curSlug === a.slug && cur.app?.scheme ? cur.app.scheme : a.slug.replace(/-/g, "")) : "";
  switch (field) {
    case "name":
      return cur.info?.name && cur.info.name !== TEMPLATE.name ? cur.info.name : "";
    case "slug":
      return curSlug ?? (a.name ? slugify(a.name) : "");
    case "scheme":
      return scheme;
    case "bundleId":
      return curBundle ?? (scheme ? `${BUNDLE_PREFIX}.${scheme}` : "");
    case "domain": {
      // Re-run (--force): keep a real custom domain that is already in APP_INFO.webUrl.
      const host = /^https?:\/\/([^/]+)/.exec(cur.info?.webUrl ?? "")?.[1] ?? "";
      return /(^|\.)(example\.com|workers\.dev)$/.test(host) ? "" : host;
    }
    case "supportEmail": {
      const email = cur.info?.supportEmail ?? "support@example.com";
      if (!/@example\.com$/i.test(email)) return email; // already a real address (re-run)
      return a.domain ? `support@${a.domain}` : email;
    }
    case "operator":
      return cur.info?.operator ?? "Freedom Builders";
    case "tagline": {
      // Keep a tagline someone wrote by hand; regenerate the template's or our own generated one.
      const t = cur.info?.tagline;
      if (t && t !== TEMPLATE.tagline && t !== autoTagline(cur.info.name, cur.info.operator)) return t;
      return a.name ? autoTagline(a.name, a.operator || defaultFor("operator", a, cur)) : "";
    }
  }
  return "";
}

async function collectAnswers(args, cur) {
  const a = {};
  const interactive = !args.yes;
  if (interactive && !process.stdin.isTTY)
    fail('Không có terminal để hỏi. Thêm --yes cùng các tham số (vd: --name "My App" --yes).');

  let rl;
  if (interactive) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("SIGINT", () => {
      console.log("\nĐã huỷ, chưa ghi gì.");
      process.exit(130);
    });
    console.log("Khởi tạo dự án mới từ template. Enter = giữ giá trị trong [ngoặc].\n");
  }

  for (const [field, label] of QUESTIONS) {
    if (args[field] !== undefined) {
      a[field] = normalize[field](args[field]);
      const err = validate[field](a[field]);
      if (err) {
        if (!interactive) fail(`--${field.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${err}`);
        console.log(`  ${err}`);
      } else continue;
    }
    const def = defaultFor(field, a, cur);
    const flag = `--${field.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`;
    if (!interactive) {
      if (field === "name" && !def) fail('Thiếu --name "Tên App".');
      const err = validate[field](def);
      if (err) fail(`Không tự suy ra được ${flag} (giá trị "${def}"): ${err} Hãy truyền ${flag}.`);
      a[field] = def;
      continue;
    }
    for (;;) {
      const hint = field === "domain" && def ? ` [${def}] ('-' để bỏ)` : def ? ` [${def}]` : "";
      const raw = await rl.question(`${label}${hint}: `);
      const value = field === "domain" && raw.trim() === "-" ? "" : normalize[field](raw.trim() ? raw : def);
      const err = validate[field](value);
      if (!err) {
        a[field] = value;
        break;
      }
      console.log(`  ${err}`);
    }
  }

  a.scheme = args.scheme !== undefined ? normalize.scheme(args.scheme) : defaultFor("scheme", a, cur);
  const schemeErr = validate.scheme(a.scheme);
  if (schemeErr) fail(`--scheme: ${schemeErr}`);

  a.worker = a.slug;
  a.dbName = `${a.slug}-db`;
  // No domain: keep the real workers.dev address of this same Worker (re-run), else a placeholder to fix after deploy.
  const keepWorkersDev = cur.info?.webUrl?.startsWith(`https://${a.slug}.`) && cur.info.webUrl.endsWith(".workers.dev");
  a.webUrl = a.domain ? `https://${a.domain}` : keepWorkersDev ? cur.info.webUrl : `https://${a.slug}.example.com`;
  return { answers: a, rl };
}

// ---------------------------------------------------------------- plan every edit in memory first

function plan(a, cur) {
  const edits = []; // { file, content, notes[] }
  const warnings = [];
  const add = (file, content, notes) => edits.push({ file, content, notes });

  // apps/mobile/app.json — structured edit (also drops the old EAS project link).
  if (cur.app) {
    const original = read(F.appJson);
    const json = JSON.parse(original);
    const e = json.expo;
    const notes = ["expo.name", "slug", "scheme", "ios.bundleIdentifier", "android.package"];
    e.name = a.name;
    e.slug = a.slug;
    e.scheme = a.scheme;
    e.ios = { ...e.ios, bundleIdentifier: a.bundleId };
    e.android = { ...e.android, package: a.bundleId };
    if ("owner" in e) {
      delete e.owner;
      notes.push("xoá owner");
    }
    if (e.extra?.eas?.projectId) {
      delete e.extra.eas.projectId;
      if (!Object.keys(e.extra.eas).length) delete e.extra.eas;
      if (!Object.keys(e.extra).length) delete e.extra;
      notes.push("xoá extra.eas.projectId");
    }
    if (typeof e.updates?.url === "string" && e.updates.url.includes("u.expo.dev")) {
      delete e.updates.url;
      if (!Object.keys(e.updates).length) delete e.updates;
      notes.push("xoá updates.url (EAS Update cũ)");
    }
    add(F.appJson, stringifyLike(original, json), notes);
  }

  // apps/api/wrangler.jsonc — text edits so the comments stay.
  if (cur.wrangler) {
    let text = read(F.wrangler);
    const notes = [];
    const w = cur.wrangler;
    const step = (label, next) => {
      if (next === null) warnings.push(`${F.wrangler}: không tìm thấy ${label} — sửa tay.`);
      else {
        text = next;
        notes.push(label);
      }
    };
    if (w.name !== undefined) step(`"name"`, swapJsonString(text, "name", w.name, a.worker));
    else warnings.push(`${F.wrangler}: không có "name" — thêm "name": "${a.worker}".`);

    if (w.dbName !== undefined) {
      const at = text.search(new RegExp(`"database_name"\\s*:\\s*${escRe(JSON.stringify(w.dbName))}`));
      const start = text.lastIndexOf("{", at);
      const end = text.indexOf("}", at);
      if (at < 0 || start < 0 || end < 0) warnings.push(`${F.wrangler}: không tìm thấy khối d1_databases — sửa tay.`);
      else {
        // `at` was found with the same pattern, so this swap always succeeds.
        let block = swapJsonString(text.slice(start, end), "database_name", w.dbName, a.dbName) ?? text.slice(start, end);
        if (a.dbName !== w.dbName) notes.push("database_name");
        // New database name (or a fresh template) => the old id points at someone else's database: reset it.
        // Same name on a --force rename => keep the id, the data stays where it is.
        const idRe = /("database_id"\s*:\s*)"[^"]*"/;
        const resetId = a.dbName !== w.dbName || a.isTemplate;
        if (!idRe.test(block)) warnings.push(`${F.wrangler}: khối D1 không có "database_id".`);
        else if (resetId && w.dbId !== ZERO_ID) {
          block = block.replace(idRe, (_, lead) => lead + JSON.stringify(ZERO_ID));
          notes.push(`database_id → ${ZERO_ID.slice(0, 8)}… (npm run cf:setup sẽ điền)`);
        }
        text = text.slice(0, start) + block + text.slice(end);
      }
    } else warnings.push(`${F.wrangler}: không có D1 binding "DB".`);

    // The commented-out custom-domain example: point it at the real domain (it stays commented).
    if (a.domain && text.includes('"pattern": "example.com"')) {
      text = text.replace('"pattern": "example.com"', `"pattern": ${JSON.stringify(a.domain)}`);
      text = text.replace('"pattern": "api.example.com"', `"pattern": ${JSON.stringify(`api.${a.domain}`)}`);
      notes.push("routes mẫu (vẫn để comment)");
    }
    add(F.wrangler, text, notes);
  }

  // packages/shared/src/app-info.ts — swap each field's string literal inside APP_INFO.
  if (exists(F.appInfo)) {
    const original = read(F.appInfo);
    const block = appInfoBlock(original);
    if (!block) warnings.push(`${F.appInfo}: không tìm thấy "export const APP_INFO = {" — sửa tay.`);
    else {
      let blockText = block.text;
      const notes = [];
      for (const field of ["name", "tagline", "supportEmail", "operator", "webUrl"]) {
        const m = appInfoField(blockText, field);
        if (!m) {
          warnings.push(`${F.appInfo}: APP_INFO.${field} không phải chuỗi "..." — sửa tay.`);
          continue;
        }
        blockText = blockText.replace(m.lead + m.literal, () => m.lead + JSON.stringify(a[field]));
        notes.push(field);
      }
      add(F.appInfo, original.slice(0, block.start) + blockText + original.slice(block.end), notes);
    }
  }

  // apps/web/index.html — title, description, Open Graph.
  if (exists(F.html)) {
    let html = read(F.html);
    const notes = [];
    const swap = (label, re, value) => {
      if (!re.test(html)) return warnings.push(`${F.html}: không tìm thấy ${label}.`);
      html = html.replace(re, (_, open, _old, close) => open + escHtml(value) + close);
      notes.push(label);
    };
    swap("<title>", /(<title>)([^<]*)(<\/title>)/, a.name);
    swap("meta description", /(<meta\s+name="description"\s+content=")([^"]*)(")/, a.tagline);
    swap("og:title", /(<meta\s+property="og:title"\s+content=")([^"]*)(")/, a.name);
    swap("og:description", /(<meta\s+property="og:description"\s+content=")([^"]*)(")/, a.tagline);
    add(F.html, html, notes);
  } else cur.missing.push(F.html);

  // package.json (+ package-lock.json root name, so `npm ci` stays quiet).
  if (cur.pkg) {
    const original = read(F.pkg);
    const pkg = JSON.parse(original);
    const notes = ["name"];
    const oldRoot = pkg.name;
    pkg.name = a.slug;
    const desc = pkg.description;
    if (typeof desc === "string" && (/mobile app template/i.test(desc) || (cur.info?.name && desc.startsWith(`${cur.info.name}:`)))) {
      pkg.description = `${a.name}: Expo (iOS/Android) + React web + Cloudflare Workers API (Hono + D1).`;
      notes.push("description");
    }
    add(F.pkg, stringifyLike(original, pkg), notes);

    if (exists(F.lock) && oldRoot) {
      let lock = read(F.lock);
      const q = escRe(JSON.stringify(oldRoot));
      const top = new RegExp(`^(\\{\\s*"name"\\s*:\\s*)${q}`);
      const ws = new RegExp(`("packages"\\s*:\\s*\\{\\s*""\\s*:\\s*\\{\\s*"name"\\s*:\\s*)${q}`);
      const before = lock;
      lock = lock.replace(top, (_, l) => l + JSON.stringify(a.slug)).replace(ws, (_, l) => l + JSON.stringify(a.slug));
      if (lock !== before) add(F.lock, lock, ["name gốc"]);
    }
  }

  // Never write something that no longer parses.
  for (const e of edits) {
    try {
      if (e.file.endsWith(".json")) JSON.parse(e.content);
      if (e.file.endsWith(".jsonc")) parseJsonc(e.content);
    } catch (err) {
      fail(`${e.file} sẽ bị hỏng sau khi sửa (${err.message}). Không ghi gì.`);
    }
  }
  return { edits: edits.filter((e) => e.content !== read(e.file)), warnings };
}

// ---------------------------------------------------------------- leftovers: where the old names still appear

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "web-build", ".wrangler", ".expo", "ios", "android", "backups", ".turbo", "worktrees",
]);
const SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|icns|svg|ttf|otf|woff2?|mp3|mp4|mov|zip|gz|pdf|jks|keystore|p8|p12|lock)$/i;

function findLeftovers(needles) {
  const hits = [];
  const self = path.relative(ROOT, fileURLToPath(import.meta.url));
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const rel = path.relative(ROOT, full).split(path.sep).join("/");
      if (ent.isDirectory()) {
        if (!SKIP_DIRS.has(ent.name)) walk(full);
        continue;
      }
      if (!ent.isFile() || SKIP_EXT.test(ent.name) || ent.name === "package-lock.json" || rel === self.split(path.sep).join("/"))
        continue;
      if (fs.statSync(full).size > 1_000_000) continue;
      const text = fs.readFileSync(full, "utf8");
      const count = needles.reduce((n, s) => n + (text.split(s).length - 1), 0);
      if (count) hits.push({ rel, count });
    }
  };
  walk(ROOT);
  return hits;
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);

  const cur = readCurrent();
  if (!cur.app && !cur.wrangler && !cur.info) fail(`Không tìm thấy các tệp của template trong ${ROOT}.`);

  const stillTemplate = [
    cur.app?.slug === TEMPLATE.slug,
    cur.app?.bundleId === TEMPLATE.bundleId,
    cur.info?.name === TEMPLATE.name,
    cur.wrangler?.name === TEMPLATE.worker,
  ].some(Boolean);
  if (!stillTemplate && !args.force) {
    console.log(`Dự án này đã được khởi tạo rồi (không còn giá trị mẫu của template):
  Tên app:   ${cur.info?.name ?? cur.app?.name}
  Slug:      ${cur.app?.slug}
  Bundle ID: ${cur.app?.bundleId}
  Worker:    ${cur.wrangler?.name}  ·  D1: ${cur.wrangler?.dbName}

Không thay đổi gì. Muốn đổi tên lần nữa: npm run init:project -- --force
(slug và bundle id giữ nguyên trừ khi truyền --slug / --bundle-id; đổi chúng sau khi đã deploy
hoặc đã lên store sẽ tạo ra Worker + database D1 MỚI, app MỚI trên store).`);
    process.exit(1);
  }

  const { answers: a, rl } = await collectAnswers(args, cur);
  a.isTemplate = stillTemplate;

  const old = {
    name: cur.info?.name ?? cur.app?.name,
    slug: cur.app?.slug,
    scheme: cur.app?.scheme,
    bundleId: cur.app?.bundleId,
    worker: cur.wrangler?.name,
    dbName: cur.wrangler?.dbName,
  };
  const row = (label, from, to) => `  ${label.padEnd(14)} ${from === to || from === undefined ? to : `${from}  →  ${to}`}`;
  console.log(`\nSẽ áp dụng:
${row("Tên app", old.name, a.name)}
${row("Slug", old.slug, a.slug)}
${row("Scheme", old.scheme, a.scheme)}
${row("Bundle ID", old.bundleId, a.bundleId)}
${row("Worker", old.worker, a.worker)}
${row("D1 database", old.dbName, a.dbName)}
${row("Web URL", cur.info?.webUrl, a.webUrl)}
${row("Email hỗ trợ", cur.info?.supportEmail, a.supportEmail)}
${row("Vận hành", cur.info?.operator, a.operator)}
${row("Tagline", cur.info?.tagline, a.tagline)}`);

  const { edits, warnings } = plan(a, cur);

  if (rl) {
    const ok = args.dryRun ? "y" : (await rl.question("\nGhi các thay đổi này? [Y/n] ")).trim().toLowerCase();
    rl.close();
    if (ok && ok !== "y" && ok !== "yes" && ok !== "c" && ok !== "có") {
      console.log("Đã huỷ, chưa ghi gì.");
      return;
    }
  }

  if (args.dryRun) console.log("\n[--dry-run] Không ghi tệp nào. Các tệp sẽ đổi:");
  else {
    for (const e of edits) fs.writeFileSync(abs(e.file), e.content);
    console.log(`\nĐã cập nhật ${edits.length} tệp:`);
  }
  const width = Math.max(...edits.map((e) => e.file.length), 10);
  for (const e of edits) console.log(`  ${e.file.padEnd(width)}  ${e.notes.join(", ")}`);
  for (const m of cur.missing) warnings.push(`Không có tệp ${m} — bỏ qua.`);
  if (warnings.length) console.log(`\nCần xem tay:\n${warnings.map((w) => `  - ${w}`).join("\n")}`);

  // Where the old names still show up (README, docs, code you added...). Informational only.
  if (!args.dryRun) {
    const fresh = [a.name, a.slug, a.bundleId, a.scheme];
    const needles = [...new Set([old.name, old.slug, old.bundleId, old.scheme])].filter(
      (s) => s && s.length >= 4 && !fresh.includes(s),
    );
    const hits = needles.length ? findLeftovers(needles) : [];
    if (hits.length) {
      console.log(`\nTệp vẫn nhắc tên cũ (${needles.map((n) => `"${n}"`).join(", ")}) — thường là tài liệu của template, sửa nếu cần:`);
      for (const h of hits.slice(0, 15)) console.log(`  ${h.rel} (${h.count})`);
      if (hits.length > 15) console.log(`  … và ${hits.length - 15} tệp khác`);
    }
  }

  const notes = [];
  if (cur.wrangler?.accountId) notes.push(`wrangler.jsonc đang đặt account_id = ${cur.wrangler.accountId} — đổi nếu dự án mới dùng tài khoản Cloudflare khác.`);
  if (/@example\.com$/i.test(a.supportEmail)) notes.push("Email hỗ trợ vẫn là @example.com — đổi trong packages/shared/src/app-info.ts trước khi lên store.");

  console.log(`
Bước tiếp theo:
  1. Xem lại thay đổi: git diff   ·   kiểm tra: npm run check
  2. Cloudflare lần đầu: npx wrangler login  →  npm run cf:setup  →  npm run deploy
     ${
       a.domain
         ? `Gắn tên miền ${a.domain}: bỏ comment "routes" trong apps/api/wrangler.jsonc rồi deploy lại (docs/03-deploy-cloudflare.md).`
         : a.webUrl.endsWith(".example.com")
           ? `Chưa có tên miền: sau lần deploy đầu, đổi webUrl trong packages/shared/src/app-info.ts\n     từ ${a.webUrl} thành URL *.workers.dev mà wrangler in ra, rồi npm run deploy lại.`
           : `webUrl giữ nguyên: ${a.webUrl}`
     }
  3. App mobile (EAS): npm run eas:init -w @app/mobile   (= npx eas-cli init — tạo project EAS mới, ghi projectId vào app.json)
  4. Tài liệu sản phẩm vào docs/product/ (PRD, spec, user stories); thiết kế vào docs/design/ (Figma, ảnh màn hình, design tokens, icon)
     rồi nhờ Claude Code đọc và làm theo (docs/02-bat-dau-du-an-moi.md).
  5. Trang pháp lý: sửa nội dung trong apps/web/src/pages/legal/ (Privacy, Terms, Support, DeleteAccount).
  6. Icon & splash: apps/mobile/assets/images/*, apps/web/public/*.
  7. Commit: git add -A && git commit -m "chore: khởi tạo ${a.name}"${notes.length ? `\n\nLưu ý:\n${notes.map((n) => `  - ${n}`).join("\n")}` : ""}`);
}

function parseArgs(argv) {
  const valueFlags = {
    name: "name",
    slug: "slug",
    scheme: "scheme",
    "bundle-id": "bundleId",
    domain: "domain",
    "support-email": "supportEmail",
    operator: "operator",
    tagline: "tagline",
  };
  const boolFlags = { yes: "yes", y: "yes", force: "force", "dry-run": "dryRun", help: "help", h: "help" };
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const m = /^--?([a-z-]+)(?:=([\s\S]*))?$/.exec(argv[i]);
    if (!m) fail(`Không hiểu tham số "${argv[i]}". Xem --help.`);
    const [, key, inline] = m;
    if (key in boolFlags) {
      out[boolFlags[key]] = true;
      continue;
    }
    if (!(key in valueFlags)) fail(`Không có tham số --${key}. Xem --help.`);
    const value = inline ?? argv[++i];
    if (value === undefined || (inline === undefined && value.startsWith("--"))) fail(`--${key} cần một giá trị.`);
    out[valueFlags[key]] = value;
  }
  return out;
}

main().catch((err) => fail(err?.stack ?? String(err)));
