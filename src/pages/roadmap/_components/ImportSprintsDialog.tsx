import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { parseSprintTimelineSheet } from "@/convex/domain/roadmapImport.ts";
import type { SprintImport } from "@/convex/domain/roadmapImport.ts";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";

type RoadmapItem = Doc<"roadmap_items">;

// Picks the sheet the Gantt "Sprint -> Luồng -> Task" timeline lives on: a
// tab whose name mentions "timeline"/"tiến độ", falling back to the first
// sheet in the workbook so a differently-named export still parses.
function pickTimelineSheetName(sheetNames: string[]): string {
  const match = sheetNames.find((name) =>
    /timeline|tiến\s*độ|tien\s*do/i.test(name),
  );
  return match ?? sheetNames[0];
}

async function parseWorkbook(file: File): Promise<SprintImport[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = pickTimelineSheetName(workbook.SheetNames);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return parseSprintTimelineSheet(grid);
}

export function ImportSprintsDialog({
  items,
  onClose,
}: {
  items: RoadmapItem[];
  onClose: () => void;
}) {
  const importSprints = useMutation(api.roadmap.importSprints);
  const projects = items.filter((i) => i.level === "project");
  const [projectId, setProjectId] = useState<Id<"roadmap_items"> | "">("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<SprintImport[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workstreamCount = parsed?.reduce(
    (sum, s) => sum + s.workstreams.length,
    0,
  );

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsed(null);
    setParsing(true);
    try {
      const sprints = await parseWorkbook(file);
      if (!sprints.length) {
        toast.error(
          "Không tìm thấy dòng Sprint nào — kiểm tra lại sheet timeline (cần có cột WBS).",
        );
        return;
      }
      setParsed(sprints);
    } catch {
      toast.error("Không đọc được file — hãy chắc đây là file Excel hợp lệ.");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!projectId || !parsed) return;
    setImporting(true);
    try {
      const result = await importSprints({ projectId, sprints: parsed });
      toast.success(
        `Đã nhập ${result.sprintsCreated} sprint / ${result.workstreamsCreated} luồng`,
      );
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Không thể nhập dữ liệu",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Project đích</Label>
        {projects.length === 0 ? (
          <p className="text-xs text-yellow-400">
            Chưa có roadmap item cấp "project" nào — hãy tạo một project trước
            khi nhập sprint.
          </p>
        ) : (
          <Select
            value={projectId}
            onValueChange={(v) => setProjectId(v as Id<"roadmap_items">)}
          >
            <SelectTrigger className="bg-input">
              <SelectValue placeholder="Chọn project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1">
        <Label>File Excel (sheet timeline: Sprint → Luồng → Task)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
        >
          <Upload className="h-4 w-4" />
          {fileName ?? "Chọn file .xlsx"}
        </Button>
      </div>

      {parsing && (
        <p className="text-xs text-muted-foreground">Đang đọc file…</p>
      )}

      {parsed && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
          <span>
            Đọc được <strong>{parsed.length}</strong> sprint /{" "}
            <strong>{workstreamCount}</strong> luồng. Từng task lẻ trong mỗi
            luồng được gộp vào mô tả, không tạo item riêng.
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose} disabled={importing}>
          Huỷ
        </Button>
        <Button
          onClick={handleImport}
          disabled={!projectId || !parsed || importing}
        >
          {importing ? "Đang nhập..." : "Nhập"}
        </Button>
      </div>
    </div>
  );
}
