"use client"

import { useQuery } from "@tanstack/react-query"
import { api, type RiskLevel } from "@/lib/api"
import Link from "next/link"
import { AlertTriangle, Activity, TrendingUp, Shield, ChevronRight, CheckCircle, XCircle } from "lucide-react"
import { FEATURE_ZH } from "@/lib/labels"
import { ErrorBanner } from "@/components/ErrorBanner"

const RISK_COLORS: Record<NonNullable<RiskLevel>, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-50",    text: "text-[#bf2525]", border: "border-red-200" },
  high:     { bg: "bg-orange-50", text: "text-[#9a4300]", border: "border-orange-200" },
  medium:   { bg: "bg-yellow-50", text: "text-[#8a5700]", border: "border-yellow-200" },
  low:      { bg: "bg-green-50",  text: "text-[#24712a]", border: "border-green-200" },
}
const RISK_ZH: Record<NonNullable<RiskLevel>, string> = {
  critical: "極高", high: "高", medium: "中", low: "低",
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-mono text-[#5c677a] w-8 text-right">{value}</span>
    </div>
  )
}

function MetricGauge({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  const color = "#4958a8"
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[12px] text-[#5c677a] uppercase tracking-wider font-semibold">{label}</span>
        <span className="text-[18px] font-semibold" style={{ color }}>{value.toFixed(4)}</span>
      </div>
      <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-[12px] text-[#5c677a]">
        <span>0.00</span>
        <span>1.00</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: alertsData, error: alertsError } = useQuery({
    queryKey: ["dashAlerts"],
    queryFn: () => api.getAlerts({ page: 1, page_size: 5 }),
    staleTime: 60_000,
  })

  const { data: criticalData, error: criticalError } = useQuery({
    queryKey: ["dashCritical"],
    queryFn: () => api.getAlerts({ page: 1, page_size: 1, risk_level: "critical" }),
    staleTime: 60_000,
  })

  const { data: highData, error: highError } = useQuery({
    queryKey: ["dashHigh"],
    queryFn: () => api.getAlerts({ page: 1, page_size: 1, risk_level: "high" }),
    staleTime: 60_000,
  })

  const { data: metrics, error: metricsError } = useQuery({
    queryKey: ["dashMetrics"],
    queryFn: () => api.getModelMetrics() as Promise<{
      model_version: string
      average_precision: number
      precision: number
      recall: number
      f1: number
      confusion_matrix: { tp: number; fp: number; fn: number; tn: number }
      feature_importance_top20: { feature: string; importance_pct: number }[]
    }>,
    staleTime: 300_000,
  })

  const { data: drift, error: driftError } = useQuery({
    queryKey: ["dashDrift"],
    queryFn: () => api.getDriftMetrics() as Promise<{ health_ok: boolean; total_drifted: number; total_checked: number }>,
    staleTime: 300_000,
  })

  const total   = alertsData?.total ?? 0
  const critical = criticalData?.total ?? 0
  const high    = highData?.total ?? 0
  const averagePrecision = metrics?.average_precision

  const KPI_CARDS = [
    {
      label: "總警示",
      value: alertsData ? total.toLocaleString() : "—",
      icon: AlertTriangle,
      color: "#4958a8",
      bg: "bg-[#eef0fa]",
      href: "/alerts",
    },
    {
      label: "極高風險",
      value: criticalData ? critical.toLocaleString() : "—",
      icon: XCircle,
      color: "#bf2525",
      bg: "bg-red-50",
      href: "/alerts?risk_level=critical",
    },
    {
      label: "高風險",
      value: highData ? high.toLocaleString() : "—",
      icon: AlertTriangle,
      color: "#9a4300",
      bg: "bg-orange-50",
      href: "/alerts?risk_level=high",
    },
    {
      label: "AP",
      value: averagePrecision != null ? averagePrecision.toFixed(4) : "—",
      icon: TrendingUp,
      color: "#4958a8",
      bg: "bg-[#eef0fa]",
      href: "/model-ops",
    },
    {
      label: "特徵漂移",
      value: drift == null ? "—" : drift.health_ok ? "正常" : `${drift.total_drifted} 項異常`,
      icon: drift?.health_ok === false ? XCircle : CheckCircle,
      color: drift == null ? "#5c677a" : drift.health_ok ? "#24712a" : "#bf2525",
      bg: drift?.health_ok === false ? "bg-red-50" : "bg-green-50",
      href: "/model-ops",
    },
    {
      label: "模型版本",
      value: metrics?.model_version
        ? metrics.model_version.split("+")[0].replace(/^(stacker|lgbm_v2|lgbm)_/, "").slice(0, 10)
        : "—",
      icon: Shield,
      color: "#4958a8",
      bg: "bg-[#eef0fa]",
      href: "/model-ops",
    },
  ]

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-[#1a1d2e]">系統概覽</h1>
        <p className="text-[13px] text-[#5c677a] mt-0.5">即時風險監控與模型健康狀態</p>
      </div>

      {/* KPI row */}
      {(alertsError || criticalError || highError || metricsError || driftError) && <ErrorBanner message="部分展示資料暫時無法載入，請重新嘗試。尚未取得的數值以 — 顯示。" />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {KPI_CARDS.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link prefetch={false} key={label} href={href}
            className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm px-4 py-3 hover:shadow-md transition-shadow group">
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-[12px] text-[#5c677a] font-semibold uppercase tracking-wider">{label}</p>
            <p className="text-[20px] font-semibold text-[#1a1d2e] mt-0.5 leading-tight">{value}</p>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Recent alerts */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1a1d2e]">最新警示</h2>
              <p className="text-[12px] text-[#5c677a] mt-0.5">最近 5 筆高風險事件</p>
            </div>
            <Link prefetch={false} href="/alerts" className="flex items-center gap-1 text-[12px] text-[#4958a8] hover:underline">
              查看全部 <ChevronRight size={12} />
            </Link>
          </div>

          {!alertsData && (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-[#f3f4f6] rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {alertsData && alertsData.items.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[#5c677a]">暫無警示資料</div>
          )}

          {alertsData && alertsData.items.length > 0 && (
            <div className="divide-y divide-[#f3f4f6]">
              {alertsData.items.slice(0, 5).map((alert) => {
                const level = alert.risk_level
                const c = level ? RISK_COLORS[level] : { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" }
                return (
                  <Link prefetch={false} key={alert.alert_id} href={`/alerts/report?alertId=${alert.alert_id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f9fafb] transition-colors">
                    <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                      {level ? RISK_ZH[level] : "—"}
                    </span>
                    <span className="text-[12px] font-mono text-[#5f6673] flex-1 truncate">{alert.user_id}</span>
                    <span className="text-[12px] font-semibold text-[#1a1d2e] font-mono">
                      {alert.risk_score != null ? alert.risk_score.toFixed(3) : "—"}
                    </span>
                    <span className="text-[12px] text-[#5c677a]">
                      {new Date(alert.created_at).toLocaleDateString("zh-TW")}
                    </span>
                    <ChevronRight size={12} className="text-[#5c677a]" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Model performance */}
        <div className="xl:col-span-2 space-y-3">
          {/* Model metric gauges */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#4958a8]" />
              <h2 className="text-[14px] font-semibold text-[#1a1d2e]">模型表現</h2>
            </div>
            {!metrics && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-[#f3f4f6] rounded animate-pulse" />
                ))}
              </div>
            )}
            {metrics && (
              <div className="space-y-4">
                <MetricGauge value={metrics.average_precision} label="AP (Average Precision)" />
                <MetricGauge value={metrics.precision} label="Precision" />
                <MetricGauge value={metrics.recall} label="Recall" />
                <div className="pt-2 border-t border-[#f3f4f6] grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[12px] text-[#5c677a] uppercase">TP</p>
                    <p className="text-[16px] font-semibold text-[#4958a8]">{metrics.confusion_matrix.tp}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#5c677a] uppercase">FP</p>
                    <p className="text-[16px] font-semibold text-[#9a4300]">{metrics.confusion_matrix.fp}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top features mini-panel */}
          {metrics?.feature_importance_top20 && metrics.feature_importance_top20.length > 0 && (
            <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4">
              <h2 className="text-[13px] font-semibold text-[#1a1d2e] mb-3">Top 5 特徵</h2>
              <div className="space-y-2">
                {metrics.feature_importance_top20.slice(0, 5).map((row) => (
                  <div key={row.feature} className="space-y-0.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#5f6673] truncate max-w-[140px]" title={row.feature}>{FEATURE_ZH[row.feature] ?? row.feature}</span>
                      <span className="text-[#1a1d2e] font-mono font-semibold">{row.importance_pct.toFixed(1)}%</span>
                    </div>
                    <MiniBar value={row.importance_pct} max={metrics.feature_importance_top20[0]?.importance_pct ?? 100} color="#4958a8" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk distribution bar */}
      {total > 0 && critical + high > 0 && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4">
          <h2 className="text-[13px] font-semibold text-[#1a1d2e] mb-3">警示風險分布</h2>
          <div className="flex h-6 rounded-lg overflow-hidden gap-0.5">
            {([["critical", critical, "#bf2525"], ["high", high, "#9a4300"]] as [string, number, string][]).map(([level, count, color]) =>
              count > 0 ? (
                <div key={level}
                  title={`${RISK_ZH[level as NonNullable<RiskLevel>]}風險: ${count}`}
                  style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
                  className="transition-all duration-500 hover:opacity-80"
                />
              ) : null
            )}
            <div style={{ flex: 1, backgroundColor: "#e5e7eb" }} className="rounded-r-lg" />
          </div>
          <div className="flex gap-4 mt-2">
            {([["critical", critical, "#bf2525", "極高"] , ["high", high, "#9a4300", "高"]] as [string, number, string, string][]).map(
              ([level, count, color, label]) => (
                <div key={level} className="flex items-center gap-1.5 text-[12px] text-[#5f6673]">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  {label}: <span className="font-semibold" style={{ color }}>{count}</span>
                </div>
              )
            )}
            <div className="flex items-center gap-1.5 text-[12px] text-[#5f6673]">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#e5e7eb]" />
              其他: <span className="font-semibold text-[#5c677a]">{total - critical - high}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
