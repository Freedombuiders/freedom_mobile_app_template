// Support URL page (required by the App Store listing).
import { Link } from "react-router";
import { APP_INFO, LEGAL_PATHS } from "@app/shared/app-info";
import { Prose } from "../../components/ui";

export default function Support() {
  return (
    <Prose title="Hỗ trợ">
      <p>
        Cần giúp đỡ với {APP_INFO.name}? Gửi email tới <a href={`mailto:${APP_INFO.supportEmail}`}>{APP_INFO.supportEmail}</a>,
        chúng tôi trả lời trong vòng 2 ngày làm việc.
      </p>
      <h2>Câu hỏi thường gặp</h2>
      <p>
        <strong>Quên mật khẩu?</strong> Liên hệ email hỗ trợ từ địa chỉ email của tài khoản.
      </p>
      <p>
        <strong>Dùng trên nhiều thiết bị?</strong> Đăng nhập cùng tài khoản trên web, iPhone và Android, dữ liệu được đồng bộ.
      </p>
      <p>
        <strong>Xoá tài khoản?</strong> Xem <Link to={LEGAL_PATHS.deleteAccount}>hướng dẫn xoá tài khoản</Link>.
      </p>
      <p>
        <Link to={LEGAL_PATHS.privacy}>Chính sách bảo mật</Link> · <Link to={LEGAL_PATHS.terms}>Điều khoản sử dụng</Link>
      </p>
    </Prose>
  );
}
