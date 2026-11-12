---
name: init-project
description: Tạo sản phẩm mới từ template Freedombuiders/freedom_mobile_app_template và dẫn tới bản MVP — tạo repo GitHub từ template, chạy npm run init:project (tên app, slug, bundle id, tên miền, email hỗ trợ), đọc docs/product + docs/design, đề xuất kế hoạch (dữ liệu → API → màn hình) rồi làm từng tính năng, typecheck sau mỗi tính năng. Dùng khi người dùng nói "dự án mới", "app mới", "tạo app mới từ template", "khởi tạo dự án", "new project from template", "init project", "đổi tên app", "bắt đầu sản phẩm mới", "đọc tài liệu rồi lên kế hoạch", hoặc vừa bỏ tài liệu vào docs/product, docs/design và muốn bắt đầu làm.
---

# Khởi tạo dự án mới từ template

Template: `Freedombuiders/freedom_mobile_app_template` (Expo app + React web + Cloudflare Worker/D1, npm workspaces). Tài liệu cho người: `docs/02-bat-dau-du-an-moi.md`. Quy ước code: `AGENTS.md`.

## 0. Đang ở đâu?

- Đọc `apps/mobile/app.json`: `expo.slug` là `freedom-app` → repo vẫn là template chưa khởi tạo. Khác → dự án đã khởi tạo, bỏ qua bước 1–3 (trừ khi người dùng muốn đổi tên, xem cuối file).
- Nếu đang mở chính repo template (remote `Freedombuiders/freedom_mobile_app_template`) thì **không** chạy `init:project` ở đây; tạo repo mới trước (bước 2).

## 1. Hỏi thông tin (một lần, gom vào một câu hỏi)

Tên app (hiển thị) · tên repo GitHub (gợi ý: slug) · private hay public (mặc định private) · tên miền nếu đã có · email hỗ trợ · người/công ty vận hành (trùng tên người bán trên store) · tagline một câu · bundle ID (gợi ý `com.freedombuilders.<tên-không-gạch>`).

Nhắc người dùng: **bundle ID không đổi được sau khi app lên store**; slug là tên Worker và database D1, đổi sau khi deploy là thành Worker/DB mới.

## 2. Tạo repo từ template (tạo repo trên GitHub: xin đồng ý trước)

```bash
gh auth status
gh repo create Freedombuiders/<repo> --template Freedombuiders/freedom_mobile_app_template --private --clone
```

- Clone vào thư mục cạnh repo hiện tại (không lồng vào trong). Thư mục trống → chờ vài giây rồi `git pull origin main`.
- Không có `gh` / chưa đăng nhập → hướng dẫn người dùng bấm **Use this template** trên GitHub rồi clone.
- Sau đó làm việc trong thư mục mới (đường dẫn tuyệt đối), hoặc đề nghị người dùng mở Claude Code ở thư mục đó.

## 3. Khởi tạo

```bash
npm install
npm run init:project -- --name "<Tên>" --slug <slug> --bundle-id <bundle> --domain <tên-miền> \
  --support-email <email> --operator "<Đơn vị>" --tagline "<Tagline>" --dry-run --yes   # xem trước
npm run init:project -- <cùng tham số, bỏ --dry-run> --yes
```

- Bỏ `--domain` nếu chưa có tên miền (webUrl tạm là `https://<slug>.example.com`, sửa sau lần deploy đầu).
- Script báo "đã khởi tạo rồi" → dừng, hỏi người dùng trước khi dùng `--force`.
- Đọc phần "Tệp vẫn nhắc tên cũ" script in ra: sửa `README.md` cho sản phẩm mới; tài liệu trong `docs/0*.md` là hướng dẫn chung, giữ nguyên.
- Kiểm tra: `npm run check` và `npm run db:migrate:local`. Đề xuất commit `chore: khởi tạo <Tên>` (commit khi người dùng đồng ý).
- **Không** tự chạy `npm run cf:setup`, `npm run deploy`, `npm run eas:init -w @app/mobile`: đó là việc của skill `deploy-cloudflare` / `build-mobile`, cần người dùng đồng ý.

## 4. Đọc tài liệu

- Đọc hết `docs/product/` và `docs/design/` (cả ảnh màn hình, PDF). Bỏ qua các `README.md` hướng dẫn trong đó.
- Trống hoặc quá sơ sài → hỏi ngắn (mục tiêu, người dùng, 3–5 chức năng chính, dữ liệu cần lưu, có thu tiền/có trẻ em dùng không), viết nháp `docs/product/PRD.md` cho người dùng duyệt.
- Tóm tắt lại cho người dùng: sản phẩm (≤5 dòng), vai trò người dùng, chức năng MVP, ngoài phạm vi, **câu hỏi còn mơ hồ**.

## 5. Kế hoạch (chờ duyệt rồi mới code)

1. **Dữ liệu**: các bảng (cột, kiểu, quan hệ, index). Bảng của người dùng có `user_id … REFERENCES users(id) ON DELETE CASCADE`.
2. **API**: mỗi endpoint: method + path, cần đăng nhập không, schema request, kiểu response, quy tắc nghiệp vụ kiểm ở server.
3. **Màn hình**: trang web (route) và màn hình app (tab/stack), ghép với ảnh trong `docs/design/`.
4. **Thương hiệu**: màu/font từ thiết kế → `apps/web/src/styles.css` (`@theme`) + `apps/mobile/src/lib/theme.ts`; icon/splash nếu đã có file.
5. **Thứ tự**: chia theo tính năng dọc (mỗi tính năng đủ 5 tầng), cái nhỏ và nền tảng trước. Ghi rõ khi nào bỏ ví dụ "Ghi chú".

## 6. Làm từng tính năng

Mỗi tính năng theo mẫu `notes` (chi tiết: `AGENTS.md`, `docs/02-bat-dau-du-an-moi.md` mục 4):

1. Migration: `npm run db:new -w @app/api -- <tên>` → SQL → `npm run db:migrate:local`.
2. `packages/shared/src/api.ts` (kiểu response) + `schemas.ts` (zod; schema PATCH không có default).
3. `apps/api/src/routes/<tên>.ts` (chép `notes.ts`), mount sau `requireUser` trong `src/index.ts`; mọi câu SQL lọc `user_id`.
4. Web: `apps/web/src/pages/<Tên>.tsx` + route `src/router.tsx` + link menu `src/components/Layout.tsx`.
5. App: `apps/mobile/src/app/(app)/<tên>.tsx` (+ `NativeTabs.Trigger` trong `(app)/_layout.tsx` nếu là tab). Thư viện native: `npx expo install` trong `apps/mobile`.

Sau **mỗi** tính năng: `npm run typecheck` (rồi `npm run lint`, `npm run build`) phải xanh; thử API bằng `npm run dev` + curl; báo ngắn gọn đã làm gì, cách thử, còn gì dở. Chữ hiển thị tiếng Việt, code/comment/tên biến tiếng Anh, đường dẫn URL tiếng Anh.

Bỏ ví dụ "Ghi chú" khi màn hình chính thật đã có: chưa deploy production → sửa thẳng `0001_init.sql` và làm lại D1 local (xoá `apps/api/.wrangler`, `npm run db:migrate:local`); đã deploy → migration mới `DROP TABLE notes;`.

## 7. Trước khi bàn giao

`packages/shared/src/app-info.ts` (email, webUrl thật), nội dung `apps/web/src/pages/legal/*`, icon/splash (`apps/mobile/assets/images/*`, `apps/web/public/*`), `README.md`. Bước tiếp: skill `deploy-cloudflare` → `build-mobile` → `store-release`.

## Chỉ đổi tên app (dự án đã khởi tạo)

- Chỉ đổi tên hiển thị (và/hoặc tagline, email, tên miền): `npm run init:project -- --force --name "<Tên mới>" --yes`. Với `--force`, slug, scheme, bundle ID mặc định **giữ nguyên** giá trị hiện tại; `database_id` và `webUrl` *.workers.dev cũng được giữ, dữ liệu không ảnh hưởng. Chạy `--dry-run` trước để người dùng xem.
- Đổi slug (`--slug`) hoặc bundle ID (`--bundle-id`) sau khi đã deploy hoặc đã lên store: cảnh báo rõ hậu quả (slug mới = Worker mới + D1 mới trống, `database_id` bị đặt lại; bundle ID mới = app mới trên store) và chỉ làm khi người dùng xác nhận.
