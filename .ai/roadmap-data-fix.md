# Roadmap — nguồn Project từ Kho hệ thống

## Nguyên nhân

`roadmap.list` trước đây đọc tất cả `roadmap_items`, chỉ thay tên Project bằng
`software_systems.name`, còn nội dung kế hoạch vẫn là dữ liệu seed. Khi liên kết
mất, query dùng lại tên cũ. `getStats` đếm cả dữ liệu đó. Form tạo Project ẩn tên
nhưng vẫn yêu cầu tên không rỗng trước khi gọi backend.

## Thay đổi

- Tab Lộ trình liệt kê hệ thống chưa có kế hoạch trực tiếp từ
  `software_systems.list`, cho phép chọn để tạo Project. Vẫn cần Initiative và
  Program làm cấp cha; form hướng dẫn khi chưa có cấp cha.
- Tên Project luôn được lấy từ hệ thống liên kết, cả lúc ghi và lúc đọc.
  Frontend/backend chấp nhận tạo Project mà người dùng không nhập tên riêng.
- Danh sách và thống kê dùng chung `roadmapView`: loại Project không có đúng
  một liên kết hợp lệ cùng các mục con. Không fallback về tên Project cũ.
- Ngừng tạo 21 bản ghi Roadmap mẫu trong `seedData`. Snapshot các trường kế
  hoạch của chúng được giữ tại `convex/domain/legacyRoadmapSeed.json` để nhận
  diện bản ghi cũ. Chỉ khi tất cả trường snapshot khớp mới loại khỏi view;
  không dựa trên tên hay một vài từ khóa. Tên và ID liên kết không nằm trong
  snapshot vì từng được đổi độc lập với dữ liệu mẫu.
- Không xóa hay sửa dữ liệu database. Bản ghi có nội dung kế hoạch đã chỉnh
  sửa được giữ lại, kể cả khi có nguồn gốc từ seed. Các mục con thực tế không
  bị loại chỉ vì cấp cha là seed; UI hiện chúng như gốc khi cha bị ẩn.
- Import Sprint kiểm tra liên kết hệ thống của Project tại backend.

## Giới hạn và vận hành

Owner, ngày, trạng thái, mô tả, điểm và ưu tiên vẫn là thông tin kế hoạch
người dùng nhập; chúng không được suy ra từ tình trạng hoạt động của hệ thống.
Không tạo tự động Initiative/Program, lịch hay tiến độ giả.

Snapshot chỉ nhận diện seed đã biết trong mã nguồn hiện tại. Seed cũ đã sửa
một phần cần kiểm tra thủ công; không suy đoán rằng tất cả bản ghi cũ là giả.
Chưa truy cập deployment, deploy backend hoặc chạy migration/seed thực tế.
Thay đổi cần được triển khai frontend và Convex để có hiệu lực trên ứng dụng.

## Kiểm tra

- Build đạt; ESLint các file thay đổi và `git diff --check` đạt.
- Test tập trung: 9/9 đạt (Roadmap domain, import, nguồn dữ liệu).
- Toàn bộ test: 112 đạt, 1 lỗi trong test `custom_admin` đã có thay đổi chưa
  commit trước task, tại `convex/security/users.security.test.ts`.
- Lint toàn repo: lỗi `no-explicit-any` tại chính test trên; warning Fast
  Refresh có sẵn tại `src/components/providers/language.tsx`.
- Không sửa các file dirty có sẵn: `.ai/codex-result.md`,
  `convex/_generated/api.d.ts`, `convex/security/users.security.test.ts`.
