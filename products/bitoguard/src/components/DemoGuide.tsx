"use client"

import { useState } from "react"
import Link from "next/link"

const portfolio = (process.env.NEXT_PUBLIC_PORTFOLIO_URL || "http://127.0.0.1:4173").replace(/\/$/, "")

export function DemoGuide() {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function reset() {
    setBusy(true)
    setError("")
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch("/api/bitoguard/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: controller.signal,
      })
      if (!response.ok) throw new Error("reset")
      // Reload the document so every original product query drops its cached decisions.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/bitoguard/alerts/")
    } catch {
      setError("暫時無法重設，請再試一次。未確認成功前，仍以目前案件狀態為準。")
      setBusy(false)
    } finally {
      clearTimeout(timeout)
    }
  }

  return (
    <section aria-label="展示操作指引" className="max-w-[1100px] mx-auto mb-5 rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[13px] text-[#374151]">
      <p>展示模式：帳戶、交易與模型指標為合成測試資料，不代表模型成效。案件處置只影響此瀏覽器。</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1">
        <a className="underline min-h-11 inline-flex items-center" href={portfolio + "/projects/bitoguard/"}>← 專案介紹</a>
        <Link prefetch={false} className="underline min-h-11 inline-flex items-center" href="/alerts/report/?alertId=demo-alert-001">開啟示例案件 →</Link>
        <button className="underline min-h-11 disabled:opacity-60" onClick={() => { setConfirming(true); setError("") }} disabled={busy}>重設我的展示案件</button>
      </div>
      <details>
        <summary className="cursor-pointer py-2 font-medium">第一次操作？查看建議流程</summary>
        <ol className="list-decimal pl-5 space-y-2 pb-2">
          <li>從示例案件查看風險因素、時間線與關聯證據。</li>
          <li>使用左側用戶全貌與關聯圖，選擇 demo-user-001；圖譜可切換 1-hop／2-hop。</li>
          <li>回到報告選擇「升級案件」，重新整理確認處置保存。</li>
          <li>重設後可以再試；這不會修改模型或其他訪客的案件。</li>
        </ol>
      </details>
      {confirming && <div className="border-t border-[#d1d5db] pt-3 mt-2">
        <p>清除這個瀏覽器的全部展示案件處置，回到初始警示？訂單和其他訪客不受影響。</p>
        <div className="flex flex-wrap gap-3 mt-2">
          <button className="min-h-11 rounded px-4 bg-[#4b56a0] text-white disabled:opacity-60" disabled={busy} onClick={reset}>{busy ? "正在重設…" : "確認重設"}</button>
          <button className="min-h-11 rounded px-4 border border-[#5f6673] disabled:opacity-60" disabled={busy} onClick={() => { setConfirming(false); setError("") }}>取消</button>
        </div>
      </div>}
      <p role="status" className="text-[#9f1239] mt-1">{error}</p>
    </section>
  )
}
