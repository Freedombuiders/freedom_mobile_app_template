# 02. Bắt đầu một sản phẩm mới từ template

Template này là khung chung cho mọi app của Freedom Builders. Mỗi sản phẩm mới là **một repo riêng** tạo từ template, rồi đổi tên và phát triển tiếp.

Tóm tắt:

1. Tạo repo từ template (GitHub "Use this template" hoặc `gh repo create … --template …`).
2. `npm install` → `npm run init:project` (đổi tên app, slug, bundle id, tên miền…).
3. Bỏ tài liệu sản phẩm vào `docs/product/`, tài liệu thiết kế vào `docs/design/`.
4. Nhờ Claude Code đọc tài liệu, lên kế hoạch, rồi làm từng tính năng theo mẫu "Ghi chú" có sẵn.
5. Đổi icon, splash, màu thương hiệu, nội dung trang pháp lý.
6. Deploy (xem [03-deploy-cloudflare.md](03-deploy-cloudflare.md)) và build app (xem [04-expo-eas-build.md](04-expo-eas-build.md)).

> Dùng Claude Code? Nói *"tạo app mới từ template tên ___"*: skill `init-project` sẽ làm các bước dưới đây và hỏi bạn những chỗ cần quyết định.

---

## 1. Tạo repo từ template

Repo `Freedombuiders/freedom_mobile_app_template` được đánh dấu là **template repository**, nên repo mới có đủ file nhưng **không mang theo lịch sử commit** của template.

**Cách 1: trên GitHub**

1. Mở <https://github.com/Freedombuiders/freedom_mobile_app_template>.
2. Bấm **Use this template** → **Create a new repository**.
3. Owner: `Freedombuiders`. Repository name: tên sản phẩm, chữ thường, gạch ngang (ví dụ `hoc-toan-vui`). Chọn **Private**.
4. Bấm **Create repository**, rồi clone về máy:

```bash
git clone https://github.com/Freedombuiders/hoc-toan-vui.git
cd hoc-toan-vui
```

**Cách 2: bằng GitHub CLI** (cần `gh auth login` một lần)

```bash
gh repo create Freedombuiders/hoc-toan-vui --template Freedombuiders/freedom_mobile_app_template --private --clone
cd hoc-toan-vui
```

> Nếu thư mục vừa clone còn trống (GitHub chưa kịp chép xong file từ template), chờ vài giây rồi chạy `git pull origin main`.

## 2. Cài đặt và khởi tạo

```bash
npm install
npm run init:project
```

`init:project` hỏi vài câu (Enter để nhận giá trị gợi ý trong ngoặc):

| Câu hỏi | Ví dụ | Dùng ở đâu |
|---|---|---|
| Tên app | `Học Toán Vui` | Tên dưới icon trên điện thoại, tiêu đề web, `APP_INFO.name` |
| Slug | `hoc-toan-vui` (tự suy ra từ tên, bỏ dấu) | Tên Worker Cloudflare (`hoc-toan-vui.<subdomain>.workers.dev`), Expo slug, tên database D1 `hoc-toan-vui-db`, tên gói npm |
| Bundle ID | `com.freedombuilders.hoctoanvui` | iOS `bundleIdentifier` và Android `package` |
| Tên miền | `hoctoanvui.vn` (để trống nếu chưa có) | `APP_INFO.webUrl`, ví dụ `routes` trong `wrangler.jsonc` |
| Email hỗ trợ | `support@hoctoanvui.vn` | Trang Support, App Store, Google Play |
| Đơn vị vận hành | `Công ty ABC` | Chính sách bảo mật, điều khoản (nên trùng tên người bán trên store) |
| Tagline | một câu mô tả | Landing page, thẻ meta của web |

Không muốn trả lời từng câu? Truyền hết bằng tham số:

```bash
npm run init:project -- --name "Học Toán Vui" --domain hoctoanvui.vn --support-email support@hoctoanvui.vn \
  --operator "Công ty ABC" --tagline "Luyện toán mỗi ngày 10 phút" --yes
```

Thêm `--dry-run` để xem trước mà không ghi gì. `npm run init:project -- --help` liệt kê đủ tham số (`--slug`, `--scheme`, `--bundle-id`…).

**Script sửa các tệp:** `apps/mobile/app.json` (tên, slug, scheme, bundle id; xoá `owner` và `extra.eas.projectId` cũ vì app mới cần project EAS mới), `apps/api/wrangler.jsonc` (tên Worker, tên D1, đặt `database_id` về `00000000-…`), `packages/shared/src/app-info.ts` (mọi trường), `apps/web/index.html` (title, description, Open Graph), `package.json` (tên). Cuối cùng nó in danh sách tệp còn nhắc tên cũ (thường là tài liệu) và các bước tiếp theo.

Chạy lần hai, script sẽ báo "đã khởi tạo rồi" và không làm gì. Muốn đổi tên lần nữa thì thêm `--force` (ví dụ `npm run init:project -- --force --name "Tên mới" --yes`): khi đó slug và bundle ID **giữ nguyên** trừ khi bạn truyền `--slug` / `--bundle-id`.

> **Chọn bundle ID cho kỹ.** Sau khi app đã lên App Store / Google Play, bundle ID không đổi được nữa (đổi là thành app khác). Slug cũng vậy với Cloudflare: đổi slug sau khi deploy nghĩa là Worker mới và database D1 mới (dữ liệu cũ nằm lại database cũ).

Sau đó kiểm tra mọi thứ còn chạy, rồi commit:

```bash
npm run doctor              # máy đủ công cụ chưa
npm run db:migrate:local    # tạo bảng trong D1 local
npm run dev                 # web http://localhost:5173 + API http://localhost:8787
npm run mobile              # app: bấm i / a hoặc quét QR bằng Expo Go
npm run check               # typecheck + build web

git add -A && git commit -m "chore: khởi tạo Học Toán Vui"
```

Hai việc làm sau, khi cần:

- **Cloudflare** (khi muốn đưa web/API lên mạng): `npx wrangler login` → `npm run cf:setup` → `npm run deploy`. Xem [03-deploy-cloudflare.md](03-deploy-cloudflare.md).
- **EAS** (khi muốn build app): `npm run eas:init -w @app/mobile` (tức `npx eas-cli init`) tạo project EAS mới và ghi `projectId` vào `app.json`. Xem [04-expo-eas-build.md](04-expo-eas-build.md).

## 3. Bỏ tài liệu vào đúng chỗ

Claude Code làm tốt nhất khi có tài liệu rõ ràng. Hai thư mục đã có sẵn, mỗi thư mục có `README.md` gợi ý nên để gì:

| Thư mục | Bỏ vào | Ví dụ |
|---|---|---|
| [`docs/product/`](product/README.md) | **App làm gì**: PRD, spec phần mềm, user stories, quy tắc nghiệp vụ, dữ liệu | `PRD.md`, `chuc-nang.md`, `du-lieu.md`, `quy-tac-nghiep-vu.md` |
| [`docs/design/`](design/README.md) | **App trông thế nào**: link Figma, ảnh chụp/xuất từng màn hình, design tokens (màu, font, bo góc), icon | `figma.md`, `screens/01-dang-nhap.png`, `tokens.md`, `icon-1024.png` |

Mẹo:

- Định dạng `.md` là tốt nhất; `.pdf`, `.docx`, ảnh `.png/.jpg` Claude cũng đọc được.
- Ảnh màn hình đánh số theo luồng (`01-…`, `02-…`) và đặt tên theo màn hình giúp Claude ghép đúng màn hình với tính năng.
- Figma: Claude không tự mở được link Figma riêng tư. Xuất ảnh từng frame vào `docs/design/screens/`, ghi mã màu/font vào `tokens.md`.
- Ghi rõ những gì **chưa làm** ở bản đầu (MVP), để Claude không làm thừa.

Rồi mở Claude Code ở thư mục repo và nhờ, ví dụ:

```text
Đọc toàn bộ docs/product và docs/design (cả ảnh). Tóm tắt sản phẩm trong 5 dòng, liệt kê:
1) các bảng dữ liệu (cột, quan hệ), 2) các API cần có, 3) các trang web và màn hình app,
4) màu/font lấy từ thiết kế, 5) những điểm tài liệu còn mơ hồ cần mình trả lời.
Sau đó đề xuất kế hoạch làm bản MVP theo từng tính năng, mỗi tính năng đi đủ
migration → shared → API → web → app, theo mẫu "notes" có sẵn. Chờ mình duyệt rồi mới code.
```

Sau khi duyệt kế hoạch:

```text
Làm tính năng 1 theo kế hoạch. Xong thì chạy npm run typecheck, npm run lint, npm run build,
áp migration local và thử API bằng curl, rồi báo lại cho mình trước khi sang tính năng tiếp theo.
```

## 4. Thêm một tính năng từ đầu đến cuối

Template có sẵn một tính năng mẫu hoàn chỉnh là **Ghi chú** (notes). Mỗi tính năng mới đi qua 5 chỗ, theo đúng thứ tự (dữ liệu trước, giao diện sau). Ví dụ dưới đây thêm tính năng **Nhiệm vụ** (`tasks`).

| Bước | Tệp mẫu để chép | Tệp mới |
|---|---|---|
| 1. Migration | `apps/api/migrations/0001_init.sql` (bảng `notes`) | `apps/api/migrations/0002_tasks.sql` |
| 2. Kiểu + schema dùng chung | `packages/shared/src/api.ts` (`Note`), `schemas.ts` (`noteInputSchema`) | thêm `Task`, `taskInputSchema` |
| 3. API | `apps/api/src/routes/notes.ts` | `apps/api/src/routes/tasks.ts` + gắn trong `src/index.ts` |
| 4. Trang web | `apps/web/src/pages/Notes.tsx` | `apps/web/src/pages/Tasks.tsx` + route trong `src/router.tsx` |
| 5. Màn hình app | `apps/mobile/src/app/(app)/index.tsx` | `apps/mobile/src/app/(app)/tasks.tsx` + tab trong `(app)/_layout.tsx` |

### Bước 1. Migration (bảng dữ liệu)

```bash
npm run db:new -w @app/api -- tasks     # tạo apps/api/migrations/0002_tasks.sql, rồi viết SQL vào đó
```

```sql
CREATE TABLE tasks (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  due_date   TEXT,                       -- ISO 8601, NULL = không hạn
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_user ON tasks(user_id, created_at DESC);
```

```bash
npm run db:migrate:local
```

- Bảng nào thuộc về người dùng thì luôn có `user_id … REFERENCES users(id) ON DELETE CASCADE`: khi người dùng xoá tài khoản (App Store và Google Play bắt buộc có), dữ liệu của họ tự xoá theo.
- **Không bao giờ sửa migration đã chạy trên production.** Muốn đổi thì tạo migration mới.

### Bước 2. Kiểu dữ liệu và schema dùng chung (`packages/shared`)

`packages/shared/src/api.ts`: hình dạng dữ liệu API trả về (camelCase).

```ts
export type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};
```

`packages/shared/src/schemas.ts`: kiểm tra dữ liệu gửi lên. Cùng một schema dùng cho server (bắt buộc) và form ở web/app (báo lỗi ngay).

```ts
export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên nhiệm vụ.").max(200),
  dueDate: z.iso.date().nullable().default(null),
});
// PATCH: mọi trường đều tuỳ chọn và KHÔNG có default (để không ghi đè trường người dùng không gửi).
export const taskPatchSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên nhiệm vụ.").max(200).optional(),
  dueDate: z.iso.date().nullable().optional(),
  done: z.boolean().optional(),
});
```

Thêm field ở đây thì TypeScript chỉ ra ngay mọi chỗ ở API, web, app cần sửa theo.

### Bước 3. API (`apps/api`)

Chép `apps/api/src/routes/notes.ts` thành `tasks.ts`, đổi tên bảng/cột/kiểu. Giữ nguyên ba quy tắc của file mẫu:

- Đọc body bằng `readBody(c, taskInputSchema)` (sai thì tự trả 400 với thông báo tiếng Việt).
- **Mọi câu SQL đều lọc theo `user_id = c.get("user").id`**, kể cả `UPDATE` và `DELETE`.
- Lỗi trả bằng `fail(404, "Không tìm thấy nhiệm vụ.")`.

Gắn router trong `apps/api/src/index.ts`, **sau** dòng `app.use("*", requireUser)` (để bắt buộc đăng nhập):

```ts
import { taskRoutes } from "./routes/tasks";
// …
app.route("/tasks", taskRoutes);
```

Thử nhanh: `npm run dev`, đăng ký một tài khoản trên web, rồi mở `http://localhost:5173/api/tasks`.

### Bước 4. Trang web (`apps/web`)

1. Chép `apps/web/src/pages/Notes.tsx` thành `Tasks.tsx`, đổi `/api/notes` → `/api/tasks`, `Note` → `Task`.
2. Thêm route trong `apps/web/src/router.tsx`, trong nhóm `/app` (đã có `RequireAuth`): `{ path: "tasks", element: <Tasks /> }`.
3. Thêm link trên thanh menu trong `apps/web/src/components/Layout.tsx` (cạnh `NavLink` "Ghi chú").

Thành phần giao diện có sẵn (`Button`, `Card`, `Input`, `Textarea`, `ErrorText`…) ở `apps/web/src/components/ui.tsx`.

### Bước 5. Màn hình app (`apps/mobile`)

1. Chép `apps/mobile/src/app/(app)/index.tsx` thành `apps/mobile/src/app/(app)/tasks.tsx` (mỗi file trong `src/app/` là một màn hình).
2. Muốn là một tab: thêm một `NativeTabs.Trigger name="tasks"` trong `apps/mobile/src/app/(app)/_layout.tsx` (icon iOS là tên SF Symbol, Android dùng ảnh PNG trong `assets/images/tabIcons`).
3. Thành phần giao diện ở `apps/mobile/src/components/ui.tsx`, màu và khoảng cách ở `apps/mobile/src/lib/theme.ts`.
4. Cần thư viện native mới? Chạy `npx expo install <tên-gói>` trong `apps/mobile` (không dùng `npm install`), để đúng phiên bản với Expo SDK.

### Bước 6. Kiểm tra

```bash
npm run typecheck && npm run lint && npm run build
```

Rồi thử tay: `npm run dev` (web) và `npm run mobile` (app). Xong thì commit. Deploy lên production: [03-deploy-cloudflare.md](03-deploy-cloudflare.md) (`npm run deploy` tự áp migration mới lên D1 production).

### Bỏ tính năng mẫu "Ghi chú"

Khi đã có tính năng thật, xoá: `apps/api/src/routes/notes.ts` (+ dòng `app.route("/notes", …)`), `Note`/`noteInputSchema`/`notePatchSchema` trong `packages/shared`, `apps/web/src/pages/Notes.tsx` (+ route, link menu), màn hình `apps/mobile/src/app/(app)/index.tsx` (thay bằng màn hình chính của bạn, vì đây là tab đầu tiên). Bảng `notes`:

- **Chưa deploy production lần nào**: xoá thẳng phần `notes` trong `0001_init.sql`, rồi làm lại D1 local (xoá thư mục `apps/api/.wrangler`, chạy `npm run db:migrate:local`).
- **Đã deploy**: tạo migration mới `npm run db:new -w @app/api -- drop_notes` với nội dung `DROP TABLE notes;`.

## 5. Đổi icon và màn hình chờ (splash)

| Tệp | Kích thước | Ghi chú |
|---|---|---|
| `apps/mobile/assets/images/icon.png` | 1024×1024 | Icon iOS. PNG vuông, **không trong suốt, không tự bo góc** (iOS tự bo) |
| `apps/mobile/assets/images/android-icon-foreground.png` | giữ như tệp mẫu | Adaptive icon Android: hình chính, chừa lề vì Android cắt thành tròn/vuông/giọt nước |
| `apps/mobile/assets/images/android-icon-background.png` | giữ như tệp mẫu | Lớp nền adaptive icon (hoặc chỉ đổi `android.adaptiveIcon.backgroundColor` trong `app.json`) |
| `apps/mobile/assets/images/android-icon-monochrome.png` | giữ như tệp mẫu | Icon một màu cho chế độ "themed icons" của Android 13+ |
| `apps/mobile/assets/images/splash-icon.png` | logo nhỏ, nền trong suốt | Màn hình chờ; màu nền và độ rộng ở plugin `expo-splash-screen` trong `apps/mobile/app.json` |
| `apps/mobile/assets/images/favicon.png` | 48×48 | Khi chạy app bản web của Expo |
| `apps/mobile/assets/images/tabIcons/*.png` | @1x/@2x/@3x | Icon tab trên Android |
| `apps/web/public/icon.png` | 1024×1024 | Icon "Add to Home Screen" trên iPhone và ảnh chia sẻ (`og:image`) |
| `apps/web/public/favicon.png` | 48×48 | Icon tab trình duyệt |

Giữ đúng tên tệp thì không phải sửa cấu hình. Icon và splash nằm trong phần native của app, nên phải **build lại** (EAS Build) mới thấy; EAS Update (OTA) không đổi được icon.

## 6. Màu thương hiệu và font

Màu khai báo ở hai nơi, giữ cho khớp nhau (và khớp `docs/design/tokens.md`):

- **Web**: khối `@theme` trong `apps/web/src/styles.css` (`--color-brand`, `--color-brand-dark`, `--color-brand-soft`, `--color-ink`, `--color-muted`, `--color-line`, `--color-danger`, `--font-sans`). Tailwind tự tạo class theo tên: `bg-brand`, `text-ink`, `border-line`…
- **App**: object `colors` trong `apps/mobile/src/lib/theme.ts` (cùng tên: `brand`, `brandDark`, `ink`, `muted`…), cạnh `space`, `radius`, `font`.

Thêm vài chỗ dùng màu chính: `<meta name="theme-color">` trong `apps/web/index.html`, `backgroundColor` của splash và `android.adaptiveIcon.backgroundColor` trong `apps/mobile/app.json`.

Font riêng: web thêm `<link>` Google Fonts trong `index.html` rồi đổi `--font-sans`; app cài `npx expo install expo-font` (trong `apps/mobile`) và nạp font theo hướng dẫn Expo.

## 7. Trước khi cho người khác dùng

- [ ] `packages/shared/src/app-info.ts`: email hỗ trợ thật, `webUrl` là địa chỉ production thật (sau lần deploy đầu).
- [ ] Nội dung trang pháp lý trong `apps/web/src/pages/legal/` (`Privacy.tsx`, `Terms.tsx`, `Support.tsx`, `DeleteAccount.tsx`) đúng với dữ liệu app thật sự thu.
- [ ] `README.md` của repo mô tả sản phẩm mới (không còn là template).
- [ ] Icon, splash, màu đã thay.
- [ ] Đã deploy và `curl https://<địa-chỉ>/api/health` trả `{"ok":true,…}`.
- [ ] Checklist phát hành store: [07-checklist-phat-hanh.md](07-checklist-phat-hanh.md).
