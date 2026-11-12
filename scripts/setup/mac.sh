#!/usr/bin/env bash
# One-time macOS developer machine setup for this template (Expo iOS/Android + Cloudflare Workers).
# Idempotent: every step checks first, so it is safe to re-run.
#
# Usage (from the repo root):
#   bash scripts/setup/mac.sh                 # everything
#   bash scripts/setup/mac.sh --skip-android  # no JDK / Android Studio
#   bash scripts/setup/mac.sh --skip-ios      # no CocoaPods / Xcode checks
#   bash scripts/setup/mac.sh --skip-globals  # no global npm tools (eas-cli, wrangler)
#   bash scripts/setup/mac.sh --yes           # do not ask before big downloads (Android Studio)
#
# sudo: this script never calls sudo itself. The Homebrew installer and the JDK package (.pkg) ask for your
# macOS password because they write to system folders; that is expected.

set -uo pipefail

SKIP_ANDROID=0
SKIP_IOS=0
SKIP_GLOBALS=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --skip-android) SKIP_ANDROID=1 ;;
    --skip-ios) SKIP_IOS=1 ;;
    --skip-globals) SKIP_GLOBALS=1 ;;
    -y | --yes) ASSUME_YES=1 ;;
    -h | --help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Tham số không hợp lệ: $arg (xem --help)" >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ---------------------------------------------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------------------------------------------

if [ -t 1 ]; then BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'; else BOLD=""; DIM=""; RESET=""; fi
WARNINGS=0
MANUAL=() # manual steps collected along the way, printed at the end

step() { printf '\n%s▶ %s%s\n' "$BOLD" "$1" "$RESET"; }
ok() { printf '  ✅ %s\n' "$1"; }
info() { printf '  %s… %s%s\n' "$DIM" "$1" "$RESET"; }
warn() {
  printf '  ⚠️  %s\n' "$1"
  WARNINGS=$((WARNINGS + 1))
}
manual() { MANUAL+=("$1"); }
have() { command -v "$1" >/dev/null 2>&1; }

# Ask yes/no (default yes). --yes or a non-interactive run answers yes.
confirm() {
  [ "$ASSUME_YES" = 1 ] && return 0
  [ -t 0 ] || return 0
  local ans
  read -r -p "  $1 [Y/n] " ans
  case "$ans" in "" | y | Y | yes | YES | c | C | co) return 0 ;; *) return 1 ;; esac
}

# Shell startup file to append environment lines to (zsh is the macOS default).
case "${SHELL:-/bin/zsh}" in
  */bash) RC_FILE="$HOME/.bash_profile"; RC_SHELL=bash ;;
  *) RC_FILE="$HOME/.zshrc"; RC_SHELL=zsh ;;
esac
RC_CHANGED=0

# Append a line to $RC_FILE unless a line matching the grep pattern ($2, default: the line itself) is already there.
add_rc_line() {
  local line="$1" pattern="${2:-$1}"
  touch "$RC_FILE"
  if grep -qF -- "$pattern" "$RC_FILE"; then
    return 1
  fi
  if [ "$RC_CHANGED" = 0 ] && ! grep -qF "# Added by freedom-app setup" "$RC_FILE"; then
    printf '\n# Added by freedom-app setup (scripts/setup/mac.sh)\n' >>"$RC_FILE"
  fi
  printf '%s\n' "$line" >>"$RC_FILE"
  RC_CHANGED=1
  return 0
}

# brew_formula <formula> [command]: skip when the formula is installed, or when [command] is already on PATH
# (e.g. CocoaPods installed with gem) so we never install a second, conflicting copy.
brew_formula() {
  local name="$1" cmd="${2:-}"
  if [ -n "$cmd" ] && have "$cmd"; then
    ok "$name đã có ($(command -v "$cmd"))"
    return 0
  fi
  if brew list --formula "$name" >/dev/null 2>&1; then
    ok "$name đã có"
    return 0
  fi
  info "brew install $name"
  if brew install "$name"; then ok "$name đã cài"; else warn "Cài $name thất bại — thử lại: brew install $name"; return 1; fi
}

brew_cask() {
  local name="$1"
  if brew list --cask "$name" >/dev/null 2>&1; then
    ok "$name đã có"
    return 0
  fi
  info "brew install --cask $name"
  if brew install --cask "$name"; then ok "$name đã cài"; else warn "Cài $name thất bại — thử lại: brew install --cask $name"; return 1; fi
}

# ---------------------------------------------------------------------------------------------------------------
# 0. Sanity
# ---------------------------------------------------------------------------------------------------------------

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Script này chỉ dành cho macOS. Windows: scripts\\setup\\windows.ps1" >&2
  exit 1
fi

printf '%sCài môi trường lập trình cho máy Mac%s (%s, %s)\n' "$BOLD" "$RESET" "$(sw_vers -productVersion 2>/dev/null)" "$(uname -m)"
printf '%sRepo: %s · file cấu hình shell: %s%s\n' "$DIM" "$REPO_ROOT" "$RC_FILE" "$RESET"

# ---------------------------------------------------------------------------------------------------------------
# 1. Homebrew (also installs the Xcode Command Line Tools when they are missing)
# ---------------------------------------------------------------------------------------------------------------

step "Homebrew"
if ! have brew; then
  for p in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    [ -x "$p" ] && eval "$("$p" shellenv)" && break
  done
fi
if have brew; then
  ok "Homebrew $(brew --version 2>/dev/null | head -n1 | awk '{print $2}')"
else
  info "Chưa có Homebrew — chạy bộ cài chính thức (sẽ hỏi mật khẩu macOS, có thể cài thêm Command Line Tools)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  for p in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    [ -x "$p" ] && eval "$("$p" shellenv)" && break
  done
  if ! have brew; then
    echo "❌ Không cài được Homebrew. Xem https://brew.sh rồi chạy lại script này." >&2
    exit 1
  fi
  ok "Homebrew đã cài"
fi
BREW_BIN="$(command -v brew)"
# Homebrew's own recommendation: load brew in login shells.
if [ "$RC_SHELL" = zsh ]; then
  PROFILE_FILE="$HOME/.zprofile"
else
  PROFILE_FILE="$HOME/.bash_profile"
fi
touch "$PROFILE_FILE"
if ! grep -qF "brew shellenv" "$PROFILE_FILE" && ! grep -qF "brew shellenv" "$RC_FILE" 2>/dev/null; then
  printf '\neval "$(%s shellenv)"\n' "$BREW_BIN" >>"$PROFILE_FILE"
  ok "Đã thêm Homebrew vào $PROFILE_FILE"
fi

# ---------------------------------------------------------------------------------------------------------------
# 2. Git, GitHub CLI
# ---------------------------------------------------------------------------------------------------------------

step "Git & GitHub CLI"
if git --version >/dev/null 2>&1; then
  ok "$(git --version)"
else
  brew_formula git
fi
brew_formula gh gh
manual "Đăng nhập GitHub: gh auth login   (chọn GitHub.com → HTTPS → Login with a web browser)"

# ---------------------------------------------------------------------------------------------------------------
# 3. Node.js via fnm (version from .nvmrc)
# ---------------------------------------------------------------------------------------------------------------

step "Node.js (qua fnm)"
brew_formula fnm fnm
NODE_VER="24"
if [ -f "$REPO_ROOT/.nvmrc" ]; then
  NODE_VER="$(tr -d '[:space:]' <"$REPO_ROOT/.nvmrc" | sed 's/^v//')"
fi
if have fnm; then
  if add_rc_line "eval \"\$(fnm env --use-on-cd --shell $RC_SHELL)\"" "fnm env"; then
    ok "Đã thêm fnm vào $RC_FILE"
  else
    ok "fnm đã có trong $RC_FILE"
  fi
  eval "$(fnm env --shell bash)"
  # `fnm install` with no argument reads .nvmrc in the current folder.
  if (cd "$REPO_ROOT" && fnm install) && fnm default "$NODE_VER" && fnm use "$NODE_VER" >/dev/null; then
    ok "Node $(node --version) (mặc định = $NODE_VER, theo .nvmrc)"
  else
    warn "fnm chưa cài được Node $NODE_VER — thử: fnm install $NODE_VER && fnm default $NODE_VER"
  fi
  if brew list --formula node >/dev/null 2>&1; then
    warn "Còn Node của Homebrew ($(brew list --versions node | awk '{print $2}')). Terminal mới sẽ ưu tiên Node của fnm; muốn gọn thì gỡ: brew uninstall node"
  fi
else
  warn "Không có fnm — bỏ qua bước Node"
fi

# ---------------------------------------------------------------------------------------------------------------
# 4. iOS tooling: CocoaPods + Xcode checks (Xcode itself comes from the App Store)
# ---------------------------------------------------------------------------------------------------------------

if [ "$SKIP_IOS" = 1 ]; then
  step "iOS — bỏ qua (--skip-ios)"
else
  step "iOS (CocoaPods, Xcode)"
  brew_formula cocoapods pod
  if [ -d /Applications/Xcode.app ]; then
    ok "Có /Applications/Xcode.app"
    sel="$(xcode-select -p 2>/dev/null || true)"
    if [ "$sel" != "/Applications/Xcode.app/Contents/Developer" ]; then
      warn "xcode-select đang trỏ vào: ${sel:-chưa đặt}"
      manual "Chọn Xcode làm công cụ dòng lệnh (cần sudo): sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
    fi
    if xcodebuild -version >/dev/null 2>&1; then
      ok "$(xcodebuild -version | head -n1)"
    else
      manual "Đồng ý giấy phép Xcode (cần sudo): sudo xcodebuild -license accept"
    fi
    if ! xcrun simctl list runtimes 2>/dev/null | grep -q '^iOS '; then
      manual "Tải iOS Simulator: mở Xcode → Settings… → Components → bấm Get cạnh iOS"
    fi
  else
    warn "Chưa có Xcode"
    manual "Cài Xcode từ Mac App Store (miễn phí, ~10 GB): mở App Store → tìm \"Xcode\" → Get. Mở Xcode một lần để nó cài thêm thành phần."
    manual "Sau khi có Xcode (cần sudo): sudo xcode-select -s /Applications/Xcode.app/Contents/Developer && sudo xcodebuild -license accept"
    manual "Tải iOS Simulator: Xcode → Settings… → Components → Get cạnh iOS"
  fi
  manual "Kiểm tra: Xcode → Settings… → Locations → Command Line Tools phải chọn đúng phiên bản Xcode"
fi

# ---------------------------------------------------------------------------------------------------------------
# 5. Android tooling: JDK 17 + Android Studio + ANDROID_HOME
# ---------------------------------------------------------------------------------------------------------------

if [ "$SKIP_ANDROID" = 1 ]; then
  step "Android — bỏ qua (--skip-android)"
else
  step "Android (JDK 17, Android Studio)"

  # JDK 17: reuse any installed JDK 17 (Zulu, Temurin...), otherwise install Azul Zulu 17 (asks for your password).
  JDK17="$(/usr/libexec/java_home -F -v 17 2>/dev/null || true)"
  if [ -z "$JDK17" ]; then
    info "Cài JDK 17 (Azul Zulu) — macOS sẽ hỏi mật khẩu để cài gói .pkg"
    brew_cask zulu@17
    JDK17="$(/usr/libexec/java_home -F -v 17 2>/dev/null || true)"
    [ -z "$JDK17" ] && [ -d /Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home ] &&
      JDK17=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
  fi
  if [ -n "$JDK17" ]; then
    ok "JDK 17: $JDK17"
    if grep -qE '^[[:space:]]*export[[:space:]]+JAVA_HOME=' "$RC_FILE" 2>/dev/null; then
      if grep -qF "$JDK17" "$RC_FILE" || grep -qE 'java_home[^|]*-v[[:space:]]*17' "$RC_FILE"; then
        ok "JAVA_HOME đã có trong $RC_FILE"
      else
        warn "$RC_FILE đã đặt JAVA_HOME khác — script không sửa. Expo cần JDK 17, hãy đổi dòng đó thành:"
        printf '      export JAVA_HOME="%s"\n' "$JDK17"
      fi
    else
      add_rc_line "export JAVA_HOME=\"$JDK17\"" >/dev/null
      ok "Đã thêm JAVA_HOME vào $RC_FILE"
    fi
    export JAVA_HOME="$JDK17"
  else
    warn "Chưa có JDK 17 — thử: brew install --cask zulu@17"
  fi

  # Android Studio (~1.5 GB download).
  if [ -d "/Applications/Android Studio.app" ] || [ -d "$HOME/Applications/Android Studio.app" ]; then
    ok "Android Studio đã có"
  elif confirm "Cài Android Studio (~1.5 GB)?"; then
    brew_cask android-studio
  else
    warn "Bỏ qua Android Studio (cài sau: brew install --cask android-studio)"
  fi

  # Environment variables (the SDK folder itself is created by the Android Studio first-run wizard).
  if add_rc_line 'export ANDROID_HOME="$HOME/Library/Android/sdk"' 'ANDROID_HOME='; then
    ok "Đã thêm ANDROID_HOME vào $RC_FILE"
  else
    ok "ANDROID_HOME đã có trong $RC_FILE"
  fi
  if add_rc_line 'export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"' 'ANDROID_HOME/platform-tools'; then
    ok "Đã thêm emulator + platform-tools vào PATH"
  fi
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"

  if [ -d "$ANDROID_HOME/platforms/android-36" ]; then
    ok "Android SDK Platform 36 đã có"
  else
    manual "Mở Android Studio lần đầu → Next → chọn Standard → Next → Accept license (cả 2 mục) → Finish, chờ tải xong SDK"
    if [ "$(uname -m)" = arm64 ]; then SYS_IMG="Google APIs ARM 64 v8a System Image"; else SYS_IMG="Google APIs Intel x86_64 Atom System Image"; fi
    manual "Android Studio → More Actions → SDK Manager → tab SDK Platforms → tick Show Package Details → mở Android 16.0 (\"Baklava\") → chọn Android SDK Platform 36 + $SYS_IMG"
    manual "Cùng màn đó → tab SDK Tools → tick Show Package Details → Android SDK Build-Tools 36.x; tick thêm Android Emulator, Android SDK Platform-Tools → Apply → OK"
  fi
  manual "Tạo máy ảo Android: Android Studio → More Actions → Virtual Device Manager → + (Create Virtual Device) → Pixel 9 → API 36 → Finish"
fi

# ---------------------------------------------------------------------------------------------------------------
# 6. Global CLIs (optional — the repo also runs them via npx)
# ---------------------------------------------------------------------------------------------------------------

if [ "$SKIP_GLOBALS" = 1 ]; then
  step "Công cụ npm toàn cục — bỏ qua (--skip-globals)"
elif have npm; then
  step "Công cụ npm toàn cục (eas-cli, wrangler)"
  for pkg in eas-cli wrangler; do
    bin="$pkg"
    [ "$pkg" = eas-cli ] && bin=eas
    if have "$bin"; then
      ok "$pkg đã có ($("$bin" --version 2>/dev/null | head -n1))"
    else
      info "npm i -g $pkg"
      if npm install -g "$pkg" >/dev/null 2>&1; then ok "$pkg đã cài"; else warn "Cài $pkg thất bại — thử: npm i -g $pkg"; fi
    fi
  done
  info "Gói toàn cục gắn với từng bản Node của fnm; đổi bản Node thì cài lại."
else
  warn "Không có npm — bỏ qua eas-cli/wrangler toàn cục"
fi

# Logins need a browser + your password/2FA, so they are always manual.
manual "Đăng nhập Cloudflare (để deploy): npx wrangler login"
manual "Đăng nhập Expo/EAS (để build app): npx eas-cli login"
manual "Cài app Expo Go trên điện thoại (App Store / Google Play) để chạy thử bằng QR"

# ---------------------------------------------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------------------------------------------

printf '\n%s══════════════════════════════════════════════════%s\n' "$BOLD" "$RESET"
if [ "$WARNINGS" = 0 ]; then
  printf '%s✅ Phần tự động đã xong.%s\n' "$BOLD" "$RESET"
else
  printf '%s⚠️  Phần tự động xong với %s cảnh báo (xem các dòng ⚠️ ở trên).%s\n' "$BOLD" "$WARNINGS" "$RESET"
fi
if [ "$RC_CHANGED" = 1 ]; then
  printf '\nĐã sửa %s. Mở cửa sổ Terminal mới (hoặc chạy: source %s) để nhận cấu hình.\n' "$RC_FILE" "$RC_FILE"
fi
printf '\n%sViệc cần bạn tự làm:%s\n' "$BOLD" "$RESET"
i=1
for m in ${MANUAL[@]+"${MANUAL[@]}"}; do
  printf '  %2d. %s\n' "$i" "$m"
  i=$((i + 1))
done
printf '\n%sKiểm tra lại:%s npm run doctor   (chi tiết: docs/01-cai-dat-moi-truong.md)\n' "$BOLD" "$RESET"
printf '%sChạy repo lần đầu:%s npm install && npm run db:migrate:local && npm run dev\n\n' "$BOLD" "$RESET"
