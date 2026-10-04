"use client"

import { Suspense, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, type RiskLevel } from "@/lib/api"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { ErrorBanner } from "@/components/ErrorBanner"
import { ALERT_STATUS_ZH } from "@/lib/labels"

const RISK_COLORS: Record<NonNullable<RiskLevel>, string> = {
  critical: "bg-red-50 text-[#bf2525] border-red-200",
  high:     "bg-orange-50 text-[#9a4300] border-orange-200",
  medium:   "bg-yellow-50 text-[#8a5700] border-yellow-200",
  low:      "bg-green-50 text-[#24712a] border-green-200",
}

const RISK_ZH: Record<NonNullable<RiskLevel>, string> = {
  critical: "極高風險", high: "高風險", medium: "中風險", low: "低風險",
}

function AlertCenterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Derive filter directly from URL — URL is the single source of truth
  const filter = searchParams.get("risk_level") ?? "all"
  const [page, setPage] = useState<number>(1)

  function changeFilter(value: string) {
    setPage(1)
    const params = new URLSearchParams()
    if (value !== "all") params.set("risk_level", value)
    router.replace(`/alerts${params.size ? `?${params}` : ""}`, { scroll: false })
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["alerts", filter, page],
    queryFn: () => api.getAlerts({ page, page_size: 50, ...(filter !== "all" ? { risk_level: filter } : {}) }),
  })

  const FILTERS = [
    { value: "all", label: "全部" },
    { value: "critical", label: "極高風險" },
    { value: "high", label: "高風險" },
    { value: "medium", label: "中風險" },
  ]

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold text-[#1a1d2e]">警示中心</h1>
        <p className="text-[13px] text-[#5c677a] mt-0.5">
          共 {data?.total ?? 0} 筆警示
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="風險篩選">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            aria-pressed={filter === f.value}
            onClick={() => changeFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
              filter === f.value
                ? "bg-[#4958a8] text-white border-[#4958a8]"
                : "bg-white text-[#5f6673] border-[#e5e7eb] hover:border-[#5c677a]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error instanceof Error ? error.message : "無法載入警示資料"} />}
      {isLoading && <div className="text-[#5c677a] py-8 text-center">載入中...</div>}

      {/* Table */}
      {!isLoading && data && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          <div className="table-scroll" tabIndex={0} role="region" aria-label="資料表格，可左右捲動"><table className="w-full text-[13px]">
            <thead className="bg-[#f4f6f9]">
              <tr>
                {["警示 ID", "帳戶", "風險等級", "風險分數", "狀態", "建立時間", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-[#5f6673] text-[12px] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((alert) => (
                <tr key={alert.alert_id} className="border-t border-[#f4f6f9] hover:bg-[#fafbfc] transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] text-[#5f6673]">{alert.alert_id}</td>
                  <td className="px-4 py-3 font-medium text-[#1a1d2e]">{alert.user_id}</td>
                  <td className="px-4 py-3">
                    {alert.risk_level && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold border ${RISK_COLORS[alert.risk_level]}`}>
                        <AlertTriangle size={10} />
                        {RISK_ZH[alert.risk_level]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#1a1d2e]">
                    <span className={`font-bold ${
                      alert.risk_level === "critical"
                        ? "text-[#bf2525]"
                        : alert.risk_level === "high"
                          ? "text-[#9a4300]"
                          : alert.risk_level === "medium"
                            ? "text-[#8a5700]"
                          : "text-[#1a1d2e]"
                    }`}>
                      {typeof alert.risk_score === "number" ? alert.risk_score.toFixed(2) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[12px] bg-[#f4f6f9] text-[#5f6673]">
                      {ALERT_STATUS_ZH[alert.status] ?? alert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#5c677a] text-[12px]">
                    {new Date(alert.created_at).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="px-4 py-3">
                    <Link prefetch={false}
                      href={`/alerts/report?alertId=${alert.alert_id}`}
                      className="inline-flex items-center gap-1 text-[#4958a8] hover:text-[#3949ab] text-[12px] font-medium"
                    >
                      診斷 <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {data.items.length === 0 && (
            <div className="text-center text-[#5c677a] py-12">目前沒有符合條件的警示</div>
          )}
          {data.total > 0 && (
            <div className="flex items-center justify-between border-t border-[#f4f6f9] px-4 py-3 text-[12px] text-[#5f6673]">
              <span>
                第 {page} 頁 / 共 {Math.max(1, Math.ceil(data.total / data.page_size))} 頁
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded border border-[#e5e7eb] px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一頁
                </button>
                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!data.has_next}
                  className="rounded border border-[#e5e7eb] px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && !error && !data && (
        <div className="text-center text-[#5c677a] py-12">目前無法取得警示資料</div>
      )}
    </div>
  )
}

export default function AlertCenterPage() {
  return (
    <Suspense fallback={<div className="text-[#5c677a] text-center py-8">載入中...</div>}>
      <AlertCenterContent />
    </Suspense>
  )
}
