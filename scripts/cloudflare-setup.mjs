#!/usr/bin/env node
// First-time Cloudflare provisioning: checks the wrangler login, finds or creates the D1 database named in
// apps/api/wrangler.jsonc and writes its id back into that file (comments kept). Zero dependencies, any OS.
//
//   npm run cf:setup                         # do it
//   npm run cf:setup -- --dry-run            # only print the commands
//   npm run cf:setup -- --location apac      # where the new D1 database should live (weur, eeur, apac, oc, wnam, enam)
//   npm run cf:setup -- --account <id>       # pick the account when your login sees several (also written to wrangler.jsonc)
//
// Safe to run again: an existing database with the same name is reused, never created twice.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = path.join(ROOT, "apps", "api");
const CONFIG = path.join(API_DIR, "wrangler.jsonc");
const CONFIG_REL = "apps/api/wrangler.jsonc";
const ZERO_ID = "00000000-0000-0000-0000-000000000000";
const LOCATIONS = ["weur", "eeur", "apac", "oc", "wnam", "enam"];

const HELP = `Thiết lập Cloudflare lần đầu: kiểm tra đăng nhập, tạo (hoặc tìm lại) database D1, ghi database_id vào ${CONFIG_REL}.

Cách dùng: npm run cf:setup [-- <tham số>]
  --dry-run          chỉ in các lệnh sẽ chạy, không gọi Cloudflare, không sửa tệp
  --location <mã>    vị trí ưu tiên cho database mới: ${LOCATIONS.join(", ")} (mặc định: Cloudflare tự chọn)
  --account <id>     chọn tài khoản Cloudflare khi đăng nhập thấy nhiều tài khoản (ghi luôn account_id vào ${CONFIG_REL})
  --help, -h         in hướng dẫn này`;

// ---------------------------------------------------------------- helpers

function fail(message) {
  console.error(`\nLỗi: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const m = /^--?([a-z-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!m) fail(`Không hiểu tham số "${argv[i]}". Xem --help.`);
    const [, key, inline] = m;
    if (key === "dry-run") out.dryRun = true;
    else if (key === "help" || key === "h") out.help = true;
    else if (key === "location" || key === "account") {
      const value = inline ?? argv[++i];
      if (!value || value.startsWith("--")) fail(`--${key} cần một giá trị.`);
      out[key] = value.trim();
    } else fail(`Không có tham số --${key}. Xem --help.`);
  }
  if (out.location && !LOCATIONS.includes(out.location)) fail(`--location phải là một trong: ${LOCATIONS.join(", ")}.`);
  if (out.account && !/^[0-9a-f]{32}$/i.test(out.account)) fail("--account phải là account ID 32 ký tự hex (xem: npx wrangler whoami).");
  return out;
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

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const show = (args) => `npx wrangler ${args.join(" ")}`;

/** Run `npx wrangler …` inside apps/api. capture=true returns stdout instead of streaming it. */
function wrangler(args, { capture = false, env } = {}) {
  const res = spawnSync("npx", ["wrangler", ...args], {
    cwd: API_DIR,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
    shell: process.platform === "win32",
  });
  if (res.error) fail(`Không chạy được "${show(args)}": ${res.error.message}. Đã chạy npm install chưa?`);
  return { status: res.status ?? 1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

/** First JSON value in a command's output (wrangler may print warnings around it). */
function extractJson(text, open) {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(open === "[" ? "]" : "}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Text edit of the D1 entry named `dbName`: set its database_id, leave everything else (comments too) alone. */
function writeDatabaseId(text, dbName, id) {
  const at = text.search(new RegExp(`"database_name"\\s*:\\s*${escRe(JSON.stringify(dbName))}`));
  const start = text.lastIndexOf("{", at);
  const end = text.indexOf("}", at);
  if (at < 0 || start < 0 || end < 0) return null;
  const block = text.slice(start, end);
  const idRe = /("database_id"\s*:\s*)"[^"]*"/;
  const nextBlock = idRe.test(block)
    ? block.replace(idRe, (_, lead) => lead + JSON.stringify(id))
    : block.replace(/("database_name"\s*:\s*"[^"]*")/, (m) => `${m},\n      "database_id": ${JSON.stringify(id)}`);
  return text.slice(0, start) + nextBlock + text.slice(end);
}

/** Uncomment the template's `// "account_id": …` line (or add one after "name"). */
function writeAccountId(text, accountId) {
  const value = JSON.stringify(accountId);
  if (/^\s*"account_id"\s*:/m.test(text)) return text.replace(/^(\s*"account_id"\s*:\s*)"[^"]*"/m, (_, lead) => lead + value);
  if (/^(\s*)\/\/\s*"account_id"\s*:.*$/m.test(text))
    return text.replace(/^(\s*)\/\/\s*"account_id"\s*:.*$/m, (_, indent) => `${indent}"account_id": ${value},`);
  return text.replace(/^(\s*"name"\s*:\s*"[^"]*",?)$/m, (line) => `${line}\n  "account_id": ${value},`);
}

function save(text) {
  parseJsonc(text); // never write a file wrangler can no longer read
  fs.writeFileSync(CONFIG, text);
}

// ---------------------------------------------------------------- main

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);
  if (!fs.existsSync(CONFIG)) fail(`Không thấy ${CONFIG_REL}.`);

  let text = fs.readFileSync(CONFIG, "utf8");
  let cfg;
  try {
    cfg = parseJsonc(text);
  } catch (err) {
    fail(`${CONFIG_REL} không đọc được: ${err.message}`);
  }
  const db = (cfg.d1_databases ?? []).find((d) => d.binding === "DB") ?? cfg.d1_databases?.[0];
  if (!db?.database_name) fail(`${CONFIG_REL} chưa có d1_databases với "database_name".`);
  const dbName = db.database_name;
  const hasId = db.database_id && db.database_id !== ZERO_ID;
  const workerName = cfg.name;

  console.log(`Worker: ${workerName}   ·   D1: ${dbName} (binding ${db.binding})   ·   database_id: ${hasId ? db.database_id : "chưa có"}`);

  const createArgs = ["d1", "create", dbName, ...(args.location ? ["--location", args.location] : []), "--update-config=false"];

  if (args.dryRun) {
    console.log(`\n[--dry-run] Không gọi Cloudflare, không sửa tệp. Các bước sẽ chạy (trong apps/api):`);
    console.log(`  1. ${show(["whoami", "--json"])}            # đã đăng nhập chưa, thấy mấy tài khoản`);
    if (args.account) console.log(`  -  ghi "account_id": "${args.account}" vào ${CONFIG_REL} (CLOUDFLARE_ACCOUNT_ID=${args.account} cho các lệnh sau)`);
    if (hasId) console.log(`  2. ${show(["d1", "list", "--json"])}           # chỉ kiểm tra database_id hiện có còn tồn tại`);
    else {
      console.log(`  2. ${show(["d1", "list", "--json"])}           # đã có database "${dbName}" chưa? có thì dùng lại`);
      console.log(`  3. ${show(createArgs)}   # chỉ khi chưa có`);
      console.log(`  4. ${show(["d1", "list", "--json"])}           # lấy uuid của database vừa tạo`);
      console.log(`  5. ghi "database_id": "<uuid>" vào ${CONFIG_REL}`);
    }
    return printNext(workerName, { dryRun: true });
  }

  // 1. Logged in?
  const who = wrangler(["whoami", "--json"], { capture: true, env: args.account ? { CLOUDFLARE_ACCOUNT_ID: args.account } : {} });
  const me = extractJson(who.stdout, "{");
  if (who.status !== 0 || !me?.loggedIn) {
    if (who.stderr.trim()) console.error(who.stderr.trim());
    fail("Chưa đăng nhập Cloudflare. Chạy:  npx wrangler login   (CI: đặt CLOUDFLARE_API_TOKEN)  rồi chạy lại npm run cf:setup.");
  }
  const accounts = Array.isArray(me.accounts) ? me.accounts : [];
  console.log(`Đăng nhập: ${me.email ?? me.authType ?? "ok"}${accounts.length ? ` · ${accounts.length} tài khoản` : ""}`);

  // 2. Which account? Creating a database in the wrong one is the classic mistake, so never guess.
  const envAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const chosen = args.account ?? cfg.account_id ?? envAccount;
  if (args.account && cfg.account_id && cfg.account_id !== args.account)
    fail(`${CONFIG_REL} đang có account_id = ${cfg.account_id}, khác --account. Sửa tay trong tệp rồi chạy lại.`);
  if (chosen && accounts.length && !accounts.some((a) => a.id === chosen))
    fail(`Tài khoản ${chosen} không có trong danh sách đăng nhập này (npx wrangler whoami).`);
  if (!chosen && accounts.length > 1) {
    const list = accounts.map((a) => `    ${a.id}  ${a.name}`).join("\n");
    fail(`Đăng nhập này thấy ${accounts.length} tài khoản Cloudflare — chọn một:
${list}

  Cách 1:  npm run cf:setup -- --account <id>        (ghi account_id vào ${CONFIG_REL})
  Cách 2:  bỏ comment dòng "account_id" trong ${CONFIG_REL} và điền id
  Cách 3:  đặt biến môi trường CLOUDFLARE_ACCOUNT_ID=<id> (mỗi lần chạy wrangler, kể cả npm run deploy)`);
  }
  const childEnv = chosen ? { CLOUDFLARE_ACCOUNT_ID: chosen } : {};
  if (chosen) {
    const name = accounts.find((a) => a.id === chosen)?.name;
    console.log(`Tài khoản: ${chosen}${name ? ` (${name})` : ""}`);
  }
  if (args.account && cfg.account_id !== args.account) {
    text = writeAccountId(text, args.account);
    save(text);
    console.log(`Đã ghi "account_id" vào ${CONFIG_REL}.`);
  }

  // 3. Find (or create) the database.
  const listDatabases = () => {
    const res = wrangler(["d1", "list", "--json"], { capture: true, env: childEnv });
    const list = extractJson(res.stdout, "[");
    if (res.status !== 0 || !Array.isArray(list)) {
      if (res.stderr.trim()) console.error(res.stderr.trim());
      fail(`"${show(["d1", "list", "--json"])}" thất bại (xem lỗi ở trên).`);
    }
    return list;
  };
  const findId = (list) => {
    const hit = list.find((d) => d.name === dbName);
    return hit?.uuid ?? hit?.id ?? null;
  };

  const existing = listDatabases();
  if (hasId) {
    if (!existing.some((d) => (d.uuid ?? d.id) === db.database_id))
      fail(
        `database_id ${db.database_id} trong ${CONFIG_REL} không có trong tài khoản này (sai tài khoản, hoặc id chép từ dự án khác).` +
          `\n  Dự án mới: đặt lại "database_id": "${ZERO_ID}" rồi chạy lại npm run cf:setup.`,
      );
    console.log(`D1 "${dbName}" đã cấu hình và tồn tại. Không cần tạo.`);
    return printNext(workerName, { viaEnvOnly: !!envAccount && !cfg.account_id && !args.account });
  }

  let id = findId(existing);
  if (id) console.log(`Đã có database "${dbName}" (${id}) — dùng lại, không tạo mới.`);
  else {
    console.log(`\nTạo database D1 "${dbName}"${args.location ? ` ở ${args.location}` : ""}…\n$ ${show(createArgs)}`);
    const created = wrangler(createArgs, { env: childEnv });
    if (created.status !== 0) fail("Tạo database thất bại (xem lỗi ở trên).");
    id = findId(listDatabases());
    if (!id)
      fail(`Đã tạo nhưng không tìm thấy "${dbName}" khi liệt kê lại. Chép "database_id" in ở trên vào ${CONFIG_REL} bằng tay.`);
  }

  // 4. Write the id back (text edit: comments stay).
  const next = writeDatabaseId(text, dbName, id);
  if (!next) fail(`Không tìm thấy khối "database_name": "${dbName}" trong ${CONFIG_REL}. Điền database_id = "${id}" bằng tay.`);
  save(next);
  console.log(`Đã ghi database_id = ${id} vào ${CONFIG_REL}.`);

  printNext(workerName, { viaEnvOnly: !!envAccount && !cfg.account_id && !args.account });
}

function printNext(workerName, { dryRun = false, viaEnvOnly = false } = {}) {
  console.log(`
${dryRun ? "Sau khi chạy thật, bước tiếp theo" : "Xong. Bước tiếp theo"}:
  1. (Tuỳ chọn) chạy thử local:  npm run db:migrate:local  &&  npm run dev
  2. Deploy:  npm run deploy
     (build web → áp migration lên D1 remote → wrangler deploy; lần đầu wrangler có thể hỏi đăng ký subdomain workers.dev)
  3. Wrangler in ra địa chỉ dạng https://${workerName}.<subdomain>.workers.dev — đặt địa chỉ đó (hoặc tên miền riêng)
     vào APP_INFO.webUrl trong packages/shared/src/app-info.ts, rồi npm run deploy lần nữa. App mobile gọi API qua webUrl.
  4. Kiểm tra:  curl https://${workerName}.<subdomain>.workers.dev/api/health
  5. Secret (khi cần, ví dụ khoá gửi email):  cd apps/api && npx wrangler secret put RESEND_API_KEY
     Local thì chép apps/api/.dev.vars.example thành apps/api/.dev.vars.
  Chi tiết: docs/03-deploy-cloudflare.md${
    viaEnvOnly
      ? `\n\nLưu ý: tài khoản đang lấy từ biến môi trường CLOUDFLARE_ACCOUNT_ID — nhớ đặt biến này khi chạy npm run deploy,\n  hoặc ghi cố định: npm run cf:setup -- --account <id>`
      : ""
  }`);
}

main();
