import { describe, expect, it } from "vitest";
import {
  buildSprintImportTree,
  classifyWbs,
  extractImportRows,
  mapImportStatus,
  parseImportDate,
  parseSprintTimelineSheet,
} from "./roadmapImport";

describe("mapImportStatus", () => {
  it("maps the three known Vietnamese labels, case/whitespace-insensitively", () => {
    expect(mapImportStatus("Hoàn thành")).toBe("done");
    expect(mapImportStatus("  đang thực hiện ")).toBe("in_progress");
    expect(mapImportStatus("Chưa làm")).toBe("not_started");
  });

  it("defaults to not_started for missing or unrecognized labels", () => {
    expect(mapImportStatus(undefined)).toBe("not_started");
    expect(mapImportStatus("")).toBe("not_started");
    expect(mapImportStatus("Huỷ")).toBe("not_started");
  });
});

describe("parseImportDate", () => {
  it("parses DD/MM/YY and DD/MM/YYYY into YYYY-MM-DD", () => {
    expect(parseImportDate("12/05/26")).toBe("2026-05-12");
    expect(parseImportDate("20/05/2026")).toBe("2026-05-20");
  });

  it("returns undefined for blank, malformed or non-calendar dates", () => {
    expect(parseImportDate(undefined)).toBeUndefined();
    expect(parseImportDate("")).toBeUndefined();
    expect(parseImportDate("not-a-date")).toBeUndefined();
    expect(parseImportDate("32/13/26")).toBeUndefined();
    expect(parseImportDate("2026-05-12")).toBeUndefined(); // wrong shape
  });
});

describe("classifyWbs", () => {
  it("distinguishes sprint, workstream and task rows", () => {
    expect(classifyWbs("Sprint 1")).toBe("sprint");
    expect(classifyWbs("sprint 12")).toBe("sprint");
    expect(classifyWbs("1")).toBe("workstream");
    expect(classifyWbs("12")).toBe("workstream");
    expect(classifyWbs("1.1")).toBe("task");
    expect(classifyWbs("12.3")).toBe("task");
  });

  it("falls back to unknown for blank/legend/malformed values", () => {
    expect(classifyWbs("")).toBe("unknown");
    expect(classifyWbs("CHÚ GIẢI:")).toBe("unknown");
    expect(classifyWbs("1.2.3")).toBe("unknown");
  });
});

// A trimmed-down but structurally faithful excerpt of the real TIMELINES
// export: decorative rows before the header, a "WBS" header row, two
// sprints each with one workstream and a couple of tasks, a blank spacer,
// and a trailing legend row that must stop parsing.
const sampleGrid: unknown[][] = [
  ["", "", "", "", "", "", ""],
  ["Ngày bắt đầu:", "", "", "12/05/2026", "Ngày kết thúc:", "20/06/2026", "PM: A"],
  ["", "", "", "", "", "", ""],
  [
    "WBS",
    "Tên Nhiệm Vụ",
    "Người Phụ Trách",
    "Ngày Bắt Đầu",
    "Ngày Kết Thúc",
    "Số Ngày",
    "Trạng Thái",
  ],
  ["Sprint 1", "PHÂN TÍCH YÊU CẦU", "", "12/05/26", "19/05/26", "5", "Hoàn thành"],
  ["1", "Luồng 1: Quản Lý Tạo Đơn Hàng", "", "12/05/26", "19/05/26", "5", "Hoàn thành"],
  ["1.1", "Thu thập & phân tích yêu cầu", "Bình", "12/05/26", "12/05/26", "0", "Hoàn thành"],
  ["1.2", "Thiết kế UI", "Hoa, Bình", "13/05/26", "14/05/26", "1", "Hoàn thành"],
  ["Sprint 2", "PHÁT TRIỂN NGHIỆP VỤ", "", "20/05/26", "27/05/26", "5", "Đang thực hiện"],
  ["2", "Luồng 2: Xử lý thanh toán", "", "20/05/26", "24/05/26", "2", "Chưa làm"],
  ["2.1", "Phát triển xử lý thanh toán", "Quang", "20/05/26", "22/05/26", "2", "Chưa làm"],
  ["", "", "", "", "", "", ""],
  ["CHÚ GIẢI:", " ", "Hoàn thành", " ", "Đang thực hiện", " ", "Chưa làm"],
  ["3", "Luồng sau chú giải — không được đọc", "", "", "", "", ""],
];

describe("extractImportRows", () => {
  it("finds the WBS header, skips decorative/blank rows and stops at the legend", () => {
    const rows = extractImportRows(sampleGrid);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({
      wbs: "Sprint 1",
      title: "PHÂN TÍCH YÊU CẦU",
      owner: "",
      startDate: "12/05/26",
      endDate: "19/05/26",
      status: "Hoàn thành",
    });
    expect(rows.map((r) => r.wbs)).not.toContain("3");
  });

  it("returns an empty array when no WBS header row exists", () => {
    expect(extractImportRows([["a", "b"], ["c", "d"]])).toEqual([]);
  });
});

describe("buildSprintImportTree / parseSprintTimelineSheet", () => {
  it("builds a 2-sprint tree with tasks folded into workstream descriptions", () => {
    const sprints = parseSprintTimelineSheet(sampleGrid);
    expect(sprints).toHaveLength(2);

    const [sprint1, sprint2] = sprints;
    expect(sprint1).toMatchObject({
      title: "PHÂN TÍCH YÊU CẦU",
      startDate: "2026-05-12",
      dueDate: "2026-05-19",
      status: "done",
    });
    expect(sprint1.workstreams).toHaveLength(1);
    const [workstream1] = sprint1.workstreams;
    expect(workstream1.title).toBe("Luồng 1: Quản Lý Tạo Đơn Hàng");
    expect(workstream1.status).toBe("done");
    expect(workstream1.description).toContain("1.1 Thu thập");
    expect(workstream1.description).toContain("Bình");
    expect(workstream1.description).toContain("1.2 Thiết kế UI");
    expect(workstream1.description?.split("\n")).toHaveLength(2);

    expect(sprint2.status).toBe("in_progress");
    expect(sprint2.workstreams[0].status).toBe("not_started");
    expect(sprint2.workstreams[0].owner).toBeUndefined();
    expect(sprint2.workstreams[0].description).toContain("Quang");
  });

  it("skips a workstream row that appears before any Sprint header", () => {
    const orphan = extractImportRows([
      ["WBS", "Tên Nhiệm Vụ", "", "", "", "", "Trạng Thái"],
      ["1", "Luồng mồ côi", "", "", "", "", "Chưa làm"],
      ["1.1", "Task mồ côi", "", "", "", "", "Chưa làm"],
    ]);
    expect(buildSprintImportTree(orphan)).toEqual([]);
  });

  it("returns an empty array for an empty/header-less grid", () => {
    expect(parseSprintTimelineSheet([])).toEqual([]);
  });
});
