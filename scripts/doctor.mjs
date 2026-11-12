#!/usr/bin/env node
// Environment check for this template: `npm run doctor` (or `node scripts/doctor.mjs`).
// Zero dependencies, works on macOS / Windows / Linux. Never throws, every external command has a timeout.
// Exit code: 1 only when a required tool (Node, npm, Git) is missing or too old, otherwise 0.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OS = platform();
const IS_WIN = OS === "win32";
const IS_MAC = OS === "darwin";
const TIMEOUT = 15_000;
const SLOW_TIMEOUT = 20_000;

// Old Windows consoles (conhost without Windows Terminal / VS Code) render emoji as boxes.
const PLAIN = process.env.NO_EMOJI === "1" || (IS_WIN && !process.env.WT_SESSION && process.env.TERM_PROGRAM !== "vscode");
const ICON = PLAIN
  ? { ok: "[OK]", warn: "[!!]", fail: "[XX]", info: "[--]" }
  : { ok: "✅", warn: "⚠️ ", fail: "❌", info: "➖" };
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const bold = (s) => (COLOR ? `\x1b[1m${s}\x1b[0m` : s);
const dim = (s) => (COLOR ? `\x1b[2m${s}\x1b[0m` : s);

// Quiet, non-interactive child env (no telemetry prompts, no update banners where we can avoid them).
const CHILD_ENV = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  EXPO_NO_TELEMETRY: "1",
  NO_UPDATE_NOTIFIER: "1",
  GH_NO_UPDATE_NOTIFIER: "1",
  NO_COLOR: "1",
  FORCE_COLOR: "0",
};

/** Run a shell command. Never throws. Returns { ok, code, out } where out = stdout + stderr, trimmed. */
function run(cmd, timeout = TIMEOUT) {
  try {
    const r = spawnSync(cmd, {
      shell: true,
      cwd: ROOT,
      env: CHILD_ENV,
      encoding: "utf8",
      timeout,
      killSignal: "SIGKILL",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "").trim();
    const timedOut = r.error?.code === "ETIMEDOUT" || (r.signal === "SIGKILL" && r.status === null);
    return { ok: !r.error && r.status === 0, code: r.status, out, timedOut };
  } catch (err) {
    return { ok: false, code: null, out: String(err?.message ?? err), timedOut: false };
  }
}

const q = (p) => `"${p}"`;
const firstLine = (s) => (s || "").split(/\r?\n/).find((l) => l.trim()) ?? "";
const semver = (s) => (s || "").match(/(\d+\.\d+\.\d+)/)?.[1] ?? null;
/** Absolute path of a command on PATH, or null. */
function which(name) {
  const r = run(IS_WIN ? `where ${name}` : `command -v ${name}`, 5_000);
  return r.ok ? firstLine(r.out).trim() : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Result collection
// ---------------------------------------------------------------------------------------------------------------

const groups = [];
let current = null;
let requiredMissing = false;
const counts = { ok: 0, warn: 0, fail: 0 };

function group(title) {
  current = { title, rows: [] };
  groups.push(current);
}
/** status: ok | warn | fail | info. required: a fail here makes the exit code 1. */
function add(status, label, detail = "", hint = "", { required = false } = {}) {
  current.rows.push({ status, label, detail, hint });
  if (status in counts) counts[status]++;
  if (required && status === "fail") requiredMissing = true;
}

/** Wrap one check so a bug in it can never crash the whole doctor. */
function check(label, fn) {
  try {
    fn();
  } catch (err) {
    add("warn", label, `lỗi khi kiểm tra: ${err?.message ?? err}`);
  }
}

function printAll() {
  console.log("");
  console.log(bold(`Kiểm tra môi trường — ${IS_MAC ? "macOS" : IS_WIN ? "Windows" : OS} (${process.arch})`));
  for (const g of groups) {
    console.log("");
    console.log(bold(g.title));
    const width = Math.max(...g.rows.map((r) => r.label.length), 10);
    for (const r of g.rows) {
      const line = `  ${ICON[r.status]} ${r.label.padEnd(width)}  ${r.detail}`;
      console.log(r.status === "info" ? dim(line) : line);
      if (r.hint && r.status !== "ok") console.log(`     ${dim("→")} ${r.hint}`);
    }
  }
  console.log("");
  const summary = `${counts.ok} ổn · ${counts.warn} cảnh báo · ${counts.fail} lỗi`;
  if (requiredMissing) {
    console.log(bold(`${ICON.fail} Thiếu công cụ bắt buộc (${summary}). Sửa các mục ${ICON.fail.trim()} trong nhóm "Bắt buộc" rồi chạy lại.`));
  } else if (counts.fail || counts.warn) {
    console.log(bold(`${ICON.ok} Phần bắt buộc đã đủ (${summary}).`));
    console.log(`   Các mục ${ICON.warn.trim()} / ${ICON.fail.trim()} còn lại chỉ cần khi bạn làm phần đó (Android, iOS, deploy...).`);
  } else {
    console.log(bold(`${ICON.ok} Mọi thứ đã sẵn sàng (${summary}).`));
  }
  console.log(dim("   Hướng dẫn chi tiết: docs/01-cai-dat-moi-truong.md"));
  console.log("");
}

// ---------------------------------------------------------------------------------------------------------------
// Bắt buộc
// ---------------------------------------------------------------------------------------------------------------

group("Bắt buộc");

const nvmrc = (() => {
  try {
    return readFileSync(join(ROOT, ".nvmrc"), "utf8").trim().replace(/^v/, "");
  } catch {
    return "24";
  }
})();

check("Node.js", () => {
  const v = process.versions.node;
  const major = Number(v.split(".")[0]);
  const want = nvmrc.split(".")[0];
  const fix = IS_WIN ? `fnm install ${want}; fnm default ${want}` : `fnm install ${want} && fnm default ${want}`;
  if (major < 22) {
    add("fail", "Node.js", `v${v} — quá cũ (cần >= 22)`, `Cài Node ${want} LTS: ${fix}`, { required: true });
  } else if (major % 2 === 1) {
    add("warn", "Node.js", `v${v} — bản lẻ, không phải LTS`, `Repo dùng Node ${want} (.nvmrc): ${fix}`);
  } else if (String(major) !== want) {
    add("ok", "Node.js", `v${v} (repo khuyên dùng ${want})`);
  } else {
    add("ok", "Node.js", `v${v}`);
  }
});

check("npm", () => {
  const r = run("npm --version");
  const v = semver(r.out);
  if (!r.ok || !v) return add("fail", "npm", "không tìm thấy", "npm đi kèm Node.js — cài lại Node", { required: true });
  if (Number(v.split(".")[0]) < 10) return add("warn", "npm", v, "Nên dùng npm >= 10: npm i -g npm@latest");
  add("ok", "npm", v);
});

check("Git", () => {
  const r = run("git --version");
  const v = semver(r.out);
  if (!r.ok || !v) {
    const fix = IS_MAC ? "xcode-select --install  (hoặc brew install git)" : IS_WIN ? "winget install --id Git.Git -e" : "sudo apt install git";
    return add("fail", "Git", "không tìm thấy", fix, { required: true });
  }
  add("ok", "Git", v);
});

check("Thư viện repo", () => {
  const nm = join(ROOT, "node_modules");
  if (!existsSync(nm)) return add("warn", "Thư viện repo", "chưa cài (thiếu node_modules)", "Chạy ở thư mục gốc repo: npm install");
  if (!existsSync(join(nm, ".package-lock.json"))) return add("warn", "Thư viện repo", "node_modules chưa đầy đủ", "npm install");
  add("ok", "Thư viện repo", "node_modules đã cài");
});

check("GitHub CLI", () => {
  const r = run("gh --version");
  const v = semver(r.out);
  if (!r.ok || !v) {
    const fix = IS_MAC ? "brew install gh" : IS_WIN ? "winget install --id GitHub.cli -e" : "https://cli.github.com";
    return add("warn", "GitHub CLI (gh)", "chưa cài (tuỳ chọn)", fix);
  }
  const auth = run("gh auth status", TIMEOUT);
  const user = auth.out.match(/account (\S+)/)?.[1] ?? auth.out.match(/as (\S+)/)?.[1];
  if (auth.timedOut) return add("warn", "GitHub CLI (gh)", `${v} — không kiểm tra được đăng nhập (mạng chậm?)`);
  if (!auth.ok) return add("warn", "GitHub CLI (gh)", `${v} — chưa đăng nhập`, "gh auth login");
  add("ok", "GitHub CLI (gh)", `${v} — đăng nhập: ${user ?? "có"}`);
});

// ---------------------------------------------------------------------------------------------------------------
// Android
// ---------------------------------------------------------------------------------------------------------------

group("Android");

/** Major Java version from `java -version` output ("1.8.0_x" → 8, "17.0.12" → 17), or null. */
function javaMajor(out) {
  const m = (out || "").match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return m[1] === "1" ? Number(m[2]) : Number(m[1]);
}
const JDK_FIX = IS_MAC ? "brew install --cask zulu@17" : IS_WIN ? "winget install --id Microsoft.OpenJDK.17 -e" : "sudo apt install openjdk-17-jdk";

check("Java (JDK)", () => {
  const r = run("java -version");
  const major = javaMajor(r.out);
  if (!r.ok || major === null) return add("fail", "Java (JDK)", "không tìm thấy", `Cài JDK 17: ${JDK_FIX}`);
  const line = firstLine(r.out).replace(/^.*version /, "").replace(/"/g, "");
  if (major !== 17) return add("warn", "Java (JDK)", `${line} — Expo SDK 58 cần JDK 17`, `Cài JDK 17 (${JDK_FIX}) rồi trỏ JAVA_HOME vào nó`);
  add("ok", "Java (JDK)", line);
});

check("JAVA_HOME", () => {
  const jh = process.env.JAVA_HOME;
  const macHint = IS_MAC ? run("/usr/libexec/java_home -F -v 17", 5_000) : null;
  const suggested = macHint?.ok ? firstLine(macHint.out) : null;
  const setHint = IS_MAC
    ? `Thêm vào ~/.zshrc: export JAVA_HOME="${suggested ?? "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"}"`
    : IS_WIN
      ? "Chạy lại scripts\\setup\\windows.ps1 (tự đặt JAVA_HOME), rồi mở terminal mới"
      : "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64";
  if (!jh) return add("warn", "JAVA_HOME", "chưa đặt", setHint);
  const javaBin = join(jh, "bin", IS_WIN ? "java.exe" : "java");
  if (!existsSync(javaBin)) return add("fail", "JAVA_HOME", `${jh} — không có bin/java`, setHint);
  const major = javaMajor(run(`${q(javaBin)} -version`).out);
  if (major !== 17) return add("warn", "JAVA_HOME", `${jh} — đang là JDK ${major ?? "?"}, cần 17`, setHint);
  add("ok", "JAVA_HOME", jh);
});

const defaultSdk = IS_MAC
  ? join(homedir(), "Library", "Android", "sdk")
  : IS_WIN
    ? join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Android", "Sdk")
    : join(homedir(), "Android", "Sdk");
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";

check("Android Studio", () => {
  const candidates = IS_MAC
    ? ["/Applications/Android Studio.app", join(homedir(), "Applications", "Android Studio.app")]
    : IS_WIN
      ? [join(process.env.ProgramFiles ?? "C:\\Program Files", "Android", "Android Studio")]
      : ["/opt/android-studio", join(homedir(), "android-studio")];
  const found = candidates.find((p) => existsSync(p));
  if (found) return add("ok", "Android Studio", found);
  if (!IS_MAC && !IS_WIN) return add("info", "Android Studio", "không thấy ở vị trí mặc định (bỏ qua nếu đã cài nơi khác)");
  add("warn", "Android Studio", "chưa cài", IS_MAC ? "brew install --cask android-studio" : "winget install --id Google.AndroidStudio -e");
});

check("ANDROID_HOME", () => {
  if (!androidHome) {
    if (existsSync(defaultSdk)) {
      const fix = IS_WIN
        ? "Chạy lại scripts\\setup\\windows.ps1 (tự đặt ANDROID_HOME)"
        : `Thêm vào ~/.zshrc: export ANDROID_HOME="$HOME/${IS_MAC ? "Library/Android/sdk" : "Android/Sdk"}"`;
      return add("warn", "ANDROID_HOME", `chưa đặt (SDK có ở ${defaultSdk})`, fix);
    }
    return add("fail", "ANDROID_HOME", "chưa đặt, chưa có Android SDK", "Mở Android Studio → chạy hết trình cài đặt (Standard) để tải SDK");
  }
  if (!existsSync(androidHome)) return add("fail", "ANDROID_HOME", `${androidHome} — thư mục không tồn tại`, "Mở Android Studio → chạy hết trình cài đặt để tải SDK");
  add("ok", "ANDROID_HOME", androidHome);
});

check("Android SDK 36", () => {
  const sdk = androidHome || defaultSdk;
  if (!existsSync(sdk)) return add("info", "Android SDK 36", "bỏ qua (chưa có SDK)");
  let platforms = [];
  try {
    platforms = readdirSync(join(sdk, "platforms")).filter((d) => d.startsWith("android-"));
  } catch {}
  const ok = platforms.some((d) => /^android-(36|3[7-9]|[4-9]\d)/.test(d));
  const fix = "Android Studio → Settings → Languages & Frameworks → Android SDK → tick Android 16 (API 36)";
  if (!ok) return add("warn", "Android SDK 36", platforms.length ? `đang có: ${platforms.join(", ")}` : "chưa có SDK Platform nào", fix);
  let buildTools = [];
  try {
    buildTools = readdirSync(join(sdk, "build-tools"));
  } catch {}
  if (!buildTools.length) return add("warn", "Android SDK 36", "có Platform 36 nhưng thiếu Build-Tools", fix + " + tab SDK Tools → Android SDK Build-Tools");
  add("ok", "Android SDK 36", `platforms: ${platforms.join(", ")}`);
});

check("adb", () => {
  const r = run("adb --version");
  if (r.ok) return add("ok", "adb", `${semver(r.out.match(/Version ([\d.]+)/)?.[1] ?? r.out) ?? firstLine(r.out)}`);
  const sdk = androidHome || defaultSdk;
  const local = join(sdk, "platform-tools", IS_WIN ? "adb.exe" : "adb");
  const fix = IS_WIN
    ? "Thêm %LOCALAPPDATA%\\Android\\Sdk\\platform-tools vào Path (chạy lại windows.ps1), mở terminal mới"
    : 'Thêm vào ~/.zshrc: export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"';
  if (existsSync(local)) return add("warn", "adb", "có trong SDK nhưng chưa nằm trong PATH", fix);
  add("warn", "adb", "không tìm thấy", "Android Studio → SDK Manager → SDK Tools → Android SDK Platform-Tools");
});

check("Emulator", () => {
  const path = which("emulator");
  const sdk = androidHome || defaultSdk;
  const local = join(sdk, "emulator", IS_WIN ? "emulator.exe" : "emulator");
  const bin = path ?? (existsSync(local) ? local : null);
  if (!bin) return add("warn", "Emulator", "không tìm thấy", "Android Studio → SDK Manager → SDK Tools → Android Emulator");
  const avds = run(`${q(bin)} -list-avds`, TIMEOUT);
  const names = avds.ok ? avds.out.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !/^(INFO|WARNING|ERROR)\b/.test(s)) : [];
  const where = path ? "" : " (chưa nằm trong PATH)";
  if (!names.length) return add("warn", "Emulator", `có${where}, chưa tạo máy ảo nào`, "Android Studio → Device Manager → Create Virtual Device (Pixel, API 36)");
  add(path ? "ok" : "warn", "Emulator", `${names.length} máy ảo: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}${where}`);
});

// ---------------------------------------------------------------------------------------------------------------
// iOS (chỉ macOS)
// ---------------------------------------------------------------------------------------------------------------

group("iOS (chỉ macOS)");

if (!IS_MAC) {
  add(
    "info",
    "iOS",
    IS_WIN ? "không build/giả lập iOS được trên Windows" : "chỉ build được trên macOS",
    "",
  );
  current.rows.push({ status: "info", label: "", detail: "→ Dùng Expo Go trên iPhone thật + EAS Build (npm run build:ios) cho bản iOS", hint: "" });
} else {
  let xcodeOk = false;
  check("Xcode", () => {
    const sel = run("xcode-select -p", 5_000);
    const selPath = firstLine(sel.out);
    if (!sel.ok) return add("fail", "Xcode", "chưa cài Command Line Tools / Xcode", "Cài Xcode từ App Store, rồi: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer");
    const v = run("xcodebuild -version", TIMEOUT);
    if (/license/i.test(v.out)) return add("warn", "Xcode", "chưa đồng ý giấy phép Xcode", "sudo xcodebuild -license accept");
    if (!v.ok || !/^Xcode/m.test(v.out)) {
      const hasApp = existsSync("/Applications/Xcode.app");
      return add(
        hasApp ? "warn" : "fail",
        "Xcode",
        hasApp ? `đã có Xcode.app nhưng đang chọn ${selPath}` : `chỉ có Command Line Tools (${selPath}), chưa có Xcode`,
        hasApp ? "sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" : "Cài Xcode từ Mac App Store (miễn phí, ~10 GB)",
      );
    }
    xcodeOk = true;
    add("ok", "Xcode", `${v.out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).join(" · ")}`);
  });

  check("iOS Simulator", () => {
    if (!xcodeOk) return add("info", "iOS Simulator", "bỏ qua (cần Xcode trước)");
    const r = run("xcrun simctl list runtimes", SLOW_TIMEOUT);
    const runtimes = r.out
      .split(/\r?\n/)
      .filter((l) => /^iOS \d/.test(l.trim()) && !/unavailable/i.test(l))
      .map((l) => l.trim().match(/^(iOS [\d.]+)/)?.[1])
      .filter(Boolean);
    if (r.timedOut) {
      return add("warn", "iOS Simulator", "simctl không trả lời kịp (lần đầu sau khi cập nhật Xcode thường chậm)", "xcodebuild -runFirstLaunch, rồi chạy lại npm run doctor");
    }
    if (!runtimes.length) return add("warn", "iOS Simulator", "chưa có runtime iOS", "Xcode → Settings → Components → tải iOS");
    add("ok", "iOS Simulator", runtimes.join(", "));
  });

  check("CocoaPods", () => {
    const r = run("pod --version", TIMEOUT);
    const v = semver(r.out);
    if (!r.ok || !v) return add("warn", "CocoaPods", "chưa cài (cần cho npx expo run:ios)", "brew install cocoapods");
    add("ok", "CocoaPods", v);
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Cloudflare & Expo
// ---------------------------------------------------------------------------------------------------------------

group("Cloudflare & Expo");

/** Local wrangler from the workspace (hoisted to the root, or under apps/api). Called directly: no npx overhead. */
const wranglerBin = [join(ROOT, "node_modules", ".bin"), join(ROOT, "apps", "api", "node_modules", ".bin")]
  .map((d) => join(d, IS_WIN ? "wrangler.cmd" : "wrangler"))
  .find((p) => existsSync(p));

check("Wrangler", () => {
  if (!wranglerBin) return add("warn", "Wrangler", "chưa có (nằm trong devDependencies của apps/api)", "npm install");
  const r = run(`${q(wranglerBin)} --version`, TIMEOUT);
  const v = semver(r.out);
  if (!v) return add("warn", "Wrangler", r.timedOut ? "không trả lời" : `lỗi: ${firstLine(r.out).slice(0, 80)}`, "npm install");
  add("ok", "Wrangler", `${v} (bản trong repo, chạy bằng npx wrangler …)`);
});

check("Cloudflare login", () => {
  if (!wranglerBin) return add("info", "Cloudflare login", "bỏ qua (chưa có wrangler)");
  const r = run(`${q(wranglerBin)} whoami`, SLOW_TIMEOUT);
  if (r.timedOut) return add("warn", "Cloudflare login", "không kiểm tra được (hết thời gian — mạng?)", "npx wrangler whoami");
  if (/not authenticated|not logged in|wrangler login/i.test(r.out) && !/You are logged in/i.test(r.out)) {
    return add("warn", "Cloudflare login", "chưa đăng nhập (cần khi deploy)", "npx wrangler login");
  }
  const email = r.out.match(/associated with the email\s+(\S+?)\.?(\s|$)/i)?.[1];
  if (/You are logged in/i.test(r.out)) return add("ok", "Cloudflare login", email ?? (/API Token/i.test(r.out) ? "API token" : "đã đăng nhập"));
  add("warn", "Cloudflare login", `không rõ: ${firstLine(r.out).slice(0, 80)}`, "npx wrangler whoami");
});

let easGlobal = null;
check("EAS CLI", () => {
  const r = run("eas --version", TIMEOUT);
  const v = semver(r.out);
  if (!r.ok || !v) return add("info", "EAS CLI", "chưa cài global — các script dùng npx --yes eas-cli@latest nên vẫn chạy được", "");
  easGlobal = v;
  add("ok", "EAS CLI", v);
});

check("Expo login", () => {
  if (process.env.EXPO_TOKEN) return add("ok", "Expo login", "EXPO_TOKEN đã đặt");
  if (!easGlobal) return add("info", "Expo login", "bỏ qua (kiểm bằng: npx eas-cli whoami)");
  const r = run("eas whoami", SLOW_TIMEOUT);
  if (r.timedOut) return add("warn", "Expo login", "không kiểm tra được (hết thời gian — mạng?)", "eas whoami");
  const lines = r.out.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("★") && !/update available|npm install -g|is now available|proceeding with outdated/i.test(s));
  if (!r.ok || /not logged in/i.test(r.out)) return add("warn", "Expo login", "chưa đăng nhập (cần khi build EAS)", "npx eas-cli login");
  add("ok", "Expo login", lines[0] ?? "đã đăng nhập");
});

printAll();
process.exitCode = requiredMissing ? 1 : 0;
