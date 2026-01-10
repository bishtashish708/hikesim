"use client";

import type { PlanSegment } from "@/lib/planGenerator";

type PlanExportButtonProps = {
  hikeName: string;
  segments: PlanSegment[];
};

export function PlanExportButton({ hikeName, segments }: PlanExportButtonProps) {
  const handleExport = () => {
    const rows = [
      ["Segment", "Minutes", "Incline %", "Speed (mph)", "Notes"],
      ...segments.map((segment) => [
        segment.segment.toString(),
        segment.minutes.toString(),
        segment.inclinePercent.toString(),
        segment.speedMph.toString(),
        segment.notes || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${slugify(hikeName)}-plan.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
    >
      Export CSV
    </button>
  );
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
