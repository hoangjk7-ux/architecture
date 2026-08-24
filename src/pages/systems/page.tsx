import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Server,
  Filter,
  AlertTriangle,
  Archive,
  UserX,
  CalendarClock,
  ChevronRight,
  X,
  History,
  TrendingDown,
  TrendingUp,
  Shield,
  DollarSign,
  PlusCircle,
  Pencil,
  UsersRound,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useLanguage } from "@/components/providers/language.tsx";
import { cn } from "@/lib/utils.ts";
import { formatVnd } from "@/lib/format.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type SoftwareSystem = Doc<"software_systems">;

// ─── Badge helpers ─────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: string }) {
  const { t } = useLanguage();
  if (level === "high")
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] font-semibold">
        {t("systems.badge.highRisk")}
      </Badge>
    );
  if (level === "medium")
    return (
      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px]">
        {t("level.medium")}
      </Badge>
    );
  return (
    <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
      {t("level.low")}
    </Badge>
  );
}

function CriticalityBadge({ level }: { level: string }) {
  const { t } = useLanguage();
  if (level === "high")
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
        {t("systems.badge.critical")}
      </Badge>
    );
  if (level === "medium")
    return (
      <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]">
        {t("level.medium")}
      </Badge>
    );
  return (
    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">
      {t("level.low")}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    core: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    supporting: "bg-green-500/15 text-green-400 border-green-500/30",
    legacy: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    pilot: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <Badge
      className={cn(
        "text-[10px]",
        map[type] ?? "bg-muted text-muted-foreground",
      )}
    >
      {t(`systemType.${type}`)}
    </Badge>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-400",
    sunset: "bg-yellow-400",
    pilot: "bg-blue-400",
    inactive: "bg-gray-500",
  };
  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full inline-block shrink-0",
        map[status] ?? "bg-gray-500",
      )}
    />
  );
}

function ScoreBar({
  value,
  invert = false,
}: {
  value: number;
  invert?: boolean;
}) {
  const color = invert
    ? value > 60
      ? "#ef4444"
      : value > 30
        ? "#f59e0b"
        : "#22c55e"
    : value >= 70
      ? "#22c55e"
      : value >= 50
        ? "#f59e0b"
        : "#ef4444";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-w-[140px] rounded-xl border p-4 text-left transition-all cursor-pointer",
        active ? "ring-1" : "hover:border-border/80",
      )}
      style={{
        background: active ? `${color}12` : "#0d1526",
        borderColor: active ? color : "#1e293b",
        ...(active ? { boxShadow: `0 0 0 1px ${color}44` } : {}),
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      )}
    </button>
  );
}

// ─── Detail side panel ─────────────────────────────────────────────────────────
function SystemDetailPanel({
  system,
  onClose,
  onEdit,
  canWrite,
}: {
  system: SoftwareSystem;
  onClose: () => void;
  onEdit: (s: SoftwareSystem) => void;
  canWrite: boolean;
}) {
  const { t } = useLanguage();
  const modules =
    useQuery(api.system_modules.listBySystem, { systemId: system._id }) ?? [];
  const resourceRates = useQuery(api.internal_resources.listRates) ?? [];
  const allocations =
    useQuery(api.internal_resources.listBySystem, { systemId: system._id }) ??
    [];
  const createAllocation = useMutation(api.internal_resources.createAllocation);
  const removeAllocation = useMutation(api.internal_resources.removeAllocation);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceRateId, setResourceRateId] = useState<
    Id<"internal_resource_rates"> | ""
  >("");
  const [headcount, setHeadcount] = useState(1);
  const [allocationPercent, setAllocationPercent] = useState(100);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const estimatedInternalBudget = allocations.reduce(
    (sum, item) => sum + item.estimatedCost,
    0,
  );

  const addAllocation = async () => {
    if (!resourceRateId || !startDate || !endDate) {
      toast.error("Vui lòng chọn vai trò và timeline");
      return;
    }
    try {
      await createAllocation({
        systemId: system._id,
        resourceRateId,
        headcount,
        allocationPercent,
        startDate,
        endDate,
      });
      setShowResourceForm(false);
      setResourceRateId("");
      setHeadcount(1);
      setAllocationPercent(100);
      setStartDate("");
      setEndDate("");
      toast.success("Đã thêm nguồn lực và cập nhật ngân sách");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Không thể thêm nguồn lực",
      );
    }
  };

  const typeColors: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    core: { bg: "#1a1f3e", border: "#6366f1", text: "#c7d2fe" },
    supporting: { bg: "#0f2318", border: "#22c55e", text: "#bbf7d0" },
    legacy: { bg: "#2a1a06", border: "#f59e0b", text: "#fde68a" },
    pilot: { bg: "#0a1a35", border: "#3b82f6", text: "#bfdbfe" },
  };
  const tc = typeColors[system.type] ?? typeColors.core;

  const inUse = modules.filter((m) => m.lifecycle === "in_use").length;
  const planned = modules.filter(
    (m) => m.lifecycle === "planned" || m.lifecycle === "in_development",
  ).length;
  const deprecated = modules.filter(
    (m) => m.lifecycle === "deprecated" || m.lifecycle === "retired",
  ).length;

  return (
    <div className="w-[320px] shrink-0 border-l border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-start justify-between gap-2"
        style={{ background: tc.bg }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot status={system.status} />
            <span
              className="font-bold text-sm truncate"
              style={{ color: tc.text }}
            >
              {system.name}
            </span>
          </div>
          <div
            className="text-[10px] opacity-60 mt-0.5"
            style={{ color: tc.text }}
          >
            {system.category} · {t(`systemType.${system.type}`)}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canWrite && (
            <button
              onClick={() => onEdit(system)}
              className="cursor-pointer p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="cursor-pointer p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: t("detail.status"),
              value: t(`status.${system.status}`),
              color:
                {
                  active: "#22c55e",
                  sunset: "#f59e0b",
                  pilot: "#3b82f6",
                  inactive: "#6b7280",
                }[system.status] ?? "#6b7280",
            },
            {
              label: t("detail.criticality"),
              value: t(`level.${system.criticality}`),
              color:
                system.criticality === "high"
                  ? "#ef4444"
                  : system.criticality === "medium"
                    ? "#f59e0b"
                    : "#22c55e",
            },
            {
              label: t("detail.riskLevel"),
              value: t(`level.${system.riskLevel}`),
              color:
                system.riskLevel === "high"
                  ? "#ef4444"
                  : system.riskLevel === "medium"
                    ? "#f59e0b"
                    : "#22c55e",
            },
            {
              label: t("detail.hosting"),
              value: system.hosting ?? "—",
              color: "#94a3b8",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-muted/30 rounded-lg p-2.5">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                {label}
              </div>
              <div className="text-xs font-semibold" style={{ color }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Scores */}
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" />
                {t("detail.architectureScore")}
              </span>
              <span
                className="font-mono font-bold"
                style={{
                  color:
                    system.architectureScore >= 70
                      ? "#22c55e"
                      : system.architectureScore >= 50
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              >
                {system.architectureScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${system.architectureScore}%`,
                  background:
                    system.architectureScore >= 70
                      ? "#22c55e"
                      : system.architectureScore >= 50
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-2.5 w-2.5" />
                {t("detail.technicalDebt")}
              </span>
              <span
                className="font-mono font-bold"
                style={{
                  color:
                    system.technicalDebtScore > 60
                      ? "#ef4444"
                      : system.technicalDebtScore > 30
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              >
                {system.technicalDebtScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${system.technicalDebtScore}%`,
                  background:
                    system.technicalDebtScore > 60
                      ? "#ef4444"
                      : system.technicalDebtScore > 30
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              />
            </div>
          </div>
        </div>

        {/* Modules summary */}
        {modules.length > 0 && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail.modules")} ({modules.length})
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-400">
                  {inUse} {t("detail.active")}
                </span>
              </span>
              {planned > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-blue-400">
                    {planned} {t("detail.upcoming")}
                  </span>
                </span>
              )}
              {deprecated > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-yellow-400">
                    {deprecated} {t("detail.deprecated")}
                  </span>
                </span>
              )}
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {modules.slice(0, 12).map((m) => (
                <div
                  key={m._id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-[10px] text-muted-foreground truncate">
                    {m.name}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      background:
                        m.lifecycle === "in_use"
                          ? "#14532d33"
                          : m.lifecycle === "in_development"
                            ? "#1e3a5f33"
                            : m.lifecycle === "planned"
                              ? "#3b076433"
                              : "#1e293b",
                      color:
                        m.lifecycle === "in_use"
                          ? "#22c55e"
                          : m.lifecycle === "in_development"
                            ? "#3b82f6"
                            : m.lifecycle === "planned"
                              ? "#a855f7"
                              : "#6b7280",
                    }}
                  >
                    {m.lifecycle.replace("_", " ")}
                  </span>
                </div>
              ))}
              {modules.length > 12 && (
                <div className="text-[10px] text-muted-foreground">
                  +{modules.length - 12} {t("detail.more")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400 flex items-center gap-1">
                <UsersRound className="h-3 w-3" />
                Ngân sách nguồn lực nội bộ
              </div>
              <div className="text-lg font-bold text-cyan-300 mt-1">
                {formatVnd(estimatedInternalBudget)}
              </div>
            </div>
            {canWrite && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
                onClick={() => setShowResourceForm((value) => !value)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Nguồn lực
              </Button>
            )}
          </div>
          {allocations.length === 0 && !showResourceForm && (
            <p className="text-[10px] text-muted-foreground">
              Chưa có nguồn lực triển khai được phân bổ.
            </p>
          )}
          <div className="space-y-2">
            {allocations.map((item) => (
              <div
                key={item._id}
                className="rounded bg-background/60 p-2 text-[10px]"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">
                    {item.rate?.name ?? "Đơn giá đã xoá"} · {item.headcount}{" "}
                    người · {item.allocationPercent}%
                  </span>
                  {canWrite && (
                    <button
                      className="text-muted-foreground hover:text-red-400 cursor-pointer"
                      onClick={async () => {
                        try {
                          await removeAllocation({ id: item._id });
                          toast.success("Đã xoá phân bổ");
                        } catch (err: unknown) {
                          toast.error(
                            (err as { data?: { message?: string } })?.data
                              ?.message ?? "Không thể xoá phân bổ",
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>
                    {item.startDate} → {item.endDate} ({item.months.toFixed(1)}{" "}
                    tháng)
                  </span>
                  <span className="text-cyan-400 font-medium">
                    {formatVnd(item.estimatedCost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {showResourceForm && (
            <div className="space-y-2 pt-2 border-t border-cyan-500/20">
              {resourceRates.length === 0 ? (
                <p className="text-[10px] text-yellow-400">
                  Hãy khai báo đơn giá tại trang Cài đặt trước.
                </p>
              ) : (
                <>
                  <Select
                    value={resourceRateId}
                    onValueChange={(value) =>
                      setResourceRateId(value as Id<"internal_resource_rates">)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-input">
                      <SelectValue placeholder="Chọn vai trò/đơn giá" />
                    </SelectTrigger>
                    <SelectContent>
                      {resourceRates.map((rate) => (
                        <SelectItem key={rate._id} value={rate._id}>
                          {rate.name} — {formatVnd(rate.monthlyRate)}/tháng
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Số người</Label>
                      <Input
                        type="number"
                        min={1}
                        value={headcount}
                        onChange={(e) => setHeadcount(Number(e.target.value))}
                        className="h-8 text-xs bg-input"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Phân bổ (%)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={allocationPercent}
                        onChange={(e) =>
                          setAllocationPercent(Number(e.target.value))
                        }
                        className="h-8 text-xs bg-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Bắt đầu</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 text-xs bg-input"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Kết thúc</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-xs bg-input"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 w-full"
                    onClick={addAllocation}
                  >
                    Thêm và tính ngân sách
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-[11px]">
          {system.owner && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("detail.owner")}</span>
              <span className="font-medium">{system.owner}</span>
            </div>
          )}
          {system.technology && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("detail.technology")}
              </span>
              <span className="font-medium">{system.technology}</span>
            </div>
          )}
          {system.database && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("detail.database")}
              </span>
              <span className="font-medium">{system.database}</span>
            </div>
          )}
          {system.sla && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Shield className="h-2.5 w-2.5" />
                {t("detail.sla")}
              </span>
              <span className="font-medium">{system.sla}</span>
            </div>
          )}
          {system.licenseType && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("detail.license")}
              </span>
              <span className="font-medium">{system.licenseType}</span>
            </div>
          )}
          {system.costPerYear !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-2.5 w-2.5" />
                {t("detail.annualCost")}
              </span>
              <span className="font-medium text-green-400">
                {formatVnd(system.costPerYear)}
              </span>
            </div>
          )}
          {system.contractEndDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-2.5 w-2.5" />
                {t("detail.contractEnd")}
              </span>
              <span
                className={cn(
                  "font-medium",
                  new Date(system.contractEndDate) <
                    new Date(Date.now() + 90 * 86400e3)
                    ? "text-red-400"
                    : "text-foreground",
                )}
              >
                {system.contractEndDate}
              </span>
            </div>
          )}
          {system.departments.length > 0 && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">
                {t("detail.departments")}
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {system.departments.map((d) => (
                  <span
                    key={d}
                    className="text-[9px] bg-muted px-1.5 py-0.5 rounded"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {system.campuses.length > 0 && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">
                {t("detail.campuses")}
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {system.campuses.map((c) => (
                  <span
                    key={c}
                    className="text-[9px] bg-muted px-1.5 py-0.5 rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {system.description && (
            <p className="text-muted-foreground leading-relaxed pt-1">
              {system.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Activity log ────────────────────────────────────────────────────────────────
const actionConfig: Record<
  string,
  { key: string; color: string; icon: React.ElementType }
> = {
  created: { key: "action.created", color: "#22c55e", icon: PlusCircle },
  updated: { key: "action.updated", color: "#3b82f6", icon: Pencil },
  deleted: { key: "action.deleted", color: "#ef4444", icon: Trash2 },
  feature_created: {
    key: "action.featureCreated",
    color: "#22c55e",
    icon: PlusCircle,
  },
  feature_updated: {
    key: "action.featureUpdated",
    color: "#8b5cf6",
    icon: Pencil,
  },
  feature_deleted: {
    key: "action.featureDeleted",
    color: "#ef4444",
    icon: Trash2,
  },
};

function ActivityLogDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const logs =
    useQuery(api.system_change_logs.list, open ? { limit: 200 } : "skip") ?? [];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t("systems.activityLogTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto space-y-2 pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {t("systems.noLogs")}
            </div>
          ) : (
            logs.map((log) => {
              const cfg = actionConfig[log.action];
              const Icon = cfg.icon;
              return (
                <div
                  key={log._id}
                  className="rounded-lg border border-border p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: cfg.color }}
                      />
                      <span className="font-semibold truncate">
                        {log.systemName}
                      </span>
                      <Badge
                        className="text-[9px]"
                        style={{
                          background: `${cfg.color}22`,
                          color: cfg.color,
                          borderColor: `${cfg.color}55`,
                        }}
                      >
                        {t(cfg.key)}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log._creationTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {t("systems.by")}{" "}
                    {log.actorName ?? log.actorEmail ?? t("detail.unknown")}
                  </div>
                  {log.changes && log.changes.length > 0 && (
                    <div className="space-y-0.5 pt-1 border-t border-border/50">
                      {log.changes.map((c, idx) => (
                        <div key={idx} className="flex flex-wrap gap-1">
                          <span className="font-medium text-foreground/80">
                            {c.field}:
                          </span>
                          <span className="text-red-400/80 line-through">
                            {c.from ?? "—"}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-green-400">{c.to ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form types ─────────────────────────────────────────────────────────────────
type SystemType = "core" | "supporting" | "legacy" | "pilot";
type SystemStatus = "active" | "sunset" | "pilot" | "inactive";
type CriticalityLevel = "high" | "medium" | "low";

type SystemFormData = {
  name: string;
  type: SystemType;
  category: string;
  status: SystemStatus;
  criticality: CriticalityLevel;
  owner: string;
  vendorId: Id<"vendors"> | undefined;
  departments: string[];
  campuses: string[];
  technology: string;
  database: string;
  hosting: string;
  sla: string;
  licenseType: string;
  costPerYear: number | undefined;
  contractEndDate: string;
  riskLevel: CriticalityLevel;
  technicalDebtScore: number;
  architectureScore: number;
  description: string;
};

const defaultForm: SystemFormData = {
  name: "",
  type: "core",
  category: "",
  status: "active",
  criticality: "medium",
  owner: "",
  vendorId: undefined,
  departments: [],
  campuses: [],
  technology: "",
  database: "",
  hosting: "",
  sla: "",
  licenseType: "",
  costPerYear: undefined,
  contractEndDate: "",
  riskLevel: "low",
  technicalDebtScore: 0,
  architectureScore: 80,
  description: "",
};

// ─── Form ──────────────────────────────────────────────────────────────────────
function SystemForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<SystemFormData> & { _id?: Id<"software_systems"> };
  onSave: (data: SystemFormData) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const config = useQuery(api.config.listAll);
  const categories = config?.category.map((c) => c.name) ?? [];
  const departments = config?.department.map((d) => d.name) ?? [];
  const campuses = config?.campus.map((c) => c.name) ?? [];

  const [form, setForm] = useState<SystemFormData>(() => {
    const src = (initial ?? {}) as Record<string, unknown>;
    return Object.keys(defaultForm).reduce<SystemFormData>(
      (acc, k) => ({
        ...acc,
        [k]: k in src ? src[k] : defaultForm[k as keyof SystemFormData],
      }),
      { ...defaultForm },
    );
  });
  const [saving, setSaving] = useState(false);
  const vendors = useQuery(api.vendors.list) ?? [];

  const set = <K extends keyof SystemFormData>(k: K, v: SystemFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleArray = (key: "departments" | "campuses", val: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val)
        ? f[key].filter((x) => x !== val)
        : [...f[key], val],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t("common.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          (err instanceof Error ? err.message : t("common.saveFailed")),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>{t("systems.form.name")}</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("systems.form.namePlaceholder")}
            className="bg-input"
          />
        </div>
        {(
          [
            [
              t("systems.form.type"),
              "type",
              [
                ["core", t("systemType.core")],
                ["supporting", t("systemType.supporting")],
                ["legacy", t("systemType.legacy")],
                ["pilot", t("systemType.pilot")],
              ],
            ],
            [
              t("systems.form.category"),
              "category",
              categories.map((c) => [c, c]),
            ],
            [
              t("systems.form.status"),
              "status",
              [
                ["active", t("status.active")],
                ["pilot", t("status.pilot")],
                ["sunset", t("status.sunset")],
                ["inactive", t("status.inactive")],
              ],
            ],
            [
              t("systems.form.criticality"),
              "criticality",
              [
                ["high", t("level.high")],
                ["medium", t("level.medium")],
                ["low", t("level.low")],
              ],
            ],
          ] as [string, keyof SystemFormData, [string, string][]][]
        ).map(([label, key, opts]) => (
          <div key={label} className="space-y-1">
            <Label>{label}</Label>
            <Select
              value={form[key] as string}
              onValueChange={(v) => set(key, v as SystemFormData[typeof key])}
            >
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opts.map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <div className="space-y-1">
          <Label>{t("systems.form.owner")}</Label>
          <Input
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
            placeholder={t("systems.form.ownerPlaceholder")}
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("systems.form.vendor")}</Label>
          <Select
            value={form.vendorId ?? "none"}
            onValueChange={(v) =>
              set("vendorId", v === "none" ? undefined : (v as Id<"vendors">))
            }
          >
            <SelectTrigger className="bg-input">
              <SelectValue placeholder={t("common.noneInternal")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("common.noneInternal")}</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v._id} value={v._id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(
          [
            [
              t("systems.form.technology"),
              "technology",
              t("systems.form.technologyPlaceholder"),
            ],
            [
              t("systems.form.database"),
              "database",
              t("systems.form.databasePlaceholder"),
            ],
            [
              t("systems.form.hosting"),
              "hosting",
              t("systems.form.hostingPlaceholder"),
            ],
            [t("systems.form.sla"), "sla", t("systems.form.slaPlaceholder")],
            [
              t("systems.form.licenseType"),
              "licenseType",
              t("systems.form.licenseTypePlaceholder"),
            ],
          ] as [string, keyof SystemFormData, string][]
        ).map(([label, key, ph]) => (
          <div key={label} className="space-y-1">
            <Label>{label}</Label>
            <Input
              value={form[key] as string}
              onChange={(e) =>
                set(key, e.target.value as SystemFormData[typeof key])
              }
              placeholder={ph}
              className="bg-input"
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label>{t("systems.form.costPerYear")}</Label>
          <Input
            type="number"
            value={form.costPerYear ?? ""}
            onChange={(e) =>
              set(
                "costPerYear",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="0"
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("systems.form.contractEndDate")}</Label>
          <Input
            type="date"
            value={form.contractEndDate}
            onChange={(e) => set("contractEndDate", e.target.value)}
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("systems.form.riskLevel")}</Label>
          <Select
            value={form.riskLevel}
            onValueChange={(v) => set("riskLevel", v as CriticalityLevel)}
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">{t("level.high")}</SelectItem>
              <SelectItem value="medium">{t("level.medium")}</SelectItem>
              <SelectItem value="low">{t("level.low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("systems.form.technicalDebt")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.technicalDebtScore}
            onChange={(e) => set("technicalDebtScore", Number(e.target.value))}
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("systems.form.architectureScore")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.architectureScore}
            onChange={(e) => set("architectureScore", Number(e.target.value))}
            className="bg-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("systems.form.departments")}</Label>
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleArray("departments", d)}
              className={cn(
                "px-2 py-1 rounded text-xs border cursor-pointer transition-colors",
                form.departments.includes(d)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-accent text-muted-foreground border-border hover:border-primary",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("systems.form.campuses")}</Label>
        <div className="flex flex-wrap gap-2">
          {campuses.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleArray("campuses", c)}
              className={cn(
                "px-2 py-1 rounded text-xs border cursor-pointer transition-colors",
                form.campuses.includes(c)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-accent text-muted-foreground border-border hover:border-primary",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label>{t("systems.form.description")}</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("systems.form.descriptionPlaceholder")}
          className="bg-input"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card pb-1">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("systems.form.saveSystem")}
        </Button>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────────
function SystemsContent() {
  const { t } = useLanguage();
  const { canWrite } = useCurrentUser();
  const rawSystems = useQuery(api.software_systems.list);
  const rawVendors = useQuery(api.vendors.list);
  const isLoading = rawSystems === undefined || rawVendors === undefined;
  const systems = useMemo(() => rawSystems ?? [], [rawSystems]);
  const vendors = useMemo(() => rawVendors ?? [], [rawVendors]);
  const createSystem = useMutation(api.software_systems.create);
  const updateSystem = useMutation(api.software_systems.update);
  const removeSystem = useMutation(api.software_systems.remove);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterCritical, setFilterCritical] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SoftwareSystem | null>(null);
  const [selectedId, setSelectedId] = useState<Id<"software_systems"> | null>(
    null,
  );
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  // Dashboard stats
  const now = useMemo(() => Date.now(), []);
  const stats = useMemo(
    () => ({
      total: systems.length,
      critical: systems.filter((s) => s.criticality === "high").length,
      legacy: systems.filter((s) => s.type === "legacy").length,
      noOwner: systems.filter((s) => !s.owner).length,
      expiring: systems.filter(
        (s) =>
          s.contractEndDate &&
          new Date(s.contractEndDate).getTime() - now < 90 * 86400e3 &&
          new Date(s.contractEndDate).getTime() > now,
      ).length,
      highDebt: systems.filter((s) => s.technicalDebtScore > 60).length,
    }),
    [systems, now],
  );

  const vendorMap = useMemo(() => {
    const m: Record<string, string> = {};
    vendors.forEach((v) => {
      m[v._id] = v.name;
    });
    return m;
  }, [vendors]);

  const filtered = useMemo(() => {
    return systems.filter((s) => {
      if (
        search &&
        !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.category.toLowerCase().includes(search.toLowerCase()) &&
        !s.departments.some((department) =>
          department.toLowerCase().includes(search.toLowerCase()),
        )
      )
        return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterType !== "all" && s.type !== filterType) return false;
      if (filterRisk !== "all" && s.riskLevel !== filterRisk) return false;
      if (filterCritical !== "all" && s.criticality !== filterCritical)
        return false;
      if (statFilter === "critical" && s.criticality !== "high") return false;
      if (statFilter === "legacy" && s.type !== "legacy") return false;
      if (statFilter === "noOwner" && s.owner) return false;
      if (
        statFilter === "expiring" &&
        !(
          s.contractEndDate &&
          new Date(s.contractEndDate).getTime() - now < 90 * 86400e3 &&
          new Date(s.contractEndDate).getTime() > now
        )
      )
        return false;
      if (statFilter === "highDebt" && s.technicalDebtScore <= 60) return false;
      return true;
    });
  }, [
    systems,
    search,
    filterStatus,
    filterType,
    filterRisk,
    filterCritical,
    statFilter,
    now,
  ]);

  const selectedSystem = useMemo(
    () => systems.find((s) => s._id === selectedId) ?? null,
    [systems, selectedId],
  );

  const handleCreate = async (data: SystemFormData) => {
    await createSystem(data);
    toast.success(t("systems.toast.added"));
  };

  const handleUpdate = async (data: SystemFormData) => {
    if (!editing) return;
    await updateSystem({ id: editing._id, ...data });
    toast.success(t("systems.toast.updated"));
    setEditing(null);
  };

  const handleDelete = async (id: Id<"software_systems">) => {
    if (selectedId === id) setSelectedId(null);
    await removeSystem({ id });
    toast.success(t("systems.toast.removed"));
  };

  const toggleStat = (key: string) =>
    setStatFilter((prev) => (prev === key ? null : key));

  const hasFilters =
    filterStatus !== "all" ||
    filterType !== "all" ||
    filterRisk !== "all" ||
    filterCritical !== "all" ||
    !!search ||
    !!statFilter;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Server className="h-6 w-6 text-primary" />
                  {t("systems.title")}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {systems.length} {t("systems.subtitleSuffix")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowLog(true)}
                >
                  <History className="h-4 w-4" />
                  {t("systems.activityLog")}
                </Button>
                {canWrite && (
                  <Button
                    onClick={() => setShowForm(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("systems.addSystem")}
                  </Button>
                )}
              </div>
            </div>

            {/* Stat cards */}
            <div className="flex flex-wrap gap-3">
              <StatCard
                icon={Server}
                label={t("systems.stat.total")}
                value={stats.total}
                sub={t("systems.stat.totalSub")}
                color="#6366f1"
                onClick={() => toggleStat("all")}
                active={statFilter === null}
              />
              <StatCard
                icon={AlertTriangle}
                label={t("systems.stat.critical")}
                value={stats.critical}
                sub={t("systems.stat.criticalSub")}
                color="#ef4444"
                onClick={() => toggleStat("critical")}
                active={statFilter === "critical"}
              />
              <StatCard
                icon={Archive}
                label={t("systems.stat.legacy")}
                value={stats.legacy}
                sub={t("systems.stat.legacySub")}
                color="#f59e0b"
                onClick={() => toggleStat("legacy")}
                active={statFilter === "legacy"}
              />
              <StatCard
                icon={UserX}
                label={t("systems.stat.noOwner")}
                value={stats.noOwner}
                sub={t("systems.stat.noOwnerSub")}
                color="#f97316"
                onClick={() => toggleStat("noOwner")}
                active={statFilter === "noOwner"}
              />
              <StatCard
                icon={CalendarClock}
                label={t("systems.stat.expiring")}
                value={stats.expiring}
                sub={t("systems.stat.expiringSub")}
                color="#e879f9"
                onClick={() => toggleStat("expiring")}
                active={statFilter === "expiring"}
              />
              <StatCard
                icon={TrendingDown}
                label={t("systems.stat.highDebt")}
                value={stats.highDebt}
                sub={t("systems.stat.highDebtSub")}
                color="#94a3b8"
                onClick={() => toggleStat("highDebt")}
                active={statFilter === "highDebt"}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("systems.searchPlaceholder")}
                  className="pl-9 bg-input h-9"
                />
              </div>
              {(
                [
                  [
                    "filterStatus",
                    filterStatus,
                    setFilterStatus,
                    t("status.allStatus"),
                    [
                      ["all", t("status.allStatus")],
                      ["active", t("status.active")],
                      ["pilot", t("status.pilot")],
                      ["sunset", t("status.sunset")],
                      ["inactive", t("status.inactive")],
                    ],
                  ],
                  [
                    "filterType",
                    filterType,
                    setFilterType,
                    t("systemType.allTypes"),
                    [
                      ["all", t("systemType.allTypes")],
                      ["core", t("systemType.core")],
                      ["supporting", t("systemType.supporting")],
                      ["legacy", t("systemType.legacy")],
                      ["pilot", t("systemType.pilot")],
                    ],
                  ],
                  [
                    "filterRisk",
                    filterRisk,
                    setFilterRisk,
                    t("level.allRisk"),
                    [
                      ["all", t("level.allRisk")],
                      ["high", t("systems.badge.highRisk")],
                      ["medium", t("level.medium")],
                      ["low", t("level.low")],
                    ],
                  ],
                  [
                    "filterCritical",
                    filterCritical,
                    setFilterCritical,
                    t("level.allCriticality"),
                    [
                      ["all", t("level.allCriticality")],
                      ["high", t("systems.badge.critical")],
                      ["medium", t("level.medium")],
                      ["low", t("level.low")],
                    ],
                  ],
                ] as [
                  string,
                  string,
                  (v: string) => void,
                  string,
                  [string, string][],
                ][]
              ).map(([id, val, setVal, placeholder, opts]) => (
                <Select key={id} value={val} onValueChange={setVal}>
                  <SelectTrigger className="w-36 bg-input h-9 text-xs">
                    <Filter className="h-3 w-3 mr-1 opacity-50 shrink-0" />
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground gap-1 cursor-pointer"
                  onClick={() => {
                    setSearch("");
                    setFilterStatus("all");
                    setFilterType("all");
                    setFilterRisk("all");
                    setFilterCritical("all");
                    setStatFilter(null);
                  }}
                >
                  <X className="h-3 w-3" />
                  {t("common.clear")}
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filtered.length} {t("common.results")}
              </span>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <Server className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">{t("systems.noSystemsFound")}</p>
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(true)}
                    className="mt-2 cursor-pointer"
                  >
                    {t("systems.addFirstSystem")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {[
                        t("systems.col.system"),
                        t("systems.col.typeCategory"),
                        t("systems.col.governingDepartment"),
                        t("systems.col.vendor"),
                        t("systems.col.risk"),
                        t("systems.col.scores"),
                        t("systems.col.contract"),
                        t("systems.col.actions"),
                      ].map((h, i) => (
                        <th
                          key={h}
                          className={cn(
                            "text-left p-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                            i >= 2 && i <= 3
                              ? "hidden md:table-cell"
                              : i === 6
                                ? "hidden lg:table-cell"
                                : i === 5
                                  ? "hidden sm:table-cell"
                                  : "",
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const isSelected = selectedId === s._id;
                      return (
                        <tr
                          key={s._id}
                          onClick={() =>
                            setSelectedId(isSelected ? null : s._id)
                          }
                          className={cn(
                            "border-b border-border/50 transition-colors cursor-pointer",
                            isSelected ? "bg-primary/10" : "hover:bg-accent/40",
                          )}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <StatusDot status={s.status} />
                              <div>
                                <div className="font-semibold text-sm flex items-center gap-1.5">
                                  {s.name}
                                  {isSelected && (
                                    <ChevronRight className="h-3 w-3 text-primary" />
                                  )}
                                </div>
                                <div className="mt-0.5">
                                  <CriticalityBadge level={s.criticality} />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <TypeBadge type={s.type} />
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {s.category}
                            </div>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {s.departments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {s.departments.slice(0, 2).map((department) => (
                                  <span
                                    key={department}
                                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground"
                                  >
                                    {department}
                                  </span>
                                ))}
                                {s.departments.length > 2 && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    +{s.departments.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-yellow-400 flex items-center gap-1">
                                <UserX className="h-3 w-3" />
                                {t("common.unassigned")}
                              </span>
                            )}
                          </td>
                          <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                            {s.vendorId ? (
                              (vendorMap[s.vendorId] ?? "—")
                            ) : (
                              <span className="text-blue-400">
                                {t("common.internal")}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <RiskBadge level={s.riskLevel} />
                          </td>
                          <td className="p-3 hidden sm:table-cell space-y-1">
                            <ScoreBar value={s.architectureScore} />
                            <ScoreBar value={s.technicalDebtScore} invert />
                          </td>
                          <td className="p-3 hidden lg:table-cell">
                            {s.contractEndDate ? (
                              <span
                                className={cn(
                                  "text-[10px] flex items-center gap-1",
                                  new Date(s.contractEndDate).getTime() - now <
                                    90 * 86400e3
                                    ? "text-red-400 font-semibold"
                                    : "text-muted-foreground",
                                )}
                              >
                                {new Date(s.contractEndDate).getTime() - now <
                                  90 * 86400e3 && (
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                )}
                                {s.contractEndDate}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {canWrite && (
                              <div
                                className="flex items-center justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 cursor-pointer"
                                  onClick={() => setEditing(s)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(s._id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side panel */}
      {selectedSystem && (
        <SystemDetailPanel
          system={selectedSystem}
          onClose={() => setSelectedId(null)}
          onEdit={(s) => {
            setEditing(s);
            setSelectedId(null);
          }}
          canWrite={canWrite}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("systems.addNewSystem")}</DialogTitle>
          </DialogHeader>
          <SystemForm
            onSave={handleCreate}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("systems.editSystem")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <SystemForm
              initial={editing}
              onSave={handleUpdate}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ActivityLogDialog open={showLog} onClose={() => setShowLog(false)} />
    </div>
  );
}

export default function SystemsPage() {
  return <SystemsContent />;
}
