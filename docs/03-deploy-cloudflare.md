# 03. Deploy lên Cloudflare (web + API + D1)

Toàn bộ phần server của app (web, API, database) chạy trên Cloudflare. Tài liệu này hướng dẫn deploy lần đầu, deploy hằng ngày, migration database, secret, tên miền riêng, xem log, rollback và tự động deploy bằng GitHub Actions.

Tóm tắt:

| Việc | Lệnh (ở thư mục gốc repo) |
|---|---|
| Đăng nhập Cloudflare (mỗi máy một lần) | `npx wrangler login` |
| Tạo database D1 lần đầu | `npm run cf:setup` |
| Deploy (web + API + migration) | `npm run deploy` |
| Tạo migration mới | `npm run db:new -w @app/api -- <tên>` |
| Áp migration lên production | `npm run db:migrate:remote` (đã nằm trong `npm run deploy`) |
| Đặt secret | `cd apps/api && npx wrangler secret put <TÊN>` |
| Xem log trực tiếp | `npm run tail -w @app/api` |
| Quay về bản trước | `cd apps/api && npx wrangler rollback` |

> Dùng Claude Code? Nói *"deploy lên Cloudflare"*, *"thêm migration"*, *"rollback worker"*: skill `deploy-cloudflare` làm theo tài liệu này và luôn hỏi bạn trước khi đụng vào production.

Các lệnh `npx wrangler …` trong tài liệu này chạy **trong thư mục `apps/api`** (nơi có `wrangler.jsonc`), trừ khi ghi khác.

---

## 1. Kiến trúc

```
                    https://<worker>.<subdomain>.workers.dev  (hoặc tên miền riêng)
                                         │
                          ┌──────────────┴──────────────┐
                          │   Cloudflare Worker (1 cái)  │
   Trình duyệt ──────────▶│  /api/*  → code Hono         │──▶ D1 (SQLite): binding DB
   App iOS / Android ────▶│            apps/api/src      │
                          │  còn lại → file tĩnh web     │
                          │            apps/web/dist     │
                          │  cron 17:00 UTC → dọn dẹp    │
                          └─────────────────────────────┘
```

- **Một Worker phục vụ cả web và API trên cùng một địa chỉ.** Đường dẫn `/api/*` chạy code trong `apps/api/src` (Hono); mọi đường dẫn khác trả file trong `apps/web/dist` (bản build React), đường dẫn lạ trả `index.html` (SPA). Không cần CORS, cookie đăng nhập hoạt động ngay. Cấu hình ở khối `assets` trong `apps/api/wrangler.jsonc`.
- **D1** là database SQLite của Cloudflare. Worker dùng qua binding `DB`; tên database là `database_name` trong `wrangler.jsonc` (template: `freedom-app-db`, sau `init:project`: `<slug>-db`). Bảng tạo bằng migration trong `apps/api/migrations/`.
- **Cron** `0 17 * * *` (17:00 UTC = 00:00 giờ Việt Nam) xoá phiên đăng nhập hết hạn và bộ đếm chống dò mật khẩu cũ (hàm `scheduled` trong `apps/api/src/index.ts`).
- **App mobile** gọi API qua `APP_INFO.webUrl` (`packages/shared/src/app-info.ts`), nên địa chỉ này phải là địa chỉ production thật trước khi build app phát hành.
- **Observability** đã bật: log của Worker xem được trên dashboard Cloudflare.

## 2. Deploy lần đầu

Cần: tài khoản Cloudflare (gói Free là đủ để bắt đầu) và repo đã chạy `npm install`, `npm run init:project`.

### Bước 1. Đăng nhập

```bash
npx wrangler login      # mở trình duyệt, bấm Allow
npx wrangler whoami     # kiểm tra: email và các tài khoản (account) thấy được
```

Thấy **nhiều tài khoản**? Đọc [mục 7](#7-nhiều-tài-khoản-cloudflare) trước khi đi tiếp, để không tạo database nhầm tài khoản.

### Bước 2. Tạo database D1

```bash
npm run cf:setup
```

Script `scripts/cloudflare-setup.mjs` sẽ:

1. Kiểm tra đã đăng nhập (`wrangler whoami`), dừng lại nếu đăng nhập thấy nhiều tài khoản mà chưa chọn.
2. Đọc `database_name` trong `apps/api/wrangler.jsonc`.
3. Nếu `database_id` vẫn là `00000000-0000-0000-0000-000000000000`: tìm database cùng tên (`wrangler d1 list`), chưa có thì tạo (`wrangler d1 create`).
4. Ghi `database_id` thật vào `wrangler.jsonc` (giữ nguyên comment). Commit thay đổi này: id database không phải bí mật.

Tham số hay dùng:

```bash
npm run cf:setup -- --dry-run                 # chỉ in các lệnh sẽ chạy
npm run cf:setup -- --location apac           # đặt database ở châu Á - Thái Bình Dương (gần người dùng Việt Nam)
npm run cf:setup -- --account <account-id>    # chọn tài khoản khi đăng nhập thấy nhiều tài khoản
```

Chạy lại nhiều lần cũng an toàn: database đã có thì dùng lại, không tạo thêm.

### Bước 3. Deploy

```bash
npm run deploy
```

Lệnh này làm 3 việc theo thứ tự, việc nào lỗi thì dừng:

1. `npm run build` → build web ra `apps/web/dist`.
2. `wrangler d1 migrations apply DB --remote` → tạo/cập nhật bảng trên D1 production.
3. `wrangler deploy` → đưa Worker (code API + file web) lên Cloudflare.

Lần đầu trên một tài khoản mới, wrangler có thể hỏi bạn đăng ký **subdomain `workers.dev`** (ví dụ `freedombuilders`). Chọn một tên, đây là phần giữa trong địa chỉ của mọi Worker trong tài khoản.

Cuối cùng wrangler in địa chỉ, dạng `https://<worker>.<subdomain>.workers.dev`.

### Bước 4. Cập nhật `APP_INFO.webUrl` rồi deploy lại

Mở `packages/shared/src/app-info.ts`, đặt `webUrl` thành địa chỉ vừa in ra (không có `/` ở cuối), hoặc tên miền riêng nếu đã gắn ([mục 6](#6-tên-miền-riêng)):

```ts
webUrl: "https://hoc-toan-vui.freedombuilders.workers.dev",
```

```bash
npm run check && npm run deploy
```

Làm việc này **trước khi build app phát hành**: app đã build gọi API theo địa chỉ lúc build.

### Bước 5. Kiểm tra

```bash
curl https://<địa-chỉ>/api/health
# {"ok":true,"env":"production","time":"2026-…"}
```

Mở địa chỉ đó trên trình duyệt, đăng ký một tài khoản, thử thêm ghi chú. Mở `/privacy`, `/support`: đây là các trang store sẽ hỏi.

## 3. Deploy hằng ngày

```bash
git pull
npm run check       # typecheck + build web: lỗi thì sửa trước
npm run deploy
curl https://<địa-chỉ>/api/health
```

- Migration mới (nếu có) được áp **trước** khi code mới lên. Vì vậy migration nên **tương thích ngược**: thêm bảng, thêm cột có giá trị mặc định thì an toàn; xoá hoặc đổi tên cột thì chia làm hai lần deploy ([mục 4](#4-migration-database-d1)).
- Mỗi lần deploy tạo một **phiên bản** (version) mới của Worker; bản cũ vẫn giữ để rollback ([mục 9](#9-rollback)).
- Chỉ muốn kiểm tra cấu hình mà không đưa lên: `npm run build && npm run deploy:dry -w @app/api`.

## 4. Migration (database D1)

Mỗi thay đổi cấu trúc database là một file SQL đánh số trong `apps/api/migrations/`. Wrangler ghi nhớ file nào đã chạy (bảng `d1_migrations`), mỗi file chỉ chạy một lần.

**Tạo và thử ở máy mình:**

```bash
npm run db:new -w @app/api -- add_tasks     # tạo apps/api/migrations/000N_add_tasks.sql, rồi viết SQL vào đó
npm run db:migrate:local                    # áp vào D1 local (dùng khi npm run dev)
```

**Xem migration nào chưa chạy trên production** (trong `apps/api`):

```bash
npx wrangler d1 migrations list DB --remote
```

**Áp lên production:** `npm run deploy` (tự áp) hoặc chỉ áp migration: `npm run db:migrate:remote`.

Quy tắc:

- **Không bao giờ sửa một migration đã chạy trên production.** Sửa sai bằng một migration mới.
- Bảng thuộc về người dùng luôn có `REFERENCES users(id) ON DELETE CASCADE`, để chức năng xoá tài khoản xoá sạch dữ liệu.
- **Thay đổi phá huỷ** (xoá bảng, xoá/đổi tên cột) làm hai bước: (1) deploy code không còn dùng cột/bảng cũ, (2) lần deploy sau mới xoá. Người dùng app mobile không cập nhật ngay, bản app cũ vẫn gọi API một thời gian.
- SQLite chỉ hỗ trợ một phần `ALTER TABLE`. Thay đổi lớn (đổi kiểu cột, thêm ràng buộc) thì tạo bảng mới, chép dữ liệu sang, xoá bảng cũ, đổi tên bảng mới.
- Nếu một migration lỗi giữa chừng, wrangler hoàn tác migration đó; `npm run deploy` dừng lại, code mới không được đưa lên.

**Sao lưu trước khi đổi cấu trúc** (trong `apps/api`):

```bash
mkdir -p backups
npx wrangler d1 export DB --remote --output backups/2026-11-13-truoc-0002.sql
```

`DB` là tên binding; dùng tên database cũng được (`npx wrangler d1 export freedom-app-db --remote --output …`, sau `init:project` là `<slug>-db`). Trong lúc export, database tạm thời không phục vụ truy vấn, nên chạy lúc ít người dùng. Thư mục `backups/` đã nằm trong `.gitignore`: file sao lưu chứa dữ liệu người dùng, **không commit**, cất ở nơi an toàn.

Ngoài ra D1 có **Time Travel**: khôi phục database về một thời điểm trong quá khứ (xem giới hạn số ngày trong `npx wrangler d1 time-travel restore --help`):

```bash
npx wrangler d1 time-travel info DB --timestamp 2026-11-13T08:00:00Z      # xem trước
npx wrangler d1 time-travel restore DB --timestamp 2026-11-13T08:00:00Z   # KHÔI PHỤC: ghi đè dữ liệu hiện tại
```

Truy vấn nhanh trên production (cẩn thận với lệnh ghi):

```bash
npx wrangler d1 execute DB --remote --command "SELECT COUNT(*) AS users FROM users"
```

## 5. Secret và biến môi trường

| Loại | Đặt ở đâu | Ví dụ |
|---|---|---|
| Giá trị không bí mật | `"vars"` trong `apps/api/wrangler.jsonc` | `APP_ENV` |
| Secret trên production | `npx wrangler secret put <TÊN>` (trong `apps/api`) | khoá API gửi email |
| Secret khi chạy local | `apps/api/.dev.vars` (chép từ `.dev.vars.example`; đã nằm trong `.gitignore`) | `RESEND_API_KEY=re_…` |

```bash
cd apps/api
npx wrangler secret put RESEND_API_KEY     # wrangler hỏi giá trị, gõ/dán vào (không hiện trên màn hình)
npx wrangler secret list                   # xem tên các secret (không xem được giá trị)
npx wrangler secret delete RESEND_API_KEY
```

- Secret có hiệu lực ngay trên Worker đang chạy, không cần deploy lại. Đặt secret **sau** lần deploy đầu (khi Worker đã tồn tại).
- Không bao giờ ghi secret vào `wrangler.jsonc`, code, hay gửi qua chat.
- Thêm secret/biến mới thì khai báo kiểu trong `apps/api/src/lib/env.ts` và thêm dòng mẫu (không có giá trị thật) vào `apps/api/.dev.vars.example`.

## 6. Tên miền riêng

1. Đưa tên miền vào Cloudflare (Dashboard → **Add a domain**, đổi nameserver ở nơi mua tên miền theo hướng dẫn). Tên miền phải nằm **trong cùng tài khoản** với Worker.
2. Trong `apps/api/wrangler.jsonc`, bỏ comment khối `routes` và sửa thành tên miền của bạn:

   ```jsonc
   "routes": [
     { "pattern": "hoctoanvui.vn", "custom_domain": true }
   ],
   ```

   Một Worker đã phục vụ cả web và API nên thường chỉ cần tên miền chính. Dòng `api.<tên-miền>` trong ví dụ chỉ cần khi bạn muốn API có địa chỉ riêng.
3. `npm run deploy`. Cloudflare tự tạo bản ghi DNS và chứng chỉ HTTPS (có thể mất vài phút). Nếu tên miền đã có bản ghi DNS trỏ đi nơi khác, xoá bản ghi đó trước.
4. Đổi `APP_INFO.webUrl` thành `https://hoctoanvui.vn`, rồi `npm run deploy` lần nữa. Các bản app build sau sẽ gọi tên miền mới.
5. Giữ `"workers_dev": true` (địa chỉ `*.workers.dev` vẫn chạy) cho đến khi mọi bản app đang có trên điện thoại người dùng đều đã dùng tên miền mới.

## 7. Nhiều tài khoản Cloudflare

Khi `npx wrangler whoami` liệt kê nhiều tài khoản, wrangler cần biết dùng tài khoản nào. Hai cách:

- **Ghi vào cấu hình (nên dùng cho mỗi dự án):** bỏ comment dòng `"account_id"` trong `apps/api/wrangler.jsonc` và điền id (lấy từ `npx wrangler whoami`), hoặc để script ghi giúp: `npm run cf:setup -- --account <account-id>`. Account ID không phải bí mật, commit được.
- **Biến môi trường** `CLOUDFLARE_ACCOUNT_ID` (phải đặt mỗi khi chạy wrangler, kể cả `npm run deploy`):

  ```bash
  export CLOUDFLARE_ACCOUNT_ID=<account-id>        # macOS / Linux
  $env:CLOUDFLARE_ACCOUNT_ID="<account-id>"        # Windows PowerShell
  ```

Nếu cả hai cùng có, `account_id` trong `wrangler.jsonc` được ưu tiên. Đổi sang người dùng Cloudflare khác: `npx wrangler logout` rồi `npx wrangler login`.

## 8. Xem log và theo dõi

```bash
npm run tail -w @app/api                           # log trực tiếp (console.log, lỗi) của Worker production; Ctrl+C để thoát
npm run tail -w @app/api -- --status error         # chỉ request lỗi
npm run tail -w @app/api -- --format pretty
```

Trên dashboard Cloudflare: **Workers & Pages** → chọn Worker → **Logs** (lưu lại log nhờ `observability` đã bật), **Metrics** (số request, lỗi, thời gian CPU), **Settings → Triggers** (cron). Database: **Storage & Databases → D1**.

Bản nào đang chạy:

```bash
npx wrangler deployments list      # 10 lần deploy gần nhất (version id, thời gian, người deploy)
npx wrangler deployments status    # phiên bản đang nhận traffic
```

## 9. Rollback

Bản mới bị lỗi? Đưa Worker về phiên bản trước (trong `apps/api`):

```bash
npx wrangler deployments list                                     # tìm version id của bản còn tốt
npx wrangler rollback                                             # về bản ngay trước đó
npx wrangler rollback <version-id> --message "Lỗi đăng nhập ở bản mới"   # hoặc về một bản cụ thể
curl https://<địa-chỉ>/api/health
```

- Rollback đưa **code API và bản web** về phiên bản cũ (file web đi cùng phiên bản Worker). Rollback **không** đụng tới **dữ liệu D1** hay migration đã chạy.
- Vì vậy migration nên tương thích ngược ([mục 4](#4-migration-database-d1)): code cũ vẫn chạy được trên database đã có thêm bảng/cột mới.
- Cần khôi phục cả dữ liệu: dùng Time Travel hoặc file sao lưu ở [mục 4](#4-migration-database-d1). Đây là thao tác ghi đè, cân nhắc kỹ.
- Sau khi rollback, sửa lỗi rồi deploy bản mới như bình thường.

## 10. Chi phí

- **Workers gói Free**: 100.000 request mỗi ngày, đủ cho giai đoạn phát triển và thử nghiệm. Khi app có người dùng thật, nâng lên **Workers Paid** để có hạn mức lớn hơn và không bị chặn khi vượt giới hạn.
- **D1** có hạn mức miễn phí theo số dòng đọc/ghi và dung lượng lưu trữ; vượt mức thì tính theo lượng dùng (gói Paid).
- Giá và hạn mức thay đổi theo thời gian, xem trang giá Cloudflare: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/).
- Theo dõi lượng dùng trên dashboard (**Workers & Pages** → Worker → **Metrics**; **D1** → database → **Metrics**). Có thể đặt cảnh báo trong **Notifications**.

## 11. Tự động deploy bằng GitHub Actions (tuỳ chọn)

Khi cả nhóm cùng làm, có thể để GitHub tự deploy. Ví dụ dưới đây chạy khi bấm tay (**Run workflow**) và có thể bật thêm khi push vào `main`.

1. Tạo API token: Cloudflare Dashboard → **My Profile → API Tokens → Create Token** → template **Edit Cloudflare Workers**, thêm quyền **Account → D1 → Edit**, giới hạn đúng tài khoản.
2. Trong repo GitHub: **Settings → Secrets and variables → Actions** → thêm `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID`.
3. (Nên làm) **Settings → Environments** → tạo `production`, bật **Required reviewers** để mỗi lần deploy cần một người duyệt.
4. Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy Cloudflare
on:
  workflow_dispatch: # bấm tay trong tab Actions
  # push:
  #   branches: [main]   # bỏ comment để tự deploy mỗi khi push vào main

concurrency: deploy-production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run check # typecheck + build web (apps/web/dist)
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: |
            d1 migrations apply DB --remote
            deploy
```

Trong CI, `d1 migrations apply` không hỏi xác nhận. Sao lưu D1 trước những lần deploy có migration phá huỷ vẫn là việc nên làm bằng tay.

## 12. Lỗi thường gặp

| Thông báo | Cách xử lý |
|---|---|
| `More than one account available but unable to select one…` | Chọn tài khoản: [mục 7](#7-nhiều-tài-khoản-cloudflare) |
| `database_id` là `00000000-…` / lỗi không tìm thấy database | Chưa chạy `npm run cf:setup` (hoặc chạy nhầm tài khoản) |
| `Authentication error` / token hết hạn | `npx wrangler login` lại |
| Lỗi thư mục `../web/dist` không tồn tại | Chạy `npm run build` trước (`npm run deploy` ở gốc đã làm sẵn) |
| Migration lỗi, deploy dừng | Đọc lỗi SQL, sửa bằng **migration mới** (migration lỗi đã được hoàn tác), deploy lại |
| App mobile báo không kết nối được máy chủ | `APP_INFO.webUrl` sai hoặc app được build trước khi sửa `webUrl`: sửa rồi build lại app |
| Tên miền riêng không lên | Tên miền chưa vào Cloudflare, khác tài khoản, hoặc còn bản ghi DNS cũ trùng tên |
