"use client"

import { Construction } from "lucide-react"

export default function LogsPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
            <Construction className="h-12 w-12 text-slate-300" />
            <div className="text-center">
                <h2 className="text-lg font-medium text-slate-900">操作日志</h2>
                <p className="text-sm mt-1">全局日志功能开发中，请在具体合同详情页查看该合同的操作记录。</p>
            </div>
        </div>
    )
}
