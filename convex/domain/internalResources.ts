import { numberInRange, requiredOrderedDates } from "./common";

export function calculateInternalResourceBudget(input: {
  monthlyRate: number;
  headcount: number;
  allocationPercent: number;
  startDate: string;
  endDate: string;
}) {
  numberInRange(input.monthlyRate, 0, Number.MAX_SAFE_INTEGER, "monthlyRate");
  numberInRange(input.headcount, 1, 10000, "headcount");
  numberInRange(input.allocationPercent, 1, 100, "allocationPercent");
  const dates = requiredOrderedDates(
    input.startDate,
    input.endDate,
    "startDate",
    "endDate",
  );
  const start = new Date(`${dates.start}T00:00:00Z`);
  const end = new Date(`${dates.end}T00:00:00Z`);
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const months = days / (365.25 / 12);
  return {
    months,
    estimatedCost: Math.round(
      input.monthlyRate *
        input.headcount *
        (input.allocationPercent / 100) *
        months,
    ),
  };
}
