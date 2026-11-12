# Tài liệu thiết kế

Bỏ vào thư mục này mọi thứ mô tả **app trông như thế nào**. Claude Code đọc được ảnh (PNG/JPG) nên ảnh chụp từng màn
hình là đủ để dựng giao diện.

| Nội dung | Gợi ý |
|---|---|
| Ảnh từng màn hình | `screens/01-dang-nhap.png`, `screens/02-trang-chu.png`… đánh số theo luồng; ghi chú tên màn hình trong tên file |
| Link Figma | `figma.md`: link file + link từng frame (cấp quyền xem cho người làm) |
| Màu, font, bo góc | `tokens.md`: mã màu chính/phụ/nền/chữ/lỗi, font chữ, cỡ chữ, khoảng cách — sẽ được chép vào `apps/web/src/styles.css` (`@theme`) và `apps/mobile/src/lib/theme.ts` |
| Icon app | `icon-1024.png` (1024×1024, không trong suốt, không bo góc) — dùng cho App Store, Google Play và thay `apps/mobile/assets/images/icon.png` |
| Icon Android | nền + hình chính tách lớp cho adaptive icon (`android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`) |
| Splash | logo trên nền trơn (`splash-icon.png`) |
| Ảnh minh hoạ | các ảnh dùng trong app/web, đặt tên tiếng Anh không dấu |

Thư mục này không được đưa vào bản build mobile (xem `.easignore`), nên để ảnh gốc dung lượng lớn ở đây cũng không sao.
