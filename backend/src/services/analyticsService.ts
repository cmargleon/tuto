import { db } from '../db';
import { PROVIDER_COST_USD } from '../config/providerCosts';
import type {
  AnalyticsClientStats,
  AnalyticsData,
  AnalyticsDailyCost,
  AnalyticsDailyVolume,
  AnalyticsProviderStats,
  AnalyticsSummary,
} from '@tuto/shared';

const costOf = (provider: string, count: number): number =>
  Math.round(count * (PROVIDER_COST_USD[provider] ?? 0) * 10000) / 10000;

export const getAnalytics = (): AnalyticsData => {
  // ─── Volume + duration summary ────────────────────────────────────────────
  const summaryRow = db
    .prepare(
      `SELECT
         COUNT(*) AS totalJobs,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedJobs,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedJobs,
         SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) AS pendingJobs,
         AVG(
           CASE
             WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
             THEN (julianday(completed_at) - julianday(started_at)) * 86400
             ELSE NULL
           END
         ) AS avgDurationSeconds
       FROM jobs`,
    )
    .get() as {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    avgDurationSeconds: number | null;
  };

  // ─── Cost per provider (completed jobs only) ───────────────────────────────
  const providerCounts = db
    .prepare(
      `SELECT
         provider,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         AVG(
           CASE
             WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
             THEN (julianday(completed_at) - julianday(started_at)) * 86400
             ELSE NULL
           END
         ) AS avgDurationSeconds
       FROM jobs
       GROUP BY provider
       ORDER BY completed DESC`,
    )
    .all() as Array<{
    provider: string;
    completed: number;
    failed: number;
    avgDurationSeconds: number | null;
  }>;

  const byProvider: AnalyticsProviderStats[] = providerCounts.map((row) => ({
    provider: row.provider,
    completed: row.completed,
    failed: row.failed,
    avgDurationSeconds: row.avgDurationSeconds != null ? Math.round(row.avgDurationSeconds) : null,
    costPerImageUsd: PROVIDER_COST_USD[row.provider] ?? 0,
    totalCostUsd: costOf(row.provider, row.completed),
  }));

  const totalCostUsd = byProvider.reduce((sum, p) => sum + p.totalCostUsd, 0);

  // ─── Daily cost (last 30 days, completed jobs grouped by provider) ─────────
  const dailyCostRows = db
    .prepare(
      `SELECT
         date(completed_at) AS date,
         provider,
         COUNT(*) AS jobCount
       FROM jobs
       WHERE status = 'completed'
         AND completed_at IS NOT NULL
         AND completed_at >= date('now', '-30 days')
       GROUP BY date(completed_at), provider
       ORDER BY date ASC`,
    )
    .all() as Array<{ date: string; provider: string; jobCount: number }>;

  // Aggregate cost by day
  const costByDateMap = new Map<string, number>();
  dailyCostRows.forEach((row) => {
    const prev = costByDateMap.get(row.date) ?? 0;
    costByDateMap.set(row.date, prev + costOf(row.provider, row.jobCount));
  });

  const dailyCost: AnalyticsDailyCost[] = Array.from(costByDateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, costUsd]) => ({ date, costUsd }));

  // Projected monthly cost from the last 30-day average
  const projectedMonthlyCostUsd =
    dailyCost.length > 0
      ? Math.round((dailyCost.reduce((s, d) => s + d.costUsd, 0) / dailyCost.length) * 30 * 100) / 100
      : null;

  // ─── Summary ───────────────────────────────────────────────────────────────
  const summary: AnalyticsSummary = {
    totalJobs: summaryRow.totalJobs,
    completedJobs: summaryRow.completedJobs,
    failedJobs: summaryRow.failedJobs,
    pendingJobs: summaryRow.pendingJobs,
    successRate:
      summaryRow.completedJobs + summaryRow.failedJobs > 0
        ? Math.round((summaryRow.completedJobs / (summaryRow.completedJobs + summaryRow.failedJobs)) * 100)
        : 0,
    avgDurationSeconds: summaryRow.avgDurationSeconds != null ? Math.round(summaryRow.avgDurationSeconds) : null,
    totalCostUsd: Math.round(totalCostUsd * 100) / 100,
    projectedMonthlyCostUsd,
  };

  // ─── Daily volume (completed + failed, last 30 days) ──────────────────────
  const dailyVolume = db
    .prepare(
      `SELECT
         date(completed_at) AS date,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM jobs
       WHERE completed_at IS NOT NULL
         AND completed_at >= date('now', '-30 days')
       GROUP BY date(completed_at)
       ORDER BY date ASC`,
    )
    .all() as AnalyticsDailyVolume[];

  // ─── Cost + volume per client ──────────────────────────────────────────────
  const clientProviderRows = db
    .prepare(
      `SELECT
         client_name AS clientName,
         provider,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM jobs
       GROUP BY client_name, provider
       ORDER BY client_name`,
    )
    .all() as Array<{ clientName: string; provider: string; completed: number }>;

  const clientMap = new Map<string, AnalyticsClientStats>();
  clientProviderRows.forEach((row) => {
    const existing = clientMap.get(row.clientName) ?? { clientName: row.clientName, completed: 0, totalCostUsd: 0 };
    existing.completed += row.completed;
    existing.totalCostUsd += costOf(row.provider, row.completed);
    clientMap.set(row.clientName, existing);
  });

  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10)
    .map((c) => ({ ...c, totalCostUsd: Math.round(c.totalCostUsd * 100) / 100 }));

  return {
    summary,
    dailyVolume,
    byProvider,
    topClients,
    dailyCost,
  };
};
