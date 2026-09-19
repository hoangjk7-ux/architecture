import { internalMutation } from "./_generated/server";

export const seedData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // ── 1. Vendors ──────────────────────────────────────────────────────────
    const sapId = await ctx.db.insert("vendors", {
      name: "SAP SE",
      contactEmail: "enterprise@sap.com",
      contactName: "Nguyen Van An",
      supportLevel: "24/7",
      sla: "99.9%",
      costPerYear: 480000,
      contractEndDate: "2026-12-31",
      riskScore: 20,
      notes: "Strategic ERP partner. Multi-year enterprise agreement.",
    });

    const salesforceId = await ctx.db.insert("vendors", {
      name: "Salesforce",
      contactEmail: "enterprise@salesforce.com",
      contactName: "Tran Thi Bich",
      supportLevel: "24/7",
      sla: "99.9%",
      costPerYear: 320000,
      contractEndDate: "2026-06-30",
      riskScore: 15,
      notes: "CRM & marketing automation platform.",
    });

    const microsoftId = await ctx.db.insert("vendors", {
      name: "Microsoft",
      contactEmail: "enterprise@microsoft.com",
      contactName: "Le Minh Duc",
      supportLevel: "business_hours",
      sla: "99.5%",
      costPerYear: 210000,
      contractEndDate: "2027-03-31",
      riskScore: 10,
      notes: "M365, Azure, Power BI licensing under EA.",
    });

    const oracleId = await ctx.db.insert("vendors", {
      name: "Oracle",
      contactEmail: "support@oracle.com",
      contactName: "Pham Quoc Hung",
      supportLevel: "business_hours",
      sla: "99.0%",
      costPerYear: 175000,
      contractEndDate: "2025-09-30",
      riskScore: 55,
      notes: "Legacy EBS support only. Contract renewal under review.",
    });

    const serviceNowId = await ctx.db.insert("vendors", {
      name: "ServiceNow",
      contactEmail: "csm@servicenow.com",
      contactName: "Hoang Kim Lan",
      supportLevel: "24/7",
      sla: "99.8%",
      costPerYear: 145000,
      contractEndDate: "2027-01-31",
      riskScore: 18,
      notes: "ITSM & HRSD modules active.",
    });

    const snowflakeId = await ctx.db.insert("vendors", {
      name: "Snowflake",
      contactEmail: "support@snowflake.com",
      contactName: "Do Thi Mai",
      supportLevel: "business_hours",
      sla: "99.7%",
      costPerYear: 98000,
      contractEndDate: "2026-09-30",
      riskScore: 22,
      notes: "Data warehouse & analytics platform.",
    });

    // ── 2. Software Systems ──────────────────────────────────────────────────
    const erpId = await ctx.db.insert("software_systems", {
      name: "POS",
      type: "core",
      category: "ERP",
      status: "active",
      criticality: "high",
      owner: "Nguyen Van An",
      vendorId: sapId,
      departments: ["Finance", "Supply Chain", "Manufacturing", "Procurement"],
      campuses: ["HQ", "Campus A", "Campus B"],
      technology: "SAP ABAP / Fiori",
      database: "SAP HANA",
      hosting: "On-premise",
      sla: "99.9%",
      licenseType: "Enterprise License",
      costPerYear: 480000,
      contractEndDate: "2026-12-31",
      riskLevel: "low",
      technicalDebtScore: 25,
      architectureScore: 82,
      description:
        "Core ERP system managing finance, logistics, and manufacturing processes across all campuses.",
    });

    const crmId = await ctx.db.insert("software_systems", {
      name: "CRM",
      type: "core",
      category: "CRM",
      status: "active",
      criticality: "high",
      owner: "Tran Thi Bich",
      vendorId: salesforceId,
      departments: ["Sales", "Marketing", "Customer Success"],
      campuses: ["HQ", "Campus A"],
      technology: "Apex / LWC",
      database: "Salesforce DB",
      hosting: "Cloud (SaaS)",
      sla: "99.9%",
      licenseType: "Per-User License",
      costPerYear: 320000,
      contractEndDate: "2026-06-30",
      riskLevel: "low",
      technicalDebtScore: 18,
      architectureScore: 88,
      description:
        "Primary CRM for managing sales pipeline, customer accounts, and marketing campaigns.",
    });

    const hrmsId = await ctx.db.insert("software_systems", {
      name: "Kế toán",
      type: "supporting",
      category: "HRM",
      status: "active",
      criticality: "high",
      owner: "Le Thi Huong",
      vendorId: sapId,
      departments: ["Human Resources", "Payroll", "Training"],
      campuses: ["HQ", "Campus A", "Campus B"],
      technology: "SAP SuccessFactors",
      database: "SAP HANA",
      hosting: "Cloud (SaaS)",
      sla: "99.5%",
      licenseType: "Per-User License",
      costPerYear: 135000,
      contractEndDate: "2026-12-31",
      riskLevel: "low",
      technicalDebtScore: 22,
      architectureScore: 79,
      description:
        "HR management system covering recruitment, payroll, performance, and learning.",
    });

    const itsmId = await ctx.db.insert("software_systems", {
      name: "Kho",
      type: "supporting",
      category: "ITSM",
      status: "active",
      criticality: "medium",
      owner: "Hoang Kim Lan",
      vendorId: serviceNowId,
      departments: ["IT", "Operations", "Security"],
      campuses: ["HQ", "Campus A", "Campus B"],
      technology: "ServiceNow Platform",
      database: "ServiceNow DB",
      hosting: "Cloud (SaaS)",
      sla: "99.8%",
      licenseType: "Per-User License",
      costPerYear: 145000,
      contractEndDate: "2027-01-31",
      riskLevel: "low",
      technicalDebtScore: 20,
      architectureScore: 85,
      description:
        "IT service management platform for incident, change, and asset management.",
    });

    const oracleEbsId = await ctx.db.insert("software_systems", {
      name: "Điều vận",
      type: "legacy",
      category: "ERP",
      status: "sunset",
      criticality: "high",
      owner: "Pham Quoc Hung",
      vendorId: oracleId,
      departments: ["Finance", "Procurement"],
      campuses: ["Campus B"],
      technology: "Oracle Forms / ADF",
      database: "Oracle DB 19c",
      hosting: "On-premise",
      sla: "99.0%",
      licenseType: "Perpetual License",
      costPerYear: 175000,
      contractEndDate: "2025-09-30",
      riskLevel: "high",
      technicalDebtScore: 75,
      architectureScore: 35,
      description:
        "Legacy ERP running on Campus B. Migration to SAP S/4HANA in progress.",
    });

    const biId = await ctx.db.insert("software_systems", {
      name: "SIS",
      type: "supporting",
      category: "BI",
      status: "active",
      criticality: "medium",
      owner: "Le Minh Duc",
      vendorId: microsoftId,
      departments: ["Finance", "Executive", "Operations", "Sales"],
      campuses: ["HQ", "Campus A", "Campus B"],
      technology: "Power BI / DAX",
      database: "Power BI Dataset",
      hosting: "Cloud (SaaS)",
      sla: "99.5%",
      licenseType: "Per-User License (Pro/Premium)",
      costPerYear: 68000,
      contractEndDate: "2027-03-31",
      riskLevel: "low",
      technicalDebtScore: 15,
      architectureScore: 80,
      description:
        "Business intelligence and data visualization platform used across all departments.",
    });

    const m365Id = await ctx.db.insert("software_systems", {
      name: "LMS",
      type: "supporting",
      category: "Collaboration",
      status: "active",
      criticality: "high",
      owner: "Le Minh Duc",
      vendorId: microsoftId,
      departments: ["All Departments"],
      campuses: ["HQ", "Campus A", "Campus B"],
      technology: "Microsoft 365",
      database: "Exchange Online",
      hosting: "Cloud (SaaS)",
      sla: "99.9%",
      licenseType: "E3 License",
      costPerYear: 142000,
      contractEndDate: "2027-03-31",
      riskLevel: "low",
      technicalDebtScore: 8,
      architectureScore: 92,
      description:
        "Enterprise collaboration suite including Teams, SharePoint, Exchange, and OneDrive.",
    });

    const apiGatewayId = await ctx.db.insert("software_systems", {
      name: "Middleware",
      type: "supporting",
      category: "Integration",
      status: "active",
      criticality: "high",
      owner: "Nguyen Thanh Long",
      departments: ["IT", "Architecture"],
      campuses: ["HQ"],
      technology: "Kong Gateway / Node.js",
      database: "PostgreSQL",
      hosting: "On-premise",
      sla: "99.95%",
      licenseType: "Open Source",
      costPerYear: 25000,
      riskLevel: "medium",
      technicalDebtScore: 35,
      architectureScore: 74,
      description:
        "Internal API gateway handling routing, authentication, and rate limiting for all service integrations.",
    });

    const dataWarehouseId = await ctx.db.insert("software_systems", {
      name: "Biểu phí",
      type: "supporting",
      category: "Data Platform",
      status: "active",
      criticality: "medium",
      owner: "Do Thi Mai",
      vendorId: snowflakeId,
      departments: ["IT", "Finance", "Operations", "Data Analytics"],
      campuses: ["HQ"],
      technology: "Snowflake / dbt",
      database: "Snowflake",
      hosting: "Cloud (SaaS)",
      sla: "99.7%",
      licenseType: "Consumption-based",
      costPerYear: 98000,
      contractEndDate: "2026-09-30",
      riskLevel: "low",
      technicalDebtScore: 28,
      architectureScore: 83,
      description:
        "Central data warehouse aggregating data from all core systems for analytics and reporting.",
    });

    const customerPortalId = await ctx.db.insert("software_systems", {
      name: "Ecommerce",
      type: "pilot",
      category: "Customer Portal",
      status: "pilot",
      criticality: "low",
      owner: "Vu Thi Ngoc",
      departments: ["Customer Success", "IT"],
      campuses: ["HQ"],
      technology: "React / Next.js",
      database: "PostgreSQL",
      hosting: "Cloud (AWS)",
      sla: "99.0%",
      licenseType: "Custom Build",
      costPerYear: 42000,
      riskLevel: "medium",
      technicalDebtScore: 30,
      architectureScore: 70,
      description:
        "Pilot customer-facing portal for self-service requests, order tracking, and support tickets.",
    });

    // ── 3. System Modules ────────────────────────────────────────────────────
    // SAP S/4HANA Modules
    await ctx.db.insert("system_modules", {
      systemId: erpId,
      name: "FI – Financial Accounting",
      description:
        "General ledger, accounts payable/receivable, asset accounting.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Finance", "Accounting"],
      version: "2023 FPS02",
      sortOrder: 1,
    });
    await ctx.db.insert("system_modules", {
      systemId: erpId,
      name: "MM – Materials Management",
      description: "Procurement, inventory management, warehouse management.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Procurement", "Supply Chain", "Warehouse"],
      version: "2023 FPS02",
      sortOrder: 2,
    });
    await ctx.db.insert("system_modules", {
      systemId: erpId,
      name: "SD – Sales & Distribution",
      description: "Order-to-cash process, customer master, pricing.",
      lifecycle: "in_use",
      health: "degraded",
      usedBy: ["Sales", "Logistics"],
      version: "2023 FPS02",
      notes:
        "Performance issues during peak order periods. Optimization in progress.",
      sortOrder: 3,
    });
    await ctx.db.insert("system_modules", {
      systemId: erpId,
      name: "PP – Production Planning",
      description: "MRP, production orders, capacity planning.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Manufacturing"],
      version: "2023 FPS02",
      sortOrder: 4,
    });
    await ctx.db.insert("system_modules", {
      systemId: erpId,
      name: "S/4HANA Embedded Analytics",
      description: "Real-time embedded analytics and CDS views within S/4HANA.",
      lifecycle: "in_development",
      health: "unknown",
      usedBy: ["Finance", "Operations"],
      plannedDate: "2025-09-01",
      sortOrder: 5,
    });

    // Salesforce Modules
    await ctx.db.insert("system_modules", {
      systemId: crmId,
      name: "Sales Cloud",
      description: "Lead management, opportunity pipeline, forecasting.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Sales"],
      version: "Spring '25",
      sortOrder: 1,
    });
    await ctx.db.insert("system_modules", {
      systemId: crmId,
      name: "Service Cloud",
      description:
        "Case management, knowledge base, customer support SLA tracking.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Customer Success", "Support"],
      version: "Spring '25",
      sortOrder: 2,
    });
    await ctx.db.insert("system_modules", {
      systemId: crmId,
      name: "Marketing Cloud",
      description: "Email campaigns, customer journeys, lead nurturing.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Marketing"],
      version: "Spring '25",
      sortOrder: 3,
    });
    await ctx.db.insert("system_modules", {
      systemId: crmId,
      name: "Einstein AI – Lead Scoring",
      description: "AI-driven lead scoring and opportunity insights.",
      lifecycle: "planned",
      health: "unknown",
      usedBy: ["Sales"],
      plannedDate: "2025-10-01",
      sortOrder: 4,
    });

    // SAP SuccessFactors Modules
    await ctx.db.insert("system_modules", {
      systemId: hrmsId,
      name: "Employee Central",
      description:
        "Core HR data, organizational structure, position management.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Human Resources"],
      version: "H1 2025",
      sortOrder: 1,
    });
    await ctx.db.insert("system_modules", {
      systemId: hrmsId,
      name: "Recruiting",
      description: "Job requisitions, candidate tracking, onboarding workflow.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Human Resources", "Hiring Managers"],
      version: "H1 2025",
      sortOrder: 2,
    });
    await ctx.db.insert("system_modules", {
      systemId: hrmsId,
      name: "Performance & Goals",
      description: "OKR tracking, performance reviews, calibration.",
      lifecycle: "in_use",
      health: "degraded",
      usedBy: ["All Departments"],
      version: "H1 2025",
      notes: "Goal sync issue with legacy HR system – patch scheduled Q3 2025.",
      sortOrder: 3,
    });
    await ctx.db.insert("system_modules", {
      systemId: hrmsId,
      name: "Learning Management",
      description: "Online training, compliance courses, skills development.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["All Departments", "Training"],
      version: "H1 2025",
      sortOrder: 4,
    });
    await ctx.db.insert("system_modules", {
      systemId: hrmsId,
      name: "Payroll (Local)",
      description:
        "Payroll processing integrated with local statutory regulations.",
      lifecycle: "deprecated",
      health: "degraded",
      usedBy: ["Payroll"],
      notes: "To be replaced by SAP Payroll cloud module by end of 2025.",
      sortOrder: 5,
    });

    // ServiceNow Modules
    await ctx.db.insert("system_modules", {
      systemId: itsmId,
      name: "Incident Management",
      description:
        "IT incident logging, triage, escalation, and resolution tracking.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["IT", "Operations"],
      version: "Washington DC",
      sortOrder: 1,
    });
    await ctx.db.insert("system_modules", {
      systemId: itsmId,
      name: "Change Management",
      description: "RFC workflow, CAB approvals, change calendar.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["IT", "Architecture"],
      version: "Washington DC",
      sortOrder: 2,
    });
    await ctx.db.insert("system_modules", {
      systemId: itsmId,
      name: "Asset & Configuration Management",
      description:
        "CMDB, hardware/software asset inventory, lifecycle tracking.",
      lifecycle: "in_use",
      health: "degraded",
      usedBy: ["IT"],
      version: "Washington DC",
      notes: "CMDB data quality remediation project underway.",
      sortOrder: 3,
    });
    await ctx.db.insert("system_modules", {
      systemId: itsmId,
      name: "HR Service Delivery",
      description:
        "HR case management, employee onboarding/offboarding workflows.",
      lifecycle: "in_development",
      health: "unknown",
      usedBy: ["Human Resources", "IT"],
      plannedDate: "2025-08-15",
      sortOrder: 4,
    });

    // Oracle EBS Modules (legacy/retired)
    await ctx.db.insert("system_modules", {
      systemId: oracleEbsId,
      name: "Oracle Financials",
      description:
        "GL, AP, AR running on Oracle EBS – read-only post-migration.",
      lifecycle: "deprecated",
      health: "degraded",
      usedBy: ["Finance"],
      version: "12.2.10",
      notes: "Data migrated to SAP S/4HANA. Kept alive for audit queries only.",
      sortOrder: 1,
    });
    await ctx.db.insert("system_modules", {
      systemId: oracleEbsId,
      name: "Oracle iProcurement",
      description: "Procurement module – decommissioned after SAP MM go-live.",
      lifecycle: "retired",
      health: "down",
      usedBy: [],
      version: "12.2.10",
      sortOrder: 2,
    });

    // Power BI Modules
    await ctx.db.insert("system_modules", {
      systemId: biId,
      name: "Finance Dashboard Suite",
      description:
        "P&L, balance sheet, cash flow, and budget variance dashboards.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Finance", "Executive"],
      version: "Q2 2025",
      sortOrder: 1,
    });
    await ctx.db.insert("system_modules", {
      systemId: biId,
      name: "Operations Analytics",
      description: "Supply chain KPIs, manufacturing OEE, logistics metrics.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Operations", "Supply Chain"],
      version: "Q2 2025",
      sortOrder: 2,
    });
    await ctx.db.insert("system_modules", {
      systemId: biId,
      name: "Sales Performance Report",
      description: "Sales pipeline, win/loss analysis, quota attainment.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Sales", "Executive"],
      version: "Q2 2025",
      sortOrder: 3,
    });
    await ctx.db.insert("system_modules", {
      systemId: biId,
      name: "HR Analytics",
      description:
        "Headcount, attrition, hiring funnel, and training completion.",
      lifecycle: "planned",
      health: "unknown",
      usedBy: ["Human Resources", "Executive"],
      plannedDate: "2025-11-01",
      sortOrder: 4,
    });

    // API Gateway Modules
    await ctx.db.insert("system_modules", {
      systemId: apiGatewayId,
      name: "Authentication & Authorization",
      description: "OAuth 2.0 / JWT token validation for all API consumers.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["IT", "Architecture"],
      version: "3.1.0",
      sortOrder: 1,
    });
    await ctx.db.insert("system_modules", {
      systemId: apiGatewayId,
      name: "Rate Limiting & Throttling",
      description: "Per-consumer rate limits and burst control policies.",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["IT"],
      version: "3.1.0",
      sortOrder: 2,
    });
    await ctx.db.insert("system_modules", {
      systemId: apiGatewayId,
      name: "API Analytics & Logging",
      description:
        "Request tracing, latency monitoring, error rate dashboards.",
      lifecycle: "in_development",
      health: "unknown",
      usedBy: ["IT", "Architecture"],
      plannedDate: "2025-07-30",
      sortOrder: 3,
    });

    // ── 4. Roadmap Items ─────────────────────────────────────────────────────
    // Initiatives (top-level)
    const initiative1Id = await ctx.db.insert("roadmap_items", {
      title: "Digital Core Transformation",
      level: "initiative",
      status: "in_progress",
      owner: "CTO Office",
      startDate: "2025-01-01",
      dueDate: "2026-12-31",
      architectureAlignmentScore: 90,
      relatedSystemIds: [erpId, oracleEbsId, apiGatewayId],
      priority: "high",
      description:
        "Modernize the core ERP landscape by completing Oracle EBS sunset, upgrading SAP S/4HANA, and establishing an enterprise integration platform.",
    });

    const initiative2Id = await ctx.db.insert("roadmap_items", {
      title: "Data & Analytics Transformation",
      level: "initiative",
      status: "in_progress",
      owner: "Chief Data Officer",
      startDate: "2025-03-01",
      dueDate: "2026-06-30",
      architectureAlignmentScore: 85,
      relatedSystemIds: [dataWarehouseId, biId, erpId, crmId],
      priority: "high",
      description:
        "Build a unified data platform enabling real-time analytics, self-service BI, and AI-powered insights across the organization.",
    });

    const initiative3Id = await ctx.db.insert("roadmap_items", {
      title: "Customer Experience Enhancement",
      level: "initiative",
      status: "not_started",
      owner: "VP Customer Success",
      startDate: "2025-07-01",
      dueDate: "2026-09-30",
      architectureAlignmentScore: 78,
      relatedSystemIds: [crmId, customerPortalId],
      priority: "medium",
      description:
        "Elevate customer-facing digital experiences through CRM optimization, AI-driven personalization, and self-service portal expansion.",
    });

    // Programs under Initiative 1
    const prog1aId = await ctx.db.insert("roadmap_items", {
      title: "ERP Modernization Program",
      level: "program",
      parentId: initiative1Id,
      status: "in_progress",
      owner: "Nguyen Van An",
      startDate: "2025-01-01",
      dueDate: "2026-06-30",
      architectureAlignmentScore: 88,
      relatedSystemIds: [erpId, oracleEbsId],
      priority: "high",
      description:
        "Complete Oracle EBS decommission and deliver SAP S/4HANA enhancements to support Campus B operations.",
    });

    const prog1bId = await ctx.db.insert("roadmap_items", {
      title: "Enterprise Integration Platform",
      level: "program",
      parentId: initiative1Id,
      status: "in_progress",
      owner: "Nguyen Thanh Long",
      startDate: "2025-02-01",
      dueDate: "2026-03-31",
      architectureAlignmentScore: 82,
      relatedSystemIds: [apiGatewayId, erpId, crmId, hrmsId],
      priority: "high",
      description:
        "Establish a centralized API gateway and event bus to replace point-to-point integrations.",
    });

    // Programs under Initiative 2
    const prog2aId = await ctx.db.insert("roadmap_items", {
      title: "Unified Data Platform",
      level: "program",
      parentId: initiative2Id,
      status: "in_progress",
      owner: "Do Thi Mai",
      startDate: "2025-03-01",
      dueDate: "2025-12-31",
      architectureAlignmentScore: 87,
      relatedSystemIds: [dataWarehouseId, biId],
      priority: "high",
      description:
        "Migrate all data pipelines to Snowflake and roll out Power BI self-service analytics.",
    });

    // Programs under Initiative 3
    const prog3aId = await ctx.db.insert("roadmap_items", {
      title: "CRM & AI Enhancement",
      level: "program",
      parentId: initiative3Id,
      status: "not_started",
      owner: "Tran Thi Bich",
      startDate: "2025-08-01",
      dueDate: "2026-06-30",
      architectureAlignmentScore: 75,
      relatedSystemIds: [crmId],
      priority: "medium",
      description:
        "Implement Einstein AI features and expand Salesforce Service Cloud capabilities.",
    });

    // Projects under Program 1a
    const proj1a1Id = await ctx.db.insert("roadmap_items", {
      title: "Điều vận",
      level: "project",
      parentId: prog1aId,
      status: "in_progress",
      owner: "Pham Quoc Hung",
      startDate: "2025-04-01",
      dueDate: "2025-09-30",
      architectureAlignmentScore: 95,
      relatedSystemIds: [oracleEbsId],
      priority: "high",
      description:
        "Final data migration from Oracle EBS to SAP S/4HANA, user acceptance testing, and system shutdown on Campus B.",
    });

    const proj1a2Id = await ctx.db.insert("roadmap_items", {
      title: "POS",
      level: "project",
      parentId: prog1aId,
      status: "in_progress",
      owner: "Nguyen Van An",
      startDate: "2025-05-01",
      dueDate: "2025-10-31",
      architectureAlignmentScore: 80,
      relatedSystemIds: [erpId],
      priority: "high",
      description:
        "Resolve SD module performance bottlenecks and implement order processing improvements.",
    });

    await ctx.db.insert("roadmap_items", {
      title: "LMS",
      level: "project",
      parentId: prog1aId,
      status: "not_started",
      owner: "Nguyen Van An",
      startDate: "2025-09-01",
      dueDate: "2026-03-31",
      architectureAlignmentScore: 82,
      relatedSystemIds: [m365Id],
      priority: "medium",
      description:
        "Deploy S/4HANA embedded analytics for Finance and Operations, reducing dependency on external reporting tools.",
    });

    // Projects under Program 1b
    const proj1b1Id = await ctx.db.insert("roadmap_items", {
      title: "Middleware",
      level: "project",
      parentId: prog1bId,
      status: "in_progress",
      owner: "Nguyen Thanh Long",
      startDate: "2025-02-01",
      dueDate: "2025-07-31",
      architectureAlignmentScore: 88,
      relatedSystemIds: [apiGatewayId],
      priority: "high",
      description:
        "Implement HA/DR for API gateway, complete API analytics module, and onboard all tier-1 integrations.",
    });

    await ctx.db.insert("roadmap_items", {
      title: "Kho",
      level: "project",
      parentId: prog1bId,
      status: "not_started",
      owner: "Nguyen Thanh Long",
      startDate: "2025-08-01",
      dueDate: "2026-03-31",
      architectureAlignmentScore: 76,
      relatedSystemIds: [itsmId],
      priority: "medium",
      description:
        "Migrate remaining direct DB-link and ETL integrations to go through the central API gateway.",
    });

    // Projects under Program 2a
    await ctx.db.insert("roadmap_items", {
      title: "Biểu phí",
      level: "project",
      parentId: prog2aId,
      status: "done",
      owner: "Do Thi Mai",
      startDate: "2025-03-01",
      dueDate: "2025-05-31",
      architectureAlignmentScore: 90,
      relatedSystemIds: [dataWarehouseId],
      priority: "high",
      description:
        "Complete migration of legacy SQL Server DW to Snowflake and validate all ELT pipelines.",
    });

    await ctx.db.insert("roadmap_items", {
      title: "SIS",
      level: "project",
      parentId: prog2aId,
      status: "in_progress",
      owner: "Le Minh Duc",
      startDate: "2025-06-01",
      dueDate: "2025-11-30",
      architectureAlignmentScore: 85,
      relatedSystemIds: [biId],
      priority: "medium",
      description:
        "Deploy Power BI premium capacity, establish data governance policies, and train 200+ business users.",
    });

    await ctx.db.insert("roadmap_items", {
      title: "Kế toán",
      level: "project",
      parentId: prog2aId,
      status: "not_started",
      owner: "Do Thi Mai",
      startDate: "2025-09-01",
      dueDate: "2025-12-31",
      architectureAlignmentScore: 83,
      relatedSystemIds: [hrmsId],
      priority: "medium",
      description:
        "Build HR analytics dashboards covering headcount, attrition, and learning metrics in Power BI.",
    });

    // Projects under Program 3a
    await ctx.db.insert("roadmap_items", {
      title: "CRM",
      level: "project",
      parentId: prog3aId,
      status: "not_started",
      owner: "Tran Thi Bich",
      startDate: "2025-10-01",
      dueDate: "2026-03-31",
      architectureAlignmentScore: 72,
      relatedSystemIds: [crmId],
      priority: "medium",
      description:
        "Configure and train Salesforce Einstein AI lead scoring model using 3 years of historical win/loss data.",
    });

    const proj3a2Id = await ctx.db.insert("roadmap_items", {
      title: "Ecommerce",
      level: "project",
      parentId: prog3aId,
      status: "not_started",
      owner: "Vu Thi Ngoc",
      startDate: "2025-08-01",
      dueDate: "2026-06-30",
      architectureAlignmentScore: 70,
      relatedSystemIds: [customerPortalId],
      priority: "medium",
      description:
        "Expand pilot portal to full production: order tracking, returns management, and live chat support.",
    });

    // Epics
    await ctx.db.insert("roadmap_items", {
      title: "Data Migration – GL & AP Accounts",
      level: "epic",
      parentId: proj1a1Id,
      status: "done",
      owner: "Pham Quoc Hung",
      startDate: "2025-04-01",
      dueDate: "2025-06-30",
      architectureAlignmentScore: 95,
      relatedSystemIds: [oracleEbsId, erpId],
      priority: "high",
      description:
        "Extract, transform, and load General Ledger and Accounts Payable historical data from Oracle EBS to SAP.",
    });

    await ctx.db.insert("roadmap_items", {
      title: "UAT & Parallel Run – Finance Modules",
      level: "epic",
      parentId: proj1a1Id,
      status: "in_progress",
      owner: "Pham Quoc Hung",
      startDate: "2025-07-01",
      dueDate: "2025-09-15",
      architectureAlignmentScore: 92,
      relatedSystemIds: [oracleEbsId, erpId],
      priority: "high",
      description:
        "3-month parallel run of Oracle EBS and SAP S/4HANA Finance modules with user acceptance testing.",
    });

    await ctx.db.insert("roadmap_items", {
      title: "Portal Authentication – SSO Integration",
      level: "epic",
      parentId: proj3a2Id,
      status: "not_started",
      owner: "Vu Thi Ngoc",
      startDate: "2025-08-01",
      dueDate: "2025-10-31",
      architectureAlignmentScore: 68,
      relatedSystemIds: [customerPortalId, apiGatewayId, m365Id],
      priority: "medium",
      description:
        "Integrate customer portal with Azure AD B2C for federated SSO using existing Microsoft 365 tenant.",
    });

    await ctx.db.insert("roadmap_items", {
      title: "Kho",
      level: "project",
      status: "blocked",
      owner: "Hoang Kim Lan",
      startDate: "2025-04-01",
      dueDate: "2025-08-31",
      architectureAlignmentScore: 65,
      relatedSystemIds: [itsmId],
      priority: "medium",
      description:
        "Clean and enrich 4,000+ CMDB records. Blocked pending resource allocation from IT Ops team.",
    });

    // ── 5. Integrations ──────────────────────────────────────────────────────
    await ctx.db.insert("integrations", {
      name: "SAP S/4HANA → Salesforce (Customer Sync)",
      sourceSystemId: erpId,
      destinationSystemId: crmId,
      protocol: "REST",
      method: "realtime",
      healthStatus: "healthy",
      criticalLevel: "high",
      owner: "Nguyen Thanh Long",
      errorRate: 0.2,
      lastSync: "2025-05-15T08:30:00Z",
      isArchitectureCompliant: true,
      description:
        "Synchronizes customer master data (accounts, contacts, pricing) from SAP S/4HANA to Salesforce in real-time via API Gateway.",
    });

    await ctx.db.insert("integrations", {
      name: "Salesforce → Snowflake (CRM Analytics Pipeline)",
      sourceSystemId: crmId,
      destinationSystemId: dataWarehouseId,
      protocol: "ETL",
      method: "batch",
      healthStatus: "healthy",
      criticalLevel: "medium",
      owner: "Do Thi Mai",
      errorRate: 0.5,
      lastSync: "2025-05-15T02:00:00Z",
      isArchitectureCompliant: true,
      description:
        "Nightly ETL batch extracting Salesforce Opportunities, Accounts, and Cases to Snowflake for BI reporting.",
    });

    await ctx.db.insert("integrations", {
      name: "SAP S/4HANA → SAP SuccessFactors (Employee Cost Center Sync)",
      sourceSystemId: erpId,
      destinationSystemId: hrmsId,
      protocol: "DB",
      method: "batch",
      healthStatus: "degraded",
      criticalLevel: "high",
      owner: "Le Thi Huong",
      errorRate: 8.3,
      lastSync: "2025-05-14T03:15:00Z",
      isArchitectureCompliant: false,
      description:
        "Direct DB link syncing cost center and org unit data from SAP FI to SuccessFactors Employee Central. Legacy connection flagged for migration to API.",
    });

    await ctx.db.insert("integrations", {
      name: "Oracle EBS → SAP S/4HANA (Historical GL Migration)",
      sourceSystemId: oracleEbsId,
      destinationSystemId: erpId,
      protocol: "ETL",
      method: "batch",
      healthStatus: "degraded",
      criticalLevel: "high",
      owner: "Pham Quoc Hung",
      errorRate: 12.1,
      lastSync: "2025-05-13T22:00:00Z",
      isArchitectureCompliant: false,
      description:
        "Ongoing ETL migration of historical GL balances and AP invoices from Oracle EBS to SAP. Degraded due to data quality issues in source records.",
    });

    await ctx.db.insert("integrations", {
      name: "ServiceNow → Microsoft 365 (IT Alert Notifications)",
      sourceSystemId: itsmId,
      destinationSystemId: m365Id,
      protocol: "Webhook",
      method: "event_driven",
      healthStatus: "healthy",
      criticalLevel: "medium",
      owner: "Hoang Kim Lan",
      errorRate: 0.1,
      lastSync: "2025-05-15T09:45:00Z",
      isArchitectureCompliant: true,
      description:
        "ServiceNow webhooks push P1/P2 incident alerts and change notifications to Microsoft Teams channels.",
    });

    await ctx.db.insert("integrations", {
      name: "SAP S/4HANA → Snowflake (Finance Data Pipeline)",
      sourceSystemId: erpId,
      destinationSystemId: dataWarehouseId,
      protocol: "ETL",
      method: "batch",
      healthStatus: "healthy",
      criticalLevel: "high",
      owner: "Do Thi Mai",
      errorRate: 0.3,
      lastSync: "2025-05-15T01:00:00Z",
      isArchitectureCompliant: true,
      description:
        "Nightly extraction of GL postings, cost center actuals, and inventory movements from SAP to Snowflake.",
    });

    await ctx.db.insert("integrations", {
      name: "Salesforce → ServiceNow (Support Case Escalation)",
      sourceSystemId: crmId,
      destinationSystemId: itsmId,
      protocol: "REST",
      method: "event_driven",
      healthStatus: "healthy",
      criticalLevel: "medium",
      owner: "Nguyen Thanh Long",
      errorRate: 1.2,
      lastSync: "2025-05-15T09:50:00Z",
      isArchitectureCompliant: true,
      description:
        "Escalates high-priority Salesforce Service Cloud cases to ServiceNow incidents for IT involvement.",
    });

    await ctx.db.insert("integrations", {
      name: "API Gateway → Customer Portal (Product Catalog API)",
      sourceSystemId: apiGatewayId,
      destinationSystemId: customerPortalId,
      protocol: "REST",
      method: "realtime",
      healthStatus: "healthy",
      criticalLevel: "low",
      owner: "Vu Thi Ngoc",
      errorRate: 0.8,
      lastSync: "2025-05-15T10:00:00Z",
      isArchitectureCompliant: true,
      description:
        "API Gateway proxies product catalog and pricing data from SAP to the customer self-service portal.",
    });

    await ctx.db.insert("integrations", {
      name: "SAP SuccessFactors → Snowflake (HR Analytics Pipeline)",
      sourceSystemId: hrmsId,
      destinationSystemId: dataWarehouseId,
      protocol: "ETL",
      method: "batch",
      healthStatus: "unknown",
      criticalLevel: "low",
      owner: "Do Thi Mai",
      errorRate: 0,
      lastSync: "2025-05-10T03:00:00Z",
      isArchitectureCompliant: true,
      description:
        "Planned nightly HR data extraction to Snowflake for HR Analytics Power BI dashboards. Currently in setup.",
    });

    await ctx.db.insert("integrations", {
      name: "ServiceNow → SAP S/4HANA (Asset Procurement Sync)",
      sourceSystemId: itsmId,
      destinationSystemId: erpId,
      protocol: "REST",
      method: "batch",
      healthStatus: "healthy",
      criticalLevel: "medium",
      owner: "Hoang Kim Lan",
      errorRate: 2.0,
      lastSync: "2025-05-15T06:00:00Z",
      isArchitectureCompliant: true,
      description:
        "Pushes approved IT asset procurement requests from ServiceNow to SAP MM purchase requisitions.",
    });

    await ctx.db.insert("integrations", {
      name: "Snowflake → Power BI (Analytics Dataset Refresh)",
      sourceSystemId: dataWarehouseId,
      destinationSystemId: biId,
      protocol: "Other",
      method: "batch",
      healthStatus: "healthy",
      criticalLevel: "medium",
      owner: "Le Minh Duc",
      errorRate: 0.4,
      lastSync: "2025-05-15T05:30:00Z",
      isArchitectureCompliant: true,
      description:
        "Scheduled Power BI dataset refresh pulling curated Snowflake views via DirectQuery and Import mode.",
    });

    await ctx.db.insert("integrations", {
      name: "Oracle EBS → Snowflake (Legacy Archive Pipeline)",
      sourceSystemId: oracleEbsId,
      destinationSystemId: dataWarehouseId,
      protocol: "ETL",
      method: "batch",
      healthStatus: "down",
      criticalLevel: "low",
      owner: "Pham Quoc Hung",
      errorRate: 100,
      lastSync: "2025-04-30T22:00:00Z",
      isArchitectureCompliant: false,
      description:
        "Archive pipeline for Oracle EBS historical data to Snowflake. Currently down due to source DB connection failure pending EBS shutdown.",
    });

    return { message: "Seed data inserted successfully." };
  },
});

export const removeMisleadingRoadmapData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("roadmap_items").collect();
    const badPatterns = [
      /sap\s*s\/4hana.*sd.*(optimization|tuning|module)/i,
      /sd\s*module.*(optimization|tuning)/i,
      /api\s*gateway.*(hardening|production)/i,
      /production\s*hardening/i,
      /module\s*optimization/i,
    ];

    for (const item of items) {
      const haystack = `${item.title} ${item.description ?? ""}`;
      if (badPatterns.some((pattern) => pattern.test(haystack))) {
        await ctx.db.delete(item._id);
      }
    }
  },
});
