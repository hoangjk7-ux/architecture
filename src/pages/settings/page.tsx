import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import {
  Settings,
  Tag,
  Building2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  UsersRound,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useLanguage } from "@/components/providers/language.tsx";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";

type ConfigItem = Doc<"config_items">;
type ConfigType = "category" | "department" | "campus";

function ResourceRateCard({ canWrite }: { canWrite: boolean }) {
  const rates = useQuery(api.internal_resources.listRates) ?? [];
  const createRate = useMutation(api.internal_resources.createRate);
  const updateRate = useMutation(api.internal_resources.updateRate);
  const [name, setName] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [editingId, setEditingId] =
    useState<Id<"internal_resource_rates"> | null>(null);
  const availableRoles = ["BA", "Dev"].filter(
    (role) => !rates.some((rate) => rate.name === role),
  );

  const save = async () => {
    if (!name.trim() || !monthlyRate || Number(monthlyRate) < 0) return;
    try {
      if (editingId)
        await updateRate({
          id: editingId,
          name,
          monthlyRate: Number(monthlyRate),
        });
      else await createRate({ name, monthlyRate: Number(monthlyRate) });
      setName("");
      setMonthlyRate("");
      setEditingId(null);
      toast.success(editingId ? "Đã cập nhật đơn giá" : "Đã thêm đơn giá");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Không thể lưu đơn giá",
      );
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden md:col-span-3">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
        <div className="p-2 rounded-lg bg-muted text-cyan-400">
          <UsersRound className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Đơn giá nguồn lực nội bộ</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chi phí chuẩn theo tháng, dùng để lập ngân sách triển khai phần mềm
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {rates.length}
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {rates.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Chưa khai báo đơn giá nguồn lực
          </div>
        )}
        {rates.map((rate) => (
          <div
            key={rate._id}
            className="flex items-center gap-3 px-4 py-2.5 group"
          >
            <span className="flex-1 text-sm font-medium">{rate.name}</span>
            <span className="text-sm text-cyan-400">
              {rate.monthlyRate.toLocaleString("vi-VN")} ₫/người/tháng
            </span>
            {canWrite && (
              <div className="flex gap-1">
                <button
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => {
                    setEditingId(rate._id);
                    setName(rate.name);
                    setMonthlyRate(String(rate.monthlyRate));
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {canWrite && (editingId || availableRoles.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 p-3 border-t border-border bg-muted/10">
          <Select value={name} onValueChange={setName} disabled={!!editingId}>
            <SelectTrigger className="h-8 text-xs bg-input">
              <SelectValue placeholder="Chọn BA hoặc Dev" />
            </SelectTrigger>
            <SelectContent>
              {(editingId ? [name] : availableRoles).map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            value={monthlyRate}
            onChange={(e) => setMonthlyRate(e.target.value)}
            placeholder="Đơn giá/người/tháng (₫)"
            className="h-8 text-xs bg-input"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8"
              disabled={!name.trim() || !monthlyRate}
              onClick={save}
            >
              {editingId ? "Cập nhật" : "Thêm đơn giá"}
            </Button>
            {editingId && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setEditingId(null);
                  setName("");
                  setMonthlyRate("");
                }}
              >
                Huỷ
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CARD_CONFIG: Record<
  ConfigType,
  {
    labelKey: string;
    icon: React.ElementType;
    color: string;
    placeholderKey: string;
    descriptionKey: string;
  }
> = {
  category: {
    labelKey: "settings.category",
    icon: Tag,
    color: "text-indigo-400",
    placeholderKey: "settings.categoryPlaceholder",
    descriptionKey: "settings.categoryDesc",
  },
  department: {
    labelKey: "settings.department",
    icon: Building2,
    color: "text-blue-400",
    placeholderKey: "settings.departmentPlaceholder",
    descriptionKey: "settings.departmentDesc",
  },
  campus: {
    labelKey: "settings.campus",
    icon: MapPin,
    color: "text-green-400",
    placeholderKey: "settings.campusPlaceholder",
    descriptionKey: "settings.campusDesc",
  },
};

function ConfigCard({
  type,
  items,
  canWrite,
}: {
  type: ConfigType;
  items: ConfigItem[];
  canWrite: boolean;
}) {
  const { t } = useLanguage();
  const addItem = useMutation(api.config.add);
  const updateItem = useMutation(api.config.update);
  const removeItem = useMutation(api.config.remove);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"config_items"> | null>(null);
  const [editName, setEditName] = useState("");

  const cfg = CARD_CONFIG[type];
  const Icon = cfg.icon;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await addItem({ type, name: newName.trim() });
      setNewName("");
      toast.success(`${t("settings.add")} ${t(cfg.labelKey).toLowerCase()}`);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          t("settings.toast.addFailed"),
      );
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: Id<"config_items">) => {
    if (!editName.trim()) return;
    try {
      await updateItem({ id, name: editName.trim() });
      setEditingId(null);
      toast.success(t("settings.toast.updated"));
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          t("settings.toast.updateFailed"),
      );
    }
  };

  const handleRemove = async (id: Id<"config_items">, name: string) => {
    try {
      await removeItem({ id });
      toast.success(`Đã xoá "${name}"`);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          t("settings.toast.removeFailed"),
      );
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
        <div className={`p-2 rounded-lg bg-muted ${cfg.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{t(cfg.labelKey)}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(cfg.descriptionKey)}
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {items.length}
        </span>
      </div>

      {/* Items list */}
      <div
        className="flex-1 overflow-y-auto divide-y divide-border/50"
        style={{ maxHeight: 280 }}
      >
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {t("settings.noData")}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item._id}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-accent/30 group"
            >
              {editingId === item._id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit(item._id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-7 text-xs flex-1 bg-input"
                    autoFocus
                  />
                  <button
                    onClick={() => handleEdit(item._id)}
                    className="p-1 rounded hover:bg-green-500/20 text-green-400 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{item.name}</span>
                  {canWrite && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(item._id);
                          setEditName(item.name);
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRemove(item._id, item.name)}
                        className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new */}
      {canWrite && (
        <div className="flex gap-2 p-3 border-t border-border bg-muted/10">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={t(cfg.placeholderKey)}
            className="h-8 text-xs flex-1 bg-input"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="gap-1 h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("settings.add")}
          </Button>
        </div>
      )}
    </div>
  );
}

function SettingsContent() {
  const { canWrite } = useCurrentUser();
  const { t } = useLanguage();
  const config = useQuery(api.config.listAll);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t("settings.subtitle")}
        </p>
      </div>

      {config === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(["category", "department", "campus"] as ConfigType[]).map(
            (type) => (
              <ConfigCard
                key={type}
                type={type}
                items={config[type]}
                canWrite={canWrite}
              />
            ),
          )}
          <ResourceRateCard canWrite={canWrite} />
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
