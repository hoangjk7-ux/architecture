// Parses a "Sprint → Luồng (workstream) → Task" Gantt sheet (as exported by
// the external sprint-tracking spreadsheet) into a tree ready to import as
// roadmap_items. Pure, source-format-agnostic: it consumes a plain
// `string[][]` grid, so it works the same whether that grid came from an
// .xlsx worksheet (SheetJS `sheet_to_json(sheet, { header: 1 })`) or any
// other row/column source — keeping it testable without a binary fixture.
//
// Sheet layout assumed (see .ai/ — imported from a real project export):
//   col A = WBS, col B = Tên Nhiệm Vụ (title), col C = Người Phụ Trách
//   (owner), col D = Ngày Bắt Đầu, col E = Ngày Kết Thúc, col F = Số Ngày
//   (day count — not imported, derivable from start/end), col G = Trạng
//   Thái. A header row has "WBS" in col A; a trailing legend row starts
//   with "CHÚ GIẢI". Everything after col G (the day-by-day Gantt bar
//   cells) is ignored — start/end/status already carry that information.
//
// Row kind is inferred from the WBS value itself:
//   "Sprint N"      -> sprint (top level)
//   "N" (no dot)    -> workstream ("Luồng N")
//   "N.M"           -> task, folded into the current workstream's
//                      description instead of becoming its own
//                      roadmap_item (keeps company-wide roadmap stats,
//                      which count all items, from being diluted by
//                      dozens of granular subtasks per sprint).

export type RoadmapStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";

export type ImportRow = {
  wbs: string;
  title: string;
  owner: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type WorkstreamImport = {
  title: string;
  owner?: string;
  startDate?: string;
  dueDate?: string;
  status: RoadmapStatus;
  description?: string;
};

export type SprintImport = {
  title: string;
  startDate?: string;
  dueDate?: string;
  status: RoadmapStatus;
  workstreams: WorkstreamImport[];
};

const STATUS_MAP: Record<string, RoadmapStatus> = {
  "hoàn thành": "done",
  "đang thực hiện": "in_progress",
  "chưa làm": "not_started",
};

export function mapImportStatus(raw: string | undefined): RoadmapStatus {
  if (!raw) return "not_started";
  return STATUS_MAP[raw.trim().toLowerCase()] ?? "not_started";
}

// Sheet dates are DD/MM/YY or DD/MM/YYYY (e.g. "12/05/26", "20/05/2026").
// roadmap_items dates are YYYY-MM-DD (see common.ts#isoDate). Returns
// undefined for blank/unparseable/non-calendar input rather than throwing —
// one bad date cell should not abort the whole import.
export function parseImportDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (!match) return undefined;
  const [, ddRaw, mmRaw, yyRaw] = match;
  const day = Number(ddRaw);
  const month = Number(mmRaw);
  const year = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidCalendarDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isValidCalendarDate) return undefined;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type WbsKind = "sprint" | "workstream" | "task" | "unknown";

export function classifyWbs(wbs: string): WbsKind {
  const trimmed = wbs.trim();
  if (/^sprint\s*\d+$/i.test(trimmed)) return "sprint";
  if (/^\d+$/.test(trimmed)) return "workstream";
  if (/^\d+\.\d+$/.test(trimmed)) return "task";
  return "unknown";
}

function normalizeCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function extractImportRows(grid: unknown[][]): ImportRow[] {
  const headerRowIndex = grid.findIndex(
    (row) => normalizeCell(row?.[0]).toLowerCase() === "wbs",
  );
  if (headerRowIndex === -1) return [];
  const rows: ImportRow[] = [];
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const wbs = normalizeCell(row[0]);
    const title = normalizeCell(row[1]);
    if (!wbs && !title) continue; // blank spacer row
    if (wbs.toLowerCase().startsWith("chú giải")) break; // legend = end of data
    rows.push({
      wbs,
      title,
      owner: normalizeCell(row[2]),
      startDate: normalizeCell(row[3]),
      endDate: normalizeCell(row[4]),
      status: normalizeCell(row[6]),
    });
  }
  return rows;
}

function formatTaskLine(row: ImportRow): string {
  const meta: string[] = [];
  if (row.owner) meta.push(row.owner);
  if (row.startDate || row.endDate) {
    meta.push(`${row.startDate || "?"} → ${row.endDate || "?"}`);
  }
  if (row.status) meta.push(row.status);
  const label = `${row.wbs} ${row.title}`.trim();
  return meta.length ? `• ${label} (${meta.join(" · ")})` : `• ${label}`;
}

export function buildSprintImportTree(rows: ImportRow[]): SprintImport[] {
  const sprints: SprintImport[] = [];
  let currentSprint: SprintImport | null = null;
  let currentWorkstream:
    | (WorkstreamImport & { _lines: string[] })
    | null = null;

  const flushWorkstream = () => {
    if (currentWorkstream && currentSprint) {
      const { _lines, ...workstream } = currentWorkstream;
      currentSprint.workstreams.push({
        ...workstream,
        description: _lines.length ? _lines.join("\n") : undefined,
      });
    }
    currentWorkstream = null;
  };

  for (const row of rows) {
    switch (classifyWbs(row.wbs)) {
      case "sprint":
        flushWorkstream();
        currentSprint = {
          title: row.title,
          startDate: parseImportDate(row.startDate),
          dueDate: parseImportDate(row.endDate),
          status: mapImportStatus(row.status),
          workstreams: [],
        };
        sprints.push(currentSprint);
        break;
      case "workstream":
        flushWorkstream();
        // A workstream row before any Sprint header is malformed input —
        // skip it rather than guess a parent.
        if (currentSprint) {
          currentWorkstream = {
            title: row.title,
            owner: row.owner || undefined,
            startDate: parseImportDate(row.startDate),
            dueDate: parseImportDate(row.endDate),
            status: mapImportStatus(row.status),
            _lines: [],
          };
        }
        break;
      case "task":
        currentWorkstream?._lines.push(formatTaskLine(row));
        break;
      case "unknown":
        // Blank separators, section footers — ignore.
        break;
    }
  }
  flushWorkstream();
  return sprints;
}

export function parseSprintTimelineSheet(grid: unknown[][]): SprintImport[] {
  return buildSprintImportTree(extractImportRows(grid));
}
