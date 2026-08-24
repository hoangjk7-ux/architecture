# Review UX “xem tổng thể” — Architecture Map

## Kết luận ngắn

Nhận định chính là đúng: trạng thái mặc định của tab `map` ưu tiên giải thích và điều khiển hơn là cho người xem thấy cấu trúc hệ sinh thái ngay lập tức. Vấn đề không chỉ nằm ở số lượng control; ba yếu tố cộng hưởng mạnh hơn là (1) toolbar và legend có thể wrap làm giảm chiều cao canvas, (2) hai overlay cố định che vùng canvas hữu ích, và (3) `fitView` phải nén toàn bộ layout có kích thước tăng theo số hệ thống, trong khi node chứa quá nhiều chi tiết để còn đọc được ở mức zoom đó.

Đây là review tĩnh từ code, không phải kiểm thử trực quan ở nhiều viewport/dataset. Tuy vậy, các kết luận về việc panel có collapse hay không, state filter, opacity và camera đều có thể xác nhận trực tiếp từ implementation.

## Đối chiếu từng quan sát

### 1. Toolbar quá nhiều control — Đồng ý, với hiệu chỉnh về cách đếm

- Top bar chứa 4 tab điều hướng (`3419–3465`), rồi ở chế độ map có 2 nút lens, 4 nút health, 5 nút type và 5 nút edge-focus (`3467–3552`). Đó là 16 map controls, hoặc 20 nút nếu tính cả tab switcher.
- Tối đa có thêm 3 nút clear: clear system, clear zone và clear all (`3553–3580`). Vì vậy con số cực đại là 19 map controls hoặc 23 nút trong toàn top bar, không chỉ “~20 nút trên một hàng”.
- Cụm filter có `flex-wrap`, và toàn top bar cũng `flex-wrap` (`3417`, `3469`). Do đó nhận định “trên 1 hàng” không luôn đúng; trên laptop nó có thể thành nhiều hàng. Điều này còn bất lợi hơn cho overview vì toolbar tăng chiều cao và lấy trực tiếp chiều cao canvas.
- Các separator dọc không tạo được hierarchy đủ mạnh khi nhóm bị wrap; separator có thể tách khỏi nhóm mà nó định phân cách.
- Ba nút clear có phạm vi chồng lấn. Đặc biệt `hasMapFocus` coi Risk lens là một “focus” và làm hiện “Xoá tất cả”; thao tác đó vừa xóa filter vừa đổi lens về Ecosystem (`3387–3404`). Đây là semantics khó đoán: mode trình bày không nên bị đóng gói như một filter tạm thời mà không nói rõ.

Kết luận: đồng ý với đề xuất gom các filter thứ cấp. Tuy nhiên nên giữ lens Ecosystem/Risk là control cấp cao, luôn nhìn thấy, vì đây là thay đổi mục đích đọc bản đồ chứ không phải filter thông thường. Nút Filters nên có badge và một dải “active criteria” ngắn hoặc tooltip/popover tổng hợp trạng thái.

### 2. Legend dày — Đồng ý

- Legend luôn hiển thị 4 health encoding, non-compliant và realtime (`3618–3640`). Risk thêm 3 mức risk (`3641–3659`); Ecosystem thêm 5 lifecycle (`3660–3681`).
- Vì vậy có khoảng 9 mục encoding ở Risk và 11 ở Ecosystem, ngoài các heading; ước lượng 10–12 chip/thành phần thông tin là hợp lý.
- Dải này cũng `flex-wrap` (`3618`), nên có cùng rủi ro tăng chiều cao trên màn hình hẹp.
- Quan trọng hơn, legend đang trộn nhiều vocabulary: màu cạnh = health, dash = compliance, animation/icon = realtime, màu node = type ở Ecosystem hoặc risk ở Risk, icon = lifecycle. Người xem phải nhớ encoding nào áp dụng cho node và encoding nào áp dụng cho edge. Heading “Edge” chỉ đứng đầu dải nhưng không tạo ranh giới thị giác rõ cho phần node/lens sau đó.

Đề xuất: giữ một legend tối giản theo lens, có hai nhóm rõ “Hệ thống” và “Luồng”; đưa các encoding hiếm/chi tiết vào popover. Legend phải phản ánh đúng cái đang nhìn thấy, không liệt kê toàn bộ ontology mọi lúc.

### 3. Panel giải thích trái-trên luôn hiện — Đồng ý hoàn toàn

- Overlay ở `3718–3740` không có nút đóng, state collapse, responsive breakpoint hay điều kiện theo lần truy cập.
- `max-w-[320px]` là giới hạn tối đa chứ không khóa cứng 320px, nhưng nội dung vẫn tạo một khối đáng kể và luôn che canvas.
- Nội dung “cách tính Hub” là giải thích phương pháp, hữu ích khi học UI nhưng không phải thông tin cần hiện trong mọi phiên overview.

Đề xuất icon trợ giúp/popover là đúng. Có thể mở mặc định duy nhất ở first-run nếu sản phẩm có cơ chế lưu trạng thái đã xem.

### 4. Panel “Đọc nhanh” phải luôn hiện — Đồng ý, với hai hiệu chỉnh

- Panel cố định rộng 300px (`3741`) và không có collapse.
- Risk có 6 ô thống kê (`3758–3796`), còn Ecosystem có 4 ô (`3797–3825`), không phải luôn là lưới 6 ô.
- “Focus cụm” có tối đa 7 nút (core + 6 nhóm), “Ẩn/hiện cụm” cũng tối đa 7, và có thể thêm “Hiện tất cả”. Vì chỉ render zone có dữ liệu, số thực tế có thể ít hơn 14.
- Panel còn kéo dài theo số chip wrap nhưng không có giới hạn chiều cao/scroll riêng. Ở canvas thấp, phần dưới có thể va chạm vùng MiniMap/Controls hoặc vượt vùng nhìn thấy.

Đề xuất collapse là ưu tiên cao. Dải số ngang có thể tốt hơn box dọc, nhưng chỉ nên giữ 3–4 KPI thật sự phục vụ lens; nếu dải này cũng wrap thì chỉ chuyển vấn đề từ chiều rộng sang chiều cao.

### 5. Zone background và nhãn — Đồng ý, và có thêm vấn đề tỷ lệ

- `ZoneNode` luôn vẽ border, tint, title và subtitle (`618–650`). Subtitle chứa cả số hệ thống, số cần chú ý/nợ cao và mô tả dài (`1163–1185`).
- Ở zoom xa, title 11px và subtitle 9px bị scale theo viewport, nên nhanh chóng không đọc được. Khi đó zone vẫn tạo các mảng màu nhạt và khung lớn nhưng text không còn đóng vai trò định hướng.
- Nhiều màu zone trùng hoặc gần với vocabulary type/risk/health. Ví dụ xanh lá có thể là Workspace, Supporting, Healthy hoặc Stable; cam có thể là Automation, Legacy/degraded/watch/critical emphasis tùy ngữ cảnh. Dù áp dụng lên thành phần khác nhau, ở overview-at-a-glance đây là tải nhận thức và rủi ro accessibility đáng kể.

Đề xuất: ở zoom xa, dùng semantic zoom—chỉ hiện tên cụm và tổng số; ẩn subtitle/node internals/edge labels. Ở zoom gần mới mở rộng chi tiết.

### 6. MiniMap và Controls — Đồng ý một phần

- Chúng chiếm thêm hai góc dưới (`3957–3976`), nhưng là control chuẩn và MiniMap có giá trị khi sơ đồ lớn.
- Code đã chủ động loại zone background khỏi MiniMap (`680–710`), nên MiniMap không bị các khung zone lớn che lấp. Đây là một điểm implementation tốt.
- Tuy nhiên màu MiniMap luôn theo system type (`3964–3969`), kể cả khi đang ở Risk lens. Vì thế MiniMap không phản ánh vocabulary chính của Risk và có thể gây cảm giác lens đổi không nhất quán.

Đề xuất: không cần bỏ Controls/MiniMap trước tiên. Nên cho phép thu gọn MiniMap hoặc đổi màu theo lens; ưu tiên xử lý overlay phía trên trước.

## Trùng lặp và mô hình tương tác

### “Focus cụm” và “Ẩn/hiện cụm” — Đồng ý là trùng danh sách, nhưng không hoàn toàn cùng chức năng

- Focus không thay đổi layout hay loại node; nó làm nổi node trong cụm và hub liên quan, giảm opacity phần còn lại (`3039–3070`, `3142–3147`, `3222–3225`).
- Hide cũng không thật sự bỏ node khỏi React Flow; nó giảm node xuống opacity `0.06`, zone xuống `0.04`, edge xuống `0.025` và vô hiệu pointer events (`3073–3097`, `3135–3155`, `3204–3217`).
- Vì vậy hai thao tác khác mục đích: focus giữ context, hide muốn loại nhiễu. Nhưng UI lặp cùng một danh sách hai lần và nhãn trạng thái của hide gây nhầm: khi cụm đang hiện, nút ghi “Hiện · …”; khi đã ẩn, nút ghi “Ẩn · …”. Nhãn đang mô tả trạng thái theo cách phản trực giác, không nói hành động click sẽ làm gì.

Không khuyến nghị overload “click lần một focus, click lần hai hide”: thao tác tuần tự này khó khám phá, khó khôi phục và không rõ với keyboard/touch. Tốt hơn là một danh sách zone duy nhất, mỗi dòng có lựa chọn focus và icon mắt riêng; hoặc một single-select focus ở toolbar và quản lý visibility trong popover nâng cao. Như vậy hợp nhất presentation nhưng vẫn giữ hai semantics rõ ràng.

### Không có một nơi tổng hợp toàn bộ trạng thái — Đồng ý

- `hasMapFocus` gộp system selection, zone focus, type, health, edge-focus, lens và hidden zones (`3387–3395`).
- Nhưng `visibleSystems` chỉ là độ dài của `filteredSystems`, tức chỉ phản ánh type + health (`2996–3014`, `3297–3344`). Nó không phản ánh hidden zone, selected zone, selected system, Risk lens hay edge-focus. Dòng `visibleSystems/systems.length` vì thế có thể nói “20/20 hệ thống” trong khi phần lớn node đang mờ/ẩn về mặt tương tác.
- Filter cũng là dimming, không phải filtering: mọi system node và mọi edge vẫn nằm trong arrays; phần không match chỉ giảm opacity (`3100–3155`, `3175–3268`). Từ “visible” và kỳ vọng của nút filter không khớp hành vi.

Đề xuất: định nghĩa rõ ba khái niệm trong UX và code: lens, filter (loại khỏi view/bounds), highlight/focus (giữ context nhưng làm mờ). Active-state summary phải diễn đạt đúng từng loại.

## Camera và `handleClearMapFocus`

Xác nhận nhận định của feedback: `handleClearMapFocus` chỉ reset state (`3397–3404`); không có `useReactFlow`, instance ref, `fitView()` hay thay đổi `key` để điều khiển viewport. Prop `<ReactFlow fitView>` (`3700–3708`) áp dụng khi flow được khởi tạo/fit ban đầu, không phải một lệnh được gọi lại mỗi lần nodes đổi.

Hệ quả:

- Clear all không đưa camera về toàn cảnh.
- Chọn zone cũng không zoom camera tới zone; nó chỉ dim phần còn lại. Tên “Focus cụm” có thể khiến người dùng kỳ vọng camera focus.
- Khi đổi filter/mode/hide, node positions không đổi và node không bị loại khỏi bounds. Ngay cả nếu gọi fit lại, bounds vẫn bao gồm toàn bộ node/zone vì chúng chỉ được giảm opacity, không đặt `hidden: true` hoặc loại khỏi arrays.
- Chuyển sang tab khác rồi quay lại sẽ unmount/remount nhánh map, nên `fitView` có khả năng chạy lại lúc map mount. Đây không phải hành vi reset ngay khi nhấn Clear.
- Mở DetailPanel lấy thêm 340px chiều rộng (`3980–3994`) nhưng không có lệnh refit/translate viewport; node được chọn có thể bị panel mới che hoặc bố cục trở nên lệch tâm.

Đề xuất: tách “Xóa điều kiện” và “Về toàn cảnh” thành hành vi rõ. Clear-all có thể gọi fit sau khi state cập nhật nếu mục tiêu sản phẩm là quay về overview; đồng thời Focus zone nên fit bounds của zone/nodes liên quan. Cần quyết định filter thật sự loại node khỏi bounds hay chỉ highlight, rồi mới định nghĩa fit đúng.

## Các vấn đề overview bị bỏ sót

### 1. Layout tăng chiều cao không giới hạn, zoom mặc định sẽ giảm mạnh

- Zone dùng tối đa 2 cột; số hàng tăng tuyến tính theo số system trong group (`893–915`). Chiều cao zone tăng theo `rows * 148`.
- Các zone được xếp thành ba dải trên/giữa/dưới (`1143–1200`); tổng chiều cao canvas phụ thuộc tổng chiều cao lớn nhất của từng dải. Dataset tập trung vào một group có thể tạo zone rất cao; dataset phân bố đều có thể làm cả ba dải cao.
- `fitView` padding chỉ `0.06`, `minZoom` xuống tới `0.08` (`3705–3708`). Trên laptop, nhiều hệ thống sẽ bị nén đến mức node 176–220px trở thành thumbnail; tên 11–13px, metadata 8–9px và zone subtitle 9px đều không thể đọc.
- Node giữ nguyên toàn bộ nội dung (type/status, tên/category, technology/hosting, hai score bars, in/out/health) ở mọi zoom. Đây là card chi tiết được thu nhỏ, không phải glyph overview.

Đề xuất: semantic zoom là thay đổi nền tảng: zoom xa chỉ hiện shape/icon, tên ngắn và 1 trạng thái chính; zoom trung bình thêm type/health; zoom gần mới hiện scores/technology/in-out. Đồng thời cân nhắc aggregate/cluster theo zone khi vượt ngưỡng số node, thay vì luôn fit mọi card chi tiết.

### 2. Cạnh dễ thành “hairball” và layout không tối ưu đường đi

- Vị trí node dựa trên classification và grid cố định, không tối ưu crossing theo topology. Mọi integration được render bằng Bezier từ handle trái/phải (`3175–3268`). Khi số luồng tăng, nhiều đường dài xuyên qua zone/core và chồng nhau.
- Ecosystem mặc định cho tất cả edge matching opacity `0.9`; nhãn critical cũng hiện mặc định (`3226–3247`). Health color và animation thêm salience nhưng không giải quyết crossing.
- Hub selection dựa trên centrality giúp kể câu chuyện trung tâm/vệ tinh, nhưng chỉ chọn 1–3 hub (`1094–1098`) và không đảm bảo các cạnh được route theo hub/zone. Overview có thể trông có tổ chức về khung nhưng vẫn rối ở lớp edge.

Đề xuất: ở zoom xa aggregate edge theo cặp zone/hub, giảm opacity/labels mặc định, hoặc chỉ hiện backbone/critical flows. Edge chi tiết xuất hiện khi hover/focus. Đây có tác động overview lớn hơn việc thêm filter mới.

### 3. Màu sắc đang gánh quá nhiều nghĩa và thiếu kênh dự phòng

- Ecosystem node dùng type làm header/border/background; edge dùng health; zone dùng group. Risk đổi border/background node sang risk nhưng header vẫn giữ màu type. Một card Risk có thể đồng thời có màu type ở header, risk ở body/border, health ở handle và status ở dot.
- Đỏ/cam/xanh được tái sử dụng cho health, risk, debt, zone và type. Người dùng mù màu hoặc ở zoom xa khó phân biệt nếu chỉ còn các mảng màu nhỏ.
- Dashed compliance và animation realtime là kênh dự phòng tốt ở zoom gần, nhưng dash/animation khó nhận ra khi edge mảnh và bị fit nhỏ.

Đề xuất: mỗi lens chỉ có một encoding màu chính. Dùng shape/icon/pattern/text badge làm kênh thứ hai; kiểm tra contrast và color-blind palette. Ở Risk lens, neutralize màu type trong card hoặc chuyển type thành icon/text nhỏ để risk thực sự chiếm ưu thế.

### 4. Risk lens không đổi layout, nên chưa phải một “risk overview” đầy đủ

- Hai lens dùng chung `architectureLayout` và positions (`2980–2986`, `3121`); Risk chỉ đổi style/opacity node, edge selection/opacity, legend và grid KPI.
- Đây là tính nhất quán không gian có lợi: người dùng không mất mental map khi chuyển lens. Không nên tạo hai layout panel hay hai cấu trúc điều khiển khác nhau.
- Tuy nhiên Risk vẫn giữ zone taxonomy Ecosystem và panel giải thích trái luôn nói “Bản đồ hệ sinh thái”. Nội dung này không thích ứng với Risk. Risk cũng chỉ dim stable node còn `fitView` vẫn bao toàn bộ ecosystem, nên vùng rủi ro có thể nhỏ/rải rác và không tạo được overview hành động.

Đề xuất: giữ chung shell, vị trí, toolbar và zone controls cho hai lens; thay đổi một “insight strip” duy nhất theo lens và cập nhật help/legend theo lens. Nếu Risk cần ưu tiên hành động, thêm tùy chọn “chỉ fit các mục rủi ro” hoặc một ranked risk summary, không tạo một panel layout thứ hai. Nói cách khác: hợp nhất chrome, khác nhau có chủ đích ở encoding và KPI.

### 5. Summary có thể gây hiểu sai

- “Cần chú ý” cộng `issueIntegrations + nonCompliantIntegrations + highDebtSystems` (`3817–3823`), trộn đơn vị flow và system, đồng thời double-count một flow vừa lỗi vừa sai chuẩn. Con số lớn nhưng không có nghĩa tập hợp rõ ràng.
- `highRiskSystems` gộp declared risk, debt và worst health down; `affectedHubs` lại dựa trên degraded/down hoặc non-compliance (`3297–3344`). Các KPI có logic khác nhau nhưng không giải thích ngắn gọn.
- Zone classification dựa trên keyword trong chuỗi đã loại ký tự ngoài `[a-z0-9]` (`852–894`); tên/mô tả tiếng Việt có dấu bị phá thành token rời, nên nhiều system có thể rơi mặc định vào Workspace. Đây không nhất thiết là bug trong phạm vi review, nhưng ảnh hưởng trực tiếp độ tin cậy trực quan của “bản đồ hệ sinh thái”.

Đề xuất: dùng KPI có đơn vị rõ (“3 hệ thống”, “5 luồng”), tránh tổng hỗn hợp; cho phép xem định nghĩa. Với classification, cần hiển thị/cho chỉnh group hoặc dùng trường dữ liệu có chủ đích thay cho heuristic ẩn nếu bản đồ dùng cho quyết định quản trị.

### 6. Responsive và khả năng tiếp cận interaction

- Hai overlay dùng `left-4/right-4`, rộng tối đa 320px và cố định 300px, không có breakpoint. Canvas hẹp có thể khiến chúng gần chạm hoặc chồng nhau.
- Nút chip chủ yếu 10px text, target khá nhỏ. Nhiều nút không có `aria-pressed`, title hay nhãn icon/state phù hợp; trạng thái phụ thuộc mạnh vào màu.
- Khi DetailPanel mở, tổng phần canvas mất thêm 340px nhưng overlays giữ nguyên kích thước.

Đề xuất: đặt breakpoint để chuyển quick-read/help thành drawer/popover; đảm bảo target tối thiểu và trạng thái accessible; test ít nhất ở 1280×720, 1366×768, 1440×900 và dataset nhỏ/vừa/lớn.

## Đánh giá các hướng sửa được đề xuất

1. **Gom filter vào popover:** đồng ý với health/type/edge-focus; không nên giấu lens trong popover. Giữ toggle lens ở toolbar, Filters có badge và active-state summary.
2. **Hợp nhất Focus/Hide:** đồng ý hợp nhất thành một danh sách, không đồng ý dùng click lần 1/lần 2 cho hai hành vi. Dùng row + action focus + eye toggle, hoặc đưa hide vào advanced visibility.
3. **Help thành icon/popover:** đồng ý, ưu tiên cao.
4. **Quick-read collapse hoặc strip:** đồng ý. Dùng chung shell cho hai lens, 3–4 KPI chính; phần còn lại mở theo nhu cầu.
5. **Clear và fitView:** xác nhận hiện chưa refit. Nên có explicit “Về toàn cảnh”; cân nhắc Clear-all gọi nó sau reset. Muốn fit có ý nghĩa thì filter/hide cần được loại khỏi bounds hoặc truyền tập node mục tiêu cho fit.

## Thứ tự ưu tiên đề xuất

### P0 — Khôi phục canvas-first overview

1. Thu help thành icon; làm quick-read collapse mặc định hoặc thành strip mỏng.
2. Giữ lens toggle, gom health/type/edge filters vào một control; hiển thị badge và active criteria.
3. Thêm “Về toàn cảnh” và định nghĩa rõ camera behavior cho Clear, Focus zone, mở/đóng DetailPanel.
4. Sửa vocabulary interaction: phân biệt lens / filter / focus / visibility; sửa `visibleSystems` để không tuyên bố sai trạng thái đang thấy.

### P1 — Làm overview đọc được khi dữ liệu lớn

1. Semantic zoom cho node, zone text và edge label.
2. Aggregate hoặc suppress edge ở zoom xa; ưu tiên backbone/risk/critical flows.
3. Focus zone phải fit zone; filter thật sự phải quyết định bounds, không chỉ opacity.
4. Kiểm thử layout với phân bố group lệch và số system lớn, không chỉ tổng số trung bình.

### P2 — Chuẩn hóa lens và encoding

1. Dùng chung panel/chrome cho Ecosystem và Risk; chỉ đổi KPI, legend và encoding chính.
2. Giảm tái sử dụng đỏ/cam/xanh cho nhiều nghĩa; thêm icon/pattern/shape và kiểm tra contrast/color blindness.
3. Đồng bộ MiniMap với lens hoặc để neutral.
4. Rà lại KPI hỗn hợp/double-count và độ tin cậy của heuristic phân cụm.

## Tiêu chí nghiệm thu UX gợi ý

- Ở 1366×768, trạng thái mặc định dành phần lớn diện tích cho canvas và không có overlay cố định che node quan trọng.
- Người mới trong 5 giây trả lời được: cụm nào lớn, hub nào chính, vùng nào có rủi ro—không cần mở filter/help.
- Với dataset lớn, tên cụm và node/hub chính vẫn đọc được ở initial fit; chi tiết card không biến thành chữ li ti.
- Chuyển lens không làm mất mental map và toàn bộ control giữ nguyên vị trí.
- Mọi trạng thái đang áp dụng được xem và xóa từ một nơi; “visible” khớp những gì thực sự được render/tương tác.
- Clear/Overview, Focus zone và mở DetailPanel có camera behavior nhất quán, có thể dự đoán.
