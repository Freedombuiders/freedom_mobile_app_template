# Freedom Mobile App Template

Khung dự án dùng lại cho mọi app mới của **Freedom Builders**: một repo gồm **app iOS/Android (Expo)**, **web (React)** và **backend (Cloudflare Workers + D1)**, có sẵn đăng ký/đăng nhập, ví dụ CRUD, trang pháp lý cho store, script cài môi trường, hướng dẫn deploy và các skill cho Claude Code.

Bắt đầu dự án mới: tạo repo từ template này → chạy `npm run init:project` → bỏ tài liệu vào `docs/product/` và `docs/design/` → nhờ Claude Code phát triển tiếp.

```
freedom_mobile_app_template/
├── apps/
│   ├── mobile/     Expo SDK 58 · React Native · Expo Router — app iOS + Android
│   ├── web/        React 19 · Vite · Tailwind 4 · React Router — web app + landing + trang pháp lý
│   └── api/        Cloudflare Worker · Hono · D1 (SQLite) — API /api/*, phục vụ luôn bản build web
├── packages/
│   └── shared/     Kiểu dữ liệu API, schema zod, API client, thông tin app — dùng chung cho cả 3
├── docs/           Hướng dẫn (cài đặt, deploy, phát hành) + chỗ để tài liệu sản phẩm và thiết kế
├── scripts/        setup Mac/Windows, doctor, init-project, cloudflare-setup
└── .claude/skills/ Skill cho Claude Code: cài môi trường, khởi tạo, deploy, build app, phát hành
```

## Tính năng có sẵn

| | |
|---|---|
| **Tài khoản** | Đăng ký / đăng nhập email + mật khẩu (PBKDF2), phiên 30 ngày. Web dùng cookie HttpOnly, app dùng token trong SecureStore. Giới hạn số lần đăng nhập sai. |
| **Xoá tài khoản** | Ngay trong app và web (App Store, Google Play bắt buộc), xoá dây chuyền mọi dữ liệu. |
| **Ví dụ CRUD** | "Ghi chú": migration → schema → API → trang web → màn hình app. Copy theo mẫu này cho tính năng thật. |
| **Trang cho store** | `/privacy`, `/terms`, `/support`, `/delete-account` (nội dung mẫu, cần sửa trước khi phát hành). |
| **Bảo mật** | Kiểm tra Origin cho request ghi (CSRF), mọi truy vấn lọc theo `user_id`, token chỉ lưu SHA-256. |
| **Vận hành** | Cron dọn phiên hết hạn, log Cloudflare Observability, `npm run doctor` kiểm tra máy. |

## Bắt đầu nhanh

> Máy mới? Cài môi trường trước: [docs/01-cai-dat-moi-truong.md](docs/01-cai-dat-moi-truong.md) — hoặc nói với Claude Code: *"cài môi trường cho máy này"* (skill `setup-dev-env`).
>
> - **macOS**: `bash scripts/setup/mac.sh`
> - **Windows** (PowerShell): `powershell -ExecutionPolicy Bypass -File scripts\setup\windows.ps1`

```bash
npm install                # cài cho cả repo (một node_modules chung ở gốc)
npm run doctor             # kiểm tra Node, Java, Android SDK, Xcode, wrangler, eas…
npm run db:migrate:local   # tạo bảng trong D1 local
npm run dev                # web http://localhost:5173 + API http://localhost:8787
npm run mobile             # Expo: bấm i (iOS Simulator), a (Android Emulator) hoặc quét QR bằng Expo Go
```

App trên điện thoại/emulator tự gọi API ở máy đang chạy `npm run dev` (cùng Wi‑Fi), không cần cấu hình.

## Lệnh thường dùng (chạy ở thư mục gốc)

| Lệnh | Làm gì |
|---|---|
| `npm run dev` | Chạy API (wrangler, :8787) + web (Vite, :5173) cùng lúc |
| `npm run mobile` | Expo dev server cho app |
| `npm run typecheck` | Kiểm tra kiểu cả 4 gói |
| `npm run check` | typecheck + build web (chạy trước khi deploy) |
| `npm run lint` | ESLint cho app mobile |
| `npm run db:migrate:local` / `db:migrate:remote` | Áp migration D1 local / production |
| `npm run db:new -w @app/api -- <tên>` | Tạo file migration mới |
| `npm run init:project` | Đổi tên template thành dự án mới (tên app, bundle id, worker, D1…) |
| `npm run cf:setup` | Lần đầu: tạo D1 trên Cloudflare và ghi id vào `wrangler.jsonc` |
| `npm run deploy` | Build web → migrate D1 production → deploy Worker |
| `npm run build:apk` | Build APK Android để cài thử (EAS) |
| `npm run build:ios` | Build iOS production và gửi lên TestFlight (EAS) |
| `npm run build:android` | Build AAB production cho Google Play (EAS) |
| `npm run submit:ios` / `submit:android` | Gửi bản build mới nhất lên store |
| `npm run doctor` | Kiểm tra môi trường máy |

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/01-cai-dat-moi-truong.md](docs/01-cai-dat-moi-truong.md) | Cài môi trường Mac / Windows: Node, Git, Java 17, Android Studio, Xcode, wrangler, eas-cli |
| [docs/02-bat-dau-du-an-moi.md](docs/02-bat-dau-du-an-moi.md) | Tạo dự án mới từ template, chỗ để tài liệu, cách thêm một tính năng từ đầu đến cuối |
| [docs/03-deploy-cloudflare.md](docs/03-deploy-cloudflare.md) | Deploy Worker + D1, migration, secret, tên miền riêng, rollback |
| [docs/04-expo-eas-build.md](docs/04-expo-eas-build.md) | Expo Go, development build, EAS Build, EAS Update, phiên bản |
| [docs/05-app-store.md](docs/05-app-store.md) | Phát hành iOS: TestFlight, App Store Connect, nội dung cần điền, lý do bị từ chối |
| [docs/06-google-play.md](docs/06-google-play.md) | Phát hành Android: Play Console, closed testing, Data safety, tự động submit |
| [docs/07-checklist-phat-hanh.md](docs/07-checklist-phat-hanh.md) | Checklist trước khi phát hành |
| [docs/product/](docs/product/README.md) | **Bỏ tài liệu sản phẩm vào đây** (PRD, đặc tả, user stories) |
| [docs/design/](docs/design/README.md) | **Bỏ tài liệu thiết kế vào đây** (ảnh màn hình, Figma, màu, font, icon) |

## Skill cho Claude Code

Mở repo bằng Claude Code rồi nói tự nhiên, skill tương ứng tự chạy:

| Skill | Nói ví dụ |
|---|---|
| `setup-dev-env` | "cài môi trường cho máy Windows này", "kiểm tra máy đủ để chạy Expo chưa" |
| `init-project` | "tạo dự án mới tên Famiu từ template", "đọc tài liệu trong docs rồi lên kế hoạch" |
| `deploy-cloudflare` | "deploy lên Cloudflare", "thêm migration", "rollback worker" |
| `build-mobile` | "build APK cho mình cài thử", "đẩy bản mới lên TestFlight" |
| `store-release` | "soạn mô tả App Store", "chuẩn bị phát hành Google Play" |

## Kiến trúc trong 30 giây

- **Một Worker cho cả web và API, cùng một tên miền**: `/api/*` chạy code trong `apps/api/src`, mọi đường dẫn khác trả file tĩnh từ `apps/web/dist` (SPA). Không cần CORS, cookie đơn giản, một lệnh deploy.
- **App mobile** gọi cùng API qua `APP_INFO.webUrl` (`packages/shared/src/app-info.ts`), gửi header `X-App-Client: mobile` và nhận token thay vì cookie.
- **`packages/shared`** là hợp đồng giữa ba bên: thêm field ở đây thì TypeScript báo ngay chỗ nào ở web/app/API cần sửa.
- Khi dev: Vite (:5173) chuyển `/api` sang `wrangler dev` (:8787); app mobile gọi thẳng :8787 trên IP LAN của máy dev.

Xem [CLAUDE.md](CLAUDE.md) để biết quy ước code (dành cho cả người và AI).
