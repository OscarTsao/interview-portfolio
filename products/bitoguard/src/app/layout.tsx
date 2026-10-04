import type { Metadata } from "next"
import "./globals.css"
import { Sidebar } from "@/components/Sidebar"
import { Providers } from "@/lib/providers"
import { DemoGuide } from "@/components/DemoGuide"

export const metadata: Metadata = {
  title: "BitoGuard — 風控分析平台",
  description: "BitoGuard 風險偵測與關聯圖分析",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <Providers>
          <a className="skip-link" href="#main">跳到主要內容</a>
          <Sidebar />
          <main id="main" tabIndex={-1} className="bito-main min-h-screen">
            <DemoGuide />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
