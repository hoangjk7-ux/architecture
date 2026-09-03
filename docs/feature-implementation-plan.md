# Kế hoạch bổ sung và triển khai tính năng TechGov

## 1. Mục đích

Tài liệu này đề xuất phạm vi, kiến trúc và lộ trình bổ sung các tính năng trong
SRS vào hệ thống TechGov hiện tại.

Định hướng chính:

- Tiếp tục sử dụng kiến trúc **Modular Monolith** trên React, TypeScript và
  Convex trong giai đoạn hiện tại.
- Phát triển theo từng lát cắt nghiệp vụ hoàn chỉnh, từ giao diện đến dữ liệu,
  phân quyền, audit và kiểm thử.
- Chỉ cân nhắc tách microservice khi xuất hiện nhu cầu mở rộng độc lập, tải lớn
  hoặc ranh giới tích hợp đủ rõ.
- Ưu tiên Demand Management trước vì đây là nguồn dữ liệu đầu vào cho Project,
  Resource và Budget.

## 2. Đánh giá hiện trạng

### 2.1. Năng lực đã có

- Google/OIDC authentication và RBAC cơ bản.
- Quản lý hệ thống phần mềm, nhà cung cấp và tích hợp.
- Architecture Map.
- Roadmap dạng cây Initiative → Program → Project → Epic/Sprint.
- Internal resource rate và phân bổ nguồn lực theo hệ thống.
- Dashboard kỹ thuật.
- Audit log cho một số nghiệp vụ hệ thống.
- Giao diện song ngữ, responsive navigation và lazy loading.

### 2.2. Khoảng trống so với SRS

| Nhóm nghiệp vụ                         | Hiện trạng                                            |
| -------------------------------------- | ----------------------------------------------------- |
| Demand Management                      | Chưa có                                               |
| Demand assessment và approval workflow | Chưa có                                               |
| Project lifecycle                      | Roadmap mới đáp ứng một phần                          |
| Resource và skill matrix               | Có allocation cơ bản, chưa có employee/capacity/skill |
| Timesheet                              | Chưa có                                               |
| Budget Management                      | Chưa có                                               |
| Portfolio và Department dashboard      | Chưa đủ dữ liệu nghiệp vụ                             |
| Notification                           | Chưa có nền tảng tổng quát                            |
| Audit Log                              | Cần tổng quát hóa cho mọi entity                      |
| RBAC                                   | Hiện có 4 role, SRS yêu cầu 11 role                   |
| External integration                   | Mới quản lý metadata, chưa đồng bộ dữ liệu            |

### 2.3. Trạng thái thiết kế lại Architecture Map

Thiết kế orbit đã được triển khai trên trang Architecture Map:

- `CoreOrbit` hiển thị 1–3 hub theo centrality score.
- Hệ thống được phân vào vòng `operational` hoặc `outer` theo loại, trạng thái,
  nhóm nghiệp vụ và technical debt; dataset dày tự tách thêm sub-ring lệch pha.
- Sáu zone nghiệp vụ được trình bày dưới dạng callout ngoài quỹ đạo, có connector
  không tương tác và không dùng làm background lớn.
- Focus, Hide, camera fit và semantic zoom dùng chung kết quả phân loại của
  thuật toán layout; Hide loại node và edge khỏi canvas thực sự.
- Thuật toán phân loại/layout nằm tại
  `src/pages/architecture/architecture-layout.ts` và có unit test riêng.

Tiêu chí regression cho Architecture Map:

- Tên nhóm tiếng Việt có dấu phải được phân loại nhất quán.
- Mọi hệ thống phải có đúng một ring và tọa độ hữu hạn, không trùng tọa độ trong
  cùng lần layout.
- Thay đổi kích thước canvas ở trạng thái overview phải tự fit lại toàn cảnh.
- Zone rỗng không được kích hoạt focus làm mờ toàn bộ sơ đồ.
- Node, zone, connector và edge của zone bị ẩn không tham gia canvas tương tác.

## 3. Phạm vi ưu tiên

### 3.1. P0 — Nền tảng bắt buộc

- Mở rộng RBAC theo các vai trò trong SRS.
- Department và cơ cấu tổ chức.
- Audit log tổng quát.
- Notification center và approval inbox.
- Workflow/state-transition service dùng chung.
- Chuẩn hóa currency, timezone, file attachment và master data.
- Pagination, database index và authorization tại backend.
- CI, monitoring và quy trình backup/restore.

### 3.2. P1 — Luồng nghiệp vụ cốt lõi

1. Demand Management.
2. Demand Assessment và Approval.
3. Chuyển Demand thành Project.
4. Project lifecycle và Project Health.
5. Resource capacity và allocation.
6. Budget planning và actual cost.
7. Timesheet.
8. CTO Portfolio Dashboard.

### 3.3. P2 — Tối ưu và tích hợp

- Gợi ý nguồn lực theo kỹ năng.
- Phát hiện demand trùng lặp.
- Đồng bộ Jira và GitHub.
- Google Workspace notification/directory.
- Đồng bộ nhân sự từ HRM.
- Đồng bộ ngân sách và actual cost từ ERP/Finance.
- Forecasting và cảnh báo sớm.
- Application lifecycle planning.

## 4. Lộ trình triển khai

Ước tính dành cho đội 5–7 người. MVP có thể phát hành sau khoảng 12–16 tuần;
phạm vi nghiệp vụ tương đối đầy đủ cần khoảng 6–8 tháng.

### Giai đoạn 0 — Chuẩn hóa nền tảng

**Thời gian:** 2–3 tuần
**Ưu tiên:** P0

Phạm vi:

- Mở rộng role nhưng giữ tương thích với dữ liệu role hiện tại.
- Thêm `departments`, `permissions` và `role_permissions`.
- Tổng quát hóa audit log với `entityType`, `entityId`, `actorId`, `action`,
  dữ liệu trước/sau và cơ chế lọc trường nhạy cảm.
- Xây notification center và approval inbox.
- Xây workflow service dùng chung.
- Hoàn thiện quality gate, test và observability.

Kết quả cần đạt:

- Các module mới dùng chung một cơ chế workflow, authorization, notification
  và audit.
- Permission được kiểm tra tại Convex query/mutation, không chỉ ở giao diện.

### Giai đoạn 1 — Demand Management MVP

**Thời gian:** 4–5 tuần
**Ưu tiên:** P0/P1

Phạm vi:

- Tạo, sửa, lưu nháp và gửi demand.
- Demand template và classification.
- Danh sách My Demands.
- BA Review, Business Assessment và Technical Assessment.
- Priority scoring.
- Approve, reject và request changes.
- Demand backlog.
- Comment, attachment và lịch sử trạng thái.
- In-app/email notification.

Công thức priority khởi điểm:

```text
Priority Score =
  Business Value × 30%
+ Strategic Alignment × 25%
+ Urgency × 20%
+ Compliance Impact × 15%
- Estimated Effort × 10%
```

Trọng số phải cấu hình được và mỗi kết quả cần lưu phiên bản scoring model để
đảm bảo khả năng kiểm toán.

Kết quả cần đạt:

- Requester gửi và theo dõi được demand.
- Các vai trò đánh giá/phê duyệt đúng theo ma trận quyền.
- Demand được duyệt có thể đưa vào backlog.

### Giai đoạn 2 — Project và Portfolio

**Thời gian:** 4–5 tuần
**Ưu tiên:** P1

Phạm vi:

- Chuyển demand đã duyệt thành project mà không nhập lại dữ liệu.
- Project charter, owner, team, KPI, scope và milestone.
- Vòng đời Project:
  `Initiation → Planning → Development → SIT → UAT → Deployment → Hypercare → Operation → Closed`.
- Project Health theo scope, schedule, budget, resource và risk.
- Risk, issue, dependency và decision log.
- Liên kết project với application, integration và roadmap.
- Portfolio dashboard và danh sách project at risk/delayed.

Quyết định thiết kế:

- Tiếp tục dùng `roadmap_items` cho phân cấp chiến lược.
- Tạo entity `projects` riêng cho dữ liệu vận hành, thay vì đưa budget, KPI và
  resource trực tiếp vào `roadmap_items`.

### Giai đoạn 3 — Resource và Capacity

**Thời gian:** 4–5 tuần
**Ưu tiên:** P1

Phạm vi:

- Employee, role và seniority.
- Skill catalog và skill profile.
- Capacity calendar theo tháng.
- Resource requirement và project allocation.
- Kiểm tra allocation theo khoảng thời gian.
- Cảnh báo allocation vượt 100%.
- Capacity dashboard theo tuần, tháng và quý.
- Gợi ý resource theo kỹ năng và khả năng sẵn sàng.

Công thức gợi ý khởi điểm:

```text
Match Score =
  Skill Match × 50%
+ Availability × 30%
+ Seniority Match × 10%
+ Prior Domain Experience × 10%
```

Phiên bản đầu nên sử dụng thuật toán rule-based có thể giải thích; chưa cần
dùng AI/ML.

### Giai đoạn 4 — Budget và Timesheet

**Thời gian:** 4–5 tuần
**Ưu tiên:** P1

Phạm vi:

- Budget theo `PRE_PROJECT`, `PROJECT_DELIVERY` và `POST_PROJECT`.
- Budget line theo cost category.
- Planned, requested, approved, committed, actual và forecast.
- Approval và versioning cho budget.
- Vendor commitment và purchase reference.
- Timesheet tuần và quy trình phê duyệt.
- Tính actual internal resource cost.
- Cảnh báo ngân sách tại ngưỡng 80% và 100%.
- Forecast theo burn rate và phần việc còn lại.

Quyết định thiết kế:

- Dùng rate có thời hạn hiệu lực.
- Snapshot rate khi ghi nhận actual để thay đổi rate tương lai không làm biến
  động số liệu lịch sử.
- Lưu tiền theo minor unit hoặc một decimal strategy thống nhất, luôn kèm
  currency.

### Giai đoạn 5 — Executive Dashboard và Application Portfolio

**Thời gian:** 3–4 tuần
**Ưu tiên:** P1/P2

Phạm vi:

- Dashboard CTO theo Demand, Project, Resource và Budget.
- Department consumption: demand, manday, planned cost và actual cost.
- KPI benefit realization sau go-live.
- Application lifecycle: Strategic, Maintain, Replace và Retire.
- Annual application cost, technical debt, criticality và vendor risk.
- Drill-down từ số liệu tổng hợp đến bản ghi nguồn.

### Giai đoạn 6 — Integration và Automation

**Thời gian:** triển khai tăng dần theo từng connector
**Ưu tiên:** P2

Thứ tự đề xuất:

1. Google Workspace: SSO, email và directory.
2. Jira: project, sprint, task và time.
3. GitHub: repository, pull request và deployment signal.
4. HRM: employee, department và employment status.
5. ERP/Finance: approved budget, commitment và actual invoice.
6. Slack/Teams: notification và approval deep link.

Mỗi connector phải có external ID mapping, sync cursor, idempotency key,
retry/dead-letter, sync log, manual reconciliation và cơ chế bảo vệ credential.
Integration không được ghi thẳng vào bảng nghiệp vụ mà phải đi qua domain
service.

## 5. Kiến trúc triển khai

```text
Frontend pages/features
        ↓
Convex public query/mutation/action
        ↓
Domain services
        ├── Authorization policy
        ├── Workflow transition
        ├── Validation/invariants
        ├── Audit writer
        └── Notification outbox
        ↓
Convex database
        ↓
Integration actions/workers
```

Cấu trúc backend đề xuất:

```text
convex/
  domain/
    demands/
    projects/
    resources/
    budgets/
    timesheets/
    workflow/
    notifications/
    audit/
```

Cấu trúc frontend đề xuất:

```text
src/features/
  demands/
  projects/
  resources/
  budgets/
  timesheets/
  portfolio/
```

Workflow service phiên bản đầu chỉ cần hỗ trợ:

- Tập trạng thái và transition hợp lệ.
- Role được phép thực hiện transition.
- Guard condition và required fields.
- Approval record.
- Transition history.
- Side effect thông qua notification outbox.

## 6. Mô hình dữ liệu cần bổ sung

Các entity chính:

- `departments`
- `demands`
- `demand_templates`
- `demand_assessments`
- `demand_scores`
- `approvals`
- `workflow_events`
- `projects`
- `project_members`
- `project_milestones`
- `project_kpis`
- `project_risks`
- `employees`
- `skills`
- `employee_skills`
- `capacity_periods`
- `resource_requirements`
- `resource_allocations`
- `budgets`
- `budget_lines`
- `budget_versions`
- `timesheets`
- `timesheet_entries`
- `notifications`
- `integration_mappings`
- `integration_runs`
- `audit_events`

## 7. Kế hoạch phát hành

### Release 1 — Demand MVP

- Demand submission.
- Assessment và approval.
- Backlog.
- Notification.
- Audit.
- RBAC mở rộng.

### Release 2 — Project và Resource

- Convert demand to project.
- Project lifecycle.
- Capacity và allocation.
- Portfolio dashboard cơ bản.

### Release 3 — Financial Governance

- Budget.
- Timesheet.
- Actual cost.
- Department consumption.
- Executive dashboard.

### Release 4 — Automation

- Skill recommendation.
- Duplicate detection.
- Jira/GitHub/HRM/ERP integrations.
- Forecast và benefit realization.

## 8. Tiêu chí nghiệm thu tổng thể

- Không thể chuyển trạng thái trái workflow.
- Permission được kiểm tra tại backend.
- Approval và thay đổi đặc quyền có audit atomic.
- Demand đã duyệt chỉ được chuyển thành project một lần.
- Allocation giao nhau không làm resource vượt 100%, trừ trường hợp override
  được cấp quyền và ghi audit.
- Budget actual truy ngược được về timesheet hoặc chứng từ nguồn.
- Dashboard truy ngược được đến dữ liệu chi tiết.
- Thao tác API thông thường đáp ứng mục tiêu dưới một giây trên tập dữ liệu dự
  kiến.
- Có test cho workflow, authorization, concurrency và phép tính tài chính.
- Migration, backfill và seed có thể chạy lại an toàn.

## 9. Rủi ro và biện pháp kiểm soát

| Rủi ro                                  | Biện pháp                                                |
| --------------------------------------- | -------------------------------------------------------- |
| Phạm vi quá lớn                         | Phát hành theo vertical slice và khóa scope từng release |
| Workflow bị hard-code                   | Dùng transition policy chung và version hóa cấu hình     |
| Sai quyền truy cập                      | Authorization tại backend và test theo từng role         |
| Số liệu tài chính thay đổi hồi tố       | Effective-dated rate và snapshot actual                  |
| Allocation sai do khoảng ngày giao nhau | Kiểm tra overlap trong cùng transaction                  |
| Dashboard không khớp dữ liệu nguồn      | Định nghĩa metric và hỗ trợ drill-down                   |
| Đồng bộ ngoài tạo dữ liệu trùng         | External mapping và idempotency key                      |
| Tăng nợ kỹ thuật                        | CI gate, diff coverage và giới hạn kích thước module     |

## 10. Các quyết định nghiệp vụ cần chốt

Trước sprint triển khai đầu tiên, cần thống nhất:

1. Ma trận người duyệt demand và budget.
2. Công thức và trọng số priority score.
3. Quy tắc xác định Project Health.
4. Capacity chuẩn, ngày nghỉ và trường hợp nhân sự thuộc nhiều đơn vị.
5. Phương pháp tính internal cost và quy tắc khóa số liệu theo kỳ.
6. Đồng tiền chuẩn và nhu cầu hỗ trợ đa tiền tệ.
7. Chính sách lưu trữ audit, notification và attachment.

## 11. Bước triển khai tiếp theo

1. Tổ chức workshop nghiệp vụ để chốt bảy quyết định trên.
2. Viết acceptance criteria và permission matrix cho Release 1.
3. Thiết kế schema/migration cho nền tảng workflow, audit và notification.
4. Chia Giai đoạn 0 và Giai đoạn 1 thành epic/user story có estimate.
5. Triển khai một vertical slice mẫu:
   `Create Demand → Submit → BA Review → Notification → Audit`.
6. Đánh giá kết quả slice mẫu trước khi mở rộng toàn bộ workflow.
