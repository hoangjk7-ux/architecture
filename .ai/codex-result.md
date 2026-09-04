## UX P0 - Architecture Map

- Review: Codex xác nhận UX review còn đúng ở semantics của clear criteria, active criteria, ARIA, visibility labels, responsive overlays và camera; các phần help/filter/quick-read/MiniMap đã có một phần implementation tại HEAD.
- Implementation: cập nhật `src/pages/architecture/page.tsx`; giữ lens độc lập, gom filter vào popover có criteria/badge, thêm ARIA state, quick-read/help responsive, visibility labels đúng hành động, fit overview/zone và đồng bộ số node được nhấn mạnh.
- Scope: không chạm `OpenHands/`, `.env*`, backend hoặc auth; không commit.
- Validation: `pnpm run typecheck` đạt; `pnpm run lint` đạt với 1 warning Fast Refresh có sẵn tại `src/components/providers/language.tsx`; focused architecture layout test đạt 9/9; `pnpm run build` đạt; `git diff --check` đạt.
- Supervision feedback: vòng hai yêu cầu rà lại ARIA, camera request loop/stale state, không reset lens Risk khi clear, i18n criteria và overflow 320px. Codex đã rà lại; không có lỗi mới cần sửa.
- Remaining risk: chưa có component/integration test cho popover, ARIA và camera; semantic zoom, edge aggregation và bundle P1 chưa thực hiện. Architecture chunk hiện 327.76 kB minified / 83.64 kB gzip.

## UX P1 - Semantic Zoom

- Review: P1 được giới hạn vào semantic zoom và giảm nhiễu edge; không thực hiện edge aggregation lớn vì chưa có oracle kiểm thử phù hợp.
- Implementation: tại `src/pages/architecture/page.tsx`, zoom xa ẩn metadata/subtitle, giảm chi tiết node, ẩn edge label và realtime animation; zoom gần khôi phục chi tiết. Edge được chọn vẫn có label để giữ khả năng điều tra.
- Camera: dùng viewport `onMove` và ngưỡng zoom ổn định, không thay đổi dữ liệu/layout và không tạo state update cho mỗi frame.
- Validation: `pnpm run typecheck` đạt; focused architecture layout test đạt 9/9; `pnpm run lint` đạt với 1 warning Fast Refresh có sẵn; `pnpm run build` đạt; `git diff --check` đạt.
- Remaining risk: chưa có visual/component test ở nhiều viewport và dataset lớn; edge crossing/aggregation, risk-ranked overview và bundle optimization vẫn là phần P1 tiếp theo. Build hiện ghi Architecture chunk 327.60 kB minified / 83.72 kB gzip.
