# Kế hoạch: Chuyển đổi full-stack sang AWS

> **Trạng thái sau Codex review (2026-08-10): NO-GO cho Phase 2 trở đi.**
> Xem `.ai/aws-migration-codex-review.md` để biết chi tiết đầy đủ (P0/P1
> risks, security, data model, cutover, cost, test matrix, go/no-go gates
> A–E). Phase 0 (ADR) và Phase 1 (frontend rehost, có điều kiện) vẫn đi
> tiếp được; Phase 2+ bị chặn ở **Gate B** cho tới khi có: ADR
> region/account/SLO/RTO-RPO/budget/data-residency, endpoint inventory +
> OpenAPI draft, PostgreSQL DDL/FK/identity model, cost model 3 profile,
> và chiến lược cutover (write-freeze/delta/dual-write) được chốt bằng
> input thật từ chủ dự án — không phải giả định của Claude/Codex.
>
> **Quyết định (2026-08-10): TẠM DỪNG toàn bộ migration này.** Lý do: rủi ro
> đụng độ trực tiếp với `.ai/task.md` (TechGov production hardening đang
> chạy trên chính các file `convex/*` mà Phase 2+ sẽ xoá/viết lại — xem
> Rủi ro §6 và Codex review §4/P0.2). Không mở lại Phase 0 trở đi cho tới
> khi TechGov hardening đóng ít nhất Giai đoạn 0 (xem `.ai/final-report.md`).
> Không cần hành động gì thêm ở file này cho tới lúc đó.

> File này độc lập với `.ai/task.md` / `.ai/claude-plan.md` / `.ai/orchestration.md`
> hiện có — các file đó đang track sáng kiến "TechGov production hardening"
> (checkpoint gần nhất: Giai đoạn 0 chưa đóng, xem `.ai/final-report.md`).
> Không sửa các file đó. Khi nào bắt đầu thực thi migration này, nó nên chạy
> **sau** khi TechGov hardening đóng Giai đoạn 0, để không sửa chồng lên diff
> đang mở trên cùng các file `convex/*`.

## 1. Mục tiêu

Thay thế toàn bộ hạ tầng hiện tại — frontend host trên Vercel, backend là
Convex (managed BaaS: DB + functions + auth) — bằng hạ tầng tự vận hành trên
AWS, giữ nguyên hành vi nghiệp vụ (RBAC 4 role, validation, referential
integrity, audit log) và không hạ cấp bảo mật so với trạng thái đang được
TechGov hardening nhắm tới.

## 2. Hiện trạng (khảo sát thực tế)

| Lớp | Hiện tại | Ghi chú |
|---|---|---|
| Frontend | Vite + React 19 SPA, deploy Vercel (`vercel.json` rewrite SPA) | Build tĩnh, không có server-side rendering |
| Backend | Convex: DB tài liệu + query/mutation reactive + `http.ts` router | 8 bảng: `users` (extend `authTables`), `software_systems`, `vendors`, `integrations`, `system_modules`, `config_items`, `system_change_logs`, `roadmap_items`; nhiều `v.id()` tham chiếu chéo + index đơn/kép |
| Auth | `@convex-dev/auth` + Google OAuth (`convex/auth.ts`, `auth.config.ts`) | JWT do Convex tự phát hành, `getAuthUserId(ctx)` phía server |
| RBAC | `convex/helpers.ts`: `requireReadAccess` / `requireWriteAccess` / `requireCTO` dựa trên `users.role` (`cto`, `it_manager`, `business_owner`, `viewer`) | Check ở **server**, không phải ẩn UI |
| Domain logic | `convex/domain/*.ts` (common, config, integrations, roadmap, softwareSystems, systemModules, vendors) | Phần lớn là hàm thuần validate/normalize, khá tách biệt khỏi Convex API — **tái dùng được** |
| Reactivity | `useQuery`/`useMutation`/`useAction` ở 11 file trong `src/` (kể cả `use-current-user.ts`) | UI phụ thuộc live-update tự động của Convex (không polling thủ công) |
| Test | Vitest + `convex-test` (in-memory Convex), test bảo mật ở `convex/security/*.test.ts`, `src/security/session.contract.test.ts` | Gắn chặt runtime Convex |
| CI | `.github/workflows/quality.yml` chạy `pnpm run check` | Không có Dockerfile/Terraform/CDK nào trong repo hiện tại |
| Không rõ | Chưa có thông tin traffic/SLA/ngân sách/độ ưu tiên compliance (vd. data residency) | Cần xác nhận trước khi chốt kiến trúc đích |

Kết luận quan trọng: đây **không phải** "đổi host cho một server có sẵn" —
Convex là managed BaaS độc quyền, không self-host công khai theo cách tương
đương. Full-stack migration = viết lại toàn bộ tầng persistence + auth +
API, giữ lại được phần lớn `domain/*.ts` và toàn bộ UI React.

## 3. Kiến trúc đích trên AWS

```
Route53 → CloudFront (+ WAF) → S3 (SPA build tĩnh)
                     │
                     └── /api/*  → API Gateway (HTTP API, JWT authorizer)
                                        │
                                   Lambda (Node/TS, tái dùng convex/domain/*)
                                        │
                                   RDS Aurora PostgreSQL (Serverless v2)
                                        │
                              Secrets Manager (DB creds, Google OAuth secret)

Cognito User Pool (Google làm Identity Provider liên kết)
  → phát JWT → API Gateway JWT authorizer → Lambda đọc role từ claim/DB
```

Quyết định kiến trúc chính và lý do:

- **RDS Postgres (Aurora Serverless v2), không phải DynamoDB.** Schema có
  nhiều quan hệ tham chiếu chéo qua `v.id()` (`software_systems.vendorId`,
  `integrations.sourceSystemId/destinationSystemId`, `roadmap_items.parentId`,
  `system_modules.systemId`...) và các rule kiểu "không xoá nếu còn tham
  chiếu" (`config.ts:remove`) — mô hình quan hệ + FK constraint khớp tự nhiên
  hơn DynamoDB single-table. Dùng Drizzle ORM (TypeScript, gần với phong
  cách `v.object`/schema hiện tại).
- **API Gateway (HTTP API) + Lambda, không phải AppSync/GraphQL.** Ứng dụng
  hiện dùng REST-style query/mutation theo domain (giống hiện tại), không có
  nhu cầu GraphQL. Giữ chi phí/độ phức tạp thấp hơn AppSync.
- **Bỏ live-reactivity ở scope migration ban đầu.** Convex tự đẩy update qua
  WebSocket; AWS không có tương đương drop-in. Thay bằng
  **TanStack Query polling/refetch-on-focus** cho các danh sách (đã có
  `@tanstack/react-query` trong `package.json`) — chấp nhận UX kém hơn một
  chút, ghi rõ đây là **regression có chủ đích**, không phải bug. Real-time
  qua API Gateway WebSocket + RDS logical replication/Debezium là khả thi
  nhưng để **Phase sau** (không block cutover).
- **Cognito User Pool + Google IdP** thay `@convex-dev/auth`. Giữ nguyên
  luồng đăng nhập bằng Google, JWT xác thực ở API Gateway thay vì ở Convex.
  Cần mapping lại `users.role` (không tự có trong Cognito) — giữ bảng
  `users` trong Postgres, Cognito chỉ lo danh tính, role vẫn resolve từ DB
  như hiện tại (qua Lambda, tương đương `getCurrentUser`/`requireRole`).
- **AWS CDK (TypeScript)**, không phải Terraform — khớp stack ngôn ngữ hiện
  tại của team, review/test IaC bằng cùng công cụ (`tsc`, `eslint`).

## 4. Phạm vi tác động

- **Xoá bỏ hoàn toàn**: mọi thứ trong `convex/_generated/*`, `convex/auth.ts`,
  `convex/auth.config.ts`, `convex/http.ts`, các file top-level dùng
  `query`/`mutation` từ `_generated/server` (`vendors.ts`, `software_systems.ts`,
  `integrations.ts`, `roadmap.ts`, `system_modules.ts`, `system_change_logs.ts`,
  `users.ts`, `config.ts`, `bootstrap.ts`, `seed.ts`).
- **Tái dùng gần như nguyên vẹn**: `convex/domain/*.ts` (đổi thư mục, bỏ mọi
  import Convex-specific nếu có) — đây là phần tiết kiệm effort lớn nhất.
- **Viết mới**: `infra/` (AWS CDK stacks: network, database, auth, api,
  frontend), `services/api/` (Lambda handlers theo domain, Drizzle schema +
  migrations), script di trú dữ liệu Convex → Postgres, Cognito post-auth
  Lambda trigger để đồng bộ user vào bảng `users`.
- **Sửa toàn bộ frontend liên quan gọi backend**: 11 file dùng
  `useQuery`/`useMutation`/`useAction` (`src/pages/*/page.tsx`,
  `src/hooks/use-current-user.ts`, `src/pages/auth/Callback.tsx`) → thay
  bằng client mới (REST client + TanStack Query hooks), bỏ `ConvexProvider`.
  `vite.config.ts` bỏ alias `@/convex`; env đổi từ `VITE_CONVEX_URL` sang URL
  API Gateway + Cognito config.
- **Test**: toàn bộ test dùng `convex-test` (`convex/**/*.test.ts`,
  `convex/security/*.test.ts`) phải viết lại chạy trên Postgres thật/test
  container; `src/security/session.contract.test.ts` viết lại theo luồng
  Cognito JWT.
- **CI/CD**: `.github/workflows/quality.yml` giữ nguyên gate `pnpm run check`,
  thêm workflow deploy CDK (staging/prod) + build & sync S3/CloudFront.
- **Không đụng**: `OpenHands/` (ngoài phạm vi theo `CLAUDE.md`), toàn bộ UI
  component/UX logic không liên quan tới data fetching.

## 5. Các bước thực hiện (theo phase, mỗi phase tự kiểm thử được)

**Phase 0 — ADR & xác nhận (không code)**
Chốt bằng văn bản: ngân sách, SLA mục tiêu, region AWS, mức chấp nhận mất
reactivity, thời điểm cutover mong muốn, ai vận hành RDS/VPC sau này (đổi từ
zero-ops Convex sang có ops). Gọi Codex review kiến trúc trước khi code theo
đúng Giai đoạn 2 trong `CLAUDE.md`.

**Phase 1 — Frontend rehost (độc lập, rủi ro thấp, có thể ship riêng)**
S3 + CloudFront + Route53 + ACM, CI đẩy `dist/` build hiện tại. Backend vẫn
là Convex, đổi 0 dòng code app. Có thể làm ngay, không phụ thuộc các phase
sau, và **hoàn tác được** (đổi lại DNS về Vercel).

**Phase 2 — Nền tảng AWS backend (song song, chưa cutover)**
CDK: VPC, RDS Aurora Postgres (private subnet), Secrets Manager, Cognito
User Pool + Google IdP, API Gateway skeleton + JWT authorizer. Deploy lên
`staging`, chưa có traffic thật.

**Phase 3 — Port domain logic + API**
Chuyển `convex/domain/*.ts` sang `services/api/domain/*.ts`. Viết Drizzle
schema tương đương `convex/schema.ts` (giữ nguyên tên bảng/field/index).
Viết Lambda handler cho từng nhóm chức năng, giữ đúng error code hiện có
(`ConvexError({code: "CONFLICT"/"NOT_FOUND"/"REFERENCE_IN_USE"/...})` →
map sang HTTP status + body tương đương để frontend đổi tối thiểu). Port
`requireReadAccess`/`requireWriteAccess`/`requireCTO` sang middleware Lambda
đọc JWT claim + `users.role` từ Postgres.

**Phase 4 — Auth cutover trên staging**
Cognito + Google IdP, Lambda post-confirmation đồng bộ `users` (email, name,
role mặc định `viewer` cho user mới — **không** fallback ngầm thành `cto`,
theo đúng nguyên tắc đang áp dụng ở TechGov hardening). Test toàn bộ
permission matrix trên staging.

**Phase 5 — Di trú dữ liệu**
Script export dữ liệu Convex (qua Convex dashboard export hoặc query nội bộ
có quyền admin) → transform ID (Convex ID → UUID, giữ mapping để sửa
`v.id()` reference) → import Postgres qua transaction có kiểm tra
referential integrity. Chạy thử trên bản sao/staging, không đụng dữ liệu
thật cho tới khi có kế hoạch cutover chính thức (không seed/chạy trên
production thật ở giai đoạn này — đúng ràng buộc chung của repo).

**Phase 6 — Frontend đổi backend client**
Thay `ConvexProvider`/`useQuery`/`useMutation` bằng client REST +
TanStack Query hook tương ứng (giữ nguyên tên hook nghiệp vụ nếu có thể để
diff các page nhỏ). Đổi `use-current-user.ts` sang đọc claim Cognito + gọi
`/users/me`.

**Phase 7 — Shadow run, cutover, decommission**
Chạy song song AWS stack (đọc dữ liệu đã đồng bộ) không phục vụ traffic thật
→ so sánh kết quả với Convex → cutover DNS + auth → theo dõi lỗi/latency →
giữ Convex ở chế độ chỉ-đọc một thời gian làm rollback path → decommission
Convex sau khi đã ổn định.

## 6. Rủi ro

- **Mất reactivity tức thời của Convex** → UX kém hơn nếu không làm
  polling/WebSocket bù. Phải quyết định rõ ở Phase 0, không để lộ ra khi đã
  cutover.
- **Effort bị đánh giá thấp**: đây là viết lại toàn bộ backend, không phải
  "đổi hosting" — ước lượng theo tuần, không theo ngày.
  `domain/*.ts` tái dùng được giảm rủi ro nhưng phần persistence/auth/API
  vẫn phải viết mới hoàn toàn.
- **Đụng độ với TechGov hardening đang chạy**: `.ai/task.md` hiện yêu cầu
  hardening session auth + RBAC + validation trên chính các file Convex sẽ
  bị xoá ở migration này. Nếu chạy song song sẽ merge conflict và làm vô
  nghĩa công sức hardening trên Convex. Khuyến nghị: hoàn tất/đóng băng
  TechGov hardening trên Convex trước, hoặc merge yêu cầu hardening thẳng
  vào domain logic mới ở Phase 3 thay vì làm hai lần.
- **Từ zero-ops sang có ops**: RDS, VPC, Lambda cold start, Cognito quota —
  team cần vận hành AWS (patch, backup, scaling) mà trước đây Convex lo
  toàn bộ. Cần rõ ai chịu trách nhiệm on-call.
- **Chi phí**: mô hình từ 1 hoá đơn Convex sang nhiều dịch vụ AWS (RDS,
  Lambda, API Gateway, CloudFront, Cognito, WAF, Secrets Manager, data
  transfer) — cần ước tính trước khi chốt, đặc biệt Aurora có phí tối thiểu
  ngay cả khi traffic thấp.
- **Sai sót di trú dữ liệu**: ID scheme đổi (Convex ID → UUID) ảnh hưởng mọi
  bảng có `v.id()` reference — cần script kiểm tra referential integrity
  đầy đủ trước cutover, không chỉ export/import thô.
- **Google OAuth redirect URI** phải đăng ký thêm domain mới (CloudFront/API
  Gateway) song song domain Convex hiện tại trong Google Cloud Console
  trước khi test Phase 4.

## 7. Cách kiểm thử

- Domain logic (`domain/*.ts` cũ → mới): giữ nguyên bộ unit test hiện có
  (`common.test.ts`, `roadmap.test.ts`...), chỉ đổi import path — phải xanh
  không sửa assertion.
- Persistence/integration: thay `convex-test` bằng Postgres thật trong
  container (testcontainers hoặc `pg` local trong CI) cho
  `integrity.integration.test.ts`, `mutations.integration.test.ts` tương
  đương.
- Security/RBAC: viết lại `identity.contract.test.ts`,
  `users.security.test.ts`, `session.contract.test.ts` chạy permission
  matrix (4 role × read/write) trên Lambda authorizer + Cognito JWT giả lập
  — không được có endpoint public nào bỏ sót check, đúng tinh thần
  `.ai/task.md` hiện tại.
- E2E tối thiểu trước cutover: đăng nhập Google → CRUD trên từng domain →
  xác nhận audit log (`system_change_logs`) vẫn ghi đúng.
- Load/latency: so sánh p50/p95 API Gateway+Lambda+RDS vs Convex hiện tại
  trên cùng tập truy vấn trước khi cutover chính thức.

## 8. Tiêu chí hoàn thành

- Frontend phục vụ 100% từ CloudFront, không còn phụ thuộc Vercel.
- Không còn `convex` trong `dependencies` sau cutover cuối; toàn bộ API đi
  qua API Gateway.
- Permission matrix (4 role) test xanh trên backend mới, y hệt hành vi cũ
  (không route nào mất auth check).
- Không mất dữ liệu trong di trú (đối chiếu checksum/count từng bảng giữa
  Convex và Postgres trước khi tắt Convex).
- `pnpm run check` xanh với toàn bộ test đã port.
- Có runbook rollback về Convex/Vercel còn hiệu lực tối thiểu N ngày sau
  cutover (N do Phase 0 quyết định).
- Chi phí vận hành thực tế đã đo và nằm trong ngân sách đã duyệt ở Phase 0.

## 9. Việc cần làm ngay (trước khi viết bất kỳ dòng code hạ tầng nào)

1. Trả lời các câu hỏi mở ở mục "Không rõ" (§2) và Phase 0 (§5).
2. Gọi Codex review plan này theo đúng Giai đoạn 2 của `CLAUDE.md`, output
   ghi vào file review riêng (không ghi đè `.ai/codex-review.md` đang dùng
   cho TechGov hardening) — ví dụ `.ai/aws-migration-codex-review.md`.
3. Quyết định trình tự với TechGov hardening đang chạy (xem Rủi ro §6) trước
   khi mở Phase 2 trở đi.
