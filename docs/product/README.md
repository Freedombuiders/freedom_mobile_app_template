# Tài liệu sản phẩm

Bỏ vào thư mục này mọi tài liệu mô tả **app làm gì**. Claude Code đọc thư mục này trước khi lên kế hoạch và viết code.

Nên có (định dạng `.md` là tốt nhất; `.docx`/`.pdf` cũng được, Claude đọc được):

| File gợi ý | Nội dung |
|---|---|
| `PRD.md` | Mục tiêu, người dùng, vấn đề cần giải quyết, phạm vi phiên bản đầu (MVP) và những gì **chưa** làm |
| `chuc-nang.md` | Danh sách chức năng / user stories: "Là ___, tôi muốn ___ để ___" + tiêu chí chấp nhận |
| `du-lieu.md` | Các đối tượng dữ liệu và quan hệ (ví dụ: Gia đình → Thành viên → Nhiệm vụ), ai được xem/sửa gì |
| `luong-man-hinh.md` | Luồng đi giữa các màn hình (có thể tham chiếu ảnh trong `../design/`) |
| `quy-tac-nghiep-vu.md` | Quy tắc bắt buộc ở server: giới hạn, tính điểm, quyền hạn, trạng thái |
| `phat-hanh.md` | Tên app, mô tả ngắn, đối tượng, quốc gia phát hành, có trẻ em dùng không, có thu tiền không |

Mẹo khi nhờ Claude:

```text
Đọc toàn bộ docs/product và docs/design. Tóm tắt lại sản phẩm, liệt kê bảng dữ liệu, API và màn hình cần có
cho bản MVP, rồi đề xuất kế hoạch làm theo từng tính năng (mỗi tính năng: migration → shared → API → web → app).
Chờ mình duyệt kế hoạch rồi mới code.
```
