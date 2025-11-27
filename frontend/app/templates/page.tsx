"use client"

import { Construction } from "lucide-react"

export default function TemplatesPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
            <Construction className="h-12 w-12 text-slate-300" />
            <div className="text-center">
                <h2 className="text-lg font-medium text-slate-900">合同模板</h2>
                <p className="text-sm mt-1">模板库功能即将上线，敬请期待。</p>
            </div>
        </div>
    )
}
