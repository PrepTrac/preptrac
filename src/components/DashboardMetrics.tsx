"use client";

import { useState } from "react";
import Link from "next/link";
import type { RouterOutputs } from "~/utils/api";

type Stats = Partial<RouterOutputs["dashboard"]["getStats"]>;
interface DashboardMetricsProps {
  stats: Stats | undefined;
  goals?: { foodGoalDays?: number | null; waterGoalGallons?: number | null };
}
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

function GoalScale({ current, target, unit, label }: { current: number; target?: number | null; unit: string; label: string }) {
  if (target == null || !Number.isFinite(target) || target <= 0) return <Link href="/settings?tab=goals" className="text-sm text-action hover:underline">Set a {label.toLowerCase()} goal →</Link>;
  const percent = Math.max(0, Math.min(100, (current / target) * 100));
  return (
    <div className="mt-4">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted mb-2">
        <span>{number(current)} / {number(target)} {unit}</span><span>{Math.round(percent)}% of goal</span>
      </div>
      <div role="progressbar" aria-label={`${label} goal`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${number(current)} of ${number(target)} ${unit}`} className="goal-scale">
        <span className="goal-fill" style={{ width: `${percent}%` }} />
        <div aria-hidden="true" className="goal-segments">{Array.from({ length: 10 }, (_, i) => <span key={i} />)}</div>
      </div>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items?: { name: string; quantity: number; unit: string; gallonsEquivalent?: number; contributionDays?: number; calories?: number }[] }) {
  if (!items?.length) return null;
  return (
    <details className="metric-details mt-3 text-sm">
      <summary className="cursor-pointer text-action py-1">{title}</summary>
      <ul className="mt-2 divide-y divide-line">
        {items.map((item, i) => <li key={i} className="py-2 flex flex-wrap justify-between gap-2">
          <span className="[overflow-wrap:anywhere] min-w-0">{item.name}</span>
          <span className="text-muted tabular-nums">{number(item.quantity)} {item.unit}{item.gallonsEquivalent != null ? ` (${number(item.gallonsEquivalent)} gal)` : ""}{item.calories != null ? ` · ${number(item.calories)} kcal` : ""}{item.contributionDays != null ? ` · ~${number(item.contributionDays)} days` : ""}</span>
        </li>)}
      </ul>
    </details>
  );
}

export default function DashboardMetrics({ stats, goals }: DashboardMetricsProps) {
  const [fuelMode, setFuelMode] = useState(1);
  const fuel = [stats?.totalFuelGallons ?? 0, stats?.totalKwh ?? 0, stats?.batteryKwh ?? 0][fuelMode]!;
  const fuelLabel = ["Stored fuel · gallons", "Generator + battery + solar · kWh", "Battery + solar · kWh"][fuelMode];
  const waterDays = stats?.totalWaterDays;
  return (
    <section aria-label="Household coverage" className="mb-8">
      <div className="section-heading"><h2>Household coverage</h2><span className="index-label">READINESS / SUPPLIES</span></div>
      <p className="text-sm text-muted mb-4">Coverage is estimated from recorded supplies and household needs.</p>
      <div className="coverage-band grid grid-cols-1 sm:grid-cols-2">
        <div className="min-w-0 p-5 sm:p-6">
          <h3 className="text-sm font-semibold" >Food coverage</h3>
          <p className="mt-2"><span className="coverage-number">{number(stats?.totalFoodDays ?? 0)}</span> <span className="text-muted text-sm">days</span></p>
          <p className="text-xs text-muted mt-2">{stats?.useHouseholdCalculation ? "Based on your household calorie needs" : "Fallback estimate: recorded food quantity ÷ 3"}</p>
          <GoalScale label="Food" current={stats?.totalFoodDays ?? 0} target={goals?.foodGoalDays} unit="days" />
          <Breakdown title="Food calorie breakdown" items={stats?.foodBreakdown} />
        </div>
        <div className="min-w-0 p-5 sm:p-6 border-t sm:border-t-0 sm:border-line">
          <h3 className="text-sm font-semibold">Water coverage</h3>
          <p className="mt-2"><span className="coverage-number">{waterDays != null ? number(waterDays) : "—"}</span> <span className="text-muted text-sm">days</span></p>
          <p className="text-xs text-muted mt-2">{number(stats?.totalWater ?? 0)} gallons recorded{stats?.useHouseholdForWater ? " · Based on your household" : ""}</p>
          {waterDays == null && ((stats?.householdDailyCalories ?? 0) > 0 ? <Link href="/inventory" className="block text-xs text-action mt-2 hover:underline">Review recorded water supplies to estimate days →</Link> : <Link href="/household" className="block text-xs text-action mt-2 hover:underline">Set up household to estimate water days →</Link>)}
          <GoalScale label="Water" current={stats?.totalWater ?? 0} target={goals?.waterGoalGallons} unit="gallons" />
          <Breakdown title="Water source breakdown" items={stats?.waterBreakdown} />
        </div>
      </div>
      <dl className="secondary-metrics grid grid-cols-1 sm:grid-cols-3 border-b border-line">
        <div className="py-4 sm:pr-4 min-w-0">
          <dt className="text-xs text-muted">Fuel / Energy</dt>
          <dd className="text-2xl font-semibold tabular-nums mt-1">{number(fuel)} <span className="text-xs font-normal text-muted">{fuelMode === 0 ? "gallons" : "kWh"}</span></dd>
          <dd><button type="button" aria-label="Switch fuel measurement" onClick={() => setFuelMode(m => (m + 1) % 3)} className="text-xs text-action text-left mt-1 py-1 hover:underline">{fuelLabel} ↻</button></dd>
        </div>
        <div className="py-4 sm:px-4 sm:border-line min-w-0">
          <dt className="text-xs text-muted">Ammunition</dt><dd className="text-2xl font-semibold tabular-nums mt-1">{number(stats?.totalAmmo ?? 0)} <span className="text-xs font-normal text-muted">rounds</span></dd>
          <dd><Breakdown title="Ammunition breakdown" items={stats?.ammoBreakdown} /></dd>
        </div>
        <div className="py-4 sm:pl-4 sm:border-line">
          <dt className="text-xs text-muted">Inventory</dt><dd className="text-2xl font-semibold tabular-nums mt-1">{number(stats?.totalItems ?? 0)} <span className="text-xs font-normal text-muted">items</span></dd>
          <dd><Link href="/inventory" className="text-xs text-action hover:underline">Review supplies →</Link></dd>
        </div>
      </dl>
    </section>
  );
}
