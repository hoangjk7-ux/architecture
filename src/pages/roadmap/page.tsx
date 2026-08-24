import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { Plus, ShieldCheck, Edit, Trash2, ChevronRight } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type RoadmapItem = Doc<"roadmap_items">;

const statusConfig = {
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
} as const;

const levelOrder = [
  "initiative",
  "program",
  "project",
  "epic",
  "sprint",
  "workstream",
] as const;

type RoadmapLevel = (typeof levelOrder)[number];
type RoadmapStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";
type RoadmapPriority = "high" | "medium" | "low";

type RoadmapFormData = {
  title: string;
  level: RoadmapLevel;
  parentId: Id<"roadmap_items"> | undefined;
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
  parentId: undefined,
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
  onSave,
  onClose,
  items,
}: {
  initial?: Partial<RoadmapFormData> & { _id?: Id<"roadmap_items"> };
  onSave: (data: RoadmapFormData) => Promise<void>;
  onClose: () => void;
  items: RoadmapItem[];
}) {
  const [form, setForm] = useState<RoadmapFormData>(() => {
    const src = (initial ?? {}) as Record<string, unknown>;
    return Object.keys(defaultForm).reduce<RoadmapFormData>(
      (acc, k) => ({
        ...acc,
        [k]: k in src ? src[k] : defaultForm[k as keyof RoadmapFormData],
      }),
      { ...defaultForm },
    );
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof defaultForm>(
    k: K,
    v: (typeof defaultForm)[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const parentCandidates = items.filter((i) => {
    const levelIdx = levelOrder.indexOf(form.level);
    const parentLevel = levelOrder[levelIdx - 1];
    return i.level === parentLevel;
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          (err instanceof Error ? err.message : "Failed to save"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Digital Campus Initiative"
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>Level</Label>
          <Select
            value={form.level}
            onValueChange={(v) => set("level", v as typeof form.level)}
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelOrder.map((l) => (
                <SelectItem key={l} value={l} className="capitalize">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => set("status", v as typeof form.status)}
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={(v) => set("priority", v as typeof form.priority)}
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {parentCandidates.length > 0 && (
          <div className="space-y-1">
            <Label>Parent</Label>
            <Select
              value={form.parentId ?? "none"}
              onValueChange={(v) =>
                set(
                  "parentId",
                  v === "none" ? undefined : (v as Id<"roadmap_items">),
                )
              }
            >
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {parentCandidates.map((i) => (
                  <SelectItem key={i._id} value={i._id}>
                    {i.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label>Owner</Label>
          <Input
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
            placeholder="e.g. IT Lead"
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            className="bg-input"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Architecture Alignment Score (0-100)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.architectureAlignmentScore}
            onChange={(e) =>
              set("architectureAlignmentScore", Number(e.target.value))
            }
            className="bg-input"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe this roadmap item..."
            className="bg-input"
            rows={2}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function RoadmapContent() {
  const { canWrite } = useCurrentUser();
  const rawItems = useQuery(api.roadmap.list);
  const items = rawItems ?? [];
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const stats = useQuery(
    api.roadmap.getStats,
    !isConvexAuthenticated ? "skip" : undefined,
  );
  const createItem = useMutation(api.roadmap.create);
  const updateItem = useMutation(api.roadmap.update);
  const removeItem = useMutation(api.roadmap.remove);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = items.filter((i) => {
    const matchLevel = filterLevel === "all" || i.level === filterLevel;
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    return matchLevel && matchStatus;
  });

  // Group by level for tree view
  const initiatives = filtered.filter((i) => i.level === "initiative");
  const programs = filtered.filter((i) => i.level === "program");
  const projects = filtered.filter((i) => i.level === "project");

  const handleCreate = async (data: RoadmapFormData) => {
    await createItem(data);
    toast.success("Added");
  };
  const handleUpdate = async (data: RoadmapFormData) => {
    if (!editing) return;
    await updateItem({ id: editing._id, ...data });
    toast.success("Updated");
    setEditing(null);
  };

  const today = new Date().toISOString().split("T")[0];

  const renderItem = (item: RoadmapItem, indent = 0) => {
    const cfg = statusConfig[item.status];
    const isOverdue =
      item.dueDate && item.dueDate < today && item.status !== "done";
    return (
      <div
        key={item._id}
        className={cn(
          "flex items-start justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors",
          indent > 0 && "ml-6 mt-1",
        )}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {indent > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{item.title}</span>
              <Badge
                variant="secondary"
                className="text-[10px] capitalize shrink-0"
              >
                {item.level}
              </Badge>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                  cfg.bg,
                  cfg.color,
                )}
              >
                {cfg.label}
              </span>
              {isOverdue && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                  Overdue
                </Badge>
              )}
              {item.priority === "high" && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
                  High Priority
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {item.owner && <span>{item.owner}</span>}
              {item.dueDate && <span>Due: {item.dueDate}</span>}
              <span>
                Alignment:{" "}
                <span
                  className={
                    item.architectureAlignmentScore >= 70
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {item.architectureAlignmentScore}%
                </span>
              </span>
            </div>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              onClick={() => setEditing(item)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
              onClick={() => {
                removeItem({ id: item._id });
                toast.success("Removed");
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technology Roadmap</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {items.length} items tracked
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.completionRate}%
            </div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {stats.inProgress}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">
              {stats.blocked}
            </div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {stats.overdue}
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.avgAlignmentScore}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Alignment</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-36 bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {levelOrder.map((l) => (
              <SelectItem key={l} value={l} className="capitalize">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rawItems === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No roadmap items yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filterLevel === "all"
            ? // Tree view
              initiatives.map((init) => (
                <div key={init._id}>
                  {renderItem(init, 0)}
                  {programs
                    .filter((p) => p.parentId === init._id)
                    .map((prog) => (
                      <div key={prog._id}>
                        {renderItem(prog, 1)}
                        {projects
                          .filter((p) => p.parentId === prog._id)
                          .map((proj) => renderItem(proj, 2))}
                      </div>
                    ))}
                </div>
              ))
            : filtered.map((item) => renderItem(item))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Roadmap Item</DialogTitle>
          </DialogHeader>
          <RoadmapForm
            onSave={handleCreate}
            onClose={() => setShowForm(false)}
            items={items}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Roadmap Item</DialogTitle>
          </DialogHeader>
          {editing && (
            <RoadmapForm
              initial={editing}
              onSave={handleUpdate}
              onClose={() => setEditing(null)}
              items={items}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RoadmapPage() {
  return <RoadmapContent />;
}
