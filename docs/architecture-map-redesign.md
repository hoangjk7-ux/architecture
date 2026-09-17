# Review và phương án thiết kế lại bản đồ kiến trúc

Ngày review: 2026-09-17. Phạm vi: mã nguồn hiện tại, bao gồm thay đổi chưa commit; chưa kiểm tra giao diện trong trình duyệt hoặc dữ liệu Convex thực tế. Các nhận định về độ dễ đọc cần được xác nhận bằng prototype và dữ liệu đại diện. Chưa thay đổi runtime.

## Kết luận

Đề xuất chuyển màn hình mặc định từ sơ đồ đồng tâm sang bản đồ hệ thống theo nhóm nghiệp vụ. Giữ React Flow và inspector hiện có. Tách rõ ba chiều: nhóm nghiệp vụ, vòng đời hệ thống, sức khỏe kết nối. Quan hệ tích hợp phải truy nguyên được về từng bản ghi.

## Findings theo ưu tiên

| Mức | Phát hiện và bằng chứng | Hệ quả / hướng xử lý |
| --- | --- | --- |
| P1 | `buildIntegrationMetrics` trong `src/pages/architecture/architecture-layout.ts:414` dùng `unknown` vừa làm giá trị khởi tạo vừa làm trạng thái thật; nhánh dòng 437 ghi đè unknown bằng healthy. Đã tái hiện: `[unknown, healthy] → healthy`, đảo thứ tự → unknown. | Màu node, lọc health và phân loại risk có thể thay đổi chỉ vì thứ tự dữ liệu. Khởi tạo từ cạnh đầu tiên, sau đó lấy độ ưu tiên lớn nhất; thống nhất với `worstHealthFor` ở `page.tsx:1660`. |
| P1 | `buildArchitectureModel` ở `architecture-layout.ts:453–470` chọn 1–3 hub theo điểm gồm số kết nối, type, criticality, architectureScore; `page.tsx:1896` gắn tiêu đề lõi dữ liệu và điều phối. | Điểm kết nối không chứng minh vai trò lõi hay điều phối. Hiển thị nhãn “Nhiều kết nối”; chỉ ghi “Core” theo dữ liệu type. Thay đổi health không được làm node đổi nhóm/vị trí. |
| P1 | `classifyEcosystemGroup` ở `architecture-layout.ts:53` ưu tiên legacy/inactive/nợ >=75 rồi pilot trước phân loại nghiệp vụ. | LMS có nợ cao mất nhóm học thuật. Giữ domain ổn định, biểu diễn legacy/pilot/nợ bằng badge hoặc bộ lọc độc lập. |
| P2 | `layoutNodes` tạo đủ sáu callout kể cả nhóm rỗng; `overviewFitNodes` ở `page.tsx:3878` đưa toàn bộ callout vào fit. Hình học kéo callout ra ngoài vòng ngoài. | Vùng trang trí làm tăng bounds và giảm tỷ lệ chữ; cần đo trên trình duyệt. Chỉ fit node/cụm dữ liệu đang hiển thị, bỏ nhóm rỗng khỏi bounds. |
| P2 | `GlowEdge` ở `page.tsx:1361` dùng cùng Bezier theo tọa độ/handle cho từng cạnh, không phân làn các cạnh cùng cặp endpoint. | Nhiều integration cùng nguồn/đích có thể chồng nhau; khó chọn từng bản ghi. Dùng đường tổng hợp có số lượng, click mở danh sách; khi cần chi tiết mới tách làn. |
| P2 | `filteredSystems` ở `page.tsx:3984` dùng để giảm opacity, trong khi hidden zone dùng `hidden`. | “Lọc” và “làm nổi bật” khác hành vi nhưng dễ bị hiểu giống nhau. Filter loại khỏi view; chọn node giữ context và làm mờ hàng xóm không liên quan. |
| P2 | URL chỉ khởi tạo state view/system/integration rồi effect ghi state trở lại URL (`page.tsx:3841–3946`); lens và filters không được lưu. | Link chia sẻ chưa tái tạo đầy đủ góc nhìn; cần test Back/Forward và đồng bộ URL hai chiều có kiểm tra giá trị. |
| P2 | Inspector map cố định 340px, trong khi canvas và toolbar có nhiều thành phần; `page.tsx` khoảng 5.7k dòng, chứa cả module CRUD, flow, Gantt và department. | Cần kiểm tra màn hình hẹp; dùng drawer khi thiếu chiều rộng và tách component theo phần được sửa để giảm rủi ro hồi quy. |

Những phần đã tốt và nên giữ: layout được memo hóa độc lập với selection, có inspector riêng cho integration, trợ giúp và minimap có thể thu gọn, focus cụm có điều khiển camera, đã có test cho layout/edge presentation. Không lặp lại các lỗi từ review cũ đã được sửa.

## Thiết kế đề xuất

### Cấu trúc màn hình

```text
Kiến trúc hệ thống          [Tìm hệ thống…] [Bộ lọc • 2] [Toàn cảnh]
[Tổng quan | Kết nối]       Góc nhìn: [Hệ sinh thái | Rủi ro]
Đang hiển thị 24/30 hệ thống · 42 tích hợp    [Điều kiện đang áp dụng ×]
┌──────────────────────────────────────────┬────────────────────────┐
│ Nhóm nghiệp vụ, mở rộng/thu gọn           │ Chi tiết khi chọn      │
│                                          │ Tên • loại • vòng đời  │
│ [Học thuật]       [Vận hành nội bộ]        │ Owner • mức quan trọng │
│  SIS   LMS         ERP   HRM              │ Kết nối vào / ra       │
│                                          │ Cảnh báo có lý do      │
│ [Dữ liệu & nền tảng] [Tích hợp & tự động] │ Modules / thông tin    │
│  DWH   SSO          Gateway              │                        │
│                  [−] [+] [Fit]           │                        │
└──────────────────────────────────────────┴────────────────────────┘
```

Đây là wireframe định hướng, không phải bố cục đã xác minh trên dữ liệu thật. Timeline và Phòng ban vẫn giữ khả năng truy cập hiện có; không đưa thêm nội dung của chúng vào canvas tổng quan.

- **Tổng quan:** nhóm nghiệp vụ ổn định, node xếp lưới trong nhóm; chỉ nhóm có dữ liệu được render. Tạm dùng phân loại category có fallback “Chưa phân nhóm”, không tự coi mọi category lạ là vận hành nội bộ. Nếu cần chỉnh domain bằng người dùng, bổ sung trường tùy chọn và backfill có preview ở giai đoạn riêng.
- **Kết nối:** chọn một hệ thống để xem luồng vào/ra một bước, có lựa chọn mở rộng. Giữ hướng mũi tên; phân biệt “liên kết trực tiếp” với “phạm vi ảnh hưởng tiềm năng”, không suy luận impact chỉ từ đường nối.
- **Node:** tên, loại hệ thống và một tín hiệu cần chú ý; thông tin owner, công nghệ, chi phí, modules chuyển vào inspector. Kích thước khung không đổi khi zoom; giảm chi tiết thay vì làm card phình ra.
- **Cạnh:** mặc định trung tính; màu cảnh báo dành cho degraded/down, unknown có ký hiệu và nhãn riêng. Số lượng trên đường gộp phải mở được toàn bộ integration gốc, gồm các chiều khác nhau. Bộ lọc áp dụng trước khi gộp; số lượng và trạng thái lấy từ tập còn lại. Luôn có danh sách để chọn chính xác khi đường khó click.
- **Góc nhìn rủi ro:** giữ nguyên vị trí; đổi badge/viền và hiện lý do cụ thể như nợ kỹ thuật cao hoặc tích hợp down. Không gọi sức khỏe tích hợp là uptime của hệ thống; dữ liệu hiện tại không chứng minh điều đó.
- **Tương tác:** tìm kiếm chọn kết quả sẽ focus node; filter có chip xóa từng điều kiện và reset. Click nền bỏ selection, không xóa filter. Fit và reset là hai hành động khác nhau. Không tự fit sau mỗi cập nhật dữ liệu.
- **Màn hình hẹp:** inspector là drawer; bảng danh sách hệ thống/kết nối là đường truy cập thay thế. Có nhãn nút, trạng thái bàn phím, trả focus khi đóng drawer, tín hiệu ngoài màu và giảm animation theo tùy chọn hệ điều hành.

### Những gì không cần xây ở đợt đầu

Không thay thư viện đồ thị, không thêm engine layout, không xây editor kéo-thả lưu tọa độ và không thêm quan hệ chưa có trong dữ liệu. Giữ các tuyến flow/Gantt/department hiện hữu trong khi nâng cấp map.

## Lộ trình triển khai

1. **Sửa tính đúng dữ liệu:** thống nhất health reducer; regression test hoán vị, tập rỗng, healthy/unknown/degraded/down; tách nhãn hub khỏi core. Hoàn tất trước thay đổi màu/legend.
2. **Prototype tổng quan:** dùng dữ liệu giả lập 5/25/80 hệ thống, tên dài và nhóm rỗng; thử layout nhóm nghiệp vụ trên 1440×900 và 1280×720. Đánh giá khả năng đọc rồi mới thay mặc định. Dùng lại node/inspector hiện có khi phù hợp.
3. **Luồng tương tác:** tìm kiếm, filter thật, focus một bước, danh sách cạnh song song, URL tái hiện góc nhìn và drawer responsive. Giữ quyền chỉnh sửa modules hiện có.
4. **Hoàn thiện và kiểm chứng:** legend đúng ngữ nghĩa, tiếng Việt/Anh nhất quán, bàn phím/reduced motion; chạy build/lint và tests phù hợp. Xóa code layout cũ sau khi xác nhận thay thế, không refactor toàn trang cùng lúc.

## Tiêu chí nghiệm thu

- Đảo thứ tự integrations không đổi health tổng hợp; không có integration hiện “chưa có dữ liệu”, không tự coi healthy.
- Hệ thống không đổi nhóm/vị trí khi chọn node, đổi lens hay đổi health. Nếu thêm/xóa hệ thống làm layout thay đổi, giới hạn thay đổi trong nhóm bị tác động.
- Bộ dữ liệu 5/25/80 hệ thống không chồng khung node; fit không tính nhóm rỗng/trang trí. Kiểm tra chữ thực tế ở hai viewport desktop và drawer ở 390px; không lấy việc test tọa độ pass làm bằng chứng chữ đọc được.
- Các integration cùng endpoint, ngược chiều và self-loop đều có thể truy cập riêng; nhóm cạnh luôn truy nguyên được ID gốc.
- Filter, counters, danh sách và đồ thị dùng cùng tập dữ liệu; reset khôi phục rõ ràng. Link chia sẻ tái hiện lens/filter/selection hợp lệ; Back/Forward không bị effect ghi đè.
- Có trạng thái loading, dữ liệu rỗng, không khớp bộ lọc và ID đã xóa; không nhầm các trường hợp này.
- Kiểm tra bàn phím và màn hình hẹp; thao tác chỉnh sửa hiện có vẫn giữ phân quyền.

## Kiểm chứng đã thực hiện

- `pnpm exec vitest run src/pages/architecture/architecture-layout.test.ts`: 18/18 tests pass.
- Tái hiện trực tiếp lỗi health bằng import module TypeScript với Node: unknown→healthy khác healthy→unknown. Suite hiện tại chưa bảo vệ invariant này.
- Không chạy build/lint vì chỉ thêm tài liệu; không truy cập `.env.local`, không sửa dữ liệu backend và không thay các chỉnh sửa runtime đang có của người dùng.
