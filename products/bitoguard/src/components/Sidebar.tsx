"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, AlertTriangle, Network, BarChart2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/",          label: "儀表板",      icon: LayoutDashboard, exact: true },
  { href: "/alerts",    label: "警示中心",    icon: AlertTriangle },
  { href: "/users",     label: "用戶全貌",    icon: Users },
  { href: "/graph",     label: "關聯圖探索",  icon: Network },
  { href: "/model-ops", label: "模型指標",    icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="bito-sidebar fixed top-0 left-0 h-screen bg-white border-r border-[#e5e7eb] flex flex-col z-10"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4958a8] flex items-center justify-center">
            <Network size={16} className="text-white" />
          </div>
          <span className="font-semibold text-[15px] text-[#1a1d2e] tracking-tight">BitoGuard</span>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="BitoGuard 主要導覽" className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-2 pb-2 text-[12px] font-semibold text-[#5c677a] uppercase tracking-wider">分析工具</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : href === "/alerts"
              ? pathname === href || pathname.startsWith(href + "/")
              : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link prefetch={false}
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium transition-colors",
                active
                  ? "bg-[#eef0fa] text-[#4958a8]"
                  : "text-[#5f6673] hover:bg-[#f4f6f9] hover:text-[#1a1d2e]"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#e5e7eb]">
        <p className="text-[12px] text-[#5c677a]">BitoGuard v1.0</p>
      </div>
    </aside>
  )
}
