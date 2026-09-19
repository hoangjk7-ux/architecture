import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  ChevronRight,
  Edit,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { ImportSprintsDialog } from "./_components/ImportSprintsDialog.tsx";

type RoadmapItem = Doc<"roadmap_items">;
type SoftwareSystem = Doc<"software_systems">;
type ProjectResource = Doc<"project_resources">;
type RoadmapLevel = RoadmapItem["level"];
type RoadmapStatus = RoadmapItem["status"];
type RoadmapPriority = RoadmapItem["priority"];

const levelOrder: RoadmapLevel[] = [
  "initiative",
  "program",
  "project",
  "epic",
  "sprint",
  "workstream",
];
const parentLevelOf: Record<RoadmapLevel, RoadmapLevel | null> = {
  initiative: null,
  program: "initiative",
  project: "program",
  epic: "project",
  sprint: "project",
  workstream: "sprint",
};
const statusConfig: Record<
  RoadmapStatus,
  { label: string; color: string; bg: string }
> = {
  not_started: {
    label: "Not Started",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  blocked: { label: "Blocked", color: "text-red-400", bg: "bg-red-500/10" },
  done: { label: "Done", color: "text-green-400", bg: "bg-green-500/10" },
  cancelled: {
    label: "Cancelled",
    color: "text-muted-foreground",
    bg: "bg-muted/30",
  },
};
const levelLabels: Record<RoadmapLevel, string> = {
  initiative: "Sáng kiến",
  program: "Chương trình",
  project: "Dự án",
  epic: "Epic",
  sprint: "Sprint",
  workstream: "Luồng công việc",
};

type RoadmapFormData = {
  title: string;
  level: RoadmapLevel;
  parentId?: Id<"roadmap_items">;
  status: RoadmapStatus;
  owner: string;
  startDate: string;
  dueDate: string;
  architectureAlignmentScore: number;
  relatedSystemIds: Id<"software_systems">[];
  description: string;
  priority: RoadmapPriority;
};

const defaultForm: RoadmapFormData = {
  title: "",
  level: "initiative",
  status: "not_started",
  owner: "",
  startDate: "",
  dueDate: "",
  architectureAlignmentScore: 80,
  relatedSystemIds: [],
  description: "",
  priority: "medium",
};

function RoadmapForm({
  initial,
  items,
  systems,
  resources,
  onSave,
  onClose,
}: {
  initial?: Partial<RoadmapFormData>;
  items: RoadmapItem[];
  systems: SoftwareSystem[];
  resources: ProjectResource[];
  onSave: (data: RoadmapFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RoadmapFormData>({
    ...defaultForm,
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof RoadmapFormData>(
    key: K,
    value: RoadmapFormData[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const systemById = new Map(systems.map((system) => [system._id, system]));
  const parentCandidates = items.filter(
    (item) =>
      item.level === parentLevelOf[form.level] &&
      (item.level !== "project" ||
        item.relatedSystemIds.some((systemId) => systemById.has(systemId))),
  );
  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (form.level === "project" && form.relatedSystemIds.length !== 1)
      return toast.error("Hãy chọn một hệ thống cho dự án");
    if (parentLevelOf[form.level] && !form.parentId)
      return toast.error("Hãy chọn cấp cha");
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim() });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>{form.level === "project" ? "Hệ thống *" : "Title *"}</Label>
          {form.level === "project" ? (
            <Select
              value={form.relatedSystemIds[0] ?? ""}
              onValueChange={(value) =>
                set("relatedSystemIds", [value as Id<"software_systems">])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn từ Kho hệ thống" />
              </SelectTrigger>
              <SelectContent>
                {systems.map((system) => (
                  <SelectItem key={system._id} value={system._id}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              className="bg-input"
            />
          )}
        </div>
        <div className="space-y-1">
          <Label>Cấp lộ trình</Label>
          <Select
            value={form.level}
            onValueChange={(value) => set("level", value as RoadmapLevel)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelOrder.map((level) => (
                <SelectItem key={level} value={level}>
                  {levelLabels[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(value) => set("status", value as RoadmapStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={(value) => set("priority", value as RoadmapPriority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["high", "medium", "low"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {parentLevelOf[form.level] && (
          <div className="space-y-1">
            <Label>Cấp cha *</Label>
            <Select
              value={form.parentId ?? ""}
              onValueChange={(value) =>
                set("parentId", value as Id<"roadmap_items">)
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={`Chọn ${levelLabels[parentLevelOf[form.level]!]}`}
                />
              </SelectTrigger>
              <SelectContent className="min-w-[320px]">
                {parentCandidates.map((item) => (
                  <SelectItem
                    key={item._id}
                    value={item._id}
                    className="whitespace-normal"
                  >
                    {item.level === "project"
                      ? (systemById.get(item.relatedSystemIds[0])?.name ??
                        item.title)
                      : item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label>
            {form.level === "project" ? "Phụ trách dự án" : "Owner"}
          </Label>
          {form.level === "project" ? (
            <Select
              value={
                resources.find((resource) => resource.name === form.owner)
                  ?._id ?? "none"
              }
              onValueChange={(value) =>
                set(
                  "owner",
                  value === "none"
                    ? ""
                    : (resources.find((resource) => resource._id === value)
                        ?.name ?? ""),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn PM / BA / DEV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa phân công</SelectItem>
                {resources.map((resource) => (
                  <SelectItem key={resource._id} value={resource._id}>
                    {resource.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.owner}
              onChange={(event) => set("owner", event.target.value)}
            />
          )}
        </div>
        <div className="space-y-1">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(event) => set("startDate", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(event) => set("dueDate", event.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Architecture Alignment Score (0-100)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.architectureAlignmentScore}
            onChange={(event) =>
              set("architectureAlignmentScore", Number(event.target.value))
            }
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            rows={2}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function TaskDialog({
  projectId,
  sprintId,
  resources,
  onClose,
}: {
  projectId: Id<"roadmap_items">;
  sprintId: Id<"roadmap_items">;
  resources: Doc<"project_resources">[];
  onClose: () => void;
}) {
  const createTask = useMutation(api.roadmap.createProjectTask);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [phase, setPhase] = useState<"pre_uat" | "post_uat">("pre_uat");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [actualHours, setActualHours] = useState("0");
  const [remainingHours, setRemainingHours] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await createTask({
        projectId,
        sprintId,
        title,
        assigneeId: assigneeId as Id<"project_resources">,
        phase,
        estimatedHours: Number(estimatedHours),
        actualHours: Number(actualHours),
        remainingHours: Number(remainingHours),
      });
      toast.success("Đã thêm Task vào Sprint");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo Task",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm Task vào Sprint</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tên Task *</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <Label>Assignee *</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nguồn lực" />
              </SelectTrigger>
              <SelectContent>
                {resources.map((resource) => (
                  <SelectItem key={resource._id} value={resource._id}>
                    {resource.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Giai đoạn</Label>
            <Select
              value={phase}
              onValueChange={(value) => setPhase(value as typeof phase)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_uat">Pre-UAT</SelectItem>
                <SelectItem value="post_uat">Post-UAT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Estimated"
              value={estimatedHours}
              onChange={(event) => setEstimatedHours(event.target.value)}
            />
            <Input
              type="number"
              min={0}
              placeholder="Actual"
              value={actualHours}
              onChange={(event) => setActualHours(event.target.value)}
            />
            <Input
              type="number"
              min={0}
              placeholder="Remaining"
              value={remainingHours}
              onChange={(event) => setRemainingHours(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button
              disabled={!title || !assigneeId || !estimatedHours || saving}
              onClick={() => void save()}
            >
              Tạo Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoadmapContent() {
  const { canWrite, canViewProjectCosts } = useCurrentUser();
  const rawItems = useQuery(api.roadmap.list);
  const systems = useQuery(api.software_systems.list) ?? [];
  const master = useQuery(
    api.roadmap.listProjectCostMasterData,
    canViewProjectCosts ? {} : "skip",
  );
  const items = rawItems ?? [];
  const projects = items.filter((item) => item.level === "project");
  const stats = useQuery(api.roadmap.getStats);
  const createItem = useMutation(api.roadmap.create);
  const updateItem = useMutation(api.roadmap.update);
  const removeItem = useMutation(api.roadmap.remove);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [taskSprint, setTaskSprint] = useState<RoadmapItem | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const filtered = items.filter(
    (item) =>
      (filterLevel === "all" || item.level === filterLevel) &&
      (filterStatus === "all" || item.status === filterStatus),
  );
  const projectForSprint = (sprint: RoadmapItem) =>
    projects.find((project) => project._id === sprint.parentId);
  const renderItem = (item: RoadmapItem, indent = 0) => {
    const config = statusConfig[item.status];
    const children = filtered.filter((child) => child.parentId === item._id);
    const project = projectForSprint(item);
    return (
      <div
        key={item._id}
        className={cn(
          "rounded-lg border border-border p-3",
          indent > 0 && "ml-6 mt-1",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{item.title}</span>
              <Badge variant="secondary" className="text-[10px]">
                {levelLabels[item.level]}
              </Badge>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  config.bg,
                  config.color,
                )}
              >
                {config.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {item.owner && <span>{item.owner}</span>}
              {item.dueDate && <span>Due: {item.dueDate}</span>}
              <span>Alignment: {item.architectureAlignmentScore}%</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {item.level === "sprint" && project && canViewProjectCosts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskSprint(item)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Task
              </Button>
            )}
            {canWrite && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(item)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => void removeItem({ id: item._id })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        {children.map((child) => (
          <div key={child._id}>
            <ChevronRight className="ml-2 mt-2 h-3 w-3 text-muted-foreground" />
            {renderItem(child, indent + 1)}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technology Roadmap</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {items.length} items tracked
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Nhập Sprint từ Excel
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        )}
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Complete", `${stats.completionRate}%`],
            ["In Progress", stats.inProgress],
            ["Blocked", stats.blocked],
            ["Overdue", stats.overdue],
            ["Alignment", `${stats.avgAlignmentScore}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border bg-card p-3 text-center"
            >
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {levelOrder.map((level) => (
              <SelectItem key={level} value={level}>
                {levelLabels[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {rawItems === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 opacity-30" />
          No roadmap items yet
        </div>
      ) : (
        <div className="space-y-1">
          {filtered
            .filter(
              (item) =>
                !item.parentId ||
                !filtered.some((candidate) => candidate._id === item.parentId),
            )
            .map((item) => renderItem(item))}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Roadmap Item</DialogTitle>
          </DialogHeader>
          <RoadmapForm
            items={items}
            systems={systems}
            resources={master?.resources ?? []}
            onSave={async (data) => {
              await createItem(data);
              toast.success("Added");
            }}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Roadmap Item</DialogTitle>
          </DialogHeader>
          {editing && (
            <RoadmapForm
              initial={editing}
              items={items}
              systems={systems}
              resources={master?.resources ?? []}
              onSave={async (data) => {
                await updateItem({ id: editing._id, ...data });
                toast.success("Updated");
              }}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập Sprint từ Excel</DialogTitle>
          </DialogHeader>
          <ImportSprintsDialog
            items={items}
            systems={systems}
            onClose={() => setShowImport(false)}
          />
        </DialogContent>
      </Dialog>
      {taskSprint && (
        <TaskDialog
          projectId={projectForSprint(taskSprint)!._id}
          sprintId={taskSprint._id}
          resources={master?.resources ?? []}
          onClose={() => setTaskSprint(null)}
        />
      )}
    </div>
  );
}

export default function RoadmapPage() {
  return <RoadmapContent />;
}
