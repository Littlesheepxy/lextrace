"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    LayoutDashboard,
    FileText,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    User,
    Scale,
    Files,
    History
} from "lucide-react"
import { useState } from "react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    const navItems = [
        { label: "合同总览", icon: LayoutDashboard, href: "/" },
        { label: "我的草稿", icon: FileText, href: "/drafts" }, // Placeholder
        { label: "合同模板", icon: Files, href: "/templates" }, // Placeholder
        { label: "操作日志", icon: History, href: "/logs" }, // Placeholder
    ]

    return (
        <div className={cn(
            "relative flex flex-col h-full bg-[#F9F9F9] border-r border-gray-200 text-slate-700 transition-all duration-300",
            collapsed ? "w-[60px]" : "w-[240px]",
            className
        )}>
            {/* Header */}
            <div className={cn("flex items-center h-16 px-4", collapsed ? "justify-center" : "justify-between")}>
                {!collapsed && (
                    <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
                        <Scale className="h-6 w-6 text-blue-600" />
                        <span>LexTrace</span>
                    </div>
                )}
                {collapsed && <Scale className="h-6 w-6 text-blue-600" />}
            </div>

            {/* Toggle Button (Absolute or integrated?) Let's integrate it nicely */}
            <div className="absolute -right-3 top-5 z-10">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-white shadow-sm border-gray-200 hover:bg-gray-50"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <PanelLeftOpen className="h-3 w-3 text-slate-500" /> : <PanelLeftClose className="h-3 w-3 text-slate-500" />}
                </Button>
            </div>

            {/* Main Navigation */}
            <ScrollArea className="flex-1 py-6">
                <nav className="grid gap-1 px-3">
                    {navItems.map((item, index) => (
                        <Button
                            key={index}
                            asChild
                            variant="ghost"
                            className={cn(
                                "justify-start h-10 transition-colors",
                                collapsed ? "justify-center px-0" : "px-3",
                                pathname === item.href
                                    ? "bg-white shadow-sm text-blue-600 font-medium hover:bg-white hover:text-blue-700"
                                    : "text-slate-600 hover:bg-gray-200/50 hover:text-slate-900"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Link href={item.href}>
                                <item.icon className={cn("h-5 w-5", !collapsed && "mr-3", pathname === item.href && "text-blue-600")} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        </Button>
                    ))}
                </nav>
            </ScrollArea>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-200 bg-[#F9F9F9]">
                {collapsed ? (
                    <Button variant="ghost" size="icon" className="mx-auto flex hover:bg-gray-200/50" title="Settings">
                        <Settings className="h-5 w-5 text-slate-600" />
                    </Button>
                ) : (
                    <div className="space-y-1">
                        <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 hover:bg-gray-200/50 hover:text-slate-900">
                            <Settings className="h-5 w-5" />
                            <span>系统设置</span>
                        </Button>
                        <div className="pt-2 mt-2 border-t border-gray-200">
                            <div className="flex items-center gap-3 px-2 py-1.5">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                    AD
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-900">Admin User</span>
                                    <span className="text-xs text-slate-500">admin@lextrace.com</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
