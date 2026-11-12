---
name: deploy-cloudflare
description: Deploy web + API (một Cloudflare Worker) và database D1 của repo này lên Cloudflare — lần đầu (wrangler login, npm run cf:setup, cập nhật APP_INFO.webUrl), deploy hằng ngày, migration D1, sao lưu, secret, tên miền riêng, xem log, rollback. Dùng khi người dùng nói "deploy", "deploy web", "deploy api", "deploy worker", "đẩy lên cloudflare", "lên production", "migration D1", "chạy migration", "rollback worker", "quay về bản trước", "thêm secret", "gắn tên miền", "xem log worker", hoặc hỏi production đang chạy bản nào. Không dùng cho build app iOS/Android (skill build-mobile).
---

# Deploy lên Cloudflare

Một Worker phục vụ cả web (`apps/web/dist`) và API (`/api/*`, `apps/api/src`) trên cùng địa chỉ, dữ liệu ở D1 (binding `DB`). Cấu hình: `apps/api/wrangler.jsonc`. Tài liệu đầy đủ cho người: `docs/03-deploy-cloudflare.md`. Lệnh `npx wrangler …` chạy trong `apps/api`; lệnh `npm run …` chạy ở gốc repo.

## Quy tắc

- **Thao tác production cần người dùng đồng ý rõ ràng trong cuộc trò chuyện này**: `npm run deploy`, `npm run db:migrate:remote`, `wrangler d1 execute --remote` có ghi, `wrangler secret put/delete`, `wrangler rollback`, `wrangler d1 time-travel restore`, bật/sửa `routes`. Trước khi chạy, nói rõ sẽ chạy lệnh gì, thay đổi gì (commit nào, migration nào), rủi ro gì, rồi chờ "ok". Đồng ý cho lần trước không áp dụng cho lần sau.
- Được tự chạy (chỉ đọc): `npx wrangler whoami`, `wrangler deployments list|status`, `wrangler d1 migrations list DB --remote`, `wrangler d1 list`, `npm run check`, `npm run deploy:dry -w @app/api`, `npm run cf:setup -- --dry-run`.
- Không in, không ghi giá trị secret vào file/chat/commit. Không sửa migration đã chạy trên production. Không đổi `name`/`database_name` trong `wrangler.jsonc` của dự án đã deploy (thành Worker/DB mới, dữ liệu nằm lại chỗ cũ).
- `wrangler login`, đăng ký subdomain `workers.dev`, thêm tên miền vào Cloudflare là việc người dùng tự làm trên trình duyệt/terminal. Hướng dẫn họ, đừng làm thay.

## Kiểm tra trước khi deploy

1. `cd apps/api && npx wrangler whoami`: đã đăng nhập chưa (chưa → bảo người dùng chạy `npx wrangler login`)? Nhiều tài khoản → `wrangler.jsonc` phải có `account_id` hoặc có `CLOUDFLARE_ACCOUNT_ID`; hỏi người dùng tài khoản nào, đừng đoán.
2. `apps/api/wrangler.jsonc`: `database_id` còn là `00000000-0000-0000-0000-000000000000` → chưa thiết lập, đi theo "Lần đầu".
3. `npm run check` (typecheck + build web) phải xanh. Lỗi thì sửa trước, không deploy.
4. `git status` / `git log`: code sắp deploy đã commit chưa, gồm những commit nào kể từ lần deploy trước. Chưa commit thì hỏi người dùng.
5. Migration chưa chạy: `cd apps/api && npx wrangler d1 migrations list DB --remote`. Đọc SQL từng file. Có `DROP`, đổi tên cột/bảng, hoặc thay đổi mà code bản cũ không chạy được → cảnh báo, đề xuất tách làm hai lần deploy (app mobile bản cũ vẫn gọi API).
6. Có migration đổi cấu trúc → **sao lưu trước** (sau khi người dùng đồng ý, vì export làm DB tạm ngừng phục vụ): `cd apps/api && mkdir -p backups && npx wrangler d1 export DB --remote --output backups/<YYYY-MM-DD>-truoc-<migration>.sql`. `backups/` đã gitignore, không commit.

## Lần đầu

1. Người dùng: `npx wrangler login`. Kiểm tra lại bằng `npx wrangler whoami`.
2. `npm run cf:setup -- --dry-run` để xem trước, rồi `npm run cf:setup` (thêm `--location apac` nếu người dùng chủ yếu ở Việt Nam/châu Á; `--account <id>` nếu nhiều tài khoản). Script tìm hoặc tạo D1 và ghi `database_id` vào `wrangler.jsonc`, không bao giờ tạo trùng.
3. Xin đồng ý → `npm run deploy` (build web → migrations apply --remote → wrangler deploy). Wrangler có thể hỏi đăng ký subdomain `workers.dev`: lệnh cần trả lời tương tác thì để người dùng tự chạy trong terminal (gõ `! npm run deploy` trong Claude Code).
4. Lấy địa chỉ `https://<worker>.<subdomain>.workers.dev` wrangler in ra → sửa `webUrl` trong `packages/shared/src/app-info.ts` → `npm run check` → xin đồng ý → `npm run deploy` lần nữa. Nhắc: phải làm trước khi build app phát hành.
5. Xác minh (dưới). Đề xuất commit `wrangler.jsonc` (database_id, account_id không phải bí mật) và `app-info.ts`.

## Hằng ngày

Kiểm tra trước → tóm tắt cho người dùng (commit nào, migration nào, có backup chưa) → xin đồng ý → `npm run deploy` → xác minh → báo kết quả (địa chỉ, version id từ `npx wrangler deployments list`).

- Chỉ áp migration: `npm run db:migrate:remote`.
- Tạo migration mới: `npm run db:new -w @app/api -- <tên>` → viết SQL → `npm run db:migrate:local` → thử local → mới deploy.

## Xác minh sau deploy

```bash
curl -sS https://<địa-chỉ>/api/health                                   # {"ok":true,"env":"production",...}
curl -sS -o /dev/null -w "%{http_code}\n" https://<địa-chỉ>/            # 200: web
curl -sS -o /dev/null -w "%{http_code}\n" https://<địa-chỉ>/api/me      # 401: đúng, vì chưa đăng nhập
cd apps/api && npx wrangler deployments list                             # version mới ở đầu danh sách
```

Xem lỗi thật: `npm run tail -w @app/api -- --status error --format pretty` (lệnh chạy mãi, đặt timeout khoảng 60 giây hoặc chạy nền rồi dừng). Có lỗi 5xx mới xuất hiện → báo người dùng, đề xuất rollback.

## Secret

- Giá trị secret không đi qua chat. Bảo người dùng tự chạy: `! cd apps/api && npx wrangler secret put <TÊN>` (wrangler hỏi giá trị, không hiện ra). Worker phải được deploy ít nhất một lần trước đó.
- Claude làm phần còn lại: khai báo kiểu trong `apps/api/src/lib/env.ts`, thêm dòng mẫu không có giá trị vào `apps/api/.dev.vars.example`, kiểm tra tên bằng `npx wrangler secret list`.

## Rollback

1. `cd apps/api && npx wrangler deployments list`: chọn version còn tốt (thường là bản ngay trước).
2. Xin đồng ý → `npx wrangler rollback <version-id> --message "<lý do>"` (không có id = về bản trước).
3. Xác minh `/api/health`. Báo người dùng: rollback chỉ đưa code + web về bản cũ, **không** hoàn tác D1.
4. Cần khôi phục dữ liệu: export sao lưu hiện trạng trước, rồi `npx wrangler d1 time-travel info DB --timestamp <RFC3339>` → (đồng ý riêng, nói rõ dữ liệu sau thời điểm đó sẽ mất) `npx wrangler d1 time-travel restore DB --timestamp <RFC3339>`.

## Tên miền riêng

Tên miền phải đã ở trong Cloudflare, cùng tài khoản (người dùng tự thêm). Bỏ comment `routes` trong `wrangler.jsonc` với `{ "pattern": "<tên-miền>", "custom_domain": true }` → xin đồng ý → `npm run deploy` → đổi `APP_INFO.webUrl` → deploy lại. Giữ `workers_dev: true` cho tới khi mọi bản app cũ đã chuyển sang tên miền mới.

## Lỗi thường gặp

| Lỗi | Xử lý |
|---|---|
| `More than one account available…` | Hỏi tài khoản → `npm run cf:setup -- --account <id>` (ghi `account_id`) |
| `database_id` toàn số 0 / không thấy database | `npm run cf:setup` |
| `Authentication error`, token hết hạn | Người dùng chạy `npx wrangler login` |
| Thư mục `../web/dist` không có | `npm run build` (hoặc dùng `npm run deploy` ở gốc) |
| Migration lỗi, deploy dừng | Migration lỗi đã được hoàn tác; sửa bằng migration **mới**, thử local, deploy lại |
| App mobile không kết nối được | `APP_INFO.webUrl` sai hoặc app build trước khi sửa: sửa, rồi build lại app (skill build-mobile) |
