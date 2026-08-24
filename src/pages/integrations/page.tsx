import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
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
  GitBranch,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useLanguage } from "@/components/providers/language.tsx";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type HealthStatus = "healthy" | "degraded" | "down" | "unknown";
type IntegrationProtocol =
  | "REST"
  | "GraphQL"
  | "SOAP"
  | "Webhook"
  | "DB"
  | "ETL"
  | "Queue"
  | "Other";
type IntegrationMethod = "realtime" | "batch" | "event_driven" | "manual";
type IntegrationCritical = "high" | "medium" | "low";

const healthConfig: Record<
  HealthStatus,
  { color: string; dot: string; key: string }
> = {
  healthy: {
    color: "text-green-400",
    dot: "bg-green-400",
    key: "health.healthy",
  },
  degraded: {
    color: "text-yellow-400",
    dot: "bg-yellow-400",
    key: "health.degraded",
  },
  down: { color: "text-red-400", dot: "bg-red-400", key: "health.down" },
  unknown: {
    color: "text-gray-400",
    dot: "bg-gray-400",
    key: "health.unknown",
  },
};

type IntegrationFormData = {
  name: string;
  sourceSystemId: Id<"software_systems">;
  destinationSystemId: Id<"software_systems">;
  protocol: IntegrationProtocol;
  method: IntegrationMethod;
  healthStatus: HealthStatus;
  criticalLevel: IntegrationCritical;
  owner: string;
  errorRate: number | undefined;
  lastSync: string;
  description: string;
  isArchitectureCompliant: boolean;
};

const defaultForm: IntegrationFormData = {
  name: "",
  sourceSystemId: "" as Id<"software_systems">,
  destinationSystemId: "" as Id<"software_systems">,
  protocol: "REST",
  method: "realtime",
  healthStatus: "healthy",
  criticalLevel: "medium",
  owner: "",
  errorRate: undefined,
  lastSync: "",
  description: "",
  isArchitectureCompliant: true,
};

function IntegrationForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<IntegrationFormData> & { _id?: Id<"integrations"> };
  onSave: (data: IntegrationFormData) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<IntegrationFormData>(() => {
    const src = (initial ?? {}) as Record<string, unknown>;
    return Object.keys(defaultForm).reduce<IntegrationFormData>(
      (acc, k) => ({
        ...acc,
        [k]: k in src ? src[k] : defaultForm[k as keyof IntegrationFormData],
      }),
      { ...defaultForm },
    );
  });
  const [saving, setSaving] = useState(false);
  const systems = useQuery(api.software_systems.list) ?? [];

  const set = <K extends keyof typeof defaultForm>(
    k: K,
    v: (typeof defaultForm)[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (
      !form.name.trim() ||
      !form.sourceSystemId ||
      !form.destinationSystemId
    ) {
      toast.error(t("integrations.toast.validation"));
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>{t("integrations.form.name")}</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("integrations.form.namePlaceholder")}
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.source")}</Label>
          <Select
            value={form.sourceSystemId}
            onValueChange={(v) =>
              set("sourceSystemId", v as Id<"software_systems">)
            }
          >
            <SelectTrigger className="bg-input">
              <SelectValue placeholder={t("integrations.form.selectSource")} />
            </SelectTrigger>
            <SelectContent>
              {systems.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.destination")}</Label>
          <Select
            value={form.destinationSystemId}
            onValueChange={(v) =>
              set("destinationSystemId", v as Id<"software_systems">)
            }
          >
            <SelectTrigger className="bg-input">
              <SelectValue
                placeholder={t("integrations.form.selectDestination")}
              />
            </SelectTrigger>
            <SelectContent>
              {systems.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.protocol")}</Label>
          <Select
            value={form.protocol}
            onValueChange={(v) => set("protocol", v as typeof form.protocol)}
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "REST",
                "GraphQL",
                "SOAP",
                "Webhook",
                "DB",
                "ETL",
                "Queue",
                "Other",
              ].map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.method")}</Label>
          <Select
            value={form.method}
            onValueChange={(v) => set("method", v as typeof form.method)}
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">{t("method.realtime")}</SelectItem>
              <SelectItem value="batch">{t("method.batch")}</SelectItem>
              <SelectItem value="event_driven">
                {t("method.event_driven")}
              </SelectItem>
              <SelectItem value="manual">{t("method.manual")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.healthStatus")}</Label>
          <Select
            value={form.healthStatus}
            onValueChange={(v) =>
              set("healthStatus", v as typeof form.healthStatus)
            }
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthy">{t("health.healthy")}</SelectItem>
              <SelectItem value="degraded">{t("health.degraded")}</SelectItem>
              <SelectItem value="down">{t("health.down")}</SelectItem>
              <SelectItem value="unknown">{t("health.unknown")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.criticalLevel")}</Label>
          <Select
            value={form.criticalLevel}
            onValueChange={(v) =>
              set("criticalLevel", v as typeof form.criticalLevel)
            }
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
          <Label>{t("integrations.form.owner")}</Label>
          <Input
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
            placeholder={t("integrations.form.ownerPlaceholder")}
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.errorRate")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.errorRate ?? ""}
            onChange={(e) =>
              set(
                "errorRate",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="0"
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("integrations.form.lastSync")}</Label>
          <Input
            type="datetime-local"
            value={form.lastSync}
            onChange={(e) => set("lastSync", e.target.value)}
            className="bg-input"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>{t("integrations.form.architectureCompliant")}</Label>
          <div className="flex gap-3">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => set("isArchitectureCompliant", val)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded border text-sm cursor-pointer transition-colors",
                  form.isArchitectureCompliant === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-accent border-border text-muted-foreground",
                )}
              >
                {val ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {val ? t("integrations.compliant") : t("detail.nonCompliant")}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 space-y-1">
          <Label>{t("integrations.form.description")}</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={t("integrations.form.descriptionPlaceholder")}
            className="bg-input"
            rows={2}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function IntegrationsContent() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canWrite } = useCurrentUser();
  const rawIntegrations = useQuery(api.integrations.list);
  const integrations = useMemo(() => rawIntegrations ?? [], [rawIntegrations]);
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const stats = useQuery(
    api.integrations.getStats,
    !isConvexAuthenticated ? "skip" : undefined,
  );
  const createIntegration = useMutation(api.integrations.create);
  const updateIntegration = useMutation(api.integrations.update);
  const removeIntegration = useMutation(api.integrations.remove);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<(typeof integrations)[0] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    (typeof integrations)[0] | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedId = searchParams.get("selected");

  useEffect(() => {
    if (!canWrite || rawIntegrations === undefined || !selectedId || editing)
      return;
    const match = integrations.find(
      (integration) => integration._id === selectedId,
    );
    if (match) setEditing(match);
  }, [canWrite, editing, integrations, rawIntegrations, selectedId]);

  const closeEditor = () => {
    setEditing(null);
    if (selectedId) {
      const next = new URLSearchParams(searchParams);
      next.delete("selected");
      setSearchParams(next, { replace: true });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await removeIntegration({ id: deleteTarget._id });
      toast.success(t("integrations.toast.removed"));
      setDeleteTarget(null);
    } catch {
      toast.error(t("integrations.toast.removeFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = async (data: IntegrationFormData) => {
    await createIntegration(data);
    toast.success(t("integrations.toast.added"));
  };
  const handleUpdate = async (data: IntegrationFormData) => {
    if (!editing) return;
    await updateIntegration({ id: editing._id, ...data });
    toast.success(t("integrations.toast.updated"));
    closeEditor();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("integrations.title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {integrations.length} {t("integrations.subtitleSuffix")}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("integrations.addIntegration")}
          </Button>
        )}
      </div>

      {/* Health Summary */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["healthy", "degraded", "down"] as const).map((s) => {
            const cfg = healthConfig[s];
            return (
              <div
                key={s}
                className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
              >
                <span className={cn("w-3 h-3 rounded-full", cfg.dot)} />
                <div>
                  <div className="text-lg font-bold">{stats[s]}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(cfg.key)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rawIntegrations === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t("integrations.noIntegrationsTracked")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="text-left p-3 font-medium text-muted-foreground">
                  {t("integrations.col.integration")}
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  {t("integrations.col.sourceDestination")}
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                  {t("integrations.col.protocol")}
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  {t("integrations.col.health")}
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
                  {t("integrations.col.compliance")}
                </th>
                <th className="text-right p-3 font-medium text-muted-foreground">
                  {t("integrations.col.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => {
                const health = healthConfig[i.healthStatus];
                return (
                  <tr
                    key={i._id}
                    className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${
                      selectedId === i._id ? "bg-primary/10" : ""
                    }`}
                  >
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-xs">
                      <span className="text-blue-400">
                        {i.sourceSystem?.name ?? "?"}
                      </span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="text-purple-400">
                        {i.destinationSystem?.name ?? "?"}
                      </span>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="secondary" className="text-[10px]">
                        {i.protocol}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn("w-2 h-2 rounded-full", health.dot)}
                        />
                        <span className={cn("text-xs", health.color)}>
                          {t(health.key)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {i.isArchitectureCompliant ? (
                        <span className="text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t("integrations.compliant")}
                        </span>
                      ) : (
                        <span className="text-red-400 text-xs flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {t("detail.nonCompliant")}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {canWrite && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer"
                            onClick={() => setEditing(i)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                            aria-label={`${t("common.delete")} ${i.name}`}
                            onClick={() => setDeleteTarget(i)}
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("integrations.addIntegration")}</DialogTitle>
          </DialogHeader>
          <IntegrationForm
            onSave={handleCreate}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t("integrations.editIntegration")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <IntegrationForm
              initial={editing}
              onSave={handleUpdate}
              onClose={closeEditor}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("integrations.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("integrations.delete.description").replace(
                "{name}",
                deleteTarget?.name ?? "",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function IntegrationsPage() {
  return <IntegrationsContent />;
}
