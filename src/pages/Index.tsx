import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Server,
  GitBranch,
  Building2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language.tsx";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: {
  title: string;
  value: number | string | undefined;
  icon: React.ElementType;
  description?: string;
  variant?: "default" | "warning" | "danger" | "success";
}) {
  const colors = {
    default: "text-foreground",
    warning: "text-yellow-600",
    danger: "text-red-600",
    success: "text-green-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${colors[variant]}`} />
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-2xl font-bold ${colors[variant]}`}>{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Index() {
  const { isBusinessOwner } = useCurrentUser();
  const { t } = useLanguage();

  const systemStats = useQuery(api.software_systems.getStats);
  const integrationStats = useQuery(
    api.integrations.getStats,
    isBusinessOwner ? "skip" : {},
  );
  const roadmapStats = useQuery(api.roadmap.getStats);
  const vendors = useQuery(api.vendors.list);

  const highRiskVendors = vendors?.filter((v) => v.riskScore >= 70).length;
  const projectProgress =
    roadmapStats?.completionRate !== undefined
      ? roadmapStats.completionRate
      : undefined;
  const progressStatus =
    roadmapStats?.blocked || roadmapStats?.overdue
      ? "danger"
      : projectProgress !== undefined && projectProgress >= 70
        ? "success"
        : projectProgress !== undefined && projectProgress >= 35
          ? "warning"
          : "default";
  const progressStatusLabel =
    progressStatus === "danger"
      ? t("dashboard.atRisk")
      : progressStatus === "success"
        ? t("dashboard.onTrack")
        : t("dashboard.needsAttention");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {t("dashboard.projectProgress")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dashboard.projectProgressSubtitle")}
              </p>
            </div>
            {projectProgress === undefined ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <Badge
                variant={
                  progressStatus === "danger" ? "destructive" : "secondary"
                }
                className="shrink-0"
              >
                {progressStatusLabel}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectProgress === undefined ? (
            <>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-full" />
            </>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-bold">{projectProgress}%</div>
                  <div className="text-xs text-muted-foreground">
                    {t("dashboard.overallCompletion")}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-right text-xs">
                  <div>
                    <div className="font-semibold text-green-600">
                      {roadmapStats?.done ?? 0}
                    </div>
                    <div className="text-muted-foreground">
                      {t("dashboard.doneItems")}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-red-600">
                      {roadmapStats?.blocked ?? 0}
                    </div>
                    <div className="text-muted-foreground">
                      {t("dashboard.blockedItems")}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-yellow-600">
                      {roadmapStats?.overdue ?? 0}
                    </div>
                    <div className="text-muted-foreground">
                      {t("dashboard.overdueItems")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${projectProgress}%`,
                    background:
                      progressStatus === "danger"
                        ? "#ef4444"
                        : progressStatus === "success"
                          ? "#22c55e"
                          : "#f59e0b",
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboard.systems")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title={t("dashboard.totalSystems")}
            value={systemStats?.total}
            icon={Server}
          />
          <StatCard
            title={t("dashboard.active")}
            value={systemStats?.active}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title={t("dashboard.highRisk")}
            value={systemStats?.highRisk}
            icon={ShieldAlert}
            variant="danger"
          />
          <StatCard
            title={t("dashboard.legacy")}
            value={systemStats?.legacy}
            icon={Clock}
            variant="warning"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title={t("dashboard.avgArchitectureScore")}
            value={
              systemStats?.avgArchitectureScore !== undefined
                ? `${systemStats.avgArchitectureScore}%`
                : undefined
            }
            icon={TrendingUp}
            variant={
              systemStats?.avgArchitectureScore !== undefined
                ? systemStats.avgArchitectureScore >= 70
                  ? "success"
                  : systemStats.avgArchitectureScore >= 40
                    ? "warning"
                    : "danger"
                : "default"
            }
          />
          <StatCard
            title={t("dashboard.avgTechnicalDebt")}
            value={
              systemStats?.avgTechnicalDebt !== undefined
                ? `${systemStats.avgTechnicalDebt}%`
                : undefined
            }
            icon={AlertTriangle}
            variant={
              systemStats?.avgTechnicalDebt !== undefined
                ? systemStats.avgTechnicalDebt <= 30
                  ? "success"
                  : systemStats.avgTechnicalDebt <= 60
                    ? "warning"
                    : "danger"
                : "default"
            }
          />
          <StatCard
            title={t("dashboard.expiringContracts")}
            value={systemStats?.expiringContracts}
            icon={Clock}
            description={t("dashboard.within30Days")}
            variant={systemStats?.expiringContracts ? "warning" : "default"}
          />
        </div>
      </div>

      {!isBusinessOwner && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("dashboard.integrations")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title={t("dashboard.total")}
              value={integrationStats?.total}
              icon={GitBranch}
            />
            <StatCard
              title={t("dashboard.healthy")}
              value={integrationStats?.healthy}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              title={t("dashboard.degraded")}
              value={integrationStats?.degraded}
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              title={t("dashboard.down")}
              value={integrationStats?.down}
              icon={ShieldAlert}
              variant="danger"
            />
          </div>
          {integrationStats?.nonCompliant !== undefined &&
            integrationStats.nonCompliant > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  {integrationStats.nonCompliant}{" "}
                  {t("dashboard.nonCompliantIntegrations")}
                </span>
              </div>
            )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("dashboard.roadmap")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title={t("dashboard.inProgress")}
              value={roadmapStats?.inProgress}
              icon={TrendingUp}
            />
            <StatCard
              title={t("dashboard.blocked")}
              value={roadmapStats?.blocked}
              icon={AlertTriangle}
              variant="danger"
            />
            <StatCard
              title={t("dashboard.completionRate")}
              value={
                roadmapStats?.completionRate !== undefined
                  ? `${roadmapStats.completionRate}%`
                  : undefined
              }
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              title={t("dashboard.overdue")}
              value={roadmapStats?.overdue}
              icon={Clock}
              variant={roadmapStats?.overdue ? "warning" : "default"}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("dashboard.vendors")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title={t("dashboard.totalVendors")}
              value={vendors?.length}
              icon={Building2}
            />
            <StatCard
              title={t("dashboard.highRisk")}
              value={highRiskVendors}
              icon={ShieldAlert}
              variant={highRiskVendors ? "danger" : "default"}
              description={t("dashboard.riskScoreAtLeast70")}
            />
          </div>
          {vendors === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.noVendors")}
            </p>
          ) : (
            <div className="space-y-2">
              {vendors.slice(0, 5).map((v) => (
                <div
                  key={v._id}
                  className="flex items-center justify-between p-2 rounded-md border border-border text-sm"
                >
                  <span className="font-medium truncate">{v.name}</span>
                  <Badge
                    variant={
                      v.riskScore >= 70
                        ? "destructive"
                        : v.riskScore >= 40
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs shrink-0"
                  >
                    {t("dashboard.risk")} {v.riskScore}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
