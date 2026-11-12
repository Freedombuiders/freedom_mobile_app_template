# 01. Cài môi trường lập trình (Mac và Windows)

Làm **một lần cho mỗi máy**. Sau bước này máy bạn chạy được cả 3 phần của repo: API (Cloudflare Worker), web (React) và app (Expo, iOS + Android).

Tóm tắt:

1. Chạy script cài đặt (**Mac**: `bash scripts/setup/mac.sh` · **Windows**: `powershell -ExecutionPolicy Bypass -File scripts\setup\windows.ps1`).
2. Làm vài bước script không tự làm được (cài Xcode, chạy trình cài đặt Android Studio, đăng nhập).
3. Mở terminal mới, chạy `npm run doctor` đến khi phần **Bắt buộc** toàn ✅.
4. Chạy repo lần đầu: `npm install` → `npm run db:migrate:local` → `npm run dev` → `npm run mobile`.

> Dùng Claude Code? Chỉ cần nói *"cài môi trường cho máy này"*: skill `setup-dev-env` sẽ làm theo đúng tài liệu này và báo bạn những bước cần tự tay làm.

---

## 1. Cài những gì, để làm gì

| Công cụ | Để làm gì | Khi nào cần |
|---|---|---|
| **Node.js 24** (qua **fnm**) | Chạy mọi thứ: Expo, Vite, wrangler. fnm giúp đổi phiên bản Node theo file `.nvmrc` của repo. | Luôn cần |
| **Git** | Lấy code, lưu lịch sử thay đổi | Luôn cần |
| **GitHub CLI** (`gh`) | Tạo repo từ template, mở Pull Request từ terminal | Nên có |
| **Homebrew** (Mac) / **winget** (Windows) | "Kho ứng dụng" dòng lệnh, script dùng nó để cài các công cụ khác | Script tự dùng |
| **Expo Go** (app trên điện thoại) | Chạy thử app bằng cách quét mã QR, không cần build | Luôn nên có |
| **JDK 17** (Java) | Gradle cần để build app Android **trên máy bạn** (`npx expo run:android`) | Khi build Android local |
| **Android Studio** + SDK 36 + Emulator | Máy ảo Android, công cụ `adb`, build Android local | Khi chạy máy ảo Android |
| **Xcode** + iOS Simulator (chỉ Mac) | Máy ảo iPhone, build iOS local | Khi chạy máy ảo iPhone |
| **CocoaPods** (chỉ Mac) | Thư viện native iOS khi build local (`npx expo run:ios`) | Khi build iOS local |
| **wrangler** | Công cụ của Cloudflare: chạy API local, deploy. Đã có sẵn trong repo (`npx wrangler …`), bản cài toàn máy chỉ cho tiện | Có sẵn |
| **eas-cli** | Build app trên máy chủ Expo (EAS). Các script trong repo gọi qua `npx`, bản cài toàn máy chỉ cho tiện | Khi build để phát hành |

Không cần **Watchman**: Expo chỉ cần nó tới SDK 55, repo này dùng SDK 58.

**Chỉ muốn chạy thử nhanh?** Node.js + Git + Expo Go trên điện thoại là đủ để chạy `npm run dev` và `npm run mobile` rồi quét QR. Android Studio, Xcode, JDK để sau cũng được.

**Dung lượng** (khoảng): Xcode + một bản iOS Simulator 20–30 GB; Android Studio + SDK + một máy ảo 10–15 GB. Hãy cài khi có mạng ổn định.

---

## 2. Máy Mac

### 2.1. Lấy repo về máy

Mở **Terminal** (bấm ⌘ + Space, gõ `Terminal`, Enter), rồi:

```bash
mkdir -p ~/Developer && cd ~/Developer
git clone https://github.com/Freedombuiders/<ten-repo>.git
cd <ten-repo>
```

Máy Mac mới chưa có Git sẽ hiện hộp thoại *"The git command requires the command line developer tools"*: bấm **Install**, chờ xong rồi chạy lại lệnh `git clone`. (Hoặc tải ZIP: trên GitHub bấm **Code → Download ZIP**, giải nén, rồi `cd` vào thư mục đó.)

### 2.2. Chạy script cài đặt

```bash
bash scripts/setup/mac.sh
```

Script kiểm tra trước rồi mới cài, nên **chạy lại bao nhiêu lần cũng được**. Nó làm lần lượt:

1. **Homebrew**: cài nếu chưa có. Bộ cài của Homebrew sẽ hỏi **mật khẩu đăng nhập máy Mac** (gõ không hiện ký tự, cứ gõ rồi Enter).
2. **Git**, **GitHub CLI**.
3. **fnm** + **Node.js** đúng bản trong `.nvmrc` (24), đặt làm mặc định, thêm dòng `eval "$(fnm env --use-on-cd --shell zsh)"` vào `~/.zshrc`.
4. **CocoaPods**; kiểm tra Xcode đã cài và đã chọn đúng chưa.
5. **JDK 17** (Azul Zulu, nếu máy chưa có JDK 17 nào; hỏi mật khẩu để cài gói), thêm `JAVA_HOME` vào `~/.zshrc`.
6. **Android Studio** (hỏi trước vì tải ~1.5 GB), thêm `ANDROID_HOME` và `PATH` cho `adb`, `emulator` vào `~/.zshrc`.
7. **eas-cli**, **wrangler** cài toàn máy (tuỳ chọn).
8. In ra danh sách **việc bạn cần tự làm**.

Tuỳ chọn:

| Cờ | Tác dụng |
|---|---|
| `--skip-android` | Bỏ qua JDK 17, Android Studio, biến môi trường Android |
| `--skip-ios` | Bỏ qua CocoaPods và phần kiểm tra Xcode |
| `--skip-globals` | Không cài `eas-cli`, `wrangler` toàn máy |
| `--yes` | Không hỏi trước khi tải gói lớn |

Script không tự gọi `sudo`. Chỉ bộ cài Homebrew và gói JDK hỏi mật khẩu vì chúng ghi vào thư mục hệ thống.

Xong thì **mở cửa sổ Terminal mới** (hoặc chạy `source ~/.zshrc`) để nhận cấu hình mới.

### 2.3. Cài Xcode (chạy máy ảo iPhone)

1. Mở **App Store** → tìm **Xcode** → **Get** / **Install** (miễn phí, khá lâu).
2. Mở **Xcode** một lần, đồng ý điều khoản, chờ nó cài thêm thành phần.
3. Trong Terminal (lệnh có `sudo` sẽ hỏi mật khẩu máy):

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   ```

4. **Xcode → Settings…** (⌘ + ,) → tab **Locations** → mục **Command Line Tools**: chọn phiên bản Xcode vừa cài.
5. **Xcode → Settings…** → tab **Components** → bấm **Get** cạnh **iOS** để tải iOS Simulator.

### 2.4. Cài Android Studio lần đầu (chạy máy ảo Android)

1. Mở **Android Studio** từ Applications. Hỏi nhập cài đặt cũ thì chọn **Do not import settings**.
2. Trình cài đặt: **Next** → Install Type chọn **Standard** → **Next** → chọn giao diện → **Next** → màn **License Agreement**: chọn từng mục bên trái và bấm **Accept** → **Finish**. Chờ tải xong SDK.
3. Ở màn Welcome: **More Actions → SDK Manager** (hoặc **Android Studio → Settings… → Languages & Frameworks → Android SDK**):
   - Tab **SDK Platforms**: tick **Show Package Details** (góc dưới phải), mở **Android 16.0 ("Baklava")**, chọn **Android SDK Platform 36** và một system image: **Google APIs ARM 64 v8a System Image** (Mac chip M) hoặc **Google APIs Intel x86_64 Atom System Image** (Mac Intel).
   - Tab **SDK Tools**: tick **Show Package Details**, trong **Android SDK Build-Tools** chọn bản **36.x**; tick thêm **Android Emulator** và **Android SDK Platform-Tools**.
   - Bấm **Apply** → **OK**, chờ tải.
4. Tạo máy ảo: màn Welcome → **More Actions → Virtual Device Manager** → **+** (Create Virtual Device) → chọn **Pixel 9** (hoặc máy bất kỳ) → **Next** → chọn image **API 36** → **Next** → **Finish**. Bấm ▶ để bật thử.

Đường dẫn SDK mặc định là `~/Library/Android/sdk`, khớp với `ANDROID_HOME` script đã đặt. Đừng đổi.

---

## 3. Máy Windows

### 3.1. Chuẩn bị

- Windows 10 (bản 21H2 trở lên) hoặc Windows 11. Cần **winget** (có sẵn trong app **App Installer**; nếu thiếu, cài từ Microsoft Store).
- Mở **PowerShell** thường: bấm Start, gõ `PowerShell`, chọn **Windows PowerShell** (không cần *Run as administrator*). Windows Terminal hoặc terminal của VS Code đều được.
- Để repo ở **đường dẫn ngắn**, ví dụ `C:\dev\<ten-repo>`. Đường dẫn dài dễ gây lỗi khi build Android.

Lấy repo: trên GitHub bấm **Code → Download ZIP** rồi giải nén vào `C:\dev`, hoặc nếu đã có Git:

```powershell
mkdir C:\dev -Force; cd C:\dev
git clone https://github.com/Freedombuiders/<ten-repo>.git
cd <ten-repo>
```

### 3.2. Chạy script cài đặt

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup\windows.ps1
```

Script chạy được nhiều lần. Nó làm lần lượt:

1. Hỏi đổi **execution policy** của riêng tài khoản bạn thành `RemoteSigned`. Mặc định Windows chặn mọi script PowerShell, kể cả `npm`, nên nên chọn **Y**.
2. Cài qua winget: **Git**, **GitHub CLI**, **fnm** (nếu lỗi thì cài Node.js LTS bản chính thức), **Microsoft OpenJDK 17**, **Android Studio** (hỏi trước), **VS Code** (hỏi trước).
3. Bật `git config --global core.longpaths true` (tránh lỗi đường dẫn dài).
4. Cài Node theo `.nvmrc`, đặt mặc định, thêm fnm vào PowerShell profile (cả Windows PowerShell 5.1 và PowerShell 7).
5. Đặt biến môi trường của người dùng: `JAVA_HOME` (thư mục JDK 17 của Microsoft), `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`, thêm `platform-tools` và `emulator` vào `Path` (không thêm trùng).
6. Cài `eas-cli`, `wrangler` toàn máy (tuỳ chọn).
7. In ra danh sách **việc bạn cần tự làm**.

Một số gói (Git, JDK, Android Studio) cài cho cả máy nên Windows sẽ hiện hộp thoại **UAC**: bấm **Yes**.

Tuỳ chọn: `-SkipAndroid`, `-SkipVSCode`, `-SkipGlobals`, `-UseNodeMsi` (dùng bộ cài Node.js chính thức thay vì fnm), `-Yes` (không hỏi). Ví dụ:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup\windows.ps1 -SkipVSCode -Yes
```

Xong thì **đóng cửa sổ PowerShell và mở cửa sổ mới** để nhận `Path`, `JAVA_HOME`, `ANDROID_HOME` và fnm.

> fnm được cấu hình cho **PowerShell**. Dùng Git Bash thì thêm `eval "$(fnm env --use-on-cd --shell bash)"` vào `~/.bashrc`. Không nên dùng Command Prompt (cmd) cho repo này.

### 3.3. Cài Android Studio lần đầu

Giống [mục 2.4](#24-cài-android-studio-lần-đầu-chạy-máy-ảo-android), khác vài chỗ:

- Mở SDK Manager bằng **More Actions → SDK Manager** hoặc **File → Settings… → Languages & Frameworks → Android SDK**.
- System image chọn **Google APIs Intel x86_64 Atom System Image** (máy Intel/AMD thông thường). Máy Windows chip ARM (Snapdragon) chọn bản **ARM 64 v8a**.
- Đường dẫn SDK mặc định là `C:\Users\<tên bạn>\AppData\Local\Android\Sdk`, khớp với `ANDROID_HOME`. Đừng đổi.
- Máy ảo không chạy hoặc báo thiếu tăng tốc phần cứng: bật **Virtualization (VT-x / AMD-V / SVM)** trong BIOS, rồi bật **Windows Hypervisor Platform** (Start → gõ *Turn Windows features on or off*), khởi động lại máy.

### 3.4. iPhone trên Windows

Apple chỉ cho build và chạy máy ảo iOS trên máy Mac, nên trên Windows **không có iOS Simulator** và **không chạy được `npx expo run:ios`**. Cách làm:

- **Khi phát triển**: cài **Expo Go** trên iPhone thật, chạy `npm run mobile`, quét QR bằng app **Camera** của iPhone. Mọi thay đổi code hiện ngay trên điện thoại.
- **Khi cần bản iOS thật** (TestFlight, App Store, development build): build trên máy chủ Expo bằng `npm run build:ios`. Cần tài khoản Apple Developer (99 USD/năm). Xem [docs/04-expo-eas-build.md](04-expo-eas-build.md) và [docs/05-app-store.md](05-app-store.md).

---

## 4. Kiểm tra bằng `npm run doctor`

Mở terminal **mới**, vào thư mục repo:

```bash
npm run doctor
```

(Chưa `npm install` cũng chạy được, hoặc gọi thẳng `node scripts/doctor.mjs`.) Kết quả chia 4 nhóm, mỗi dòng có ✅ ổn / ⚠️ nên sửa / ❌ thiếu, kèm lệnh sửa ngay dưới:

| Nhóm | Kiểm tra |
|---|---|
| **Bắt buộc** | Node (>= 22, khuyên dùng bản trong `.nvmrc`), npm, Git, `node_modules`, GitHub CLI + đăng nhập (tuỳ chọn) |
| **Android** | Java 17, `JAVA_HOME`, Android Studio, `ANDROID_HOME`, SDK Platform 36, `adb`, emulator và số máy ảo |
| **iOS (chỉ macOS)** | Xcode, giấy phép Xcode, iOS Simulator runtime, CocoaPods |
| **Cloudflare & Expo** | wrangler trong repo, đăng nhập Cloudflare, eas-cli, đăng nhập Expo |

Chỉ nhóm **Bắt buộc** phải xanh để bắt đầu code. Các nhóm khác cần khi bạn làm tới phần đó (chạy máy ảo, deploy, build app). Lệnh trả mã lỗi 1 khi thiếu Node, npm hoặc Git.

---

## 5. Chạy repo lần đầu

Ở thư mục gốc repo:

```bash
npm install                # cài thư viện cho cả repo (một node_modules chung)
npm run db:migrate:local   # tạo bảng trong cơ sở dữ liệu D1 local
npm run dev                # API http://localhost:8787 + web http://localhost:5173
```

Mở http://localhost:5173 để xem web, http://localhost:8787/api/health để thấy API trả `{"ok":true,…}`.

Mở **terminal thứ hai** (để `npm run dev` vẫn chạy), chạy app:

```bash
npm run mobile
```

Khi Expo hiện mã QR:

- Bấm **`i`**: mở trên iOS Simulator (chỉ Mac, cần Xcode).
- Bấm **`a`**: mở trên máy ảo Android (bật máy ảo trong Android Studio trước cho nhanh).
- Hoặc **quét QR bằng điện thoại**: iPhone dùng app Camera, Android dùng app Expo Go. Điện thoại và máy tính phải **cùng Wi‑Fi**.

App tự tìm API trên chính máy đang chạy `npm run dev` (xem `apps/mobile/src/lib/config.ts`), không cần cấu hình gì.

---

## 6. Đăng nhập các dịch vụ

Chạy trên terminal **của bạn** (cần trình duyệt, mật khẩu, mã 2FA). Chạy `npm run dev` không cần các tài khoản này, chỉ cần khi đẩy code lên GitHub, deploy hoặc build app.

| Dịch vụ | Lệnh | Ghi chú | Kiểm tra |
|---|---|---|---|
| GitHub | `gh auth login` | Chọn **GitHub.com → HTTPS → Yes (dùng cho git) → Login with a web browser**, dán mã vào trình duyệt | `gh auth status` |
| Cloudflare | `npx wrangler login` | Mở trình duyệt, bấm **Allow** | `npx wrangler whoami` |
| Expo / EAS | `npx eas-cli login` | Chưa có tài khoản thì tạo ở https://expo.dev/signup | `npx eas-cli whoami` |

---

## 7. Gặp lỗi thì sao

| Triệu chứng | Cách sửa |
|---|---|
| `npm run dev` báo **port 8787 đang dùng** (`Address already in use`) | Có một `wrangler dev` khác đang chạy. Mac: `lsof -i :8787` lấy PID rồi `kill <PID>`. Windows: `netstat -ano \| findstr :8787` rồi `taskkill /PID <PID> /F`. Cổng 5173 (web), 8081 (Metro) làm tương tự. |
| `adb: command not found` / `'adb' is not recognized` | Mở terminal mới. Vẫn lỗi: Mac kiểm tra `~/.zshrc` có dòng `export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"`; Windows chạy lại `windows.ps1`. Thư mục `platform-tools` chỉ có sau khi chạy xong trình cài đặt Android Studio. |
| `JAVA_HOME is set to an invalid directory` hoặc Java không phải 17 | Mac: `/usr/libexec/java_home -V` xem các JDK đã cài, rồi sửa trong `~/.zshrc`: `export JAVA_HOME="$(/usr/libexec/java_home -v 17)"`. Windows: chạy lại `windows.ps1`, hoặc **Start → "Edit environment variables for your account"** → sửa `JAVA_HOME` thành `C:\Program Files\Microsoft\jdk-17…-hotspot`. Mở terminal mới. |
| Gradle báo sai JDK (`Unsupported class file major version`, `Android Gradle plugin requires Java 17`) | Ép Gradle dùng JDK 17: tạo file `~/.gradle/gradle.properties` (Windows: `C:\Users\<tên>\.gradle\gradle.properties`) với dòng `org.gradle.java.home=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home` (Windows viết dấu `/`: `org.gradle.java.home=C:/Program Files/Microsoft/jdk-17.0.x-hotspot`). Trong Android Studio: **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** chọn 17. Sau đó `cd apps/mobile/android && ./gradlew --stop` (nếu có thư mục `android`). |
| App trên điện thoại báo **"Không kết nối được máy chủ"** | Điện thoại và máy tính **cùng Wi‑Fi**, tắt VPN. `npm run dev` phải đang chạy (`wrangler dev` đã nghe ở `0.0.0.0`, không cần sửa). Thử mở `http://<IP máy tính>:8787/api/health` bằng trình duyệt điện thoại: không mở được thì do tường lửa hoặc Wi‑Fi chặn các máy nói chuyện với nhau (Wi‑Fi khách, Wi‑Fi công ty) → dùng 4G phát từ điện thoại. Mac: **System Settings → Network → Firewall → Options** cho phép `node`/`workerd`. |
| Windows hiện **"Windows Defender Firewall has blocked some features"** khi chạy `npm run dev` / `npm run mobile` | Tick **Private networks** → **Allow access** (cho cả Node.js và `workerd`). Lỡ bấm Cancel: **Control Panel → Windows Defender Firewall → Allow an app or feature through Windows Defender Firewall** → tick **Private** cho Node.js và workerd. Mạng Wi‑Fi nhà nên đặt là **Private network**. |
| Windows: `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, chọn **Y**, mở PowerShell mới. |
| `fnm: command not found` hoặc `node -v` vẫn ra bản cũ | Mở terminal mới (Mac có thể `source ~/.zshrc`). Rồi `fnm use` trong thư mục repo, `fnm default 24`. Mac có Node của Homebrew thì có thể gỡ: `brew uninstall node`. |
| Windows: `Filename too long` khi `git clone` / `npm install` | `git config --global core.longpaths true` và chuyển repo về đường dẫn ngắn như `C:\dev\<ten-repo>`. |
| `xcrun: error: unable to find utility "simctl"` / bấm `i` không mở được Simulator | Đang chọn Command Line Tools thay vì Xcode: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`. Chưa có iOS runtime: **Xcode → Settings… → Components**. |
| Expo Go báo **project is incompatible with this version of Expo Go** | Cập nhật app Expo Go trên điện thoại lên bản mới nhất (repo dùng Expo SDK 58). |
| Bấm `a` báo không có thiết bị Android | Bật máy ảo trước (Android Studio → Virtual Device Manager → ▶), kiểm tra `adb devices` có dòng `emulator-5554 device`. |

Vẫn chưa được: chạy `npm run doctor`, chụp kết quả và lỗi gửi cho người hỗ trợ (hoặc dán cho Claude Code).
