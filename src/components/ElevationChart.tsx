"use client";

import { useMemo, useState } from "react";
import type { ProfilePoint } from "@/lib/planGenerator";
import { formatElevation, formatMiles } from "@/lib/formatters";

type ElevationChartProps = {
  points: ProfilePoint[];
};

export function ElevationChart({ points }: ElevationChartProps) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
        Not enough elevation points to render a profile.
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = 24;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);

  const distances = points.map((point) => point.distanceMiles);
  const elevations = points.map((point) => point.elevationFt);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const distanceRange = maxDistance - minDistance || 1;
  const elevationRange = maxElevation - minElevation || 1;

  const chartCoords = useMemo(
    () =>
      points.map((point) => {
        const x =
          ((point.distanceMiles - minDistance) / distanceRange) *
            (width - padding * 2) +
          padding;
        const y =
          height -
          padding -
          ((point.elevationFt - minElevation) / elevationRange) * (height - padding * 2);
        return { x, y };
      }),
    [points, minDistance, distanceRange, height, padding, minElevation, elevationRange]
  );

  const chartPoints = chartCoords.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeft = hoverX ? Math.min(hoverX + 12, width - 140) : 0;
  const tooltipTop = hoverY ? Math.max(hoverY - 18, 12) : 0;

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const offsetX = (event.clientX - rect.left) * scaleX;
    const offsetY = (event.clientY - rect.top) * scaleY;
    const clampedX = Math.max(padding, Math.min(width - padding, offsetX));

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    chartCoords.forEach((point, index) => {
      const distance = Math.abs(point.x - clampedX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const nextX = chartCoords[nearestIndex].x;
    const nextY = offsetY;
    if (hoverIndex !== nearestIndex) {
      setHoverIndex(nearestIndex);
    }
    if (hoverX !== nextX) {
      setHoverX(nextX);
    }
    if (hoverY !== nextY) {
      setHoverY(nextY);
    }
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setHoverX(null);
    setHoverY(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Elevation profile</span>
        <span>
          {minElevation.toLocaleString()}–{maxElevation.toLocaleString()} ft
        </span>
      </div>
      <div className="relative">
        <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 h-52 w-full touch-none"
        role="img"
        aria-label="Elevation profile chart"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerMove}
      >
        <defs>
          <linearGradient id="elevationGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="#0f766e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={chartPoints}
        />
        <polygon
          points={`${chartPoints} ${width - padding},${height - padding} ${padding},${
            height - padding
          }`}
          fill="url(#elevationGradient)"
        />
        {hoverIndex !== null && hoverX !== null ? (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={padding}
            y2={height - padding}
            stroke="#94a3b8"
            strokeDasharray="4 4"
          />
        ) : null}
      </svg>
        {hoveredPoint && hoverX !== null && hoverY !== null ? (
          <div
            className="pointer-events-none absolute rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md"
            style={{
              left: `${(tooltipLeft / width) * 100}%`,
              top: `${(tooltipTop / height) * 100}%`,
              transform: "translate3d(0, -100%, 0)",
            }}
            role="status"
            aria-live="polite"
          >
            <div>{formatMiles(hoveredPoint.distanceMiles)}</div>
            <div className="text-slate-500">{formatElevation(hoveredPoint.elevationFt)}</div>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>{minDistance.toFixed(1)} mi</span>
        <span>{maxDistance.toFixed(1)} mi</span>
      </div>
    </div>
  );
}
