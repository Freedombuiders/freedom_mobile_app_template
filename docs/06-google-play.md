# 06. Đưa app lên Google Play (Android)

Thứ tự tổng quát:

1. Tạo tài khoản nhà phát triển.
2. Tạo app.
3. Build AAB và tải bản đầu lên **Internal testing**.
4. Tạo khoá service account để từ bản sau gửi bằng lệnh.
5. Điền trang cửa hàng và mục *App content*.
6. Chạy closed testing. Tài khoản cá nhân phải có ít nhất 12 người thử trong 14 ngày.
7. Xin quyền Production, rồi phát hành.

Trong tài liệu, `<domain>` là tên miền production của bạn (giá trị `webUrl` trong `packages/shared/src/app-info.ts`).

> Số liệu dưới đây kiểm tra tháng 11/2026. Google đổi chính sách khá thường xuyên: kiểm tra lại trên trang chính thức trước khi làm.

---

## 1. Tài khoản nhà phát triển

Đăng ký tại https://play.google.com/console:

- Phí **25 USD, trả một lần**. Không nhận thẻ trả trước.
- Google có thể yêu cầu **giấy tờ tùy thân và thẻ tín dụng đứng tên bạn** để xác minh. Thông tin sai thì không được hoàn phí.
- Xác minh số điện thoại và email liên hệ. **Email liên hệ hiện công khai** trên trang app.

| | Cá nhân (Personal) | Tổ chức (Organization) |
|---|---|---|
| Dành cho | Cá nhân, người làm app một mình | Công ty, tổ chức |
| Giấy tờ | Giấy tờ tùy thân | Số **D-U-N-S** (miễn phí từ Dun & Bradstreet, cẩn thận dịch vụ thu phí) |
| Bắt buộc dùng loại này khi | | App tài chính, sức khoẻ, VPN, app của cơ quan nhà nước |
| **Thử nghiệm trước khi lên Production** | **Bắt buộc** với tài khoản tạo sau 13/11/2023: closed testing với **ít nhất 12 người**, tham gia **liên tục ít nhất 14 ngày** | Không bắt buộc |
| Thêm | Phải xác minh có thiết bị Android thật qua app Play Console | |

Muốn phát hành ở **EU** thì phải khai *trader status* theo Đạo luật Dịch vụ số (DSA). Nếu là "trader", thông tin liên hệ sẽ hiện công khai.

---

## 2. Tạo app

Play Console → **Create app**:

| Ô | Điền |
|---|---|
| App name | ≤ 30 ký tự |
| Default language | Ví dụ Vietnamese – vi-VN |
| App or game | App |
| Free or paid | **Free**. Google không cho đổi app miễn phí sang trả phí sau khi đã phát hành, nên quyết định trước |
| Declarations | Đồng ý Developer Program Policies, luật xuất khẩu Hoa Kỳ, và điều khoản Play App Signing |

Package name lấy từ `android.package` trong `apps/mobile/app.json` (`com.freedombuilders.freedomapp`). Nó **bị khoá vĩnh viễn từ lần tải AAB đầu tiên** và phải là duy nhất trên toàn Google Play. Đổi trong `app.json` trước khi build lần đầu.

---

## 3. Bản AAB đầu tiên → Internal testing

```bash
npm run build:android        # profile production → file .aab, versionCode tự tăng
```

Build xong, tải file `.aab` từ link build trên expo.dev.

**Tải lên tay lần đầu (khuyên dùng):**

1. Play Console → app → **Test and release** → **Testing** → **Internal testing** → **Create new release**.
2. **Play App Signing**: giữ mặc định (Google tạo và giữ khoá ký app). Keystore trên EAS trở thành *upload key*: chỉ dùng để tải lên, Google ký lại trước khi phát.
3. Kéo file `.aab` vào. Viết ghi chú phát hành → **Next** → **Save and publish** (hoặc *Start rollout to Internal testing*).
4. Tab **Testers**: tạo danh sách email người thử (tối đa 100), lưu, rồi gửi họ **link tham gia** (*Copy link*).

Theo tài liệu Expo hiện tại, `eas submit` cũng tạo được bản phát hành đầu tiên trên Internal testing, nên tải tay là **không bắt buộc**. Tải tay lần đầu thì chưa cần service account, và bạn thấy rõ bước Play App Signing.

Nếu `eas submit` lần đầu báo không tìm thấy app hoặc package, cứ tải tay như trên rồi dùng lệnh từ bản sau. Dù cách nào, app vẫn ở trạng thái nháp cho tới khi bạn điền xong các mục bắt buộc.

Máy đang cài APK (`npm run build:apk`) phải **gỡ app ra** rồi mới cài được bản từ Play. Hai bản ký bằng hai khoá khác nhau.

---

## 4. Gửi bằng lệnh: khoá service account (làm một lần)

`npm run submit:android` cần một khoá JSON của Google service account, đặt ở `apps/mobile/google-play-service-account.json`:

- `eas.json` → `submit.production.android.serviceAccountKeyPath`.
- File đã bị chặn trong `.gitignore` và `.easignore`. **Không bao giờ commit nó.**

**Bên Google Cloud** (https://console.cloud.google.com):

1. Tạo hoặc chọn một project.
2. Bật **Google Play Android Developer API** (tìm trong *APIs & Services* → *Library* → **Enable**).
3. **IAM & Admin** → **Service Accounts** → **Create Service Account**. Đặt tên dễ hiểu, ví dụ `eas-submit` → *Create and close*.
4. Chép **email** của service account (dạng `…@….iam.gserviceaccount.com`).
5. Bên phải service account → **Manage keys** → **Add key** → **Create new key** → **JSON**. Lưu file tải về thành `apps/mobile/google-play-service-account.json`.

**Bên Play Console:**

6. **Users and permissions** → **Invite new users** → dán email service account.
7. Tab *App permissions* chọn app của bạn (hoặc tab *Account permissions* để áp cho mọi app), rồi cấp:
   - *View app information (read-only)*
   - *Edit and delete draft apps*
   - *Release to production, exclude devices, and use Play App Signing*
   - *Release apps to testing tracks*
   - *Manage testing tracks and edit tester lists*
   - *Manage store presence*

   Không cần Admin, dữ liệu tài chính hay trả lời đánh giá.
8. **Invite user**. Quyền có thể mất một lúc mới có hiệu lực. Nếu lần gửi đầu báo thiếu quyền, chờ rồi thử lại.

Từ đó, mỗi bản mới:

```bash
npm run build:android                                   # build AAB
npm run submit:android                                  # gửi AAB mới nhất
# hoặc gộp:
npm run build:android -w @app/mobile -- --auto-submit
```

Cách khác: tải khoá lên EAS (`cd apps/mobile && npx --yes eas-cli@latest credentials -p android` → *Google Service Account*). Khi đó máy khác (hoặc CI) gửi được mà không cần file trên máy.

---

## 5. Các track phát hành và `eas.json`

| Track trong Play Console | Giá trị `track` trong `eas.json` | Ai thấy | Ghi chú |
|---|---|---|---|
| Internal testing | `internal` | Tối đa 100 người trong danh sách | Có rất nhanh. Dùng để tự kiểm tra |
| Closed testing | `alpha` | Danh sách email hoặc Google Group | **12 người × 14 ngày** cho tài khoản cá nhân diễn ra ở đây |
| Open testing | `beta` | Ai cũng tham gia được từ trang cửa hàng | Tùy chọn |
| Production | `production` | Mọi người | Tài khoản cá nhân phải xin quyền trước (mục 8) |

Mặc định template gửi vào `internal` dạng **nháp**:

```json
"android": {
  "serviceAccountKeyPath": "./google-play-service-account.json",
  "track": "internal",
  "releaseStatus": "draft"
}
```

- `releaseStatus: "draft"`: bản được tải lên nhưng chưa phát. Bạn vào Play Console bấm phát hành. An toàn nhất, nên giữ.
- `"completed"`: phát ngay cho track đó. `"inProgress"` kèm `"rollout": 0.1`: phát cho 10% người dùng.
- Đổi `track` sang `alpha` hoặc `production` khi muốn gửi thẳng vào track đó. Cũng có thể **Promote release** từ track thấp lên track cao ngay trong Play Console.

---

## 6. Trang cửa hàng (Grow users → Store presence → Main store listing)

| Ô | Giới hạn / quy cách | Gợi ý |
|---|---|---|
| App name | ≤ 30 ký tự | |
| Short description | ≤ 80 ký tự | Một câu nói app làm gì |
| Full description | ≤ 4.000 ký tự | Không nhồi từ khoá, không nhắc App Store/iPhone |
| App icon | 512 × 512, PNG 32-bit (có alpha), ≤ 1 MB | Xuất từ cùng file gốc với icon app |
| Feature graphic | **1024 × 500**, JPEG hoặc PNG 24-bit (không alpha) | Bắt buộc |
| Phone screenshots | 2–8 ảnh; JPEG/PNG 24-bit; cạnh 320–3840 px; cạnh dài ≤ 2 lần cạnh ngắn | Nên có **ít nhất 4 ảnh dọc 1080 × 1920 (9:16)** để được Google đề xuất |
| Tablet screenshots | Tùy chọn | Thêm nếu app chạy tốt trên tablet |
| Category, Tags | Chọn trong danh sách | |
| Contact email | Bắt buộc, hiện công khai | Email hỗ trợ (`APP_INFO.supportEmail`) |
| Website | Tùy chọn | `https://<domain>` |
| Privacy policy | Bắt buộc | `https://<domain>/privacy` |

---

## 7. App content (Policy and programs → App content)

Trả lời từng mục, đúng với **những gì app thật sự làm**:

**Privacy policy.** `https://<domain>/privacy`. Trang phải mở được và nhắc đúng tên app hoặc nhà phát triển.

**App access.** Chọn *All or some functionality is restricted* → **Add instructions**:

- Tên, email và mật khẩu của **tài khoản demo** trên production, có sẵn dữ liệu mẫu.
- Vài dòng tiếng Anh chỉ đường, ví dụ: `Sign in with the account above. Delete account: Settings → "Xoá tài khoản".`

Không xoá tài khoản demo khi app còn đang duyệt.

**Ads.** *No, my app does not contain ads* (template không có quảng cáo).

**Advertising ID.** App không dùng mã quảng cáo → **No**. Nếu sau này thêm SDK quảng cáo hoặc phân tích, kiểm tra lại câu này.

**Content rating.** Bảng câu hỏi IARC:

- Chọn loại app (thường là *All Other App Types*), nhập email.
- Trả lời **No** cho bạo lực, tình dục, ngôn từ, chất kích thích, cờ bạc nếu app không có.
- *Users can interact or exchange content*: trả lời **thật**. Có chat, chia sẻ, bình luận thì là Yes.
- Kết quả thường là *Everyone / 3+*.

**Target audience and content.** Chọn nhóm tuổi người dùng thật:

- App cho người lớn: chọn 18+ (hoặc 13+).
- Chọn nhóm **dưới 13 tuổi** thì app phải theo **Families Policy**: hạn chế SDK, không mã quảng cáo… Nên cân nhắc kỹ.

**Data safety.** Phần quan trọng nhất. Template mặc định:

- *Does your app collect or share any of the required user data types?* → **Yes**
- *Is all of the user data collected by your app encrypted in transit?* → **Yes** (chỉ dùng HTTPS)
- *Do you provide a way for users to request that their data is deleted?* → **Yes**
- **Delete account URL:** `https://<domain>/delete-account`

  Google bắt buộc có link web để xin xoá tài khoản mà không phải cài lại app, ngoài nút xoá trong app. Template đã có cả hai.

| Nhóm → loại dữ liệu | Thu (collected) | Chia sẻ (shared) | Bắt buộc? | Mục đích |
|---|---|---|---|---|
| Personal info → Name | Có | Không | Bắt buộc | App functionality, Account management |
| Personal info → Email address | Có | Không | Bắt buộc | App functionality, Account management |
| Personal info → User IDs | Có | Không | Bắt buộc | App functionality, Account management |
| App activity → Other user-generated content (ghi chú) | Có | Không | Bắt buộc | App functionality |

Về các mục còn lại:

- Cloudflare lưu trữ thay mặt bạn, **không tính là "chia sẻ"** theo định nghĩa của Google.
- Không khai Location, Device IDs, Financial, Health, Contacts, App info & performance nếu app không thu.
- Thêm SDK báo lỗi hay phân tích thì phải khai thêm, ví dụ *App info and performance → Crash logs*.

**Các khai báo khác:**

- *News apps*, *Government apps*, *Financial features*, *Health apps*: trả lời **No/None** nếu không phải.
- App tài chính hoặc sức khoẻ có thể phải dùng tài khoản tổ chức.
- Nếu app xin quyền đặc biệt (ảnh/video, vị trí nền, foreground service…), Play Console hiện thêm mục khai báo riêng.

---

## 8. Quốc gia, giá, và xin quyền Production

**Countries/regions:** Production → *Countries / regions* → chọn nước, ví dụ chỉ Việt Nam lúc đầu. **Pricing:** Free.

**Closed testing (tài khoản cá nhân):**

1. *Testing* → **Closed testing** → tạo release, bằng tay hoặc `track: "alpha"`.
2. Thêm người thử bằng danh sách email hoặc một Google Group. Gửi họ link tham gia.
3. Cần **ít nhất 12 người opt-in liên tục ≥ 14 ngày**. Ai rời rồi vào lại thì tính lại từ đầu.
4. Mời 15–20 người để dự phòng. Nhắc họ mở app thật và góp ý. Đẩy vài bản cập nhật trong đợt thử.
5. Đủ điều kiện → **Dashboard** → **Apply for production**. Trả lời câu hỏi về đợt thử: tìm người thử thế nào, họ góp ý gì, bạn đã sửa gì. Google duyệt đơn này mất thêm vài ngày (kiểm tra lại trên trang chính thức).

**Gửi bản Production:**

- Tạo release ở *Production*, hoặc **Promote release** từ track thử.
- Có thể chọn **staged rollout**, ví dụ 20% người dùng trước.

**Thời gian duyệt:** thường từ vài giờ tới **7 ngày**, có khi lâu hơn. Tài khoản mới thường bị duyệt kỹ hơn. Trang *Publishing overview* cho biết trạng thái. Bật **Managed publishing** nếu muốn tự chọn lúc nào bản đã duyệt được phát hành.

---

## 9. Cập nhật về sau

1. Tăng `expo.version` trong `apps/mobile/app.json`. `versionCode` EAS tự tăng.
2. `npm run build:android`, rồi `npm run submit:android`. Bản mới vào track trong `eas.json` dạng nháp.
3. Play Console: viết *Release notes*, rồi phát hành hoặc promote lên Production.

**Target API level:** từ 31/08/2026, app mới và bản cập nhật phải target **Android 16 (API 36)** trở lên. Gia hạn tối đa tới 01/11/2026. Năm nào Google cũng nâng mức này.

- Bản Expo SDK mới thường đã target đúng mức.
- Play Console báo lỗi target API thì nâng Expo SDK rồi build lại.
- Mỗi năm kiểm tra lại https://developer.android.com/google/play/requirements/target-sdk

Thêm hoặc đổi dữ liệu thu thập thì sửa cùng lúc **Data safety**, nhãn **App Privacy** của Apple và trang `/privacy`.

Tài liệu gốc: [EAS Submit Android](https://docs.expo.dev/submit/android/) · [Tạo service account](https://github.com/expo/fyi/blob/main/creating-google-service-account.md) · [Yêu cầu thử nghiệm tài khoản cá nhân](https://support.google.com/googleplay/android-developer/answer/14151465) · [Loại tài khoản](https://support.google.com/googleplay/android-developer/answer/13634885) · [Ảnh và đồ hoạ](https://support.google.com/googleplay/android-developer/answer/9866151) · [Xoá tài khoản](https://support.google.com/googleplay/android-developer/answer/13327111) · [Target API](https://developer.android.com/google/play/requirements/target-sdk)
