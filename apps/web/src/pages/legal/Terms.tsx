// TEMPLATE TEXT — rewrite for your product before release.
import { APP_INFO } from "@app/shared/app-info";
import { Prose } from "../../components/ui";

export default function Terms() {
  return (
    <Prose title="Điều khoản sử dụng" updated="01/01/2027">
      <p>
        Khi dùng {APP_INFO.name}, bạn đồng ý với các điều khoản dưới đây. Dịch vụ do {APP_INFO.operator} cung cấp.
      </p>
      <h2>1. Tài khoản</h2>
      <p>Bạn chịu trách nhiệm giữ bí mật mật khẩu và mọi hoạt động diễn ra trong tài khoản của mình.</p>
      <h2>2. Sử dụng hợp lệ</h2>
      <p>Không dùng dịch vụ để vi phạm pháp luật, phát tán nội dung độc hại hoặc can thiệp vào hệ thống.</p>
      <h2>3. Nội dung của bạn</h2>
      <p>Bạn sở hữu nội dung mình tạo. Chúng tôi chỉ lưu trữ và xử lý nội dung đó để cung cấp dịch vụ cho bạn.</p>
      <h2>4. Thay đổi và chấm dứt</h2>
      <p>Chúng tôi có thể cập nhật dịch vụ hoặc điều khoản và sẽ thông báo khi có thay đổi quan trọng. Bạn có thể ngừng dùng và xoá tài khoản bất cứ lúc nào.</p>
      <h2>5. Giới hạn trách nhiệm</h2>
      <p>Dịch vụ được cung cấp "nguyên trạng". Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ.</p>
      <h2>6. App Store và Google Play</h2>
      <p>
        Nếu bạn tải ứng dụng từ App Store, Apple không có trách nhiệm bảo trì hay hỗ trợ ứng dụng; Apple và các công ty con là
        bên thụ hưởng thứ ba của điều khoản này. Việc tải từ Google Play cũng tuân theo điều khoản của Google Play.
      </p>
      <h2>7. Liên hệ</h2>
      <p>
        <a href={`mailto:${APP_INFO.supportEmail}`}>{APP_INFO.supportEmail}</a>
      </p>
    </Prose>
  );
}
