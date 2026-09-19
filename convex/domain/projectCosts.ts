export type TaskCostInput = {
  estimatedHours: number;
  actualHours: number;
  remainingHours: number;
  unitRate: number;
  phase: "pre_uat" | "post_uat";
};

export type NonLaborCostInput = {
  costType: "initial" | "monthly" | "annual";
  amount: number;
};

export function calculateTaskCost(task: TaskCostInput) {
  return {
    budgetCost: task.estimatedHours * task.unitRate,
    actualCost: task.actualHours * task.unitRate,
    remainingCost: task.remainingHours * task.unitRate,
    forecastCost: (task.actualHours + task.remainingHours) * task.unitRate,
  };
}

export function calculateProjectCost(
  tasks: TaskCostInput[],
  nonLaborCosts: NonLaborCostInput[],
) {
  let internalPreUat = 0;
  let internalPostUat = 0;
  let budgetCost = 0;
  let actualCost = 0;
  let remainingCost = 0;
  for (const task of tasks) {
    const cost = calculateTaskCost(task);
    budgetCost += cost.budgetCost;
    actualCost += cost.actualCost;
    remainingCost += cost.remainingCost;
    if (task.phase === "pre_uat") internalPreUat += cost.actualCost;
    else internalPostUat += cost.actualCost;
  }
  const initialCost = nonLaborCosts
    .filter((cost) => cost.costType === "initial")
    .reduce((sum, cost) => sum + cost.amount, 0);
  const monthlyCost = nonLaborCosts
    .filter((cost) => cost.costType === "monthly")
    .reduce((sum, cost) => sum + cost.amount, 0);
  const annualCost = nonLaborCosts
    .filter((cost) => cost.costType === "annual")
    .reduce((sum, cost) => sum + cost.amount, 0);
  const forecastCost = actualCost + remainingCost;
  const projectRemainingCost = Math.max(budgetCost - actualCost, 0);
  const internalResourceCost = actualCost;
  const usedPercent = budgetCost
    ? Math.round((actualCost / budgetCost) * 10000) / 100
    : 0;
  return {
    budgetCost,
    actualCost,
    remainingCost: projectRemainingCost,
    forecastCost,
    usedPercent,
    internalPreUat,
    internalPostUat,
    internalResourceCost,
    initialCost,
    monthlyCost,
    annualCost,
    year1Cost: forecastCost + initialCost + monthlyCost * 12 + annualCost,
    year2AnnualRunRate: monthlyCost * 12 + annualCost,
  };
}
