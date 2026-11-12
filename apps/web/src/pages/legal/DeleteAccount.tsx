// "Delete account URL" required by Google Play's Data safety form: explains how to delete the account and data,
// from inside the app and without the app.
import { Link } from "react-router";
import { APP_INFO } from "@app/shared/app-info";
import { Prose } from "../../components/ui";
import { useSession } from "../../lib/session";

export default function DeleteAccount() {
  const { user } = useSession();
  return (
    <Prose title={`Xoá tài khoản ${APP_INFO.name}`}>
      <p>Bạn có thể xoá tài khoản và toàn bộ dữ liệu của mình bất cứ lúc nào. Việc xoá có hiệu lực ngay và không thể hoàn tác.</p>
      <h2>Trong ứng dụng điện thoại</h2>
      <p>Mở ứng dụng → tab <strong>Cài đặt</strong> → <strong>Xoá tài khoản</strong> → nhập mật khẩu để xác nhận.</p>
      <h2>Trên web</h2>
      <p>
        Đăng nhập → <strong>Tài khoản</strong> → <strong>Xoá tài khoản vĩnh viễn</strong>.{" "}
        {user ? <Link to="/app/account">Mở trang Tài khoản</Link> : <Link to="/login?next=/app/account">Đăng nhập để xoá</Link>}
      </p>
      <h2>Không đăng nhập được?</h2>
      <p>
        Gửi email từ địa chỉ email của tài khoản tới <a href={`mailto:${APP_INFO.supportEmail}`}>{APP_INFO.supportEmail}</a> với
        tiêu đề "Xoá tài khoản". Chúng tôi xoá trong vòng 7 ngày.
      </p>
      <h2>Dữ liệu bị xoá</h2>
      <ul>
        <li>Thông tin tài khoản (tên, email, mật khẩu đã mã hoá) và mọi phiên đăng nhập.</li>
        <li>Toàn bộ nội dung bạn đã tạo.</li>
      </ul>
      <p>Chúng tôi không giữ lại bản sao dữ liệu cá nhân sau khi xoá, trừ khi pháp luật yêu cầu.</p>
    </Prose>
  );
}
