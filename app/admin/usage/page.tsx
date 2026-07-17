"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { UsageSnapshot } from "@/lib/usage-types";

const TOKEN_STORAGE_KEY = "opshop:usage-dashboard-token";

const LEVEL_STYLES: Record<
  UsageSnapshot["warnings"][number]["level"],
  string
> = {
  ok: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warn: "bg-amber-50 text-amber-950 border-amber-200",
  high: "bg-orange-50 text-orange-950 border-orange-300",
  critical: "bg-red-50 text-red-950 border-red-300",
  blocked: "bg-red-100 text-red-950 border-red-400",
};

function formatMetric(metric: string): string {
  return metric.replace(/_/g, " ");
}

export default function UsageAdminPage() {
  const [token, setToken] = useState("");
  const [draftToken, setDraftToken] = useState("");
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/usage", {
        headers: {
          "x-usage-token": authToken,
        },
        cache: "no-store",
      });
      const data = (await response.json()) as UsageSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load usage");
      }
      setSnapshot(data);
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    if (!saved) return;
    queueMicrotask(() => {
      setToken(saved);
      setDraftToken(saved);
      void load(saved);
    });
  }, [load]);

  function saveToken(event: React.FormEvent) {
    event.preventDefault();
    const next = draftToken.trim();
    if (!next) return;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, next);
    setToken(next);
    void load(next);
  }

  function clearToken() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setDraftToken("");
    setSnapshot(null);
  }

  return (
    <div className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-teal-800">
            <Link href="/" className="underline">
              ← Back to locator
            </Link>
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
            Usage & free-tier guardrails
          </h1>
          <p className="text-sm text-stone-600">
            Private counters for this app. Google Cloud and Upstash consoles remain
            authoritative for billed totals.
          </p>
        </header>

        <form
          onSubmit={saveToken}
          className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <label className="block text-sm font-medium text-stone-800">
            Dashboard token
            <input
              type="password"
              value={draftToken}
              onChange={(e) => setDraftToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
              placeholder="USAGE_DASHBOARD_TOKEN"
              autoComplete="off"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white hover:bg-teal-900"
            >
              Unlock dashboard
            </button>
            {token && (
              <>
                <button
                  type="button"
                  onClick={() => void load(token)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm hover:bg-stone-50"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={clearToken}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm hover:bg-stone-50"
                >
                  Clear token
                </button>
              </>
            )}
          </div>
        </form>

        {loading && (
          <p className="text-sm text-stone-600">Loading usage…</p>
        )}
        {error && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        )}

        {snapshot && (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Month"
                value={snapshot.monthKey}
                hint={`Day ${snapshot.dayOfMonth} / ${snapshot.daysInMonth}`}
              />
              <StatCard
                label="Cache hit rate"
                value={
                  snapshot.cacheHitRate == null
                    ? "—"
                    : `${Math.round(snapshot.cacheHitRate * 100)}%`
                }
                hint={`${snapshot.month.cache_hits} hits · ${snapshot.month.cache_misses} misses`}
              />
              <StatCard
                label="Calls avoided"
                value={String(snapshot.month.cache_hits)}
                hint="Successful cache hits this month"
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-stone-900">
                Free-tier pressure
              </h2>
              <div className="grid gap-3">
                {snapshot.warnings.map((warning) => (
                  <div
                    key={warning.metric}
                    className={`rounded-2xl border p-4 ${LEVEL_STYLES[warning.level]}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-medium capitalize">
                        {formatMetric(warning.metric)}
                      </h3>
                      <p className="text-sm uppercase tracking-wide">
                        {warning.level}
                      </p>
                    </div>
                    <p className="mt-1 text-2xl font-semibold">
                      {warning.used.toLocaleString()} /{" "}
                      {warning.cap.toLocaleString()}
                      <span className="ml-2 text-base font-normal">
                        ({warning.percent.toFixed(1)}%)
                      </span>
                    </p>
                    <p className="mt-1 text-sm">
                      Projected month-end:{" "}
                      <strong>{warning.projected.toLocaleString()}</strong>
                    </p>
                    {warning.note && (
                      <p className="mt-2 text-sm opacity-90">{warning.note}</p>
                    )}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                      <div
                        className="h-full rounded-full bg-current opacity-70"
                        style={{
                          width: `${Math.min(100, warning.percent)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">
                Circuit breakers
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {Object.entries(snapshot.circuitBreakers).map(([metric, state]) => (
                  <li
                    key={metric}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
                  >
                    <span className="capitalize">{formatMetric(metric)}</span>
                    <span>
                      {state.allowed ? (
                        <span className="text-emerald-700">
                          open · blocks at {state.blockAt.toLocaleString()}
                        </span>
                      ) : (
                        <span className="font-medium text-red-700">
                          tripped · used {state.used.toLocaleString()}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">
                Today ({snapshot.dayKey})
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {Object.entries(snapshot.today).map(([metric, value]) => (
                  <div key={metric}>
                    <dt className="capitalize text-stone-500">
                      {formatMetric(metric)}
                    </dt>
                    <dd className="text-lg font-semibold">
                      {value.toLocaleString()}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">
                Provider dashboards
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-teal-900">
                <li>
                  <a
                    className="underline"
                    href="https://console.cloud.google.com/google/maps-apis/metrics"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps metrics
                  </a>
                </li>
                <li>
                  <a
                    className="underline"
                    href="https://console.cloud.google.com/iam-admin/quotas"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Cloud quotas
                  </a>
                </li>
                <li>
                  <a
                    className="underline"
                    href="https://console.cloud.google.com/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Cloud billing / budgets
                  </a>
                </li>
                <li>
                  <a
                    className="underline"
                    href="https://console.upstash.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Upstash Console
                  </a>
                </li>
              </ul>
              <ul className="mt-4 space-y-1 text-sm text-stone-600">
                {snapshot.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </div>
  );
}
