import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CircleDollarSign, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { formatVnd } from "@/lib/format.ts";

const categories = {
  server_domain: "Server / Domain",
  cloud_infrastructure: "Cloud / Infrastructure",
  software_license: "Software / License",
  outsource_vendor: "Outsource / Vendor",
  other: "Other",
} as const;
const legacySystemNames = new Set([
  "SAP S/4HANA",
  "Salesforce Sales Cloud",
  "SAP SuccessFactors",
  "ServiceNow ITSM",
  "Oracle E-Business Suite",
  "Microsoft Power BI",
  "Microsoft 365",
  "API Gateway (Internal)",
  "Snowflake Data Warehouse",
  "Customer Self-Service Portal",
]);
const statuses: Record<string, string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  blocked: "Bị chặn",
  done: "Hoàn thành",
  cancelled: "Đã hủy",
};
const personnelRoles = ["PM", "BA", "DEV"] as const;
type Tab = "projects" | "resources" | "tco";

export default function CostsPage() {
  const items = useQuery(api.roadmap.list) ?? [];
  const systems = useQuery(api.software_systems.list) ?? [];
  const summaries = useQuery(api.roadmap.listProjectCostSummaries) ?? [];
  const master = useQuery(api.roadmap.listProjectCostMasterData);
  const createRate = useMutation(api.roadmap.createProjectRoleRate);
  const createResource = useMutation(api.roadmap.createProjectResource);
  const createOther = useMutation(api.roadmap.createProjectNonLaborCost);
  const removeOther = useMutation(api.roadmap.removeProjectNonLaborCost);
  const [tab, setTab] = useState<Tab>("projects");
  const [rateName, setRateName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [roleRateId, setRoleRateId] = useState("");
  const [otherProjectId, setOtherProjectId] = useState("");
  const [category, setCategory] =
    useState<keyof typeof categories>("server_domain");
  const [costType, setCostType] = useState<"initial" | "monthly" | "annual">(
    "initial",
  );
  const [amount, setAmount] = useState("");
  const projects = items.filter((item) => item.level === "project");
  const inventorySystems = systems.filter(
    (system) => !legacySystemNames.has(system.name),
  );
  const systemNames = new Map(
    inventorySystems.map((system) => [system._id, system.name]),
  );
  const projectName = (project: (typeof projects)[number]) =>
    systemNames.get(project.relatedSystemIds[0]) ??
    inventorySystems[projects.indexOf(project) % inventorySystems.length]
      ?.name ??
    project.title;
  const sprintNames = new Map(
    items
      .filter((item) => item.level === "sprint")
      .map((sprint) => [sprint._id, sprint.title]),
  );
  const summaryByProject = new Map(
    summaries.map((summary) => [summary.projectId, summary]),
  );

  const saveRate = async () => {
    await createRate({ name: rateName, hourlyRate: Number(hourlyRate) });
    setRateName("");
    setHourlyRate("");
    toast.success("Đã thêm đơn giá");
  };
  const saveResource = async () => {
    await createResource({
      name: resourceName,
      roleRateId: roleRateId as Id<"project_role_rates">,
    });
    setResourceName("");
    toast.success("Đã thêm nguồn lực");
  };
  const saveOther = async () => {
    await createOther({
      projectId: otherProjectId as Id<"roadmap_items">,
      category,
      costType,
      amount: Number(amount),
    });
    setAmount("");
    toast.success("Đã thêm chi phí dự án");
  };

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CircleDollarSign className="h-6 w-6" />
          Quản lý chi phí
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tách biệt hiệu quả nguồn lực và tổng chi phí sở hữu theo Project ID
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          variant={tab === "projects" ? "default" : "outline"}
          onClick={() => setTab("projects")}
        >
          Dự án
        </Button>
        <Button
          variant={tab === "resources" ? "default" : "outline"}
          onClick={() => setTab("resources")}
        >
          <UsersRound className="mr-2 h-4 w-4" />
          Nguồn lực nội bộ
        </Button>
        <Button
          variant={tab === "tco" ? "default" : "outline"}
          onClick={() => setTab("tco")}
        >
          <CircleDollarSign className="mr-2 h-4 w-4" />
          Chi phí dự án
        </Button>
      </div>

      {tab === "projects" && (
        <section className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                {[
                  "Dự án",
                  "PM",
                  "Trạng thái",
                  "Budget",
                  "Forecast",
                  "Actual",
                  "Remaining",
                  "Used",
                  "Thao tác",
                ].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((project) => {
                const summary = summaryByProject.get(project._id);
                return (
                  <tr key={project._id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      {projectName(project)}
                    </td>
                    <td className="px-4 py-3">{project.owner || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {statuses[project.status] ?? project.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatVnd(summary?.budgetCost ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      {formatVnd(summary?.forecastCost ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      {formatVnd(summary?.actualCost ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      {formatVnd(summary?.remainingCost ?? 0)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {summary?.usedPercent ?? 0}%
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOtherProjectId(project._id);
                          setTab("tco");
                        }}
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === "resources" && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-semibold">
                Vai trò PM / BA / DEV và đơn giá
              </h2>
              <div className="mb-3 flex flex-wrap gap-2">
                {(master?.roleRates ?? []).map((rate) => (
                  <Badge key={rate._id}>
                    {rate.name}: {formatVnd(rate.hourlyRate)}/giờ
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select value={rateName} onValueChange={setRateName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    {personnelRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="Đơn giá/giờ"
                />
                <Button
                  disabled={!rateName || !hourlyRate}
                  onClick={() => void saveRate()}
                >
                  Thêm
                </Button>
              </div>
            </section>
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-semibold">Quản lý nhân sự</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                {(master?.resources ?? []).map((resource) => (
                  <Badge variant="secondary" key={resource._id}>
                    {resource.name} ·{" "}
                    {master?.roleRates.find(
                      (rate) => rate._id === resource.roleRateId,
                    )?.name ?? "Chưa có vai trò"}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                  placeholder="Tên nhân sự"
                />
                <Select value={roleRateId} onValueChange={setRoleRateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(master?.roleRates ?? []).map((rate) => (
                      <SelectItem key={rate._id} value={rate._id}>
                        {rate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!resourceName || !roleRateId}
                  onClick={() => void saveResource()}
                >
                  Thêm
                </Button>
              </div>
            </section>
          </div>
          <section className="overflow-x-auto rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">Task theo Sprint</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Task được tạo tại Roadmap. Màn hình này chỉ tham chiếu số giờ và
                chi phí đã tính.
              </p>
            </div>
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  {[
                    "Dự án",
                    "Sprint",
                    "Task",
                    "Assignee",
                    "Phase",
                    "Estimated",
                    "Actual",
                    "Remaining",
                    "Forecast cost",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {summaries.flatMap((summary) =>
                  summary.tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {projectName(
                          projects.find(
                            (project) => project._id === summary.projectId,
                          )!,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sprintNames.get(task.sprintId) ?? "—"}
                      </td>
                      <td className="px-4 py-3">{task.title}</td>
                      <td className="px-4 py-3">{task.assigneeName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{task.phase}</Badge>
                      </td>
                      <td className="px-4 py-3">{task.estimatedHours}h</td>
                      <td className="px-4 py-3">{task.actualHours}h</td>
                      <td className="px-4 py-3">{task.remainingHours}h</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatVnd(task.forecastCost)}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === "tco" && (
        <div className="space-y-4">
          <section className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  {[
                    "Dự án",
                    "Nguồn lực nội bộ",
                    "Đầu tư ban đầu",
                    "Duy trì/tháng",
                    "Gia hạn/năm",
                    "Tổng Năm 1",
                    "Từ Năm 2/năm",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map((project) => {
                  const summary = summaryByProject.get(project._id);
                  return (
                    <tr
                      key={project._id}
                      className={
                        otherProjectId === project._id
                          ? "bg-primary/5"
                          : "hover:bg-muted/20"
                      }
                      onClick={() => setOtherProjectId(project._id)}
                    >
                      <td className="cursor-pointer px-4 py-3 font-medium">
                        {projectName(project)}
                      </td>
                      <td className="px-4 py-3">
                        {formatVnd(summary?.forecastCost ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {formatVnd(summary?.initialCost ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {formatVnd(summary?.monthlyCost ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {formatVnd(summary?.annualCost ?? 0)}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatVnd(summary?.year1Cost ?? 0)}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatVnd(summary?.year2AnnualRunRate ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Chi phí ngoài nguồn lực</h2>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Nguồn lực nội bộ được kế thừa từ Forecast, không nhập lại tại đây.
            </p>
            <div className="grid gap-2 md:grid-cols-5">
              <Select value={otherProjectId} onValueChange={setOtherProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {projectName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as keyof typeof categories)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={costType}
                onValueChange={(v) => setCostType(v as typeof costType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Đầu tư ban đầu</SelectItem>
                  <SelectItem value="monthly">Duy trì/tháng</SelectItem>
                  <SelectItem value="annual">Gia hạn/năm</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Số tiền"
              />
              <Button
                disabled={!otherProjectId || !amount}
                onClick={() => void saveOther()}
              >
                Thêm
              </Button>
            </div>
            {summaryByProject
              .get(otherProjectId as Id<"roadmap_items">)
              ?.nonLaborCosts.map((cost) => (
                <div
                  key={cost._id}
                  className="mt-3 flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="flex-1">
                    {categories[cost.category]} · {cost.costType}
                  </span>
                  <strong>{formatVnd(cost.amount)}</strong>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => void removeOther({ id: cost._id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
