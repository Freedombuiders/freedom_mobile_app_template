# 05. Đưa app lên App Store (iOS)

Thứ tự tổng quát:

1. Đăng ký Apple Developer Program.
2. Tạo app trong App Store Connect.
3. Build bản đầu: `npm run build:ios`, tự lên TestFlight.
4. Thử trên TestFlight.
5. Điền trang cửa hàng và các bảng câu hỏi.
6. Gửi duyệt, rồi phát hành.

Trong tài liệu, `<domain>` là tên miền production của bạn (giá trị `webUrl` trong `packages/shared/src/app-info.ts`).

> Số liệu dưới đây kiểm tra tháng 11/2026. Apple đổi yêu cầu (kích thước ảnh, bảng câu hỏi) khá thường xuyên: kiểm tra lại trên trang chính thức trước khi nộp.

---

## 1. Chuẩn bị: tài khoản Apple Developer

- Phí **99 USD mỗi năm** (hoặc giá nội tệ ở một số nước). Tổ chức phi lợi nhuận, trường học, cơ quan nhà nước có thể xin miễn phí. Hết hạn mà không gia hạn thì app bị gỡ khỏi App Store.
- Cần một **Apple ID đã bật xác thực hai lớp (2FA)**.
- Đăng ký tại https://developer.apple.com/programs/enroll/ (trên web hoặc app Apple Developer).

| | Cá nhân (Individual) | Tổ chức (Organization) |
|---|---|---|
| Tên người bán trên App Store | Họ tên thật của bạn | Tên pháp lý của công ty |
| Giấy tờ | Giấy tờ tùy thân | Số **D-U-N-S** (miễn phí từ Dun & Bradstreet), website công ty, quyền ký thay công ty |
| Thời gian duyệt | Thường nhanh | Lâu hơn (chờ D-U-N-S, Apple gọi xác minh) |
| Thành viên | Chỉ một người trong team Developer (vẫn mời được người dùng App Store Connect, ví dụ người thử TestFlight) | Mời nhiều thành viên, đủ vai trò |

App miễn phí không cần điền ngân hàng và thuế. Bán app hoặc có mua trong app thì phải ký *Paid Apps Agreement* và điền ngân hàng, thuế trong App Store Connect → *Business*.

Muốn phát hành ở **EU** thì phải khai *trader status* theo Đạo luật Dịch vụ số (DSA). Nếu là "trader", địa chỉ, số điện thoại và email sẽ hiện công khai.

---

## 2. Tạo app trong App Store Connect

https://appstoreconnect.apple.com → **Apps** → **+** → **New App**:

| Ô | Điền |
|---|---|
| Platforms | iOS |
| Name | Tên trên cửa hàng, 2–30 ký tự, không trùng app khác. Có thể khác `expo.name` (tên dưới icon) |
| Primary Language | Ví dụ Vietnamese |
| Bundle ID | Chọn `com.freedombuilders.freedomapp`, **phải trùng `ios.bundleIdentifier` trong `apps/mobile/app.json`** |
| SKU | Mã nội bộ tùy ý, ví dụ `freedom-app-ios` |
| User Access | Full Access |

Danh sách chưa có bundle id thì đăng ký ở https://developer.apple.com/account → *Certificates, IDs & Profiles* → *Identifiers*. Cách khác: chạy bản build đầu (mục 3), EAS sẽ đăng ký giúp, rồi quay lại tạo app.

Nếu bỏ qua bước này, EAS Submit cũng tự tạo app khi gửi lần đầu (lấy tên từ `app.json`). Tự tạo bằng tay thì bạn chủ động chọn tên, ngôn ngữ và SKU.

**Bundle ID không đổi được sau lần tải đầu tiên.** Đổi nó trong `app.json` trước khi build lần đầu (`npm run init:project` làm việc này).

**Quyết định có hỗ trợ iPad trước bản đầu tiên.** Template đặt `supportsTablet: true`, nên bắt buộc có ảnh iPad. Đã phát hành có iPad thì các bản sau không bỏ iPad được.

---

## 3. Bản build đầu tiên

Lần đầu phải chạy trong **terminal thật**, do chính chủ tài khoản Apple ngồi gõ, vì EAS sẽ hỏi mật khẩu và mã 2FA:

```bash
npm run build:ios
```

EAS sẽ hỏi lần lượt:

1. *Do you want to log in to your Apple account?* → **Yes**. Nhập Apple ID, mật khẩu, mã 2FA gửi về iPhone hoặc Mac.
2. Chọn **team**, nếu Apple ID thuộc nhiều team. Chọn đúng team sẽ đứng tên app.
3. Đăng ký bundle id (nếu chưa có), tạo **Distribution Certificate** và **Provisioning Profile** → **Yes** cho các câu tạo mới. EAS lưu chúng trên máy chủ cho mọi lần build sau.
4. Code được tải lên và build trên EAS: khoảng 15–30 phút, cộng thời gian chờ hàng đợi.
5. Bước tự gửi (`--auto-submit`) hỏi tạo **App Store Connect API key** → **Yes**. EAS giữ khoá này để gửi TestFlight mà không cần đăng nhập lại.
6. Build được tải lên App Store Connect. Apple **xử lý thêm khoảng 5–30 phút**, rồi gửi email. Build hiện trong tab **TestFlight**.

Sau lần đầu:

- Lấy **Apple ID của app** (một dãy số): App Store Connect → app → **App Information** → *General Information* → **Apple ID**.
- Ghi vào `apps/mobile/eas.json` rồi commit:

  ```json
  "submit": {
    "production": {
      "ios": { "ascAppId": "1234567890" },
      "android": { "...": "giữ nguyên" }
    }
  }
  ```

Có `ascAppId` và chứng chỉ đã lưu trên EAS thì từ đó build và gửi chạy được ở chế độ không hỏi (`--non-interactive`). Claude Code chạy giúp được.

Build xong mà bước gửi lỗi thì gửi lại bản mới nhất bằng `npm run submit:ios`.

`usesNonExemptEncryption: false` đã có trong `app.json`, nên Apple không hỏi về mã hoá xuất khẩu cho từng build. App chỉ dùng HTTPS thì khai như vậy là đúng.

---

## 4. TestFlight: cho người khác thử trước

| | Internal testing | External testing |
|---|---|---|
| Ai | Người dùng trong App Store Connect của bạn (thêm ở *Users and Access*) | Bất kỳ ai, mời bằng email hoặc **link công khai** |
| Số lượng | Tối đa 100 | Tối đa 10.000 |
| Cần Apple duyệt? | Không. Có ngay sau khi build xử lý xong | **Có, Beta App Review** cho build đầu của nhóm (thường khoảng 1 ngày). Các build sau thường không phải duyệt đầy đủ |
| Cần điền | Không | *Test Information*: mô tả, email nhận góp ý, **tài khoản demo** nếu app có đăng nhập |

Người thử cài app **TestFlight** từ App Store rồi bấm link mời. Mỗi build dùng được **90 ngày**.

---

## 5. Trang cửa hàng: những ô phải điền

Ở App Store Connect → app → trang phiên bản (ví dụ *1.0 Prepare for Submission*) và *App Information*:

| Ô | Giới hạn | Ghi chú |
|---|---|---|
| Name | 2–30 ký tự | Không nhồi từ khoá |
| Subtitle | ≤ 30 ký tự | Hiện dưới tên app |
| Keywords | ≤ **100 byte** | Cách nhau bằng dấu phẩy, không cần dấu cách. Không lặp tên app, không dùng tên app hoặc công ty khác. **Chữ tiếng Việt có dấu chiếm 2–3 byte mỗi ký tự**, nên đếm theo byte, không đếm theo ký tự |
| Description | ≤ 4.000 ký tự | Chỉ văn bản thuần, không HTML |
| Promotional Text | ≤ 170 ký tự | Sửa bất cứ lúc nào, không cần duyệt lại |
| What's New | ≤ 4.000 ký tự | Không có ở bản đầu, bắt buộc từ bản thứ hai |
| Screenshots | 1–10 ảnh mỗi cỡ | Xem bảng dưới |
| Support URL | Bắt buộc | `https://<domain>/support`. Trang phải có thông tin liên hệ thật (email) |
| Marketing URL | Không bắt buộc | `https://<domain>` |
| Privacy Policy URL | Bắt buộc | `https://<domain>/privacy` |
| Copyright | Bắt buộc | Năm + tên chủ sở hữu, ví dụ `2026 Công ty ABC` (Apple tự thêm ©) |
| Category | Bắt buộc | Một danh mục chính, một phụ |
| Content Rights | Bắt buộc | App có dùng nội dung của bên thứ ba không |

**Ảnh chụp màn hình**: PNG hoặc JPEG, không có kênh trong suốt (alpha). Ảnh phải cho thấy app đang dùng thật, không chỉ màn chào hay màn đăng nhập (guideline 2.3.3).

| Thiết bị | Kích thước (dọc) | Bắt buộc? |
|---|---|---|
| iPhone màn **Dynamic Island cỡ vừa** (iPhone 17, 17 Pro, 16 Pro…) | 1206 × 2622 hoặc 1179 × 2556 | **Bắt buộc** theo trang Screenshot specifications (11/2026) |
| iPhone **6.9"** (Dynamic Island cỡ lớn: 17 Pro Max, 16 Pro Max…) | 1320 × 2868, 1290 × 2796 hoặc 1260 × 2736 | Nên có, để ảnh nét trên máy lớn. Trước đây đây là cỡ bắt buộc |
| iPad **13"** | 2064 × 2752 hoặc 2048 × 2732 | **Bắt buộc** vì app hỗ trợ iPad (`supportsTablet: true`) |

Các cỡ nhỏ hơn App Store Connect tự thu nhỏ. Yêu cầu cỡ ảnh đổi khá thường xuyên: mở [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) và xem mục *Required device sizes* trước khi chụp.

Cách chụp: dùng iOS Simulator trên Mac (chọn đúng máy, bấm ⌘S) hoặc chụp trên máy thật. Đăng nhập tài khoản có dữ liệu mẫu đẹp, không để lộ dữ liệu thật của ai.

---

## 6. App Privacy (nhãn quyền riêng tư)

App Store Connect → app → **App Privacy**. Khai đúng dữ liệu app **thật sự gửi lên server và lưu lại**. Template mặc định thu những thứ sau (bảng `users` và `notes` trong `apps/api/migrations/`):

| Loại dữ liệu (Apple) | Mục đích | Gắn với danh tính | Dùng để theo dõi (tracking) |
|---|---|---|---|
| Contact Info → Name | App Functionality | Yes | No |
| Contact Info → Email Address | App Functionality | Yes | No |
| User Content → Other User Content (ghi chú) | App Functionality | Yes | No |
| Identifiers → User ID | App Functionality | Yes | No |

- *Do you or your third-party partners use data for tracking?* → **No**. Template không có quảng cáo hay SDK theo dõi.
- Mỗi khi thêm SDK (phân tích, báo lỗi, quảng cáo, đăng nhập Google…) hoặc thu thêm dữ liệu (ảnh, vị trí…), phải sửa **cả ba chỗ**:
  - Nhãn App Privacy này.
  - Data safety bên Google Play.
  - Trang `/privacy` (`apps/web/src/pages/legal/Privacy.tsx`).

---

## 7. Age Rating

App Information → **Age Rating** → trả lời bảng câu hỏi. Bảng mới có thêm các mức 13+, 16+, 18+. Với app thường không có nội dung nhạy cảm, trả lời **None/No** cho bạo lực, tình dục, cờ bạc, ngôn từ… thì ra **4+**.

Hai câu cần trả lời đúng sự thật:

- Có cho người dùng **nhắn tin với người lạ** không.
- Có **nội dung do người dùng tạo** mà người khác xem được không.

---

## 8. Thông tin cho người duyệt (App Review Information)

- **Sign-in required: Yes.** Tạo sẵn một **tài khoản demo** trên production, có dữ liệu mẫu. Ghi email và mật khẩu vào đây. **Không xoá tài khoản này** trong lúc chờ duyệt. Không ghi mật khẩu demo vào git.
- **Contact Information:** họ tên, số điện thoại, email của người chịu trách nhiệm. Apple không hiện công khai.
- **Notes:** viết bằng tiếng Anh, ngắn gọn, chỉ đường đến các tính năng chính. Mẫu:

```
<App name> lets users <one-line purpose>.

Sign in with the demo account above. Main flow: <step 1> → <step 2> → <step 3>.

Account deletion: Settings → "Xoá tài khoản" (Delete account). It permanently deletes the account and all its data.

No ads, no in-app purchases, no third-party analytics or tracking SDKs.
The UI is in Vietnamese; labels above include English translations.
```

---

## 9. Đăng nhập Google/Facebook thì phải có tùy chọn tương đương (guideline 4.8)

App dùng đăng nhập bên thứ ba (Google, Facebook…) làm cách đăng nhập chính thì phải có thêm một tùy chọn tương đương: chỉ thu tên và email, cho người dùng giấu email, không theo dõi để quảng cáo. **Sign in with Apple** đáp ứng yêu cầu này.

- Đặt nút Apple ngang hàng với nút Google.
- Thêm quyền *Sign in with Apple* cho app, rồi build lại. EAS sẽ cần đăng nhập Apple để cập nhật profile.
- Người dùng xoá tài khoản thì server phải **thu hồi token Apple** qua REST API của Apple.

Template hiện chỉ có đăng nhập email và mật khẩu (hệ thống tài khoản riêng), nên chưa cần.

---

## 10. Lý do bị từ chối hay gặp

| Guideline | Lỗi | Cách tránh |
|---|---|---|
| 2.1 App Completeness | App crash, nút không chạy, tài khoản demo không đăng nhập được, server tắt | Thử bản TestFlight trên máy thật; giữ API và tài khoản demo sống trong suốt thời gian duyệt |
| 2.1 / 2.3 | Còn **nội dung giữ chỗ**: "Freedom App", `support@example.com`, chữ mẫu, ảnh mẫu, trang pháp lý chưa sửa | Tìm và thay hết trước khi nộp (`docs/07-checklist-phat-hanh.md`) |
| 2.3.3 | Ảnh chụp chỉ có màn chào hoặc đăng nhập, hoặc không phải app thật | Chụp các màn đang dùng thật |
| 2.3.10 | Mô tả hoặc ảnh nhắc đến Android, Google Play | Viết riêng nội dung cho App Store |
| 4.2 Minimum Functionality | App quá đơn giản, hoặc chỉ là website bọc trong app | Có tính năng riêng, dùng được ngay sau đăng nhập |
| 5.1.1(v) | Cho tạo tài khoản nhưng không cho **xoá tài khoản trong app** | Template đã có (Cài đặt → "Xoá tài khoản"). Đừng bỏ, và giữ nó dễ tìm |
| 5.1.1 | Thiếu link chính sách bảo mật **trong app**, link hỏng, hoặc chuỗi xin quyền (camera, ảnh…) mơ hồ | Kiểm tra các link ở Cài đặt; viết chuỗi xin quyền nói rõ dùng để làm gì |
| 4.8 | Có đăng nhập Google nhưng thiếu tùy chọn tương đương | Xem mục 9 |

Bị từ chối thì đọc tin nhắn ở App Store Connect (*App Review*), sửa, rồi trả lời trong đó hoặc gửi lại. Chỉ sửa nội dung trang cửa hàng thì không cần build mới.

---

## 11. Gửi duyệt và phát hành

1. **Pricing and Availability:** chọn giá (Free) và các quốc gia.
2. Trên trang phiên bản, mục **Build** → **+** → chọn build đã qua TestFlight.
3. Chọn cách phát hành:
   - *Manually release*: bạn tự bấm phát hành sau khi được duyệt.
   - *Automatically release*: phát hành ngay khi được duyệt.
   - Hẹn ngày.
4. **Add for Review** → **Submit for Review**. Bấm gửi là việc của chủ tài khoản.
5. Apple duyệt khoảng **50% trong 24 giờ, 90% trong 48 giờ**. Hồ sơ thiếu thì lâu hơn. Trạng thái báo qua email.

**Phát hành theo giai đoạn (Phased Release)** cho các bản cập nhật: Apple đẩy bản mới cho người bật tự cập nhật trong 7 ngày (1% → 2% → 5% → 10% → 20% → 50% → 100%). Tạm dừng được, tổng cộng tối đa 30 ngày. Người tự vào App Store tải thì luôn nhận bản mới ngay.

---

## 12. Cập nhật phiên bản về sau

1. Tăng `expo.version` trong `apps/mobile/app.json` (ví dụ `1.0.0` → `1.0.1`). Số build EAS tự tăng.
2. `npm run build:ios`. Build tự lên TestFlight.
3. App Store Connect → **+ Version**, nhập đúng số phiên bản đó.
4. Điền *What's New*, chọn build, gửi duyệt.

Chỉ sửa JS/giao diện nhỏ thì cân nhắc EAS Update (`docs/04-expo-eas-build.md`, mục 8): không phải chờ duyệt.

Tài liệu gốc: [EAS Submit iOS](https://docs.expo.dev/submit/ios/) · [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview) · [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) · [Thông tin phiên bản](https://developer.apple.com/help/app-store-connect/reference/platform-version-information) · [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Phased release](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases)
