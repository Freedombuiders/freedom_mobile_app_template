// TEMPLATE TEXT — rewrite for your product before release. It must describe exactly what the app collects
// (match the App Store "App Privacy" and Google Play "Data safety" answers, see docs/05-app-store.md, docs/06-google-play.md).
import { Link } from "react-router";
import { APP_INFO, LEGAL_PATHS } from "@app/shared/app-info";
import { Prose } from "../../components/ui";

export default function Privacy() {
  return (
    <Prose title="Chính sách bảo mật" updated="01/01/2027">
      <p>
        Chính sách này giải thích {APP_INFO.name} (do {APP_INFO.operator} vận hành) thu thập dữ liệu gì, dùng vào việc gì và bạn
        có những quyền gì đối với dữ liệu của mình.
      </p>
      <h2>1. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>Thông tin tài khoản: tên, email, mật khẩu (chỉ lưu dạng mã hoá một chiều).</li>
        <li>Nội dung bạn tạo trong ứng dụng (ví dụ: ghi chú).</li>
        <li>Dữ liệu kỹ thuật tối thiểu để vận hành và bảo vệ dịch vụ (địa chỉ IP trong nhật ký máy chủ, thời điểm đăng nhập).</li>
      </ul>
      <p>Chúng tôi không bán dữ liệu, không dùng quảng cáo và không dùng công cụ theo dõi của bên thứ ba.</p>
      <h2>2. Mục đích sử dụng</h2>
      <ul>
        <li>Cung cấp các chức năng của ứng dụng và đồng bộ giữa web và điện thoại.</li>
        <li>Bảo mật tài khoản (chống đăng nhập trái phép, giới hạn số lần thử).</li>
        <li>Hỗ trợ khi bạn liên hệ.</li>
      </ul>
      <h2>3. Lưu trữ và bảo mật</h2>
      <p>
        Dữ liệu được lưu trên hạ tầng Cloudflare (có thể đặt ngoài Việt Nam), truyền qua kết nối mã hoá HTTPS. Phiên đăng nhập
        trên điện thoại được lưu trong vùng lưu trữ an toàn của hệ điều hành.
      </p>
      <h2>4. Quyền của bạn</h2>
      <ul>
        <li>Xem và sửa thông tin tài khoản trong mục Tài khoản.</li>
        <li>
          Xoá tài khoản và toàn bộ dữ liệu bất cứ lúc nào, ngay trong ứng dụng hoặc theo hướng dẫn tại{" "}
          <Link to={LEGAL_PATHS.deleteAccount}>trang xoá tài khoản</Link>.
        </li>
      </ul>
      <h2>5. Trẻ em</h2>
      <p>Ứng dụng không dành cho trẻ em dưới 13 tuổi. (Sửa mục này nếu sản phẩm của bạn có người dùng là trẻ em.)</p>
      <h2>6. Liên hệ</h2>
      <p>
        Mọi câu hỏi về quyền riêng tư: <a href={`mailto:${APP_INFO.supportEmail}`}>{APP_INFO.supportEmail}</a>.
      </p>
    </Prose>
  );
}
