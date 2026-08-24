# Codex review — Internal resource allocation & Architecture Map zones

## Kết luận ngắn

Cả 6 finding đều có cơ sở. Điểm 1 cần sửa nhẹ cách mô tả hậu quả: `undefined` không được commit vào cột `v.string()`; thao tác insert/mutation sẽ thất bại và transaction bị rollback. Rủi ro thực tế vẫn đúng: API chấp nhận chuỗi rỗng ở validator đầu vào nhưng không trả một `domainError` thân thiện. Điểm 2 đúng hoàn toàn ở tầng domain helper và còn có thể làm hỏng toàn bộ query `listBySystem` nếu dữ liệu rỗng/malformed đã tồn tại.

## Xác nhận từng finding

### 1. `createAllocation` và non-null assertion — Xác nhận, severity cao

- `allocationArgs.startDate/endDate` dùng `v.string()` (`convex/internal_resources.ts:132-139`), nên `""` và chuỗi chỉ có khoảng trắng qua được argument validation.
- `orderedDates` gọi `isoDate`; `isoDate` chủ động trả `undefined` khi giá trị `undefined`, rỗng hoặc chỉ có whitespace (`convex/domain/common.ts:63-68`). Vì vậy `dates.start`/`dates.end` có thể thực sự là `undefined`.
- Dấu `!` tại `convex/internal_resources.ts:159-160` chỉ làm TypeScript im lặng, không biến đổi runtime value.
- Tuy nhiên câu “có thể ghi `undefined` vào cột schema” chưa chính xác về kết quả cuối: Convex không commit document không hợp schema/không serialize được. `ctx.db.insert` sẽ throw và toàn bộ mutation transaction bị rollback. Không có allocation nửa vời và các read trước đó không tạo side effect.
- Finding cốt lõi vẫn đúng: contract đầu vào nói “string bất kỳ”, domain helper coi rỗng là optional, trong khi schema đích bắt buộc string. Caller ngoài UI có thể kích hoạt lỗi validation/serialization thô thay vì `ConvexError({ code: "VALIDATION_ERROR", ... })`.
- UI hiện chặn falsy `startDate/endDate`, nhưng đây không phải bảo vệ domain/API và không chặn chuỗi whitespace từ caller khác.

### 2. `calculateInternalResourceBudget` trả NaN — Xác nhận, severity cao

- Với ngày rỗng/whitespace, `orderedDates` trả `undefined`; template literal tạo `"undefinedT00:00:00Z"`, hai `Date` đều invalid, rồi `days`, `months`, `estimatedCost` đều thành `NaN` (`convex/domain/internalResources.ts:13-30`).
- `numberInRange` chỉ kiểm tra ba trường số, không cứu được lỗi ngày.
- `listBySystem` tính budget cho mọi allocation có rate (`convex/internal_resources.ts:105-129`). Vì schema cho phép chuỗi rỗng, dữ liệu rỗng được import/ghi bởi đường khác có thể đi vào helper. Tùy đường serialize/render, kết quả sẽ là `NaN` ở UI hoặc query sẽ thất bại; ít nhất không có lỗi domain rõ ràng. `item.months.toFixed(1)` cho chuỗi `"NaN"`, và formatter tiền có thể hiển thị `NaN`.
- Tests hiện chỉ phủ timeline hợp lệ, một ngày và đảo ngược; không phủ rỗng, whitespace, format sai, ngày lịch không tồn tại. Finding này nên được xem độc lập với điểm 1 vì helper là exported domain logic.

### 3. Xóa allocation không bắt lỗi — Xác nhận, severity trung bình

Handler tại `src/pages/systems/page.tsx:578-582` `await removeAllocation` rồi toast success nhưng không có `try/catch`. Permission, network, hoặc `NOT_FOUND` do concurrent tab sẽ tạo rejected promise/unhandled event; user không nhận toast thất bại. Success toast chỉ chạy khi mutation resolve, nên không có false-success, nhưng UX thất bại không được xử lý và khác với luồng create.

### 4. Zone xuất hiện trong MiniMap — Xác nhận, severity trung bình

Sáu zone được đưa vào cùng mảng `nodes`, có kích thước thật và không có `hidden` (`src/pages/architecture/page.tsx:2558-2583`). `MiniMap.nodeColor` tại khoảng `2942` chỉ dựa vào `node.data.system?.type`; zone không có `system` nên rơi về màu mặc định. `selectable: false` và `pointerEvents: none` không loại node khỏi MiniMap. Do zone rất lớn, chúng sẽ thành các khối nền lớn và có thể che/làm sai tỷ lệ biểu diễn hệ thống.

### 5. `legacyRows` không khớp thuật toán placement — Xác nhận, severity thấp/trung bình

Legacy nodes luôn có `y: laneBottom` và trải ngang bằng `index * colGap` (`src/pages/architecture/page.tsx:758-763`). Không có wrap sau 4 item. Trong khi đó zone height dùng `ceil(legacy.length / 4) * rowGap + 70` (`773`, `842`), nên từ 5 item trở lên box cao thêm dù node vẫn chỉ có một hàng. Width đồng thời vẫn tăng theo toàn bộ số item, xác nhận đây không phải layout nhiều hàng bị thiếu riêng ở phép tính width.

### 6. Tính integration metrics hai lần — Xác nhận, severity thấp

`layoutNodes` gọi `buildIntegrationMetrics` (`src/pages/architecture/page.tsx:656-660`), còn component tạo một memo `integrationMetrics` thứ hai (`2519-2522`). Cả hai phụ thuộc cùng `integrations`; mỗi thay đổi integrations chạy hai lượt O(E), tạo hai Map riêng. Không sai kết quả nhưng là chi phí trùng lặp và tăng allocation/GC.

## Risk/edge case bổ sung

### A. Schema không bảo đảm referential integrity — severity trung bình

`v.id("software_systems")` và `v.id("internal_resource_rates")` bảo đảm ID đúng loại bảng, nhưng không phải foreign-key constraint tự động. Integrity phụ thuộc vào mọi write path:

- `createAllocation` có kiểm tra cả system và rate tồn tại, đây là điểm tốt.
- `removeRate` query index `by_rate` và từ chối khi còn allocation, đây là điểm tốt.
- `software_systems.remove` đã bổ sung query `by_system` và xóa allocations trong cùng mutation, đây là cleanup đúng hướng.
- Vì các thao tác nằm trong Convex mutation transaction, lỗi giữa chừng rollback toàn bộ; optimistic concurrency cũng ngăn một create/delete cạnh tranh im lặng commit trên snapshot cũ.
- Dù vậy, import/dashboard/manual mutation hoặc write path tương lai có thể tạo dangling IDs; schema tự nó không ngăn điều đó. Nhánh fallback `rate: null` và budget 0 trong `listBySystem` chính là dấu hiệu code đã dự phòng orphan rate, nhưng nó che mất lỗi integrity và làm tổng budget bị understated thay vì báo dữ liệu hỏng.

### B. `listBySystem` không xác nhận system tồn tại — severity thấp

Query nhận một ID đúng loại và trả mảng rỗng nếu system đã bị xóa/không tồn tại. Đây có thể là semantics chấp nhận được cho UI reactive, nhưng khác với create mutation và có thể che dangling/caller bug. Không phải lỗi transaction.

### C. Tính nhất quán ngân sách theo rate hiện tại — cần xác nhận nghiệp vụ

Allocation chỉ lưu `resourceRateId`, không snapshot `monthlyRate`. `listBySystem` luôn dùng rate hiện tại, nên `updateRate` sẽ hồi tố thay đổi estimated budget của mọi allocation quá khứ. Nếu budget là estimate động thì đúng; nếu cần audit/approved budget lịch sử thì schema hiện thiếu snapshot hoặc effective-date/versioning.

### D. Zone rỗng vẫn ảnh hưởng `fitView` và canvas — severity trung bình

Khi có ít nhất một system, code luôn tạo cả sáu zone, kể cả pilot/legacy/left/right/outer không có node. Các zone rỗng vẫn có minimum width/height và tham gia bounds của React Flow. Hậu quả là `fitView` có thể zoom out/chừa khoảng trống không cần thiết; cùng nguyên nhân với lỗi MiniMap nhưng ảnh hưởng cả viewport chính.

### E. Nhãn “nguồn”/“tiêu thụ” không theo hướng integration — severity trung bình

`connectedSatellites` chỉ kiểm tra có liên kết với central; sau đó phân vào `left`/`right` bằng parity của index (`src/pages/architecture/page.tsx:716-750`). Vì vậy một destination có thể nằm trong zone “Vệ tinh nguồn”, và source có thể nằm trong “Vệ tinh tiêu thụ”. Đây là sai semantics trực quan, đặc biệt với node có cả inbound/outbound; cần rule rõ cho hai chiều/tie-break.

### F. Test coverage chưa bảo vệ các invariant mới — severity trung bình

Test domain mới chưa có case ngày bắt buộc/rỗng/whitespace và chưa có test mutation cho cascade system deletion, rate-in-use guard, hoặc cạnh tranh create/delete. Do schema chỉ bảo đảm type chứ không bảo đảm existence, các mutation tests là lớp bảo vệ quan trọng cho reference integrity.

## Ưu tiên đề xuất

1. Chặn ngày thiếu bằng domain validation bắt buộc ở cả create mutation và budget helper; thêm tests cho rỗng/whitespace.
2. Giữ và test transaction/reference invariants: create chỉ dùng parent tồn tại, rate đang dùng không được xóa, xóa system cascade allocations.
3. Bắt lỗi ở delete UI.
4. Loại zone khỏi MiniMap/bounds khi thích hợp và chỉ render zone có nội dung, hoặc xác định rõ chúng có nên tham gia `fitView`.
5. Đồng bộ legacy wrap/height và phân lane theo direction thật.
6. Tái sử dụng một metrics Map cho layout và render.

## Ghi chú phạm vi xác minh

Review dựa trên uncommitted source/diff hiện tại. Không sửa file trong `src/` hoặc `convex/`, và không chạy build/test vì yêu cầu chỉ cho phép ghi đúng file báo cáo này (build/test có thể sinh artifact/cache).
