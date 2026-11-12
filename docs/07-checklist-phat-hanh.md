# 07. Checklist trước khi phát hành

In ra hoặc chép vào issue, đánh dấu từng ô. Chi tiết từng bước nằm ở `docs/04-expo-eas-build.md`, `docs/05-app-store.md` và `docs/06-google-play.md`. Thay `<domain>` bằng tên miền production của bạn.

## Server và trang web

- [ ] API đã deploy lên production (`npm run deploy`) cùng mọi migration D1 mà bản app này cần
- [ ] `webUrl` trong `packages/shared/src/app-info.ts` đúng tên miền production; `curl -s https://<domain>/api/health` trả `{"ok":true,…}`
- [ ] Đã sửa nội dung 4 trang pháp lý trong `apps/web/src/pages/legal/` (Privacy, Terms, Support, DeleteAccount): đúng tên app, người vận hành, dữ liệu thật sự thu thập
- [ ] Mở được cả 4 trang: `https://<domain>/privacy`, `/terms`, `/support`, `/delete-account`
- [ ] `supportEmail` và `operator` trong `app-info.ts` đã thay giá trị mẫu; **gửi thử một email tới địa chỉ hỗ trợ và nhận được**

## App

- [ ] Tên app (`expo.name`), bundle id và package (`com.…`) đã đổi khỏi giá trị mẫu, trước bản build đầu tiên
- [ ] Icon, adaptive icon Android, splash đã thay (`apps/mobile/assets/images/`); không còn ảnh mẫu
- [ ] Không còn chữ giữ chỗ: "Freedom App", `example.com`, lorem ipsum, màn "Notes" mẫu nếu không dùng
- [ ] `expo.version` trong `apps/mobile/app.json` đã tăng so với bản đã phát hành
- [ ] `npm run typecheck` và `npm run lint` sạch; `npm run doctor -w @app/mobile` không báo lỗi
- [ ] Chuỗi xin quyền (camera, ảnh, vị trí…) nói rõ dùng để làm gì, bằng ngôn ngữ của app

## Thử nghiệm

- [ ] Đã thử **bản build production** (TestFlight / Internal testing), không chỉ Expo Go
- [ ] Đã thử trên **iPhone thật** và **điện thoại Android thật**
- [ ] Chạy hết luồng chính không crash: đăng ký → đăng nhập → tính năng chính → đăng xuất → đăng nhập lại
- [ ] Mất mạng hoặc server lỗi thì app báo lỗi dễ hiểu, không treo
- [ ] Các link trong Cài đặt (Chính sách bảo mật, Điều khoản, Hỗ trợ) mở đúng trang
- [ ] **Xoá tài khoản** trong app (Cài đặt → "Xoá tài khoản") chạy được: tạo tài khoản thử, xoá, rồi không đăng nhập lại được nữa

## Cho người duyệt

- [ ] Tài khoản demo trên production, có dữ liệu mẫu, đăng nhập được trên bản build sẽ nộp
- [ ] Mật khẩu demo cất ngoài git (trình quản lý mật khẩu hoặc file bị `.gitignore`)
- [ ] Đã ghi ghi chú tiếng Anh cho người duyệt (App Review Information / App access)

## Trang cửa hàng

- [ ] Tên (≤ 30), subtitle (≤ 30), từ khoá (≤ 100 byte) cho App Store
- [ ] Short description (≤ 80), full description (≤ 4.000) cho Google Play
- [ ] Mô tả App Store không nhắc Android; mô tả Google Play không nhắc iPhone
- [ ] Ảnh chụp iPhone theo cỡ Apple đang bắt buộc, iPad 13" (vì `supportsTablet: true`), điện thoại Android (≥ 4 ảnh 1080 × 1920)
- [ ] Icon 512 × 512 và feature graphic 1024 × 500 cho Google Play
- [ ] Support URL, Privacy Policy URL, Marketing URL, Copyright

## Khai báo

- [ ] Apple **App Privacy** khớp dữ liệu app thật sự thu (đối chiếu `apps/api/migrations/`)
- [ ] Google **Data safety** khớp; đã nhập Delete account URL `https://<domain>/delete-account`
- [ ] Age Rating (Apple), Content rating IARC, Target audience, Ads, Advertising ID (Google)
- [ ] Export compliance: `usesNonExemptEncryption: false` vẫn đúng (app chỉ dùng HTTPS)
- [ ] Có đăng nhập Google/Facebook thì đã có Sign in with Apple (guideline 4.8)
- [ ] Quốc gia, giá (Free), trader status nếu phát hành ở EU

## Build và gửi

- [ ] Đã commit mọi thay đổi (EAS tải lên cả thay đổi chưa commit)
- [ ] `npm run build:ios`, build đã lên TestFlight và được chọn trong trang phiên bản
- [ ] `npm run build:android`, rồi `npm run submit:android` (hoặc tải tay bản đầu), đã phát lên track thử
- [ ] Google Play tài khoản cá nhân: đã đủ 12 người thử × 14 ngày và được duyệt quyền Production
- [ ] Chủ tài khoản đã bấm **Submit for Review** (Apple) và **Send for review / Start rollout** (Google)

## Sau khi phát hành

- [ ] Tải app từ cửa hàng về máy thật, đăng nhập, chạy luồng chính một lần nữa
- [ ] Theo dõi log server trong vài giờ đầu: `npm run tail -w @app/api` (`wrangler tail`)
- [ ] Xem crash: App Store Connect (*App Analytics*, *TestFlight → Crashes*), Play Console → *Android vitals* (crash, ANR)
- [ ] Trả lời đánh giá của người dùng trên cả hai cửa hàng
- [ ] Ghi lại phiên bản đã phát hành và ngày phát hành; tag git (ví dụ `v1.0.0`)
- [ ] Giữ tài khoản demo cho các lần duyệt sau
