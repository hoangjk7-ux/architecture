import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type DemandStatus =
  | "draft"
  | "submitted"
  | "ba_review"
  | "changes_requested"
  | "approved"
  | "rejected";
const statusLabels: Record<DemandStatus, string> = {
  draft: "Nháp",
  submitted: "Đã gửi",
  ba_review: "BA đang đánh giá",
  changes_requested: "Yêu cầu chỉnh sửa",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};
const initial = {
  title: "",
  description: "",
  category: "General",
  businessValue: 3,
  strategicAlignment: 3,
  urgency: 3,
  complianceImpact: 3,
  estimatedEffort: 3,
};

export default function DemandsPage() {
  const { user } = useCurrentUser();
  const demands = useQuery(api.demands.list, {});
  const createDemand = useMutation(api.demands.create);
  const transition = useMutation(api.demands.transition);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initial);

  const create = async () => {
    if (!form.title.trim()) return toast.error("Tiêu đề là bắt buộc");
    setSaving(true);
    try {
      await createDemand(form);
      setForm(initial);
      setOpen(false);
      toast.success("Đã tạo demand nháp");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo demand",
      );
    } finally {
      setSaving(false);
    }
  };

  const move = async (demandId: Id<"demands">, to: DemandStatus) => {
    try {
      const comment = ["approved", "rejected", "changes_requested"].includes(to)
        ? (window.prompt("Nhập nhận xét (không bắt buộc)") ?? undefined)
        : undefined;
      await transition({ demandId, to, comment });
      toast.success("Đã cập nhật trạng thái");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật",
      );
    }
  };

  const actions = (status: DemandStatus, requesterId: Id<"users">) => {
    const role = user?.role;
    if (
      (status === "draft" || status === "changes_requested") &&
      (requesterId === user?._id || role === "cto" || role === "it_manager")
    )
      return [{ to: "submitted" as const, label: "Gửi đánh giá" }];
    if (
      status === "submitted" &&
      ["cto", "it_manager", "business_analyst"].includes(role ?? "")
    )
      return [{ to: "ba_review" as const, label: "Bắt đầu BA review" }];
    if (
      status === "ba_review" &&
      ["cto", "it_manager", "approver"].includes(role ?? "")
    )
      return [
        { to: "approved" as const, label: "Phê duyệt" },
        { to: "changes_requested" as const, label: "Yêu cầu sửa" },
        { to: "rejected" as const, label: "Từ chối" },
      ];
    return [];
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Demand Management</h1>
          <p className="text-sm text-muted-foreground">
            Tạo, đánh giá và phê duyệt yêu cầu nghiệp vụ
          </p>
        </div>
        {["cto", "it_manager", "business_owner", "requester"].includes(
          user?.role ?? "",
        ) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo demand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Tạo demand mới</DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                <div className="space-y-1">
                  <Label>Tiêu đề *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phân loại</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["businessValue", "Business value"],
                      ["strategicAlignment", "Strategic alignment"],
                      ["urgency", "Urgency"],
                      ["complianceImpact", "Compliance impact"],
                      ["estimatedEffort", "Estimated effort"],
                    ] as const
                  ).map(([key, label]) => (
                    <div className="space-y-1" key={key}>
                      <Label>{label} (0–5)</Label>
                      <Select
                        value={String(form[key])}
                        onValueChange={(value) =>
                          setForm({ ...form, [key]: Number(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  disabled={saving}
                  onClick={() => void create()}
                >
                  {saving ? "Đang lưu…" : "Lưu nháp"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {demands === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : demands.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 h-10 w-10" />
          Chưa có demand nào.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {demands.map((demand) => (
            <Card key={demand._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {demand.code} · {demand.category}
                    </p>
                    <CardTitle className="mt-1 text-lg">
                      {demand.title}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">{statusLabels[demand.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {demand.description || "Không có mô tả"}
                </p>
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Priority score · model {demand.scoringModelVersion}
                  </span>
                  <strong>{demand.priorityScore.toFixed(2)}</strong>
                </div>
                {actions(demand.status, demand.requesterId).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {actions(demand.status, demand.requesterId).map(
                      (action) => (
                        <Button
                          key={action.to}
                          size="sm"
                          variant={
                            action.to === "approved" ? "default" : "outline"
                          }
                          onClick={() => void move(demand._id, action.to)}
                        >
                          {action.label}
                        </Button>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
