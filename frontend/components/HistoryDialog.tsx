"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, FileText, Upload, Trash2, PlusCircle, ArrowLeftRight, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { getContractLogs } from "@/lib/api"
import { OperationLog } from "@/lib/types"

interface HistoryDialogProps {
    contractId: number
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function HistoryDialog({ contractId, trigger, open, onOpenChange }: HistoryDialogProps) {
    const [logs, setLogs] = useState<OperationLog[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            loadLogs()
        }
    }, [open, contractId])

    const loadLogs = async () => {
        try {
            setLoading(true)
            const data = await getContractLogs(contractId)
            setLogs(data)
        } catch (error) {
            console.error("Failed to load logs:", error)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (action: string) => {
        switch (action) {
            case "create_contract":
                return <PlusCircle className="h-4 w-4 text-blue-500" />
            case "upload_version":
                return <Upload className="h-4 w-4 text-green-500" />
            case "delete_version":
                return <Trash2 className="h-4 w-4 text-red-500" />
            case "compare_versions":
                return <ArrowLeftRight className="h-4 w-4 text-purple-500" />
            default:
                return <FileText className="h-4 w-4 text-slate-500" />
        }
    }

    const getActionLabel = (action: string) => {
        switch (action) {
            case "create_contract": return "创建合同"
            case "upload_version": return "上传版本"
            case "delete_version": return "删除版本"
            case "compare_versions": return "版本对比"
            default: return action
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-500" />
                        操作历史记录
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">加载中...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">暂无操作记录</div>
                    ) : (
                        <div className="space-y-6 pl-2 pt-2">
                            {logs.map((log, index) => (
                                <div key={log.id} className="relative flex gap-4">
                                    {/* Timeline Line */}
                                    {index !== logs.length - 1 && (
                                        <div className="absolute left-[19px] top-8 bottom-[-24px] w-px bg-slate-200" />
                                    )}

                                    {/* Icon */}
                                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm">
                                        {getIcon(log.action)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col gap-1 pb-1 w-full">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-slate-900">
                                                {getActionLabel(log.action)}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        {log.action === 'compare_versions' ? (() => {
                                            try {
                                                const details = JSON.parse(log.details)
                                                return (
                                                    <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 flex items-center justify-between">
                                                        <span>
                                                            对比 <span className="font-medium">v{details.base_version}</span> 与 <span className="font-medium">v{details.target_version}</span>
                                                        </span>
                                                        <a
                                                            href={`/contracts/${contractId}/diff?base=${details.base_id}&target=${details.target_id}`}
                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            查看 <ArrowRight className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                )
                                            } catch (e) {
                                                return <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100">{log.details}</p>
                                            }
                                        })() : (
                                            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100">
                                                {log.details}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
