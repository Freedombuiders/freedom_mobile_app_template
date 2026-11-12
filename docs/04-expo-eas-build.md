# 04. Expo và EAS: chạy thử, build, cập nhật app

App mobile nằm ở `apps/mobile` (Expo SDK 58, React Native 0.88, Expo Router, mã nguồn trong `src/app`). Bản để cài lên điện thoại và gửi lên cửa hàng được build trên máy chủ của Expo (dịch vụ **EAS Build**, nay Expo gọi là *Expo Build*), nên bạn **không cần Xcode hay Android Studio**.

Mọi lệnh EAS trong template chạy qua `npx --yes eas-cli@latest ...`, không cần cài `eas-cli` toàn máy. Trong tài liệu Expo bạn sẽ thấy viết tắt là `eas ...`: hai cách là một.

> Kiểm tra lại số liệu (giá, giới hạn, thời gian) trên trang chính thức trước khi dựa vào: Expo và hai cửa hàng thay đổi chúng thường xuyên. Tài liệu này cập nhật tháng 11/2026.

---

## 1. Chạy app khi đang phát triển

### Cách 1: Expo Go (nhanh nhất, dùng đầu tiên)

```bash
npm run dev       # terminal 1: API (wrangler, cổng 8787) + web
npm run mobile    # terminal 2: Metro cho app mobile
```

Cài app **Expo Go** trên điện thoại, quét mã QR (iPhone dùng app Camera, Android dùng Expo Go). Điện thoại và máy tính phải chung Wi-Fi. Khi chạy dev, app tự gọi API trên chính máy tính đang chạy Metro (xem `apps/mobile/src/lib/config.ts`).

Expo Go là một app cố định, chỉ có sẵn một số thư viện native và chỉ chạy SDK mới nhất. Các thư viện có sẵn trong template đều chạy được trên Expo Go.

### Cách 2: Development build (khi Expo Go không đủ)

Development build là "Expo Go của riêng app bạn": build một lần, sau đó vẫn sửa code và thấy thay đổi ngay như Expo Go. Bạn cần nó khi:

- Thêm thư viện có code native **không có trong Expo Go**.
- Sửa cấu hình native trong `app.json`: plugin, quyền (camera, vị trí…), icon, tên app, scheme.
- Muốn chạy thử y như bản thật (thông báo đẩy, deep link, đăng nhập Apple/Google…).

```bash
cd apps/mobile
npx expo install expo-dev-client          # một lần; profile "development" bắt buộc có gói này

# Android: ra file APK dev, cài thẳng lên máy
npx --yes eas-cli@latest build -p android --profile development

# iOS: phải đăng ký iPhone (UDID) trước, rồi mới build
npx --yes eas-cli@latest device:create
npx --yes eas-cli@latest build -p ios --profile development

npm run start                              # Metro, giờ mở bằng development build thay cho Expo Go
```

Chỉ build lại development build khi đổi phần native (thêm/nâng thư viện native, sửa `app.json`, nâng SDK). Sửa code JS/TS thì không cần build lại.

Có Mac với Xcode (hoặc máy có Android Studio) thì có thể build tại chỗ: `npx expo run:ios` / `npx expo run:android`.

### Quy tắc cài thư viện: luôn dùng `npx expo install`

```bash
cd apps/mobile
npx expo install <tên-gói>        # KHÔNG dùng npm install cho thư viện của app mobile
npx expo install --check          # liệt kê gói lệch phiên bản với SDK 58
npx expo install --fix            # tự sửa về đúng phiên bản
npm run doctor -w @app/mobile     # expo-doctor: kiểm tra cấu hình, gói trùng, gói lệch
```

`npx expo install` chọn đúng phiên bản hợp với SDK đang dùng. `npm install` lấy bản mới nhất, thường lệch và làm build hỏng. Chạy `npm run doctor -w @app/mobile` trước mỗi lần build bản phát hành.

Đây là monorepo: file khoá thư viện là `package-lock.json` **ở gốc repo**. EAS cài thư viện theo file này, nên thêm thư viện xong phải commit cả `package-lock.json`. File khoá lệch với `package.json` là build hỏng ngay ở bước *Install dependencies*.

---

## 2. Tài khoản Expo và liên kết project (làm một lần)

1. Tạo tài khoản miễn phí tại https://expo.dev. Làm theo nhóm thì tạo thêm một *Organization* để cả nhóm cùng thấy build.
2. Đăng nhập từ máy:
   ```bash
   npm run eas:login -w @app/mobile
   npx --yes eas-cli@latest whoami       # kiểm tra: in ra tên tài khoản
   ```
3. Tạo project trên EAS và gắn vào app:
   ```bash
   npm run eas:init -w @app/mobile
   ```
   Lệnh này ghi `extra.eas.projectId` và `owner` vào `apps/mobile/app.json`. **Commit `app.json`** sau đó.
4. Sau khi init, **đừng đổi `slug`** trong `app.json` (EAS báo lỗi lệch project). `name` (tên hiện dưới icon) thì đổi thoải mái.

Repo phải là git repo: EAS dùng git để biết file nào cần tải lên. EAS **tải cả thay đổi chưa commit** và bỏ qua những gì có trong `.easignore` ở gốc repo. `.easignore` thay hẳn cho `.gitignore` khi build, nên sửa file này thì sửa cả file kia.

---

## 3. Ba profile build (`apps/mobile/eas.json`)

| Profile | Dùng để | Android ra | iOS ra | Ai cài được |
|---|---|---|---|---|
| `development` | Phát triển, có màn chọn server dev | APK (dev) | Bản ad hoc (dev) | Máy của bạn; iPhone phải đăng ký UDID |
| `preview` | Gửi người thử nhanh | **APK** cài thẳng (`buildType: apk`) | Bản ad hoc | Ai có link (Android); iPhone đã đăng ký UDID |
| `production` | Gửi lên cửa hàng | **AAB** cho Google Play | **IPA** cho App Store/TestFlight | Qua cửa hàng, TestFlight, Play testing |

- `production` có `autoIncrement: true`: mỗi lần build, số build tự tăng.
- `cli.appVersionSource: "remote"`: số build lưu trên máy chủ EAS, không lưu trong `app.json`.
- `distribution: "internal"`: bản build có link cài trực tiếp, không qua cửa hàng.

---

## 4. Lệnh build theo từng nhu cầu

Chạy ở **gốc repo**:

| Muốn gì | Lệnh | Kết quả |
|---|---|---|
| Gửi APK cho người thử Android | `npm run build:apk` | Link tải `.apk`, mở trên điện thoại là cài được |
| iOS lên TestFlight | `npm run build:ios` | Build IPA, xong tự gửi lên App Store Connect/TestFlight |
| Android cho Google Play | `npm run build:android` | File `.aab` |
| Gửi AAB mới nhất lên Google Play | `npm run submit:android` | Vào track ghi trong `eas.json` (mặc định `internal`, dạng nháp) |
| Gửi lại IPA mới nhất lên App Store Connect | `npm run submit:ios` | Dùng khi build xong mà bước gửi lỗi |
| iOS ad hoc cho iPhone đã đăng ký | `cd apps/mobile && npx --yes eas-cli@latest build -p ios --profile preview` | Link cài cho iPhone có trong danh sách UDID |
| Cả hai nền tảng bản store | `cd apps/mobile && npx --yes eas-cli@latest build -p all --profile production` | AAB + IPA |

Muốn thêm cờ cho lệnh, gọi thẳng workspace và đặt cờ sau `--`:

```bash
npm run build:apk -w @app/mobile -- --no-wait           # tải code lên rồi thoát, build vẫn chạy trên EAS
npm run build:ios -w @app/mobile -- --non-interactive   # không hỏi gì (chỉ dùng khi chứng chỉ đã có sẵn)
```

Với iPhone người thử, **TestFlight** dễ hơn bản ad hoc nhiều: không cần thu UDID từng máy. Xem `docs/05-app-store.md`.

Bản APK cài thẳng ký bằng khoá của EAS, còn bản tải từ Google Play ký bằng khoá của Google. Máy đang cài APK phải gỡ ra rồi mới cài được bản từ Play.

Google đang triển khai **xác minh nhà phát triển** cho app cài trên thiết bị Android được chứng nhận, kể cả app cài ngoài Play (bắt đầu ở vài quốc gia từ 30/09/2026, mở rộng toàn cầu từ 2027). Nếu APK cài thẳng bị chặn, phát hành qua track Internal testing của Play, và kiểm tra lại quy định trên trang chính thức: https://developer.android.com/developer-verification

---

## 5. Phiên bản và số build

Có hai con số khác nhau:

| | Ở đâu | Ai thấy | Ai tăng |
|---|---|---|---|
| **Phiên bản** (`1.0.0`) | `expo.version` trong `apps/mobile/app.json` | Người dùng, trên trang cửa hàng | **Bạn**, bằng tay, khi ra bản mới cho người dùng |
| **Số build** (iOS `buildNumber`, Android `versionCode`) | Máy chủ EAS | Chỉ cửa hàng, để phân biệt các lần tải lên | **EAS tự tăng** ở profile `production` |

Quy tắc tăng phiên bản:

- Sửa lỗi: `1.0.0` → `1.0.1`. Thêm tính năng: `1.0.0` → `1.1.0`. Thay đổi lớn: `2.0.0`.
- Cùng một phiên bản có thể build và gửi TestFlight nhiều lần (số build khác nhau).
- Khi phiên bản đã được Apple duyệt hoặc đã phát hành, Apple không nhận thêm build cho phiên bản đó (lỗi kiểu *"train version … is closed"*). Lúc đó tăng `version` rồi build lại.
- Google Play chỉ cần `versionCode` tăng dần. `version` là chữ hiển thị.
- Không ghi `buildNumber`/`versionCode` vào `app.json`: với nguồn `remote`, EAS bỏ qua các giá trị đó.
- App đã có trên cửa hàng từ trước (build bằng cách khác): đặt số build hiện tại cho EAS một lần bằng `npx --yes eas-cli@latest build:version:set` (chạy trong `apps/mobile`).

---

## 6. Biến môi trường lúc build

App đọc địa chỉ API như sau (`apps/mobile/src/lib/config.ts`):

1. Có `EXPO_PUBLIC_API_URL` thì dùng nó.
2. Không có: khi dev dùng máy tính đang chạy Metro (cổng 8787); bản release dùng `APP_INFO.webUrl` trong `packages/shared/src/app-info.ts`.

Thường bạn **không cần đặt gì**: chỉ cần `webUrl` đúng tên miền production. Đặt `EXPO_PUBLIC_API_URL` khi muốn một bản build trỏ tới server khác (ví dụ server thử nghiệm).

Biến `EXPO_PUBLIC_*` được **chép thẳng vào mã JS lúc build**. Ai có file app cũng đọc được, nên tuyệt đối không đặt bí mật (khoá API, mật khẩu) vào đây. Bí mật thuộc về Worker: `npx wrangler secret put TÊN` trong `apps/api`.

**Cách A: ghi trong `eas.json`** (giá trị không bí mật, chấp nhận commit lên git):

```json
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "env": { "EXPO_PUBLIC_API_URL": "https://staging.example.com" }
}
```

**Cách B: biến môi trường trên EAS** (quản lý trên expo.dev, dùng chung cho build và EAS Update):

```bash
cd apps/mobile
npx --yes eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://staging.example.com \
  --environment preview --visibility plaintext
npx --yes eas-cli@latest env:list --environment preview
```

Rồi chọn môi trường cho profile trong `eas.json`: `"preview": { ..., "environment": "preview" }`. Có ba môi trường mặc định: `development`, `preview`, `production`.

File `apps/mobile/.env` chỉ có tác dụng khi chạy dev trên máy. File này nằm trong `.gitignore` và `.easignore`, nên **EAS không thấy nó** khi build.

---

## 7. Chứng chỉ và khoá ký (credentials)

EAS tự tạo và giữ:

- **Android:** keystore (khoá tải lên, *upload key*).
- **iOS:** Distribution Certificate, Provisioning Profile, App Store Connect API key (để gửi TestFlight), và khoá Push nếu dùng thông báo đẩy.

Xem hoặc tải về: `cd apps/mobile && npx --yes eas-cli@latest credentials`.

**Không bao giờ xoá keystore Android trên EAS.** Mọi bản cập nhật phải ký bằng đúng khoá cũ:

- Mất khoá thì các máy đã cài APK không cập nhật được nữa.
- Với Google Play (có Play App Signing), bạn phải xin Google đặt lại upload key và chờ nhiều ngày.

Nên tải một bản sao keystore (`credentials` → Android → production → *Download*) và cất trong trình quản lý mật khẩu. Không commit: các đuôi `*.jks`, `*.keystore`, `*.p8`, `*.p12` đã bị chặn trong `.gitignore`.

Chứng chỉ và profile iOS hết hạn sau khoảng 1 năm. Khi hết hạn, EAS hỏi tạo mới, và bước đó cần đăng nhập Apple.

**Chỉ chủ tài khoản Apple mới đăng nhập Apple được**, trong một terminal thật, vì phải gõ mật khẩu và mã 2FA. Việc này chỉ cần làm khi:

- Build iOS lần đầu.
- Chứng chỉ hết hạn.
- Thêm quyền Apple mới cho app (Push Notifications, Sign in with Apple…).

Có thể đặt sẵn `EXPO_APPLE_ID` và `EXPO_APPLE_TEAM_ID` để EAS khỏi hỏi Apple ID và team.

---

## 8. EAS Update: cập nhật qua mạng (OTA), không qua duyệt

EAS Update đẩy phần JS và ảnh mới xuống các app **đã cài**, không cần build và duyệt lại. Template chưa bật sẵn. Cách bật:

```bash
cd apps/mobile
npx expo install expo-updates
npx --yes eas-cli@latest update:configure    # thêm updates.url và runtimeVersion vào app.json
```

Thêm `channel` cho từng profile trong `eas.json`:

```json
"preview":    { "distribution": "internal", "android": { "buildType": "apk" }, "channel": "preview" },
"production": { "autoIncrement": true, "channel": "production" }
```

Sau đó **build và phát hành một bản mới**: chỉ bản build có `expo-updates` mới nhận được update. Từ đó, mỗi lần muốn đẩy bản sửa:

```bash
cd apps/mobile
npx --yes eas-cli@latest update --channel production --environment production --message "Sửa lỗi nút Lưu"
npx --yes eas-cli@latest update:list          # xem các update đã đẩy
npx --yes eas-cli@latest update:rollback      # update lỗi: quay về update trước
npx --yes eas-cli@latest update:roll-back-to-embedded --channel production   # quay về đúng code có sẵn trong bản build
```

Lưu ý khi dùng EAS Update:

- `--environment` bắt buộc từ SDK 55. Update lấy biến môi trường từ **môi trường EAS** (cách B ở mục 6), không đọc khối `env` trong `eas.json`. Dùng EAS Update thì nên đặt `EXPO_PUBLIC_API_URL` theo cách B.
- Giữ `runtimeVersion` theo `{ "policy": "appVersion" }`: update chỉ tới các máy cài đúng `version` đó. Chính sách `nativeVersion` không chạy được với số build tự tăng trên máy chủ.
- App tải update khi mở và áp dụng ở lần mở sau. Để kiểm tra, tắt hẳn app rồi mở lại một đến hai lần.
- Gói miễn phí giới hạn số người dùng hoạt động mỗi tháng nhận update (xem mục 10).

| Đẩy OTA được | Phải build và gửi duyệt lại |
|---|---|
| Sửa code JS/TS, giao diện, chữ, màu | Thêm hoặc nâng thư viện có code native |
| Ảnh, font nằm trong bundle | Đổi `app.json`: tên, icon, splash, quyền, plugin, bundle id |
| Sửa lỗi logic, gọi API mới (khi API đã deploy) | Nâng Expo SDK |
| | Đổi `version` (bản mới cho cửa hàng) |

Cả Apple và Google đều không cho dùng OTA để thêm tính năng lớn hay đổi mục đích app mà lách duyệt. Chỉ dùng OTA cho sửa lỗi và chỉnh nhỏ.

---

## 9. Đọc log build và các lỗi hay gặp

Mỗi lần build, CLI in ra một link `https://expo.dev/accounts/<owner>/projects/<slug>/builds/<id>`. Mở link để xem log từng bước. Bước lỗi có màu đỏ, và dòng lỗi thật thường nằm gần cuối bước đó.

```bash
cd apps/mobile
npx --yes eas-cli@latest build:list --limit 5                      # các build gần nhất
npx --yes eas-cli@latest build:list --platform ios --limit 1 --json --non-interactive
npx --yes eas-cli@latest build:view <build-id>                     # chi tiết một build
```

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| `EAS project not configured` / thiếu `projectId` | Chưa chạy init | `npm run eas:init -w @app/mobile`, commit `app.json` |
| Hỏng ở *Install dependencies* (`npm ci`) | `package-lock.json` lệch hoặc chưa commit | `npm install` ở gốc, commit lockfile |
| Hỏng ở bước bundle JS hoặc native, báo lệch phiên bản | Thư viện cài bằng `npm install` thay vì `expo install` | `npx expo install --fix`, `npm run doctor -w @app/mobile` |
| Thiếu file khi build, chạy dưới máy thì được | File bị chặn trong `.easignore` | Sửa `.easignore` (nhớ nó thay cho `.gitignore`) |
| Lỗi phiên bản Node | Máy EAS dùng Node khác `.nvmrc` | Thêm `"node": "<phiên bản>"` vào profile trong `eas.json` |
| iOS: bundle id đã thuộc team khác / không tạo được profile | Đăng nhập nhầm Apple ID hoặc team | Đăng nhập lại đúng team; bundle id phải đăng ký trong team sẽ phát hành |
| iOS: *"train version … is closed"* khi gửi | Phiên bản đó đã được duyệt hoặc phát hành | Tăng `version` trong `app.json`, build lại |
| Android: `versionCode` đã dùng | App từng build bằng cách khác | `npx --yes eas-cli@latest build:version:set` |
| Gửi tự động lỗi ở chế độ `--non-interactive` | Chưa có `ascAppId` (iOS) hoặc khoá service account (Android) | Xem `docs/05-app-store.md`, `docs/06-google-play.md` |
| Build quá 45 phút bị dừng (gói miễn phí) | Build lớn, hoặc máy chủ chậm | Chạy lại; dự án lớn cân nhắc gói trả phí |
| App mở ra trắng hoặc đăng nhập lỗi, chỉ ở bản release | API production chưa deploy hoặc `webUrl` sai | `curl -s <webUrl>/api/health`, deploy API (`npm run deploy`) |

---

## 10. Gói miễn phí và hàng đợi

Theo https://expo.dev/pricing (tháng 11/2026; kiểm tra lại trên trang chính thức), gói Free có:

- Tối đa **15 build Android + 15 build iOS mỗi tháng**.
- Hàng đợi **ưu tiên thấp**: giờ cao điểm có thể chờ **90 phút trở lên** mới tới lượt.
- Mỗi build tối đa **45 phút**.
- EAS Update cho tối đa **1.000 người dùng hoạt động mỗi tháng**.

Mẹo tiết kiệm lượt build:

- Chạy `npm run typecheck`, `npm run lint` và `npm run doctor -w @app/mobile` trên máy trước khi build. Build hỏng vẫn tính lượt.
- Thử tính năng bằng Expo Go hoặc development build, chỉ build bản store khi đã ổn.
- Thêm `--no-wait` để khỏi giữ terminal, rồi theo dõi trên expo.dev.
- Có Mac/Android Studio thì `npx --yes eas-cli@latest build --local ...` build ngay trên máy, không dùng máy chủ EAS.

Tài liệu gốc: [EAS Build](https://docs.expo.dev/build/introduction/) · [Development builds](https://docs.expo.dev/develop/development-builds/introduction/) · [Quản lý phiên bản](https://docs.expo.dev/build-reference/app-versions/) · [Biến môi trường](https://docs.expo.dev/eas/environment-variables/) · [EAS Update](https://docs.expo.dev/eas-update/getting-started/) · [eas.json](https://docs.expo.dev/eas/json/)
