---
name: build-mobile
description: Build và gửi app mobile (Expo + EAS) — iOS lên TestFlight/App Store Connect, Android ra APK cho người thử hoặc AAB cho Google Play, và đẩy EAS Update (OTA). Dùng khi người dùng nói "build app", "build iOS", "build Android", "ra bản mới", "đẩy lên TestFlight", "build APK", "submit App Store", "submit Google Play", "EAS", "eas update", "cập nhật OTA", "build xong chưa", hoặc chỉ nói "iOS"/"Android" trong ngữ cảnh phát hành app.
---

# Build và gửi app mobile bằng EAS

App ở `apps/mobile` (Expo SDK 58, npm workspaces). Build chạy trên máy chủ EAS, không cần Xcode hay Android Studio. Gọi EAS bằng `npx --yes eas-cli@latest` (không cài global). Tài liệu đầy đủ cho người: `docs/04-expo-eas-build.md`, `docs/05-app-store.md`, `docs/06-google-play.md`.

## Lệnh (chạy ở gốc repo)

| Lệnh | Làm gì |
|---|---|
| `npm run build:apk` | Android APK (profile `preview`): link cài thẳng cho người thử |
| `npm run build:ios` | iOS IPA (profile `production`), build xong tự gửi lên TestFlight (`--auto-submit`) |
| `npm run build:android` | Android AAB (profile `production`) cho Google Play |
| `npm run submit:android` | Gửi AAB mới nhất lên Google Play (track/trạng thái theo `submit.production.android` trong `apps/mobile/eas.json`; mặc định `internal`, nháp) |
| `npm run submit:ios` | Gửi IPA mới nhất lên App Store Connect (khi build xong mà bước gửi lỗi) |

Thêm cờ thì gọi thẳng workspace: `npm run build:apk -w @app/mobile -- --no-wait`, `npm run build:ios -w @app/mobile -- --non-interactive`. Lệnh khác: `cd apps/mobile && npx --yes eas-cli@latest <lệnh>`.

## Quy trình

### 1. Kiểm tra trước khi build

Báo người dùng nếu có mục nào không đạt.

- `npx --yes eas-cli@latest whoami` phải ra một tài khoản Expo.
  - Chưa đăng nhập: nhờ người dùng chạy `npm run eas:login -w @app/mobile` trong terminal của họ.
  - Không tự nhập mật khẩu hộ.
- `apps/mobile/app.json` phải có `expo.extra.eas.projectId`. Chưa có: `npm run eas:init -w @app/mobile` (ghi `projectId` và `owner` vào `app.json`), rồi nhắc commit.
- `npm run typecheck` sạch. Nên chạy thêm `npm run lint` và `npm run doctor -w @app/mobile`: build hỏng vẫn tính lượt (gói Free chỉ có 15 build mỗi nền tảng mỗi tháng).
- `git status --short`: **EAS tải lên cả thay đổi chưa commit** (trừ những gì có trong `.easignore`). Nói rõ với người dùng trong một dòng: bản build gồm những thay đổi chưa commit nào.
- Bản build release gọi API ở `APP_INFO.webUrl` (`packages/shared/src/app-info.ts`), hoặc `EXPO_PUBLIC_API_URL` nếu đặt trong `eas.json`/môi trường EAS.
  - Kiểm tra `curl -s <webUrl>/api/health`.
  - Bản app cần API hoặc migration mới thì API phải deploy trước (`npm run deploy`).
  - Deploy production cần người dùng đồng ý riêng. Skill này không tự deploy.
- iOS: nếu `submit.production.ios` trong `eas.json` chưa có `ascAppId`, hoặc đây là build iOS **đầu tiên**, EAS sẽ hỏi đăng nhập Apple (mật khẩu + 2FA), tạo chứng chỉ và App Store Connect API key.
  - Bước này **chỉ người dùng làm được**: mở terminal cho họ chạy `npm run build:ios` và tự trả lời.
  - Không chạy ở chế độ `--non-interactive` (sẽ lỗi).
  - Sau lần đầu, nhắc họ lấy Apple ID của app (App Store Connect → App Information) điền vào `ascAppId`.
- Android gửi lên Play: cần `apps/mobile/google-play-service-account.json` (git-ignored) hoặc khoá đã tải lên EAS.
  - Bản AAB đầu tiên nên để người dùng tự tải lên Play Console (Internal testing). Xem `docs/06-google-play.md`.

### 2. Chạy build

Build iOS mất 15–30 phút, cộng thời gian chờ hàng đợi; gói Free có thể chờ 90 phút trở lên.

- Chạy bằng Bash ở chế độ nền (`run_in_background`), hoặc thêm `--no-wait`.
- Cả hai nền tảng: đẩy Android với `--no-wait` trước, rồi chạy iOS ở nền.
- Chép link build (`https://expo.dev/accounts/.../builds/<id>`) từ output và báo người dùng ngay.

### 3. Theo dõi

```bash
cd apps/mobile
npx --yes eas-cli@latest build:list --platform ios --limit 1 --json --non-interactive      # status: NEW/IN_QUEUE/IN_PROGRESS/FINISHED/ERRORED/CANCELED
npx --yes eas-cli@latest build:list --platform android --limit 1 --json --non-interactive
npx --yes eas-cli@latest submit:list --platform ios --limit 1 --json --non-interactive    # bước gửi TestFlight
```

Build iOS `FINISHED` mà không có lượt gửi nào thì gửi thủ công:

```bash
npx --yes eas-cli@latest submit -p ios --profile production --id <buildId> --non-interactive
```

### 4. Build lỗi

- Lấy log bằng `npx --yes eas-cli@latest build:view <id> --json`, xem trường `logFiles`, hoặc mở link build.
  - File log tải về là nhị phân thì giải nén brotli: `node -e "process.stdout.write(require('zlib').brotliDecompressSync(require('fs').readFileSync('log.br')))"`.
- Tìm bước đầu tiên bị lỗi. Bảng lỗi hay gặp ở `docs/04-expo-eas-build.md`, mục 9:
  - lockfile lệch;
  - thư viện cài bằng `npm install` thay vì `npx expo install`;
  - file bị `.easignore` chặn;
  - `train version is closed`;
  - thiếu `ascAppId`.
- Sửa nguyên nhân rồi build lại. Đừng build lại y nguyên khi chưa hiểu lỗi.

### 5. Báo kết quả

- **APK:** gửi link `artifacts.buildUrl` (file `.apk`). Mở trên điện thoại Android là cài được. Lần đầu máy hỏi cho phép cài từ nguồn ngoài. Máy đang cài bản từ Google Play phải gỡ ra trước (khác khoá ký).
- **iOS:** build đã gửi thì Apple còn xử lý khoảng 5–30 phút. Sau đó build hiện trong tab TestFlight của App Store Connect, và người thử Internal nhận bản mới qua app TestFlight. Nhóm External cần Beta App Review cho build đầu.
- **AAB:** cho link tải, hoặc báo đã gửi vào track nào. Trạng thái `draft` nghĩa là người dùng còn phải vào Play Console bấm phát hành.

## Phiên bản

- Số build (iOS `buildNumber`, Android `versionCode`): EAS tự tăng trên máy chủ (`appVersionSource: remote`, `autoIncrement` ở `production`). Không sửa tay, không ghi vào `app.json`.
- `expo.version` trong `apps/mobile/app.json`: chỉ tăng khi ra **phiên bản mới cho người dùng** trên cửa hàng (`1.0.0` → `1.0.1` sửa lỗi, `1.1.0` tính năng). **Hỏi người dùng trước khi tăng.**
- Bắt buộc tăng `version` khi Apple báo phiên bản đã đóng (*"train version … is closed"*, tức phiên bản đó đã được duyệt hoặc phát hành).

## EAS Update (OTA)

Chỉ dùng khi app đã cài `expo-updates` và các bản build có `channel` (xem `docs/04-expo-eas-build.md`, mục 8).

```bash
cd apps/mobile
npx --yes eas-cli@latest update --channel production --environment production --message "<mô tả ngắn>"
```

Chỉ đẩy OTA được thay đổi JS/TS và ảnh. Thêm thư viện native, sửa `app.json` (tên, icon, quyền, plugin) hoặc nâng SDK thì phải build lại và gửi duyệt. Hỏi người dùng trước khi đẩy update lên channel `production`: nó tới máy người dùng thật ngay.

## Không bao giờ

- Xoá hoặc tạo lại credentials trên EAS, đặc biệt **keystore Android**. Mất keystore là các máy đã cài không cập nhật được nữa.
- Đăng nhập Apple hay Google hộ người dùng, hoặc ghi mật khẩu, mã 2FA, file khoá vào repo. Đăng nhập Apple do chủ tài khoản tự làm trong terminal.
- Commit `google-play-service-account*.json`, `*.p8`, `*.p12`, `*.jks`, `*.keystore`.
- Bấm gửi duyệt (Submit for Review) hay phát hành Production thay người dùng. Đó là việc của chủ tài khoản.
