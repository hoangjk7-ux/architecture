import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { formatVnd } from "@/lib/format.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CircleDollarSign, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

const categories = {
  server: "Server",
  domain: "Domain",
  license: "License",
  software: "Software",
  outsource: "Outsource",
  other: "Other",
} as const;

export default function CostsPage() {
  const items = useQuery(api.roadmap.list) ?? [];
  const summaries = useQuery(api.roadmap.listProjectCostSummaries) ?? [];
  const master = useQuery(api.roadmap.listProjectCostMasterData);
  const createRate = useMutation(api.roadmap.createProjectRoleRate);
  const createResource = useMutation(api.roadmap.createProjectResource);
  const createTask = useMutation(api.roadmap.createProjectTask);
  const createOther = useMutation(api.roadmap.createProjectNonLaborCost);
  const removeOther = useMutation(api.roadmap.removeProjectNonLaborCost);
  const [tab, setTab] = useState<"resources" | "projects">("resources");
  const [rateName, setRateName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [roleRateId, setRoleRateId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [phase, setPhase] = useState<"pre_uat" | "post_uat">("pre_uat");
  const [estimated, setEstimated] = useState("");
  const [actual, setActual] = useState("");
  const [remaining, setRemaining] = useState("");
  const [otherProjectId, setOtherProjectId] = useState("");
  const [category, setCategory] = useState<keyof typeof categories>("server");
  const [costType, setCostType] = useState<"initial" | "monthly" | "annual">(
    "initial",
  );
  const [amount, setAmount] = useState("");
  const projects = items.filter((item) => item.level === "project");
  const sprints = items.filter(
    (item) => item.level === "sprint" && item.parentId === projectId,
  );
  const tasks = summaries.flatMap((summary) => summary.tasks);

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
  const saveTask = async () => {
    await createTask({
      projectId: projectId as Id<"roadmap_items">,
      sprintId: sprintId as Id<"roadmap_items">,
      assigneeId: assigneeId as Id<"project_resources">,
      title: taskTitle,
      phase,
      estimatedHours: Number(estimated),
      actualHours: Number(actual),
      remainingHours: Number(remaining),
    });
    setTaskTitle("");
    setEstimated("");
    setActual("");
    setRemaining("");
    toast.success("Đã thêm Task");
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
          Nguồn lực nội bộ và tổng chi phí dự án theo Project ID
        </p>
      </div>
      <div className="flex gap-2 border-b pb-3">
        <Button
          variant={tab === "resources" ? "default" : "outline"}
          onClick={() => setTab("resources")}
        >
          <UsersRound className="mr-2 h-4 w-4" />
          Nguồn lực nội bộ
        </Button>
        <Button
          variant={tab === "projects" ? "default" : "outline"}
          onClick={() => setTab("projects")}
        >
          <CircleDollarSign className="mr-2 h-4 w-4" />
          Chi phí dự án
        </Button>
      </div>

      {tab === "resources" ? (
        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Role & đơn giá theo giờ</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {(master?.roleRates ?? []).map((rate) => (
                <Badge key={rate._id}>
                  {rate.name}: {formatVnd(rate.hourlyRate)}/giờ
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={rateName}
                onChange={(e) => setRateName(e.target.value)}
                placeholder="Role: Dev, BA, PM"
              />
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
            <h2 className="mb-3 font-semibold">Resource Master</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {(master?.resources ?? []).map((resource) => (
                <Badge variant="secondary" key={resource._id}>
                  {resource.name}
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
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Task Cost</h2>
            <div className="grid gap-2 md:grid-cols-4">
              <Select
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                  setSprintId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  {(master?.resources ?? []).map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Tên Task"
              />
              <Select
                value={phase}
                onValueChange={(v) => setPhase(v as typeof phase)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_uat">Pre-UAT</SelectItem>
                  <SelectItem value="post_uat">Post-UAT</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={estimated}
                onChange={(e) => setEstimated(e.target.value)}
                placeholder="Estimated hours"
              />
              <Input
                type="number"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="Actual hours"
              />
              <Input
                type="number"
                value={remaining}
                onChange={(e) => setRemaining(e.target.value)}
                placeholder="Remaining hours"
              />
            </div>
            <Button
              className="mt-3"
              disabled={!projectId || !sprintId || !assigneeId || !taskTitle}
              onClick={() => void saveTask()}
            >
              Thêm Task
            </Button>
            <div className="mt-4 text-xs text-muted-foreground">
              {tasks.length} Task đang được roll-up vào chi phí Project.
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const s = summaries.find((x) => x.projectId === project._id);
              return (
                <div
                  key={project._id}
                  className="rounded-xl border bg-card p-4"
                >
                  <h3 className="font-semibold">{project.title}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span>
                      Budget
                      <br />
                      <strong>{formatVnd(s?.budgetCost ?? 0)}</strong>
                    </span>
                    <span>
                      Forecast
                      <br />
                      <strong>{formatVnd(s?.forecastCost ?? 0)}</strong>
                    </span>
                    <span>
                      Actual
                      <br />
                      <strong>{formatVnd(s?.actualCost ?? 0)}</strong>
                    </span>
                    <span>
                      Remaining
                      <br />
                      <strong>{formatVnd(s?.remainingCost ?? 0)}</strong>
                    </span>
                    <span>
                      Used
                      <br />
                      <strong>{s?.usedPercent ?? 0}%</strong>
                    </span>
                    <span>
                      Năm 1<br />
                      <strong>{formatVnd(s?.year1Cost ?? 0)}</strong>
                    </span>
                  </div>
                  {s?.nonLaborCosts.map((cost) => (
                    <div
                      key={cost._id}
                      className="mt-2 flex items-center gap-2 text-xs"
                    >
                      <span className="flex-1">
                        {categories[cost.category]} · {cost.costType}
                      </span>
                      <strong>{formatVnd(cost.amount)}</strong>
                      <button
                        onClick={() => void removeOther({ id: cost._id })}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Thêm chi phí dự án</h2>
            <div className="grid gap-2 md:grid-cols-5">
              <Select value={otherProjectId} onValueChange={setOtherProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.title}
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
                  {Object.entries(categories).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
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
                  <SelectItem value="initial">Initial</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
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
          </section>
        </div>
      )}
    </div>
  );
}
