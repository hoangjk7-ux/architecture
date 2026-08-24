# Codex review: kế hoạch migration Convex + Vercel sang AWS

## 1. Kết luận điều hành

**Trạng thái: NO-GO cho triển khai Phase 2 trở đi theo plan hiện tại.** Hướng kiến trúc tổng thể là khả thi, và nhận định đây là một lần viết lại backend chứ không phải đổi hosting là đúng. Tuy nhiên plan chưa đủ để bảo đảm tương đương hành vi, an toàn dữ liệu, rollback, bảo mật danh tính và khả năng vận hành. Phase 0/1 có thể tiếp tục sau khi bổ sung ADR và tiêu chí đo; Phase 1 chỉ thực sự “đổi 0 dòng app” nếu cấu hình OAuth/CORS/CSP và routing SPA được chứng minh trên domain CloudFront.

Các blocker lớn nhất:

1. Chưa có chiến lược **delta sync/dual-write/write freeze**. Một lần export/import rồi “shadow read” không giữ AWS đồng bộ với Convex; rollback sau khi AWS nhận write cũng sẽ mất dữ liệu.
2. Chưa đặc tả chính xác **identity linking và provisioning** giữa Google, Cognito và hàng đợi invite hiện được biểu diễn ngay trong bảng `users`. Ghép tài khoản chỉ bằng email có thể dẫn đến account takeover/escalation nếu không kiểm tra issuer, `email_verified`, chuẩn hóa và uniqueness.
3. “Giữ nguyên field/index” không phải thiết kế Postgres đầy đủ. Arrays, self-reference, cascade, audit-log retention, concurrency và các invariant hiện đang được transaction Convex bảo vệ cần quyết định SQL cụ thể.
4. Chưa có contract API/versioning/idempotency/pagination/concurrency model. REST + polling có thể làm tăng tải Lambda/Postgres đáng kể và gây lost update.
5. Security/operations còn thiếu threat model, network egress, DB connection management, encryption/backup/restore, logging có kiểm soát PII, rate limits, alarms và DR.

## 2. Phạm vi và bằng chứng đã khảo sát

Đã đối chiếu `.ai/aws-migration-plan.md` với `package.json`, `vite.config.ts`, `vercel.json`, `.github/workflows/*`, toàn bộ `convex/` (trừ nội dung generated không cần diễn giải) và các call-site trong `src/`.

Không có số liệu production trong repository về traffic, kích thước DB, tần suất mutation, concurrency, latency/SLA, RTO/RPO, region, compliance hay hóa đơn hiện tại. Vì vậy mọi quyết định capacity, chi phí và timeline lúc này chỉ là giả thuyết.

## 3. Kiểm chứng các giả định trong plan

| Giả định/nhận định | Kết quả kiểm chứng | Nhận xét |
|---|---|---|
| Frontend là Vite + React SPA, Vercel rewrite về `index.html` | **Đúng** | `vite.config.ts`, `src/App.tsx`, `vercel.json` xác nhận SPA, không SSR. CloudFront phải tự tái tạo fallback route; S3 website hosting không nên được dùng nếu muốn bucket private/OAC. |
| Frontend hiện host trên Vercel | **Chưa chứng minh được chỉ từ repo** | Có `vercel.json`, nhưng không có deployment metadata/DNS. Cần kiểm tra thực tế trước đổi DNS. |
| Backend có 8 bảng | **Sai/thiếu** | Có 7 bảng domain (`software_systems`, `vendors`, `integrations`, `system_modules`, `config_items`, `system_change_logs`, `roadmap_items`) cộng bảng `users` được override, **và** `...authTables` của `@convex-dev/auth` tạo thêm các bảng auth nội bộ. Phải inventory export thật thay vì giả định chỉ 8 bảng. |
| Auth là Convex Auth + Google và server dùng `getAuthUserId` | **Đúng** | `convex/auth.ts`, `auth.config.ts`, `helpers.ts`. Ngoài ra package còn có `@usehercules/auth`, `oidc-client-ts`, `react-oidc-context`, và `src/hooks/use-auth.ts`; cần xác nhận dead code/tránh hai auth stack sau migration. |
| RBAC gồm 4 role và được enforce server-side | **Đúng nhưng đơn giản hóa quá mức** | CRUD thường dùng `requireReadAccess`/`requireWriteAccess`, nhưng integrations cố ý loại `business_owner`; audit logs chỉ CTO/IT manager; user admin chỉ CTO. Port một policy “read/write” chung sẽ làm rộng quyền. `src/lib/permissions.ts` cũng chứa route matrix cần contract-test với backend. |
| Domain logic gần như thuần và tái dùng gần nguyên vẹn | **Đúng một phần** | Các normalizer phần lớn tách được, nhưng `convex/domain/common.ts` import `ConvexError`; integration/integrity tests phụ thuộc `convex-test`, generated API và Convex transaction. Referential checks/cascade/audit nằm chủ yếu trong top-level Convex functions, không nằm trong `domain/*.ts`. |
| Có 11 file frontend dùng Convex hooks | **Gần đúng** | Có 11 file app trực tiếp dùng `useQuery`/`useMutation`/`useConvexAuth` khi tính `use-current-user.ts` và callback; không thấy call-site `useAction`. Ngoài ra provider và sign-in UI cũng phụ thuộc Convex (`src/components/providers/convex.tsx`, `default.tsx`, `src/components/ui/signin.tsx`), nên impact lớn hơn danh sách 11 file. |
| TanStack Query đã có | **Đúng** | Dependency và provider đã có. Tuy nhiên provider hiện nằm bên trong `CurrentUserProvider`; nếu `/users/me` dùng Query thì thứ tự provider phải đổi. |
| Phase 1 đổi 0 dòng app | **Có điều kiện** | Bundle tĩnh vẫn gọi Convex được, nhưng Google redirect URLs, Convex allowed origins/site URL, CORS, CSP, CloudFront SPA error response và cache invalidation phải được cấu hình/test. `VITE_CONVEX_URL` vẫn phải có tại build time. |
| Giữ tên bảng/field/index là đủ để port schema | **Sai** | Convex tự có `_id`, `_creationTime`, semantics optional và transaction; PostgreSQL cần types, defaults, nullability, constraints, timestamps, array/join-table strategy, indexes/unique indexes và delete actions rõ ràng. |
| Post-confirmation trigger đồng bộ mọi Cognito user | **Rủi ro/chưa đủ** | Federated-login lifecycle và trigger coverage phải được kiểm chứng bằng integration test. Trigger retry có thể tạo duplicate; provisioning phải idempotent và không được là điểm duy nhất tạo/merge user. |
| Có thể giữ Convex read-only làm rollback | **Sai nếu không có cơ chế đồng bộ ngược** | Sau mutation đầu tiên trên AWS, Convex đã stale. DNS rollback chỉ khôi phục frontend; auth issuer/session và write data không tự quay lại. |

## 4. P0 risks — phải đóng trước khi build/cutover

### P0.1 — Không có chiến lược nhất quán dữ liệu trong cutover và rollback

Plan chỉ mô tả export/import, shadow comparison rồi DNS/auth cutover. Trong khoảng giữa export và cutover, Convex vẫn nhận write. Sau cutover, AWS nhận write nhưng rollback path là Convex read-only/stale. Cần chọn và thiết kế một trong các phương án:

- maintenance window: chặn mutation ở Convex, final incremental export, reconcile, import transactionally, smoke test rồi bật AWS;
- dual-write/outbox có idempotency và reconciliation (effort/rủi ro cao hơn);
- CDC/delta exporter dựa trên watermark đáng tin cậy; `_creationTime` không đủ cho update/delete nếu không có change stream/tombstone.

Runbook phải nêu điểm **point of no return**, tiêu chí abort, quyền bật/tắt write, cách replay, và rollback data/auth/frontend độc lập. Không được gọi DNS là cơ chế cutover API nếu frontend chứa API URL build-time; cần origin/config switching và TTL cụ thể.

### P0.2 — Identity mapping, invite và role escalation chưa được đặc tả

Hiện tại `users.updateCurrentUser` merge một bản ghi đăng nhập với invitation thủ công theo email, áp role invite, xóa invite, và mặc định `viewer`. Logic còn bảo vệ last active CTO, cấm CTO tự xóa, bootstrap CTO duy nhất. Cognito `sub` sẽ khác Convex user ID và có thể khác theo IdP/linking.

Cần schema identity riêng, tối thiểu `(issuer, subject)` unique, cùng trạng thái invitation riêng thay vì hai loại record dùng chung bảng. Chỉ consume invite khi token hợp lệ, `email_verified=true`, email canonical khớp chính xác và transaction/locking bảo đảm một lần. Xác định hành vi khi Google đổi email, tài khoản bị disable/delete, cùng email từ nhiều issuer, invite trùng, trigger retry/concurrent first-login. Role phải lấy từ DB hoặc claim do pre-token-generation tạo từ nguồn chuẩn; không tin role do client gửi.

### P0.3 — Chưa có relational schema và semantics xóa chính xác

Các quan hệ không cùng một kiểu:

- Xóa vendor khi đang được system tham chiếu phải bị chặn (`RESTRICT`).
- Xóa software system hiện xóa integrations/modules, loại ID khỏi `roadmap_items.relatedSystemIds`, nhưng vẫn ghi audit log với system vừa bị xóa. PostgreSQL cần `CASCADE`, join table và `SET NULL`/snapshot phù hợp, trong **một transaction**.
- Xóa roadmap item đệ quy xóa toàn bộ descendants. Self-FK cần policy và test depth/cycle; recursion ứng dụng có thể timeout/stack overflow.
- `departments`, `campuses`, `usedBy`, `relatedSystemIds`, `changes` là arrays/objects; plan chưa chọn native array, JSONB hay normalized join tables.
- `config_items` kiểm tra uniqueness bằng code nhưng schema Convex không có unique constraint. Postgres cần unique functional index phù hợp normalization, nếu không concurrent requests tạo duplicate.

Đặc tả DDL, FK actions, CHECK/UNIQUE constraints, transaction isolation và migration ordering là deliverable trước Phase 3.

### P0.4 — Chưa có API contract tương đương

Convex trả documents có `_id`, `_creationTime`, `undefined` và tự serialize ID; UI hiện dùng các shape này. REST cần OpenAPI/JSON Schema cho request/response/error, quy tắc `null` so với omitted field, timestamp/timezone, stable sorting, maximum payload, pagination, HTTP mapping và backward compatibility. Không nên chỉ “map error body tương đương”.

Mutation cần idempotency key/retry semantics. API Gateway/browser/network retry có thể tạo duplicate; update toàn-object hiện dễ lost update khi polling. Cần optimistic concurrency (`version`/ETag/`If-Match`) hoặc policy last-write-wins được chấp thuận. API path/version và generated typed client nên được quyết định sớm.

### P0.5 — Database connectivity/capacity chưa khả thi hóa

Lambda trực tiếp tới Aurora có nguy cơ connection storm khi concurrency tăng hoặc cold-start scale-out. Plan phải chọn RDS Proxy hoặc Data API (sau khi xác nhận engine/feature support), connection/pool limits, reserved concurrency, timeout/retry/backoff và circuit breaker. Lambda trong private subnets cũng cần chiến lược egress/VPC endpoints; NAT Gateway có thể là khoản phí nền lớn. Phải load-test cold/warm paths và failover thay vì chỉ so p95 bình thường.

## 5. P1 risks và edge cases

- **Polling regression chưa được định lượng:** interval, refetch focus, stale time, background tabs, request dedup, visibility/offline behavior và cache invalidation sau mutation chưa có. Nhiều page gọi cùng danh sách; polling có thể nhân tải và chi phí. UX cần chỉ báo stale/conflict.
- **Query đang full-scan/full-return:** nhiều Convex query `.collect()` toàn bảng và join in-memory. Port nguyên xi sang Lambda sẽ tốn memory/latency; cần pagination, server aggregation và query plans. Điều này làm “frontend đổi tối thiểu” khó đạt.
- **Ordering:** các list hiện thường dựa vào thứ tự mặc định Convex/creation time; SQL không có order nếu không `ORDER BY`. Test snapshot ordering rõ ràng.
- **Ngày và số:** dates hiện là string `YYYY-MM-DD`, `costPerYear`/scores là JS number. Quyết định `date`, `numeric` precision, validation NaN/Infinity, locale và timezone; giữ semantics so sánh ngày.
- **Audit chưa đầy đủ:** hiện chỉ software systems/modules ghi `system_change_logs`, không phải mọi domain/role change. Plan nói “audit log” dễ tạo kỳ vọng rộng hơn hiện trạng. Cần xác định audit bắt buộc, immutable append-only, retention, access, actor subject/IP/request ID, chống sửa/xóa và xử lý PII.
- **Audit atomicy:** business mutation và audit insert phải cùng transaction; nếu audit thất bại thì mutation phải rollback. Với delete, giữ snapshot/name và FK behavior đúng.
- **Cognito session semantics:** logout, token refresh/expiry, revoked/disabled user, clock skew, multiple tabs, callback replay, auth error, browser back, issuer/audience mismatch và key rotation chưa có.
- **Role freshness:** JWT authorizer xác thực token nhưng không kiểm tra role trong DB. Nếu role được đưa vào access token, demotion/removal không có hiệu lực đến khi token hết hạn nếu Lambda tin claim. Nên DB-authorize cho operation nhạy cảm hoặc thiết kế token revocation/short TTL/cache invalidation.
- **Bootstrap/admin recovery:** `bootstrapCto` hiện là internal mutation có guard. Cần break-glass procedure có MFA, audit, approval và chống tạo CTO thứ hai; không biến nó thành public endpoint.
- **Cognito limits/behavior:** case sensitivity, username/email aliases, account linking, deletion, hosted UI/custom domain, quotas và Google secret rotation cần ADR/runbook.
- **CloudFront deployment:** cache-busted assets có thể immutable, nhưng `index.html` cần TTL ngắn/no-cache và invalidation an toàn. Phải xử lý custom error response 403/404 → `index.html` mà không biến lỗi asset thành HTML 200 khó debug.
- **Environment isolation:** dev/staging/prod cần AWS accounts hoặc boundaries rõ, separate User Pools/DB/secrets/domains, stack deletion protection và không cho staging truy cập prod.
- **IaC state/deploy:** CDK bootstrap roles, least-privilege GitHub OIDC (không static AWS keys), approval prod, migrations trước/sau Lambda deploy, rollback incompatible schema và asset provenance/SBOM chưa có.
- **Observability:** thiếu structured logs, request/correlation ID, metrics, traces, dashboards, SLO burn alerts, DLQ/on-failure handling và quy tắc không log token/PII/query payload.
- **Backups/DR:** chưa có PITR retention, automated backup, snapshot trước migration, cross-region/account copy, restore drill, RTO/RPO và deletion protection.
- **WAF không thay authorization/rate limiting:** cần per-route throttles, body-size limits, abuse controls cho auth/admin, bot/DDOS assumptions và budget alarms.
- **Vercel decommission:** cần inventory domain/env/secrets/deploy hooks/preview deployments; CloudFront tương đương preview environments không tự có.

## 6. Security review

### Bắt buộc trước staging có dữ liệu thật

1. Threat model theo trust boundary: browser → CloudFront/API Gateway → Lambda → DB; Cognito/Google callbacks; CI/CD; operator và migration job.
2. CloudFront dùng HTTPS-only, ACM đúng region, modern TLS, HSTS sau khi xác nhận domain; S3 bucket private với Origin Access Control, Block Public Access và bucket policy chỉ cho distribution. Không dùng public S3 website endpoint.
3. API Gateway JWT authorizer khóa chính xác issuer và audience/client ID. Lambda không nhận role/user ID từ body/header tùy ý; mọi object access đều authorize server-side.
4. OAuth Authorization Code + PKCE, `state` và `nonce`; allow-list redirect/logout URI chính xác, không wildcard. Chốt nơi lưu token và đánh giá XSS. CSP nghiêm, không nhúng secret vào `VITE_*` vì mọi Vite env là public.
5. CORS allow-list theo từng environment, chỉ methods/headers cần thiết; không phản chiếu Origin. Nếu dùng cookie, thêm SameSite/Secure/HttpOnly và CSRF defense; nếu bearer token, chống token leakage qua logs/referrer.
6. Postgres private, TLS enforced, encryption KMS, secret rotation và least-privilege DB roles. Migration principal tách runtime principal; runtime không có quyền DDL/superuser.
7. Secrets Manager chỉ dùng cho server secrets. Google client secret thuộc Cognito/secret integration; frontend chỉ có non-secret IDs. Redact JWT, email và DB errors khỏi CloudWatch/API responses.
8. WAF managed rules phải được tune ở count mode trước block; rate-limit/login abuse và set API Gateway throttling/concurrency caps để bảo vệ DB/budget.
9. CloudTrail/Config/GuardDuty (theo compliance), API access logs có retention, alarms cho auth failures/5xx/latency/connections/cost, và incident runbook.
10. Dependency/IaC scanning, lockfile reproducibility, artifact integrity, OIDC deploy role giới hạn branch/environment và manual approval production.

### Sai giả định bảo mật cần tránh

- Cognito JWT authorizer chỉ xác thực token theo cấu hình; nó không tự thực thi RBAC trong bảng `users`, không tự phát hiện user bị disable ngay lập tức, và không bảo vệ logic object-level.
- WAF không bù cho validation, authorization hoặc query parameterization.
- Foreign keys không tự tái tạo mọi invariant trong code; chúng cũng không giải quyết hierarchy level/cycle, last CTO hay normalized email uniqueness nếu chưa thiết kế constraint/transaction.
- “Google authenticated” không đồng nghĩa email có quyền nhận invite. Quyền phải bind tới identity đã xác minh theo policy rõ ràng.

## 7. Data model và migration checklist

Trước khi viết importer cần tạo data dictionary cho từng collection/field gồm: source type, target type, nullable/default, transform, constraint, index, retention, ownership và validation. Inventory phải lấy từ export thật, bao gồm auth tables, record không đúng schema lịch sử, orphan, duplicate/case-variant emails và IDs trong nested arrays.

Khuyến nghị target model tối thiểu:

- UUID riêng cho domain entities; lưu `legacy_convex_id` unique trong giai đoạn migration để trace/reconcile, không chỉ giữ mapping trong RAM/file tạm.
- `users` tách khỏi `identities` và `invitations`; identity unique `(issuer, subject)`, normalized email có policy rõ ràng. Không nhất thiết migrate Convex sessions/refresh tokens: ép re-login có chủ đích và truyền thông trước.
- Join table cho roadmap ↔ systems nếu cần FK/referential cleanup/query; cân nhắc bảng cho departments/campuses/usedBy nếu chúng thật sự tham chiếu config, nếu không ghi rõ chúng chỉ là snapshot strings.
- `created_at`, `updated_at`, `version`; đừng giả định `_creationTime` tự xuất hiện. Timestamp migration giữ nguyên source time và UTC.
- CHECK constraints cho enums/scores/ranges, unique constraint cho normalized config key/email theo đúng nghiệp vụ, FK delete action được review từng cạnh.
- Audit append-only, partition/retention nếu cần, actor identity bền vững và request ID.

Importer phải restartable/idempotent, chunked, có checkpoint, dry-run, error quarantine, bounded memory, checksum canonical và report mapping. Counts/checksum riêng lẻ chưa đủ: kiểm tra orphan/FK, null distribution, enum distribution, aggregate nghiệp vụ, sample record và query-result parity. Mã hóa artifact export, giới hạn quyền, không ghi PII vào CI artifact/log, đặt TTL và quy trình xóa an toàn.

## 8. Cutover/rollback đề xuất

1. Chốt RTO/RPO, maintenance window, decision owner và communications.
2. Diễn tập ít nhất hai lần bằng production-like snapshot; đo export/import/reconcile time và dung lượng.
3. Giảm DNS TTL từ trước; deploy frontend có cơ chế chuyển backend endpoint được kiểm soát. Xác nhận callback URLs và sessions sẽ bị invalidated/re-login.
4. Bật maintenance/read-only tại source hoặc bắt đầu cơ chế delta đã chứng minh; ghi watermark và final backup.
5. Chạy final delta/import, constraints, reconciliation và parity suite. Không bỏ qua records lỗi.
6. Smoke test Cognito, `/users/me`, mỗi role, CRUD/cascade/audit và cache behavior qua domain thật.
7. Chuyển traffic theo canary/weighted mechanism nếu kiến trúc hỗ trợ; giám sát error, auth failures, DB connections, p95/p99 và data discrepancy.
8. Trong rollback window, hoặc dual-write đáng tin cậy cả hai chiều, hoặc AWS là source of truth và rollback app vẫn phải nói chuyện với AWS. Không quảng bá Convex stale là rollback data path.
9. Chỉ decommission sau khi hết window, backup/restore drill xanh, billing/alarms ổn và secrets/keys cũ được revoke.

Runbook phải nêu rõ rollback cho từng failure class: frontend/CDN, Cognito, API, schema migration, data corruption và performance saturation. Một nút “đổi DNS về Vercel” không xử lý năm loại sau.

## 9. Cost và effort

### Vấn đề với plan hiện tại

Plan chỉ nói “theo tuần, không theo ngày” và không đưa workload/unit economics, staffing, environments hay mức confidence; do đó chưa phải estimate. Aurora Serverless v2 không scale-to-zero trong mọi cấu hình/phiên bản và có baseline ACU; thêm RDS Proxy, NAT Gateway hoặc VPC endpoints, WAF, logs, backups, custom domains, Route53, CloudFront invalidations/data transfer và ba environment có thể khiến fixed cost lấn át request cost ở tải thấp.

Polling làm tăng API/Lambda/DB reads theo `active users × open tabs × queries/page × polling frequency`, không theo số lần người dùng thao tác. Đây phải là input trong cost model.

### Cách estimate cần có

Lập calculator theo ít nhất ba profile (idle/expected/peak) với:

- MAU Cognito và federated sign-ins;
- requests/second, payload/egress, Lambda duration/memory/concurrency/cold start;
- Aurora min/max ACU, storage/I/O/backups, Proxy connections;
- NAT hourly/data processing hoặc endpoint costs;
- CloudFront/S3 requests + egress, WAF requests/rules, logs ingest/retention, Secrets/KMS, Route53;
- dev/staging/prod và DR; support plan/on-call/engineering cost;
- 30–50% contingency cho unknowns và load-test evidence.

Một planning range hợp lý để khám phá — **không phải cam kết** — là khoảng **10–18 engineer-weeks** cho một migration production-grade nhỏ, cộng review/platform/security và thời gian chờ OAuth/DNS/UAT. Nếu chỉ một kỹ sư, calendar time thường dài hơn đáng kể. Range phải được thay bằng bottom-up estimate sau inventory endpoint/schema, data volume và SLO; real-time, strict compliance, zero-downtime hoặc bidirectional rollback sẽ tăng mạnh.

## 10. Test matrix bắt buộc

| Nhóm | Ca kiểm thử tối thiểu | Gate |
|---|---|---|
| Domain parity | Normalization/validation cũ; boundary 0/100; empty/whitespace; enum/date/number; hierarchy level/cycle | Assertions tương đương hoặc thay đổi có ADR |
| API contract | Request/response/error schema; omitted vs null; ID/time serialization; stable ordering; pagination; large/invalid body; unsupported method/content type | OpenAPI contract + generated client xanh |
| Authentication | Google success/deny; callback tamper/replay; PKCE/state/nonce; wrong issuer/audience; expired/not-before token; JWKS rotation/outage; refresh/logout; disabled/deleted user | Không bypass; UX phục hồi được |
| Provisioning/invite | New viewer; verified invite; unverified email; duplicate/case/Unicode email; concurrent first login; trigger retry; multiple IdPs; changed email | Một identity/user/role đúng, idempotent |
| RBAC | Mọi endpoint × unauthenticated × 4 roles; đặc biệt integrations loại business owner, logs CTO/IT manager, user admin CTO | Default deny, backend matrix khớp hiện tại |
| Admin invariants | Cannot self-delete; cannot remove/demote last active CTO; concurrent demotions; bootstrap once/break-glass audit | Không thể về 0 active CTO hoặc escalation |
| Referential integrity | Missing vendor/system/parent; vendor restrict; system cascade + roadmap detach + audit retention; roadmap recursive delete; orphan lịch sử | Một transaction, không orphan ngoài policy |
| Concurrency/retry | Duplicate POST, concurrent update/delete, unique config/email races, Lambda retry, DB timeout/deadlock | Idempotent hoặc conflict rõ, không lost update |
| Audit | Create/update/delete module/system; actor snapshot; diff; auth failure; audit insert failure; immutability/access/retention | Mutation và audit atomic |
| Migration | Full + delta; rerun; resume after crash; malformed row; mapping nested/self refs; counts/checksums/FK/distributions/query parity | 100% accounted; zero unexplained mismatch |
| Frontend | Deep-link refresh, 403/404 asset, cache/version skew, offline/stale/polling, multi-tab, mutation invalidation, role change mid-session | Không blank page/stale privilege |
| Performance | cold/warm p50/p95/p99; peak/burst/soak; connection exhaustion; large lists; polling fan-out; failover | Đạt SLO với headroom và budget |
| Resilience/DR | Aurora failover, secret/JWKS/Google outage, Lambda throttle, partial deploy, backup restore, region/account recovery | RTO/RPO đo được |
| Security | CORS/CSRF/XSS/CSP, SQL injection, IDOR, mass assignment, rate limit, WAF false positive, secret/PII log scan, dependency/IaC scan | Không critical/high chưa xử lý |
| Deployment | CDK synth/diff, least-privilege OIDC, schema forward/back compatibility, canary/rollback, CloudFront invalidation | Rehearsal staging hoàn chỉnh |

Không nên chỉ dùng Cognito JWT “giả lập” cho toàn bộ security suite. Unit tests có thể dùng signed local fixtures, nhưng staging E2E phải lấy token thật từ User Pool/test IdP hoặc một flow automation được AWS hỗ trợ và phải kiểm tra authorizer thật.

## 11. Go/no-go gates

### Gate A — trước Phase 1 (frontend rehost)

- Domain/DNS ownership, TLS, OAuth redirect/origin allow-list và CSP đã xác nhận.
- Private S3 + OAC, SPA fallback, cache policy/invalidation và rollback frontend đã test.
- Baseline latency/errors và Vercel deployment inventory đã lưu.

### Gate B — trước Phase 2/3

- ADR chốt region/accounts, SLO, RTO/RPO, budget, data residency, reactivity regression và owner on-call.
- Endpoint inventory + OpenAPI draft + exact RBAC matrix được duyệt.
- PostgreSQL DDL/FK/transaction/identity model được review.
- Cost model ba profile và bottom-up effort/staffing được duyệt.
- Cutover strategy chọn write-freeze/delta/dual-write; rollback source-of-truth rõ ràng.

### Gate C — trước staging có production-like data

- Threat model và security controls ở §6 hoàn tất.
- IaC environment isolation, GitHub OIDC, backup/PITR, deletion protection, alarms và secret rotation hoạt động.
- Data masking hoặc quyền truy cập snapshot staging được phê duyệt.

### Gate D — trước production cutover

- Hai migration rehearsals xanh trong maintenance budget; 100% records accounted, không mismatch chưa giải thích.
- Test matrix P0/RBAC/auth/cascade/concurrency/performance/restore xanh; security critical/high = 0 hoặc có risk acceptance có chủ sở hữu/hạn xử lý.
- Load/soak đạt SLO và DB connection headroom; monthly projection trong budget.
- Runbook cutover/rollback đã tabletop và có người trực, dashboard/alerts/communications sẵn sàng.
- Google/Cognito production config, quotas và domain certificates đã xác nhận.

### Gate E — trước decommission Convex/Vercel

- Hết rollback window đã định lượng; không discrepancy, error budget và chi phí ổn định.
- Backup AWS restore thành công; audit/retention đáp ứng yêu cầu.
- Đã quyết định/xử lý dữ liệu ghi sau cutover, thu hồi credentials/secrets cũ, tắt workflow seed và cập nhật runbooks/ownership.

## 12. Các sửa đổi đề nghị cho migration plan

1. Chèn một phase **discovery/contract** trước IaC: production inventory, endpoint/OpenAPI, relational DDL, identity model, SLO/RPO/RTO, cost model.
2. Tách migration auth thành: Cognito federation, identity linking, invitation provisioning, RBAC source of truth, token/session lifecycle và admin recovery.
3. Đưa cutover-data design lên trước việc viết importer; chọn rõ freeze/delta/dual-write và source of truth khi rollback.
4. Thêm platform requirements: RDS connection management, environment/accounts, egress, backup/restore, observability, alarms, DR và secure CI/CD.
5. Xem polling là thay đổi capacity lẫn UX, có benchmark và product sign-off; không mặc định “regression nhỏ”.
6. Không cam kết “giữ nguyên UI” hoặc “domain gần như nguyên vẹn” cho đến khi contract parity và query pagination được thiết kế.
7. Chỉ chuyển trạng thái sang GO khi Gate B đóng; hiện tại kiến trúc đủ để làm spike/PoC không dữ liệu thật, chưa đủ để triển khai production.
