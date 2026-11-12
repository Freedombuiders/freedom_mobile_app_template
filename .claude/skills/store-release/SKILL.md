---
name: store-release
description: Chuẩn bị phát hành app lên App Store và Google Play — soạn nội dung trang cửa hàng đúng giới hạn ký tự, lên kế hoạch ảnh chụp màn hình, trả lời App Privacy / Data safety dựa trên dữ liệu code thật sự thu, rà checklist phát hành. Dùng khi người dùng nói "phát hành", "lên App Store", "lên Google Play", "store listing", "mô tả app store", "ảnh chụp màn hình store", "privacy questionnaire", "data safety", "release checklist", "chuẩn bị nộp app", hoặc hỏi cần điền gì trong App Store Connect / Play Console.
---

# Chuẩn bị phát hành lên cửa hàng

Claude soạn nội dung, kiểm tra, và chỉ đường. Chủ tài khoản là người đăng nhập, trả tiền và bấm gửi. Hướng dẫn chi tiết cho người: `docs/05-app-store.md` (Apple), `docs/06-google-play.md` (Google), `docs/07-checklist-phat-hanh.md` (checklist). Build và gửi bản build: skill `build-mobile`.

## Đọc trước

- `docs/product/`: sản phẩm làm gì, cho ai, tính năng chính.
- `packages/shared/src/app-info.ts`: tên, tagline, `supportEmail`, `operator`, `webUrl`.
- `apps/mobile/app.json`: tên app, bundle id/package, `version`, `supportsTablet`, plugin, quyền.
- `apps/web/src/pages/legal/`: Privacy, Terms, Support, DeleteAccount.
- `apps/api/migrations/*.sql` và `apps/api/src/routes/`: dữ liệu thật sự lưu.

## 1. Soạn nội dung trang cửa hàng

Ghi bản nháp vào `docs/release/app-store.md` và `docs/release/google-play.md` (tạo thư mục nếu chưa có).

Mỗi ô một khối code để người dùng chép thẳng, kèm số ký tự đã đếm. Ngôn ngữ chính theo app (mặc định tiếng Việt). Ghi chú cho người duyệt viết bằng tiếng Anh.

| Cửa hàng | Ô | Giới hạn |
|---|---|---|
| App Store | Name | 2–30 ký tự |
| App Store | Subtitle | ≤ 30 ký tự |
| App Store | Keywords | ≤ **100 byte**, cách nhau bằng dấu phẩy, không dấu cách; không lặp tên app; không tên app/hãng khác |
| App Store | Promotional Text | ≤ 170 ký tự |
| App Store | Description | ≤ 4.000 ký tự, văn bản thuần |
| App Store | What's New | ≤ 4.000 ký tự (từ bản thứ hai) |
| Google Play | App name | ≤ 30 ký tự |
| Google Play | Short description | ≤ 80 ký tự |
| Google Play | Full description | ≤ 4.000 ký tự |

**Đếm bằng máy, không ước lượng.** Chữ tiếng Việt có dấu chiếm 2–3 byte, nên Keywords phải đếm byte:

```bash
node -e 'for (const s of process.argv.slice(1)) console.log([...s].length + " ký tự, " + Buffer.byteLength(s) + " byte: " + s)' "Tên app" "từ khoá 1,từ khoá 2"
```

Quy tắc nội dung:

- Mô tả đúng những gì app làm **hiện tại**. Không hứa tính năng chưa có.
- Không viết "số 1", "tốt nhất" khi không chứng minh được.
- Bản App Store không nhắc Android/Google Play; bản Google Play không nhắc iPhone/App Store.
- Không còn chữ mẫu của template ("Freedom App", `example.com`).
- Ghi kèm các URL: Support `https://<domain>/support`, Privacy `https://<domain>/privacy`, Marketing `https://<domain>`, Delete account (Google) `https://<domain>/delete-account`. Lấy `<domain>` từ `webUrl`.
- Copyright: `<năm> <operator>`. Operator nên trùng tên người bán trên cửa hàng.

## 2. Kế hoạch ảnh chụp màn hình

Ghi vào `docs/release/screenshots.md`:

- 4–8 màn theo thứ tự kể chuyện: màn chính trước, sau đó là tính năng nổi bật. Không mở đầu bằng màn đăng nhập.
- Mỗi màn có một câu chú thích ngắn (≤ 6–8 từ) nếu muốn đặt chữ lên ảnh.
- Dữ liệu mẫu cần có trong tài khoản demo để ảnh đẹp. Không dùng dữ liệu thật của ai.
- Cỡ cần chụp:
  - **Apple:** iPhone theo nhóm Apple đang bắt buộc (11/2026 là "Dynamic Island medium", 1206 × 2622; nên có thêm 6.9", 1320 × 2868). iPad 13" (2064 × 2752) nếu `supportsTablet: true`. Mở https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications để kiểm tra lại.
  - **Google:** điện thoại ≥ 4 ảnh dọc 1080 × 1920; icon 512 × 512; feature graphic 1024 × 500.
- Cách chụp: iOS Simulator (⌘S) đúng máy; Android emulator; hoặc máy thật.

Ảnh phải là app thật. Không dựng giao diện giả khác với app (Apple 2.3.3, chính sách metadata của Google).

## 3. Trả lời App Privacy (Apple) và Data safety (Google) theo code

Không trả lời theo trí nhớ: dò code rồi mới điền.

```bash
cat apps/api/migrations/*.sql                                   # cột nào được lưu: email, tên, nội dung người dùng…
grep -rn "fetch(" apps/api/src                                  # gọi dịch vụ ngoài nào (email, AI, thanh toán) → có "chia sẻ" không
grep -n '"' apps/mobile/package.json                            # SDK: sentry, firebase, analytics, ads, expo-location, expo-camera, expo-image-picker, expo-contacts, expo-notifications, expo-tracking-transparency…
grep -n "permissions\|infoPlist\|Permission" apps/mobile/app.json
grep -n "vars\|secret" apps/api/wrangler.jsonc apps/api/.dev.vars.example   # dịch vụ bên thứ ba qua khoá API
```

Đối chiếu sang hai bảng câu hỏi:

- **Apple App Privacy:** từng loại dữ liệu (Contact Info → Name/Email, User Content, Identifiers → User ID, Diagnostics…). Với mỗi loại: mục đích, có gắn với danh tính không, có tracking không.
- **Google Data safety:** loại dữ liệu, collected/shared, bắt buộc hay tùy chọn, mục đích. Kèm ba câu: mã hoá khi truyền (HTTPS → Yes), cho xoá dữ liệu (Yes), Delete account URL.

Template gốc chỉ thu tên, email, User ID và ghi chú. Không quảng cáo, không SDK theo dõi. Bảng mẫu có trong `docs/05-app-store.md` (mục 6) và `docs/06-google-play.md` (mục 7).

Ghi câu trả lời vào hai file `docs/release/*.md`, mỗi dòng ghi **bằng chứng** (file:dòng).

Nếu trang `/privacy` (`apps/web/src/pages/legal/Privacy.tsx`) nói khác với dữ liệu code thu, chỉ ra chỗ lệch. Đề xuất sửa trang **trước khi** nộp: ba nơi (Privacy, App Privacy, Data safety) phải khớp nhau.

## 4. Rà checklist `docs/07-checklist-phat-hanh.md`

Tự kiểm những gì kiểm được bằng lệnh, rồi báo từng mục: đạt / chưa đạt / cần người dùng xác nhận.

```bash
grep -rn "example\.com\|Freedom App\|support@example\|lorem" apps packages --include=*.ts --include=*.tsx --include=*.json
curl -s https://<domain>/api/health
for p in privacy terms support delete-account; do curl -s -o /dev/null -w "%{http_code} $p\n" https://<domain>/$p; done
npm run typecheck && npm run lint
```

Trang web là SPA, nên đường dẫn sai vẫn có thể trả 200. Mở hoặc đọc nội dung trang để chắc nó không phải trang 404 của app.

Kiểm thêm:

- `expo.version` đã tăng so với bản trên cửa hàng.
- Icon/splash đã thay (so với ảnh mẫu trong `apps/mobile/assets/images/`).
- Có màn Xoá tài khoản trong app.

## 5. Thông tin cho người duyệt

- Soạn ghi chú tiếng Anh, gồm: app làm gì, luồng chính từng bước, nơi xoá tài khoản (Cài đặt → "Xoá tài khoản"), "no ads / no tracking" nếu đúng. Thêm bản dịch tiếng Anh cho các nhãn tiếng Việt nhắc tới.
- **Tài khoản demo** trên production:
  - Hỏi người dùng trước khi tạo, vì nó ghi vào database thật.
  - **Không ghi mật khẩu vào file sẽ commit.** Trong `docs/release/*.md` ghi `<mật khẩu: xem trình quản lý mật khẩu>`.

## Việc chỉ người dùng làm được

Nhắc rõ từng việc khi tới bước đó, không làm thay:

- Trả phí: Apple 99 USD/năm, Google 25 USD một lần. Xác minh danh tính, xin số D-U-N-S, ký thỏa thuận, khai thuế và ngân hàng (app trả phí), khai trader status EU.
- Đăng nhập Apple ID / Google, nhập mã 2FA, đăng nhập lần đầu cho EAS (`npm run build:ios` lần đầu).
- Tạo app trong App Store Connect / Play Console. Claude chỉ từng ô theo bản nháp.
- Tải ảnh lên, dán nội dung vào các ô, trả lời bảng câu hỏi trong console.
- Mời và giữ đủ **12 người thử × 14 ngày** (tài khoản Google Play cá nhân), rồi xin quyền Production.
- Bấm **Submit for Review**, **Start rollout**, **Release**. Trả lời người duyệt khi bị từ chối. Claude giúp soạn câu trả lời.
