---
name: setup-dev-env
description: Cài và kiểm tra môi trường lập trình cho repo này trên máy Mac hoặc Windows — Node (fnm), Git, GitHub CLI, JDK 17, Android Studio + SDK 36 + emulator, Xcode + iOS Simulator, CocoaPods, wrangler, eas-cli — rồi chạy repo lần đầu. Dùng khi người dùng nói "cài môi trường", "setup máy mới", "máy mới", "cài đặt máy", "cài Expo", "cài Android Studio", "cài Xcode", "cài Java/JDK", "cài Node", "cài wrangler", "cài eas", "máy Windows", "chạy doctor", "npm run doctor", "kiểm tra máy", "không chạy được npm run dev / npm run mobile", "adb not found", "JAVA_HOME", hoặc tiếng Anh "setup dev environment", "set up this machine", "install dependencies for Expo/Android/iOS", "new laptop", "doctor". Cũng dùng khi lần đầu clone repo về máy và chưa chạy được.
---

# Cài môi trường lập trình

Mục tiêu: `npm run doctor` xanh phần **Bắt buộc** (và phần Android/iOS người dùng cần), rồi `npm run dev` + `npm run mobile` chạy được. Tài liệu đầy đủ cho người: `docs/01-cai-dat-moi-truong.md` — khi người dùng cần hướng dẫn bấm từng menu, trích từ đó.

Các file liên quan:

- `scripts/doctor.mjs` (`npm run doctor`): kiểm tra, không cài gì, chạy ~5 giây, không cần `npm install` trước.
- `scripts/setup/mac.sh`: cờ `--skip-android`, `--skip-ios`, `--skip-globals`, `--yes`.
- `scripts/setup/windows.ps1`: cờ `-SkipAndroid`, `-SkipVSCode`, `-SkipGlobals`, `-UseNodeMsi`, `-Yes`.

Cả hai script kiểm tra trước rồi mới cài nên chạy lại an toàn.

## Quy trình

### 1. Xác định hệ điều hành

- Bash/zsh: `uname -s` → `Darwin` = Mac, `Linux` = Linux (chỉ hỗ trợ doctor, không có script cài).
- PowerShell: `$env:OS` = `Windows_NT` → Windows.

### 2. Chạy doctor trước

```bash
node scripts/doctor.mjs        # hoặc npm run doctor
```

Đọc kết quả theo nhóm (Bắt buộc / Android / iOS (chỉ macOS) / Cloudflare & Expo). Mỗi dòng ⚠️/❌ có sẵn lệnh sửa ngay bên dưới. Tóm tắt cho người dùng bằng vài dòng: thiếu gì, cái nào bắt buộc.

Hỏi người dùng cần tới đâu nếu chưa rõ:

- **Chỉ chạy thử nhanh** → chỉ cần nhóm Bắt buộc + Expo Go trên điện thoại.
- **Máy ảo Android** → thêm nhóm Android.
- **Máy ảo iPhone** (chỉ Mac) → thêm nhóm iOS.
- **Deploy / build app** → thêm đăng nhập Cloudflare, Expo.

### 3. Chạy script cài đặt

**Hỏi trước** khi cài thứ lớn: Android Studio (~1.5 GB, cộng SDK + máy ảo ~10 GB), Xcode (~20–30 GB). Không cần Android thì thêm `--skip-android` / `-SkipAndroid`.

**Mac** (chạy từ gốc repo):

```bash
bash scripts/setup/mac.sh --yes            # đã được người dùng đồng ý cài Android Studio
bash scripts/setup/mac.sh --skip-android   # không cần Android
```

- Homebrew chưa có: bộ cài Homebrew đòi mật khẩu macOS → không chạy được qua tool không tương tác. Nhờ người dùng tự chạy `bash scripts/setup/mac.sh` trong Terminal của họ, rồi quay lại.
- Gói JDK (`zulu@17`) cũng có thể hỏi mật khẩu: nếu lệnh treo hoặc báo cần sudo, nhờ người dùng chạy script trong Terminal.
- Không tự chạy `sudo`. Các lệnh `sudo` (xcode-select, license) đưa cho người dùng tự chạy.

**Windows** (PowerShell thường, không cần admin):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup\windows.ps1 -Yes
```

- `-Yes` cũng đồng ý đổi execution policy của tài khoản sang `RemoteSigned` (cần để `npm` chạy trong PowerShell). Nói rõ điều này với người dùng trước khi chạy.
- Windows sẽ bật hộp thoại UAC cho Git, JDK, Android Studio: báo người dùng bấm **Yes**.
- Sau script, PATH/JAVA_HOME/ANDROID_HOME chỉ có ở **cửa sổ mới**: nhờ người dùng mở PowerShell mới (hoặc tự mở shell mới) trước khi chạy doctor.

Script in ra mục **"Việc cần bạn tự làm"** ở cuối: chuyển lại cho người dùng, đánh số, ngắn gọn.

### 4. Những bước người dùng phải tự làm

Đưa đúng lệnh/menu, chờ họ báo xong. Chi tiết từng màn hình ở `docs/01-cai-dat-moi-truong.md` (mục 2.3, 2.4, 3.3).

| Việc | Ghi chú |
|---|---|
| Cài **Xcode** từ Mac App Store, mở một lần | Rồi `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` và `sudo xcodebuild -license accept` |
| Tải **iOS Simulator** | Xcode → Settings… → Components → Get cạnh iOS |
| **Android Studio** lần đầu | Standard → Accept license → Finish; SDK Manager: Android 16 (API 36) + system image, Build-Tools 36, Emulator, Platform-Tools |
| Tạo **máy ảo Android** | More Actions → Virtual Device Manager → + → Pixel 9 → API 36 |
| **Đăng nhập** (cần trình duyệt, mật khẩu, 2FA) | `gh auth login`, `npx wrangler login`, `npx eas-cli login` — người dùng tự gõ trong terminal của họ. Không bao giờ nhập mật khẩu/token hộ. |
| **Expo Go** trên điện thoại | App Store / Google Play |

Windows: **không** build/giả lập iOS được. Hướng dẫn dùng Expo Go trên iPhone thật để phát triển và `npm run build:ios` (EAS, máy chủ Expo) cho bản iOS thật (xem skill `build-mobile`).

### 5. Lặp lại doctor đến khi xanh

Chạy lại `node scripts/doctor.mjs` sau mỗi đợt sửa. Nếu một mục vẫn hỏng, xem bảng "Gặp lỗi thì sao" trong `docs/01-cai-dat-moi-truong.md` (port 8787 bận, `adb` không thấy, JAVA_HOME sai, Gradle sai JDK, điện thoại không gọi được API, tường lửa Windows, execution policy).

Lưu ý khi chạy qua tool của Claude Code:

- Shell của tool có thể chưa nạp `~/.zshrc` mới. Mac: chạy `source ~/.zshrc` trước, hoặc `zsh -ic 'node scripts/doctor.mjs'`.
- Node của fnm: `eval "$(fnm env --shell bash)" && fnm use` trước các lệnh `node`/`npm` nếu `node -v` chưa đúng bản trong `.nvmrc`.

### 6. Chạy repo lần đầu

```bash
npm install
npm run db:migrate:local
npm run dev            # chạy nền: API :8787 + web :5173
```

- Kiểm tra: `curl -s http://localhost:8787/api/health` trả `{"ok":true,…}`; web ở http://localhost:5173.
- `npm run dev` và `npm run mobile` là tiến trình chạy mãi: chạy nền (hoặc nhờ người dùng chạy ở terminal riêng), đừng chờ nó kết thúc.
- App: người dùng chạy `npm run mobile` trong terminal của họ rồi bấm `i` (iOS Simulator), `a` (Android emulator) hoặc quét QR bằng Expo Go (cùng Wi‑Fi).

### 7. Báo kết quả

Kết thúc bằng: những gì đã cài, kết quả doctor cuối (nhóm nào xanh, mục nào còn ⚠️ và có cần không), các bước người dùng còn phải làm.

## Không làm

- Không chạy `sudo`, không nhập mật khẩu, token, mã 2FA hộ người dùng.
- Không cài Xcode hay Android Studio khi chưa hỏi.
- Không sửa `~/.zshrc`, biến môi trường hay PowerShell profile bằng tay khi script đã làm việc đó — chạy lại script.
- Không cài Watchman (Expo SDK 58 không cần).
