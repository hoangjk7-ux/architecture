import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Language = "vi" | "en";

type TranslationKey = string;

type TranslationMap = Record<TranslationKey, Record<Language, string>>;

const translations: TranslationMap = {
  "auth.signIn": { vi: "Đăng nhập", en: "Sign in" },
  "auth.signOut": { vi: "Đăng xuất", en: "Sign out" },
  "auth.username": { vi: "Tài khoản", en: "Username" },
  "auth.password": { vi: "Mật khẩu", en: "Password" },
  "auth.google": { vi: "Đăng nhập bằng Google", en: "Sign in with Google" },
  "auth.or": { vi: "hoặc", en: "or" },
  "nav.dashboard": { vi: "Bảng điều khiển", en: "Dashboard" },
  "nav.systems": { vi: "Kho hệ thống", en: "System inventory" },
  "nav.vendors": { vi: "Nhà cung cấp", en: "Vendors" },
  "nav.architecture": { vi: "Bản đồ kiến trúc", en: "Architecture map" },
  "nav.integrations": { vi: "Tích hợp", en: "Integrations" },
  "nav.roadmap": { vi: "Lộ trình", en: "Roadmap" },
  "nav.users": { vi: "Người dùng & vai trò", en: "Users & roles" },
  "nav.settings": { vi: "Cấu hình", en: "Settings" },
  "app.title": { vi: "Nền tảng TechGov", en: "TechGov Platform" },
  "app.subtitle": {
    vi: "Quản trị công nghệ cho CTO trường quốc tế",
    en: "Technology governance for the international school CTO",
  },

  "detail.status": { vi: "Trạng thái", en: "Status" },
  "detail.criticality": { vi: "Mức độ trọng yếu", en: "Criticality" },
  "detail.riskLevel": { vi: "Mức rủi ro", en: "Risk Level" },
  "detail.hosting": { vi: "Lưu trữ", en: "Hosting" },
  "detail.owner": { vi: "Chủ sở hữu", en: "Owner" },
  "detail.technology": { vi: "Công nghệ", en: "Technology" },
  "detail.database": { vi: "Cơ sở dữ liệu", en: "Database" },
  "detail.sla": { vi: "SLA", en: "SLA" },
  "detail.license": { vi: "Giấy phép", en: "License" },
  "detail.contractEnd": { vi: "Hết hạn HĐ", en: "Contract End" },
  "detail.contractEndDate": {
    vi: "Ngày hết hạn hợp đồng",
    en: "Contract End Date",
  },
  "detail.departments": { vi: "Phòng ban", en: "Departments" },
  "detail.campuses": { vi: "Cơ sở", en: "Campuses" },
  "detail.architectureScore": {
    vi: "Điểm kiến trúc",
    en: "Architecture Score",
  },
  "detail.technicalDebt": { vi: "Nợ kỹ thuật", en: "Technical Debt" },
  "detail.annualCost": { vi: "Chi phí/năm", en: "Annual Cost" },
  "detail.modules": { vi: "Module", en: "Modules" },
  "detail.active": { vi: "đang dùng", en: "active" },
  "detail.upcoming": { vi: "sắp triển khai", en: "upcoming" },
  "detail.deprecated": { vi: "ngừng dùng", en: "deprecated" },
  "detail.more": { vi: "thêm", en: "more" },
  "detail.overview": { vi: "Tổng quan", en: "Overview" },
  "detail.integrations": { vi: "Tích hợp", en: "Integrations" },
  "detail.outbound": { vi: "Đi ra", en: "Outbound" },
  "detail.inbound": { vi: "Đi vào", en: "Inbound" },
  "detail.noIntegrations": {
    vi: "Chưa ghi nhận tích hợp nào",
    en: "No integrations recorded",
  },
  "detail.nonCompliant": { vi: "Không tuân thủ", en: "Non-compliant" },
  "detail.lastSync": { vi: "Đồng bộ lần cuối", en: "Last sync" },
  "detail.unknown": { vi: "Không xác định", en: "Unknown" },
  "detail.error": { vi: "Lỗi", en: "Err" },

  "toast.moduleAdded": { vi: "Đã thêm module", en: "Module added" },
  "toast.moduleUpdated": { vi: "Đã cập nhật module", en: "Module updated" },
  "toast.moduleDeleted": { vi: "Đã xoá module", en: "Module deleted" },

  "vendor.contractExpiringSoon": {
    vi: "Hợp đồng sắp hết hạn!",
    en: "Contract expiring soon!",
  },
  "vendor.contractRenewalNeeded": {
    vi: "Cần gia hạn hợp đồng",
    en: "Contract renewal needed",
  },
  "vendor.alreadyExpired": { vi: "Đã hết hạn", en: "Already expired" },
  "vendor.contact": { vi: "Liên hệ", en: "Contact" },
  "vendor.linkedSystems": { vi: "Hệ thống liên kết", en: "Linked Systems" },
  "vendor.noLinkedSystems": {
    vi: "Chưa có hệ thống nào liên kết với nhà cung cấp này.",
    en: "No systems linked to this vendor.",
  },

  "modal.addModule": { vi: "Thêm module", en: "Add Module" },
  "modal.editModule": { vi: "Sửa module", en: "Edit Module" },

  // ─── Common ──────────────────────────────────────────────────────────────
  "common.add": { vi: "Thêm", en: "Add" },
  "common.edit": { vi: "Sửa", en: "Edit" },
  "common.delete": { vi: "Xoá", en: "Delete" },
  "common.cancel": { vi: "Huỷ", en: "Cancel" },
  "common.save": { vi: "Lưu", en: "Save" },
  "common.saving": { vi: "Đang lưu…", en: "Saving…" },
  "common.search": { vi: "Tìm kiếm", en: "Search" },
  "common.filter": { vi: "Lọc", en: "Filter" },
  "common.actions": { vi: "Hành động", en: "Actions" },
  "common.clear": { vi: "Xoá lọc", en: "Clear" },
  "common.description": { vi: "Mô tả", en: "Description" },
  "common.notes": { vi: "Ghi chú", en: "Notes" },
  "common.nameRequired": { vi: "Tên là bắt buộc", en: "Name is required" },
  "common.titleRequired": {
    vi: "Tiêu đề là bắt buộc",
    en: "Title is required",
  },
  "common.saveFailed": { vi: "Lưu thất bại", en: "Failed to save" },
  "common.unassigned": { vi: "Chưa gán", en: "Unassigned" },
  "common.internal": { vi: "Nội bộ", en: "Internal" },
  "common.results": { vi: "kết quả", en: "results" },
  "common.noneInternal": { vi: "Không có (Nội bộ)", en: "None (Internal)" },

  // ─── Dashboard ───────────────────────────────────────────────────────────
  "dashboard.title": { vi: "Bảng điều khiển", en: "Dashboard" },
  "dashboard.subtitle": {
    vi: "Tổng quan quản trị công nghệ",
    en: "Technology governance overview",
  },
  "dashboard.systems": { vi: "Hệ thống", en: "Systems" },
  "dashboard.integrations": { vi: "Tích hợp", en: "Integrations" },
  "dashboard.roadmap": { vi: "Lộ trình", en: "Roadmap" },
  "dashboard.vendors": { vi: "Nhà cung cấp", en: "Vendors" },
  "dashboard.totalSystems": { vi: "Tổng số hệ thống", en: "Total Systems" },
  "dashboard.active": { vi: "Đang hoạt động", en: "Active" },
  "dashboard.highRisk": { vi: "Rủi ro cao", en: "High Risk" },
  "dashboard.legacy": { vi: "Hệ thống cũ", en: "Legacy" },
  "dashboard.avgArchitectureScore": {
    vi: "Điểm kiến trúc TB",
    en: "Avg Architecture Score",
  },
  "dashboard.avgTechnicalDebt": {
    vi: "Nợ kỹ thuật TB",
    en: "Avg Technical Debt",
  },
  "dashboard.expiringContracts": {
    vi: "Hợp đồng sắp hết hạn",
    en: "Expiring Contracts",
  },
  "dashboard.within30Days": { vi: "Trong 30 ngày", en: "Within 30 days" },
  "dashboard.total": { vi: "Tổng số", en: "Total" },
  "dashboard.healthy": { vi: "Ổn định", en: "Healthy" },
  "dashboard.degraded": { vi: "Suy giảm", en: "Degraded" },
  "dashboard.down": { vi: "Ngừng hoạt động", en: "Down" },
  "dashboard.nonCompliantIntegrations": {
    vi: "tích hợp chưa tuân thủ kiến trúc",
    en: "integration(s) not architecture-compliant",
  },
  "dashboard.inProgress": { vi: "Đang thực hiện", en: "In Progress" },
  "dashboard.blocked": { vi: "Bị chặn", en: "Blocked" },
  "dashboard.completionRate": { vi: "Tỷ lệ hoàn thành", en: "Completion Rate" },
  "dashboard.overdue": { vi: "Quá hạn", en: "Overdue" },
  "dashboard.totalVendors": { vi: "Tổng số nhà cung cấp", en: "Total Vendors" },
  "dashboard.riskScoreAtLeast70": {
    vi: "Điểm rủi ro >= 70",
    en: "Risk score >= 70",
  },
  "dashboard.noVendors": {
    vi: "Chưa có nhà cung cấp nào.",
    en: "No vendors yet.",
  },
  "dashboard.risk": { vi: "Rủi ro", en: "Risk" },

  "status.active": { vi: "Đang hoạt động", en: "Active" },
  "status.sunset": { vi: "Ngừng dùng", en: "Sunset" },
  "status.pilot": { vi: "Thử nghiệm", en: "Pilot" },
  "status.inactive": { vi: "Không hoạt động", en: "Inactive" },
  "status.allStatus": { vi: "Tất cả trạng thái", en: "All Status" },
  "status.notStarted": { vi: "Chưa bắt đầu", en: "Not Started" },
  "status.inProgress": { vi: "Đang thực hiện", en: "In Progress" },
  "status.blocked": { vi: "Bị chặn", en: "Blocked" },
  "status.done": { vi: "Hoàn thành", en: "Done" },
  "status.cancelled": { vi: "Đã huỷ", en: "Cancelled" },

  "level.high": { vi: "Cao", en: "High" },
  "level.medium": { vi: "Trung bình", en: "Medium" },
  "level.low": { vi: "Thấp", en: "Low" },
  "level.allRisk": { vi: "Tất cả mức rủi ro", en: "All Risk" },
  "level.allCriticality": { vi: "Tất cả mức trọng yếu", en: "All Criticality" },

  "systemType.core": { vi: "Cốt lõi", en: "Core" },
  "systemType.supporting": { vi: "Hỗ trợ", en: "Supporting" },
  "systemType.legacy": { vi: "Cũ", en: "Legacy" },
  "systemType.pilot": { vi: "Thử nghiệm", en: "Pilot" },
  "systemType.allTypes": { vi: "Tất cả loại", en: "All Types" },

  "health.healthy": { vi: "Ổn định", en: "Healthy" },
  "health.degraded": { vi: "Suy giảm", en: "Degraded" },
  "health.down": { vi: "Ngừng hoạt động", en: "Down" },
  "health.unknown": { vi: "Không xác định", en: "Unknown" },

  "method.realtime": { vi: "Thời gian thực", en: "Realtime" },
  "method.batch": { vi: "Theo lô", en: "Batch" },
  "method.event_driven": { vi: "Theo sự kiện", en: "Event Driven" },
  "method.manual": { vi: "Thủ công", en: "Manual" },

  "lifecycle.in_use": { vi: "Đang dùng", en: "In Use" },
  "lifecycle.in_development": { vi: "Đang phát triển", en: "In Development" },
  "lifecycle.planned": { vi: "Kế hoạch", en: "Planned" },
  "lifecycle.deprecated": { vi: "Sắp bỏ", en: "Deprecated" },
  "lifecycle.retired": { vi: "Đã bỏ", en: "Retired" },

  // ─── Systems page ────────────────────────────────────────────────────────
  "systems.title": { vi: "Kho hệ thống", en: "System Inventory" },
  "systems.subtitleSuffix": {
    vi: "hệ thống được theo dõi trên toàn bộ campus",
    en: "systems tracked across all campuses",
  },
  "systems.addSystem": { vi: "Thêm hệ thống", en: "Add System" },
  "systems.addNewSystem": { vi: "Thêm hệ thống mới", en: "Add New System" },
  "systems.editSystem": { vi: "Sửa hệ thống", en: "Edit System" },
  "systems.searchPlaceholder": {
    vi: "Tìm theo tên hoặc danh mục…",
    en: "Search name or category…",
  },
  "systems.noSystemsFound": {
    vi: "Không tìm thấy hệ thống nào",
    en: "No systems found",
  },
  "systems.addFirstSystem": {
    vi: "Thêm hệ thống đầu tiên",
    en: "Add your first system",
  },
  "systems.stat.total": { vi: "Tổng số hệ thống", en: "Total Systems" },
  "systems.stat.totalSub": {
    vi: "trên toàn bộ campus",
    en: "across all campuses",
  },
  "systems.stat.critical": { vi: "Hệ thống trọng yếu", en: "Critical Systems" },
  "systems.stat.criticalSub": {
    vi: "mức độ trọng yếu cao",
    en: "high criticality",
  },
  "systems.stat.legacy": { vi: "Hệ thống cũ", en: "Legacy Systems" },
  "systems.stat.legacySub": {
    vi: "cần kế hoạch chuyển đổi",
    en: "require migration plan",
  },
  "systems.stat.noOwner": { vi: "Chưa có chủ sở hữu", en: "No Owner" },
  "systems.stat.noOwnerSub": {
    vi: "hệ thống chưa được gán",
    en: "unassigned systems",
  },
  "systems.stat.expiring": { vi: "Hết hạn trong 90 ngày", en: "Expiring 90d" },
  "systems.stat.expiringSub": {
    vi: "hợp đồng sắp hết hạn",
    en: "contracts ending soon",
  },
  "systems.stat.highDebt": { vi: "Nợ kỹ thuật cao", en: "High Tech Debt" },
  "systems.stat.highDebtSub": { vi: "điểm nợ > 60", en: "debt score > 60" },
  "systems.col.system": { vi: "Hệ thống", en: "System" },
  "systems.col.typeCategory": { vi: "Loại / Danh mục", en: "Type / Category" },
  "systems.col.owner": { vi: "Chủ sở hữu", en: "Owner" },
  "systems.col.governingDepartment": { vi: "Phòng ban quản trị", en: "Governing Department" },
  "systems.col.vendor": { vi: "Nhà cung cấp", en: "Vendor" },
  "systems.col.risk": { vi: "Rủi ro", en: "Risk" },
  "systems.col.scores": { vi: "Điểm số", en: "Scores" },
  "systems.col.contract": { vi: "Hợp đồng", en: "Contract" },
  "systems.col.actions": { vi: "Hành động", en: "Actions" },
  "systems.form.name": { vi: "Tên hệ thống *", en: "System Name *" },
  "systems.form.namePlaceholder": {
    vi: "VD: Student CRM",
    en: "e.g. Student CRM",
  },
  "systems.form.type": { vi: "Loại", en: "Type" },
  "systems.form.category": { vi: "Danh mục", en: "Category" },
  "systems.form.status": { vi: "Trạng thái", en: "Status" },
  "systems.form.criticality": { vi: "Mức độ trọng yếu", en: "Criticality" },
  "systems.form.owner": { vi: "Chủ sở hữu", en: "Owner" },
  "systems.form.ownerPlaceholder": { vi: "VD: IT Team", en: "e.g. IT Team" },
  "systems.form.vendor": { vi: "Nhà cung cấp", en: "Vendor" },
  "systems.form.technology": { vi: "Công nghệ", en: "Technology" },
  "systems.form.technologyPlaceholder": {
    vi: "VD: Laravel, NodeJS",
    en: "e.g. Laravel, NodeJS",
  },
  "systems.form.database": { vi: "Cơ sở dữ liệu", en: "Database" },
  "systems.form.databasePlaceholder": {
    vi: "VD: MySQL, PostgreSQL",
    en: "e.g. MySQL, PostgreSQL",
  },
  "systems.form.hosting": { vi: "Lưu trữ", en: "Hosting" },
  "systems.form.hostingPlaceholder": {
    vi: "VD: AWS, On-premise",
    en: "e.g. AWS, On-premise",
  },
  "systems.form.sla": { vi: "SLA", en: "SLA" },
  "systems.form.slaPlaceholder": { vi: "VD: 99.9%", en: "e.g. 99.9%" },
  "systems.form.licenseType": { vi: "Loại giấy phép", en: "License Type" },
  "systems.form.licenseTypePlaceholder": {
    vi: "VD: Subscription",
    en: "e.g. Subscription",
  },
  "systems.form.costPerYear": {
    vi: "Chi phí / Năm (VNĐ)",
    en: "Cost / Year (VND)",
  },
  "systems.form.contractEndDate": {
    vi: "Ngày hết hạn hợp đồng",
    en: "Contract End Date",
  },
  "systems.form.riskLevel": { vi: "Mức rủi ro", en: "Risk Level" },
  "systems.form.technicalDebt": {
    vi: "Nợ kỹ thuật (0–100)",
    en: "Technical Debt (0–100)",
  },
  "systems.form.architectureScore": {
    vi: "Điểm kiến trúc (0–100)",
    en: "Architecture Score (0–100)",
  },
  "systems.form.departments": { vi: "Phòng ban", en: "Departments" },
  "systems.form.campuses": { vi: "Cơ sở", en: "Campuses" },
  "systems.form.description": { vi: "Mô tả", en: "Description" },
  "systems.form.descriptionPlaceholder": {
    vi: "Mô tả ngắn gọn...",
    en: "Brief description...",
  },
  "systems.form.saveSystem": { vi: "Lưu hệ thống", en: "Save System" },
  "systems.toast.added": { vi: "Đã thêm hệ thống", en: "System added" },
  "systems.toast.updated": { vi: "Đã cập nhật hệ thống", en: "System updated" },
  "systems.toast.removed": { vi: "Đã xoá hệ thống", en: "System removed" },
  "systems.activityLog": { vi: "Nhật ký hoạt động", en: "Activity Log" },
  "systems.activityLogTitle": {
    vi: "Nhật ký thay đổi hệ thống",
    en: "System Activity Log",
  },
  "systems.noLogs": {
    vi: "Chưa có thay đổi nào được ghi nhận",
    en: "No changes recorded yet",
  },
  "systems.by": { vi: "bởi", en: "by" },
  "systems.badge.highRisk": { vi: "Rủi ro cao", en: "High Risk" },
  "systems.badge.critical": { vi: "Trọng yếu", en: "Critical" },
  "action.created": { vi: "Đã tạo", en: "Created" },
  "action.updated": { vi: "Đã cập nhật", en: "Updated" },
  "action.deleted": { vi: "Đã xoá", en: "Deleted" },
  "action.featureCreated": { vi: "Đã thêm tính năng", en: "Feature added" },
  "action.featureUpdated": {
    vi: "Đã điều chỉnh tính năng",
    en: "Feature updated",
  },
  "action.featureDeleted": { vi: "Đã xoá tính năng", en: "Feature deleted" },

  // ─── Vendors page ────────────────────────────────────────────────────────
  "vendors.title": {
    vi: "Quản lý Nhà cung cấp & Hợp đồng",
    en: "Vendor & Contract Management",
  },
  "vendors.subtitleVendors": { vi: "nhà cung cấp", en: "vendors" },
  "vendors.subtitleTotalCost": { vi: "tổng chi phí", en: "total cost" },
  "vendors.perYear": { vi: "/năm", en: "/yr" },
  "vendors.addVendor": { vi: "Thêm nhà cung cấp", en: "Add Vendor" },
  "vendors.editVendor": { vi: "Sửa nhà cung cấp", en: "Edit Vendor" },
  "vendors.searchPlaceholder": {
    vi: "Tìm nhà cung cấp…",
    en: "Search vendors…",
  },
  "vendors.noVendorsFound": {
    vi: "Không tìm thấy nhà cung cấp nào",
    en: "No vendors found",
  },
  "vendors.addFirstVendor": {
    vi: "Thêm nhà cung cấp đầu tiên",
    en: "Add your first vendor",
  },
  "vendors.stat.total": { vi: "Tổng số nhà cung cấp", en: "Total Vendors" },
  "vendors.stat.urgent": { vi: "Hết hạn ≤30 ngày", en: "Expiring ≤30d" },
  "vendors.stat.urgentSub": { vi: "cần gia hạn gấp", en: "urgent renewal" },
  "vendors.stat.expiring": { vi: "Hết hạn ≤90 ngày", en: "Expiring ≤90d" },
  "vendors.stat.expiringSub": {
    vi: "lên kế hoạch gia hạn",
    en: "plan renewal",
  },
  "vendors.stat.highRisk": { vi: "Rủi ro cao", en: "High Risk" },
  "vendors.stat.highRiskSub": { vi: "điểm ≥ 70", en: "score ≥ 70" },
  "vendors.stat.totalSpend": { vi: "Tổng chi phí", en: "Total Spend" },
  "vendors.stat.perYear": { vi: "mỗi năm", en: "per year" },
  "vendors.filter.allRisk": { vi: "Tất cả mức rủi ro", en: "All Risk" },
  "vendors.filter.highRisk": { vi: "Rủi ro cao (≥70)", en: "High Risk (≥70)" },
  "vendors.filter.mediumRisk": {
    vi: "Trung bình (40–69)",
    en: "Medium (40–69)",
  },
  "vendors.filter.lowRisk": { vi: "Thấp (<40)", en: "Low (<40)" },
  "vendors.filter.allContracts": { vi: "Tất cả hợp đồng", en: "All Contracts" },
  "vendors.filter.expiring30": { vi: "Hết hạn ≤30 ngày", en: "Expiring ≤30d" },
  "vendors.filter.expiring90": { vi: "Hết hạn ≤90 ngày", en: "Expiring ≤90d" },
  "vendors.filter.active90": { vi: "Còn hạn >90 ngày", en: "Active >90d" },
  "vendors.card.systems": { vi: "Hệ thống", en: "Systems" },
  "vendors.card.risk": { vi: "Rủi ro", en: "Risk" },
  "vendors.card.support": { vi: "Hỗ trợ", en: "Support" },
  "vendors.supportBizHrs": { vi: "Giờ hành chính", en: "Biz Hrs" },
  "vendors.supportEmail": { vi: "Email", en: "Email" },
  "vendors.support247Full": { vi: "Hỗ trợ 24/7", en: "24/7 Support" },
  "vendors.supportBizHrsFull": { vi: "Giờ hành chính", en: "Business Hours" },
  "vendors.supportEmailFull": { vi: "Chỉ qua Email", en: "Email Only" },
  "vendors.form.name": { vi: "Tên nhà cung cấp *", en: "Vendor Name *" },
  "vendors.form.namePlaceholder": {
    vi: "VD: OpenEdu Solutions",
    en: "e.g. OpenEdu Solutions",
  },
  "vendors.form.contactName": { vi: "Người liên hệ", en: "Contact Name" },
  "vendors.form.contactEmail": { vi: "Email liên hệ", en: "Contact Email" },
  "vendors.form.supportLevel": { vi: "Mức hỗ trợ", en: "Support Level" },
  "vendors.form.sla": { vi: "SLA", en: "SLA" },
  "vendors.form.slaPlaceholder": { vi: "VD: 99.9%", en: "e.g. 99.9%" },
  "vendors.form.costPerYear": {
    vi: "Chi phí / Năm (VNĐ)",
    en: "Cost / Year (VND)",
  },
  "vendors.form.contractEndDate": {
    vi: "Ngày hết hạn hợp đồng",
    en: "Contract End Date",
  },
  "vendors.form.riskScore": {
    vi: "Điểm rủi ro (0–100) — cao hơn = rủi ro hơn",
    en: "Risk Score (0–100) — higher = riskier",
  },
  "vendors.form.notesPlaceholder": {
    vi: "Ghi chú thêm...",
    en: "Additional notes...",
  },
  "vendors.form.saveVendor": { vi: "Lưu nhà cung cấp", en: "Save Vendor" },
  "vendors.toast.added": { vi: "Đã thêm nhà cung cấp", en: "Vendor added" },
  "vendors.toast.updated": {
    vi: "Đã cập nhật nhà cung cấp",
    en: "Vendor updated",
  },
  "vendors.toast.removed": { vi: "Đã xoá nhà cung cấp", en: "Vendor removed" },

  // ─── Integrations page ───────────────────────────────────────────────────
  "integrations.title": {
    vi: "Quản trị Tích hợp",
    en: "Integration Governance",
  },
  "integrations.subtitleSuffix": {
    vi: "tích hợp được theo dõi",
    en: "integrations tracked",
  },
  "integrations.addIntegration": { vi: "Thêm tích hợp", en: "Add Integration" },
  "integrations.editIntegration": {
    vi: "Sửa tích hợp",
    en: "Edit Integration",
  },
  "integrations.noIntegrationsTracked": {
    vi: "Chưa có tích hợp nào được theo dõi",
    en: "No integrations tracked yet",
  },
  "integrations.col.integration": { vi: "Tích hợp", en: "Integration" },
  "integrations.col.sourceDestination": {
    vi: "Nguồn → Đích",
    en: "Source → Destination",
  },
  "integrations.col.protocol": { vi: "Giao thức", en: "Protocol" },
  "integrations.col.health": { vi: "Tình trạng", en: "Health" },
  "integrations.col.compliance": { vi: "Tuân thủ", en: "Compliance" },
  "integrations.col.actions": { vi: "Hành động", en: "Actions" },
  "integrations.compliant": { vi: "Tuân thủ", en: "Compliant" },
  "integrations.form.name": { vi: "Tên tích hợp *", en: "Integration Name *" },
  "integrations.form.namePlaceholder": {
    vi: "VD: Đồng bộ CRM sang ERP",
    en: "e.g. CRM to ERP Sync",
  },
  "integrations.form.source": { vi: "Hệ thống nguồn *", en: "Source System *" },
  "integrations.form.destination": {
    vi: "Hệ thống đích *",
    en: "Destination System *",
  },
  "integrations.form.selectSource": {
    vi: "Chọn hệ thống nguồn",
    en: "Select source",
  },
  "integrations.form.selectDestination": {
    vi: "Chọn hệ thống đích",
    en: "Select destination",
  },
  "integrations.form.protocol": { vi: "Giao thức", en: "Protocol" },
  "integrations.form.method": { vi: "Phương thức", en: "Method" },
  "integrations.form.healthStatus": { vi: "Tình trạng", en: "Health Status" },
  "integrations.form.criticalLevel": {
    vi: "Mức độ quan trọng",
    en: "Critical Level",
  },
  "integrations.form.owner": { vi: "Người phụ trách", en: "Owner" },
  "integrations.form.ownerPlaceholder": {
    vi: "VD: IT Team",
    en: "e.g. IT Team",
  },
  "integrations.form.errorRate": { vi: "Tỷ lệ lỗi (%)", en: "Error Rate (%)" },
  "integrations.form.lastSync": { vi: "Đồng bộ lần cuối", en: "Last Sync" },
  "integrations.form.architectureCompliant": {
    vi: "Tuân thủ kiến trúc",
    en: "Architecture Compliant",
  },
  "integrations.form.description": { vi: "Mô tả", en: "Description" },
  "integrations.form.descriptionPlaceholder": {
    vi: "Mô tả tích hợp này...",
    en: "Describe this integration...",
  },
  "integrations.toast.validation": {
    vi: "Cần nhập tên, nguồn và đích",
    en: "Name, source and destination are required",
  },
  "integrations.toast.added": {
    vi: "Đã thêm tích hợp",
    en: "Integration added",
  },
  "integrations.toast.updated": { vi: "Đã cập nhật", en: "Updated" },
  "integrations.toast.removed": { vi: "Đã xoá", en: "Removed" },

  // ─── Architecture page ───────────────────────────────────────────────────
  "arch.tab.map": { vi: "Sơ đồ kiến trúc", en: "Architecture Map" },
  "arch.tab.flow": { vi: "Luồng tích hợp", en: "Integration Flow" },
  "arch.tab.gantt": { vi: "Dòng thời gian", en: "Gantt Timeline" },
  "arch.tab.dept": { vi: "Phòng ban", en: "Departments" },
  "arch.legend.edge": { vi: "Liên kết:", en: "Edge:" },
  "arch.legend.moduleIcons": { vi: "Biểu tượng module:", en: "Module icons:" },
  "arch.integrationsWord": { vi: "tích hợp", en: "integrations" },
  "arch.systemsWord": { vi: "hệ thống", en: "systems" },
  "arch.noSystemsToDisplay": {
    vi: "Chưa có hệ thống nào để hiển thị",
    en: "No systems to display",
  },
  "arch.addSystemsFirst": {
    vi: "Thêm hệ thống trong Kho hệ thống trước",
    en: "Add systems in System Inventory first",
  },
  "arch.flow.systemType": { vi: "Loại hệ thống:", en: "System type:" },
  "arch.flow.edgeHealth": { vi: "Tình trạng liên kết:", en: "Edge health:" },
  "arch.flow.legendNote": {
    vi: "Độ dày = mức độ quan trọng · Mũi tên = hướng luồng",
    en: "Thickness = criticality · Arrows = flow direction",
  },
  "arch.flow.hint": {
    vi: "Nhấp vào hệ thống để làm nổi bật kết nối · Cuộn để phóng to · Kéo để di chuyển",
    en: "Click a system to highlight connections · Scroll to zoom · Drag to pan",
  },
  "arch.flow.criticalitySuffix": { vi: "mức độ trọng yếu", en: "criticality" },
  "arch.flow.riskPrefix": { vi: "Rủi ro:", en: "Risk:" },
  "arch.flow.connections": { vi: "Kết nối", en: "Connections" },
  "arch.flow.noIntegrations": {
    vi: "Không có tích hợp",
    en: "No integrations",
  },
  "arch.gantt.title": { vi: "Dòng thời gian lộ trình", en: "Roadmap Timeline" },
  "arch.gantt.itemsWord": { vi: "mục", en: "items" },
  "arch.gantt.byDates": {
    vi: "xem theo lịch trình (Gantt)",
    en: "Gantt view by scheduled dates",
  },
  "arch.gantt.today": { vi: "Hôm nay", en: "Today" },

  "dept.all": { vi: "Tất cả phòng ban", en: "All Departments" },
  "dept.departments": { vi: "Phòng ban", en: "Departments" },
  "dept.other": { vi: "Khác", en: "Other" },
  "dept.uncategorized": { vi: "Chưa phân loại", en: "Uncategorized" },
  "dept.noDataTitle": {
    vi: "Chưa có dữ liệu phòng ban",
    en: "No department data yet",
  },
  "dept.noDataHint": {
    vi: "Thêm phòng ban trong trang Cấu hình",
    en: "Add departments in Settings",
  },
  "dept.noSystemsInDept": {
    vi: "Không có hệ thống nào trong phòng ban này",
    en: "No systems in this department",
  },
  "dept.critical": { vi: "trọng yếu", en: "critical" },
  "dept.portfolio": { vi: "Danh mục hệ thống", en: "System portfolio" },
  "dept.selectHint": {
    vi: "Chọn một phòng ban để xem chi tiết hệ thống, tích hợp và rủi ro vận hành.",
    en: "Select a department to inspect systems, integrations and operational risk.",
  },
  "dept.totalSpend": { vi: "Tổng chi phí", en: "Total spend" },
  "dept.avgArchitecture": { vi: "Kiến trúc TB", en: "Avg architecture" },
  "dept.avgDebt": { vi: "Nợ kỹ thuật TB", en: "Avg debt" },
  "dept.noOwner": { vi: "Chưa có chủ sở hữu", en: "No owner" },
  "dept.integrationFlow": { vi: "Luồng tích hợp", en: "Integration flow" },
  "dept.outbound": { vi: "Đi ra", en: "Outbound" },
  "dept.inbound": { vi: "Đi vào", en: "Inbound" },
  "dept.riskDebt": { vi: "Rủi ro / Nợ kỹ thuật", en: "Risk / Tech debt" },
  "dept.owner": { vi: "Chủ sở hữu", en: "Owner" },
  "dept.col.system": { vi: "Hệ thống", en: "System" },
  "dept.col.typeStatus": { vi: "Loại · Trạng thái", en: "Type · Status" },
  "dept.col.health": { vi: "Sức khỏe", en: "Health" },
  "dept.col.archScore": { vi: "Điểm kiến trúc", en: "Arch Score" },
  "dept.col.integrations": { vi: "Tích hợp", en: "Integrations" },
  "dept.col.costPerYear": { vi: "Chi phí / Năm", en: "Cost / Year" },
  "dept.col.owner": { vi: "Người quản lý", en: "Manager" },

  "module.name": { vi: "Tên *", en: "Name *" },
  "module.namePlaceholder": {
    vi: "VD: Student Portal",
    en: "e.g. Student Portal",
  },
  "module.lifecycle": { vi: "Vòng đời", en: "Lifecycle" },
  "module.health": { vi: "Tình trạng", en: "Health" },
  "module.version": { vi: "Phiên bản", en: "Version" },
  "module.versionPlaceholder": { vi: "VD: 2.1.0", en: "e.g. 2.1.0" },
  "module.targetDate": { vi: "Ngày dự kiến", en: "Target Date" },
  "module.usedBy": { vi: "Sử dụng bởi", en: "Used By" },
  "module.usedByHint": {
    vi: "(phân tách bằng dấu phẩy)",
    en: "(comma separated)",
  },
  "module.usedByPlaceholder": {
    vi: "VD: Admissions, Finance",
    en: "e.g. Admissions, Finance",
  },
  "module.saveModule": { vi: "Lưu module", en: "Save Module" },
  "module.noModules": { vi: "Chưa có module nào", en: "No modules recorded" },
  "module.addModule": { vi: "Thêm module", en: "Add Module" },
  "module.target": { vi: "Dự kiến:", en: "Target:" },
  "module.all": { vi: "Tất cả", en: "All" },

  // ─── Roadmap page ────────────────────────────────────────────────────────
  "roadmap.title": { vi: "Lộ trình Công nghệ", en: "Technology Roadmap" },
  "roadmap.subtitleSuffix": { vi: "mục đang theo dõi", en: "items tracked" },
  "roadmap.addItem": { vi: "Thêm mục", en: "Add Item" },
  "roadmap.addRoadmapItem": { vi: "Thêm mục lộ trình", en: "Add Roadmap Item" },
  "roadmap.editRoadmapItem": {
    vi: "Sửa mục lộ trình",
    en: "Edit Roadmap Item",
  },
  "roadmap.noItems": {
    vi: "Chưa có mục lộ trình nào",
    en: "No roadmap items yet",
  },
  "roadmap.stat.complete": { vi: "Hoàn thành", en: "Complete" },
  "roadmap.stat.inProgress": { vi: "Đang thực hiện", en: "In Progress" },
  "roadmap.stat.blocked": { vi: "Bị chặn", en: "Blocked" },
  "roadmap.stat.overdue": { vi: "Quá hạn", en: "Overdue" },
  "roadmap.stat.avgAlignment": { vi: "Điểm phù hợp TB", en: "Avg Alignment" },
  "roadmap.filter.allLevels": { vi: "Tất cả cấp độ", en: "All Levels" },
  "roadmap.filter.allStatus": { vi: "Tất cả trạng thái", en: "All Status" },
  "roadmap.overdueBadge": { vi: "Quá hạn", en: "Overdue" },
  "roadmap.highPriorityBadge": { vi: "Ưu tiên cao", en: "High Priority" },
  "roadmap.due": { vi: "Hạn:", en: "Due:" },
  "roadmap.alignment": { vi: "Phù hợp:", en: "Alignment:" },
  "roadmap.form.title": { vi: "Tiêu đề *", en: "Title *" },
  "roadmap.form.titlePlaceholder": {
    vi: "VD: Sáng kiến Campus số",
    en: "e.g. Digital Campus Initiative",
  },
  "roadmap.form.level": { vi: "Cấp độ", en: "Level" },
  "roadmap.form.status": { vi: "Trạng thái", en: "Status" },
  "roadmap.form.priority": { vi: "Ưu tiên", en: "Priority" },
  "roadmap.form.parent": { vi: "Mục cha", en: "Parent" },
  "roadmap.form.parentNone": { vi: "Không có", en: "None" },
  "roadmap.form.owner": { vi: "Người phụ trách", en: "Owner" },
  "roadmap.form.ownerPlaceholder": { vi: "VD: IT Lead", en: "e.g. IT Lead" },
  "roadmap.form.startDate": { vi: "Ngày bắt đầu", en: "Start Date" },
  "roadmap.form.dueDate": { vi: "Ngày kết thúc", en: "Due Date" },
  "roadmap.form.alignmentScore": {
    vi: "Điểm phù hợp kiến trúc (0-100)",
    en: "Architecture Alignment Score (0-100)",
  },
  "roadmap.form.description": { vi: "Mô tả", en: "Description" },
  "roadmap.form.descriptionPlaceholder": {
    vi: "Mô tả mục lộ trình này...",
    en: "Describe this roadmap item...",
  },
  "roadmap.toast.added": { vi: "Đã thêm", en: "Added" },
  "roadmap.toast.updated": { vi: "Đã cập nhật", en: "Updated" },
  "roadmap.toast.removed": { vi: "Đã xoá", en: "Removed" },

  // ─── Settings page ───────────────────────────────────────────────────────
  "settings.title": { vi: "Cấu hình hệ thống", en: "System Settings" },
  "settings.subtitle": {
    vi: "Quản lý danh mục, phòng ban và cơ sở dùng chung trong toàn hệ thống",
    en: "Manage the Category, Department, and Campus lists used across the whole system",
  },
  "settings.category": { vi: "Danh mục", en: "Category" },
  "settings.categoryPlaceholder": {
    vi: "VD: CRM, ERP, SIS…",
    en: "e.g. CRM, ERP, SIS…",
  },
  "settings.categoryDesc": {
    vi: "Phân loại chức năng của hệ thống phần mềm",
    en: "Functional classification of software systems",
  },
  "settings.department": { vi: "Phòng ban", en: "Department" },
  "settings.departmentPlaceholder": {
    vi: "VD: Tài chính, Nhân sự, Tuyển sinh…",
    en: "e.g. Finance, HR, Admissions…",
  },
  "settings.departmentDesc": {
    vi: "Các phòng ban sử dụng hệ thống",
    en: "Departments that use the systems",
  },
  "settings.campus": { vi: "Cơ sở", en: "Campus" },
  "settings.campusPlaceholder": {
    vi: "VD: Hà Nội, TP.HCM, Đà Nẵng…",
    en: "e.g. Hanoi, HCMC, Da Nang…",
  },
  "settings.campusDesc": {
    vi: "Cơ sở / chi nhánh áp dụng hệ thống",
    en: "Campuses / branches where systems apply",
  },
  "settings.noData": {
    vi: "Chưa có dữ liệu. Thêm mới bên dưới.",
    en: "No data yet. Add one below.",
  },
  "settings.add": { vi: "Thêm", en: "Add" },
  "settings.toast.addFailed": { vi: "Không thể thêm", en: "Failed to add" },
  "settings.toast.updated": { vi: "Đã cập nhật", en: "Updated" },
  "settings.toast.updateFailed": {
    vi: "Không thể cập nhật",
    en: "Failed to update",
  },
  "settings.toast.removeFailed": {
    vi: "Không thể xoá",
    en: "Failed to remove",
  },

  // ─── Users page ──────────────────────────────────────────────────────────
  "users.title": { vi: "Người dùng & Phân quyền", en: "Users & Roles" },
  "users.subtitle": {
    vi: "Quản lý quyền truy cập cho từng thành viên",
    en: "Manage access permissions for each member",
  },
  "users.addUser": { vi: "Thêm người dùng", en: "Add User" },
  "users.ctoOnly": {
    vi: "Chỉ CTO mới có thể quản lý người dùng và phân quyền.",
    en: "Only the CTO can manage users and roles.",
  },
  "users.noUsers": { vi: "Chưa có người dùng nào", en: "No users yet" },
  "users.col.user": { vi: "Người dùng", en: "User" },
  "users.col.email": { vi: "Email", en: "Email" },
  "users.col.currentRole": { vi: "Quyền hiện tại", en: "Current Role" },
  "users.col.updateRole": { vi: "Cập nhật quyền", en: "Update Role" },
  "users.you": { vi: "Bạn", en: "You" },
  "users.pendingSignIn": { vi: "Chờ đăng nhập", en: "Pending sign-in" },
  "users.noName": { vi: "Chưa đặt tên", en: "No name set" },
  "users.removeUser": { vi: "Xoá người dùng", en: "Remove user" },
  "users.invite.title": { vi: "Thêm người dùng", en: "Add User" },
  "users.invite.displayName": { vi: "Tên hiển thị", en: "Display Name" },
  "users.invite.namePlaceholder": { vi: "Nguyễn Văn A", en: "Jane Doe" },
  "users.invite.email": { vi: "Email", en: "Email" },
  "users.invite.emailPlaceholder": {
    vi: "user@school.edu.vn",
    en: "user@school.edu",
  },
  "users.invite.role": { vi: "Phân quyền", en: "Role" },
  "users.invite.hint": {
    vi: "Người dùng sẽ được cấp quyền khi đăng nhập lần đầu bằng email này.",
    en: "The user will be granted this role the first time they sign in with this email.",
  },
  "users.toast.emailRequired": {
    vi: "Email là bắt buộc",
    en: "Email is required",
  },
  "users.toast.emailInvalid": { vi: "Email không hợp lệ", en: "Invalid email" },
  "users.toast.userAdded": { vi: "Đã thêm người dùng", en: "User added" },
  "users.toast.userAddFailed": {
    vi: "Không thể thêm người dùng",
    en: "Failed to add user",
  },
  "users.toast.roleUpdated": {
    vi: "Đã cập nhật phân quyền",
    en: "Role updated",
  },
  "users.toast.roleUpdateFailed": {
    vi: "Không thể cập nhật phân quyền",
    en: "Failed to update role",
  },
  "users.toast.userRemoved": { vi: "Đã xoá người dùng", en: "User removed" },
  "users.toast.userRemoveFailed": {
    vi: "Không thể xoá người dùng",
    en: "Failed to remove user",
  },

  "role.cto": { vi: "CTO", en: "CTO" },
  "role.itManager": { vi: "QUẢN LÝ IT", en: "IT MANAGER" },
  "role.businessOwner": { vi: "CHỦ SỞ HỮU NGHIỆP VỤ", en: "BUSINESS OWNER" },
  "role.viewer": { vi: "NGƯỜI XEM", en: "VIEWER" },
  "role.desc.cto": {
    vi: "Toàn quyền truy cập tất cả module",
    en: "Full access to all modules",
  },
  "role.desc.itManager": {
    vi: "Đọc/ghi tất cả, ngoại trừ Users",
    en: "Read/write everything except Users",
  },
  "role.desc.businessOwner": {
    vi: "Xem systems, vendors, roadmap",
    en: "View systems, vendors, roadmap",
  },
  "role.desc.viewer": { vi: "Chỉ đọc", en: "Read only" },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  const stored = window.localStorage.getItem("techgov-language");
  return stored === "en" ? "en" : "vi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  const value = useMemo(() => {
    const updateLanguage = (nextLanguage: Language) => {
      setLanguage(nextLanguage);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("techgov-language", nextLanguage);
      }
    };

    return {
      language,
      setLanguage: updateLanguage,
      t: (key: TranslationKey) => translations[key]?.[language] ?? key,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
