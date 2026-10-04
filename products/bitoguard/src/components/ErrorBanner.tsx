"use client"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"

export function ErrorBanner({ message }: { message: string }) {
  const client = useQueryClient()
  const busy = useIsFetching() > 0
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-[#bf2525]">
      {message}
      <button type="button" className="block mt-2 rounded-lg border border-current px-3 py-2" disabled={busy} onClick={() => client.invalidateQueries()}>{busy ? '重新載入中…' : '重新載入資料'}</button>
    </div>
  )
}
