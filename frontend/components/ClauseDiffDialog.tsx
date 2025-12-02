"use client"

import { useState, useEffect } from "react"
import { Version } from "@/lib/types"
import { getClauseHistory } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowRight,
    Loader2,
    ExternalLink,
    GitCompare
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as DiffLib from 'diff'

interface ClauseDiffDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contractId: number;
    clauseId: string | null;
    fromVersion?: number;
    toVersion?: number;
    versions: Version[];
}

export function ClauseDiffDialog({
    open,
    onOpenChange,
    contractId,
    clauseId,
    fromVersion: initialFromVersion,
    toVersion: initialToVersion,
    versions,
}: ClauseDiffDialogProps) {
    const router = useRouter()
    const [fromVersion, setFromVersion] = useState<number | undefined>(initialFromVersion)
    const [toVersion, setToVersion] = useState<number | undefined>(initialToVersion)
    const [loading, setLoading] = useState(false)
    const [fromContent, setFromContent] = useState<string>('')
    const [toContent, setToContent] = useState<string>('')

    // 排序版本（从小到大）
    const sortedVersions = [...versions].sort((a, b) => a.version_number - b.version_number)

    // 当 props 变化时更新状态
    useEffect(() => {
        if (initialFromVersion !== undefined) setFromVersion(initialFromVersion)
        if (initialToVersion !== undefined) setToVersion(initialToVersion)
    }, [initialFromVersion, initialToVersion])

    // 加载条款内容
    useEffect(() => {
        if (!open || !clauseId || !fromVersion || !toVersion) return

        const loadContent = async () => {
            setLoading(true)
            try {
                const history = await getClauseHistory(contractId, clauseId)
                
                const fromState = history.versionStates.find(s => s.versionNumber === fromVersion)
                const toState = history.versionStates.find(s => s.versionNumber === toVersion)
                
                setFromContent(fromState?.content || '（该版本无此条款）')
                setToContent(toState?.content || '（该版本无此条款）')
            } catch (error) {
                console.error('加载条款内容失败:', error)
            } finally {
                setLoading(false)
            }
        }

        loadContent()
    }, [open, contractId, clauseId, fromVersion, toVersion])

    // 生成 diff 高亮
    const renderDiff = () => {
        if (!fromContent || !toContent) return null

        const diff = DiffLib.diffWords(fromContent, toContent)

        return (
            <div className="grid grid-cols-2 gap-4">
                {/* 左侧：原版本 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            V{fromVersion}
                        </Badge>
                        <span className="text-xs text-slate-500">原版本</span>
                    </div>
                    <div className="p-4 bg-red-50/30 rounded-lg border border-red-100 min-h-[200px] max-h-[400px] overflow-auto">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {diff.map((part, i) => {
                                if (part.added) return null
                                return (
                                    <span
                                        key={i}
                                        className={cn(
                                            part.removed && "bg-red-200 text-red-900 line-through decoration-red-400"
                                        )}
                                    >
                                        {part.value}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* 右侧：新版本 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            V{toVersion}
                        </Badge>
                        <span className="text-xs text-slate-500">新版本</span>
                    </div>
                    <div className="p-4 bg-green-50/30 rounded-lg border border-green-100 min-h-[200px] max-h-[400px] overflow-auto">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {diff.map((part, i) => {
                                if (part.removed) return null
                                return (
                                    <span
                                        key={i}
                                        className={cn(
                                            part.added && "bg-green-200 text-green-900 font-medium"
                                        )}
                                    >
                                        {part.value}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // 跳转到全文 diff 页面
    const goToFullDiff = () => {
        if (fromVersion && toVersion) {
            router.push(`/contracts/${contractId}/diff?base=${fromVersion}&target=${toVersion}`)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <GitCompare className="h-5 w-5 text-blue-600" />
                        条款版本对比
                        {clauseId && (
                            <Badge variant="outline" className="font-normal">
                                条款 {clauseId}
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* 版本选择器 */}
                <div className="flex items-center gap-4 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">从</span>
                        <Select
                            value={fromVersion?.toString()}
                            onValueChange={(v) => setFromVersion(Number(v))}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="选择版本" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedVersions.map((v) => (
                                    <SelectItem 
                                        key={v.id} 
                                        value={v.version_number.toString()}
                                        disabled={v.version_number === toVersion}
                                    >
                                        V{v.version_number}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <ArrowRight className="h-4 w-4 text-slate-400" />

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">到</span>
                        <Select
                            value={toVersion?.toString()}
                            onValueChange={(v) => setToVersion(Number(v))}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="选择版本" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedVersions.map((v) => (
                                    <SelectItem 
                                        key={v.id} 
                                        value={v.version_number.toString()}
                                        disabled={v.version_number === fromVersion}
                                    >
                                        V{v.version_number}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1" />

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={goToFullDiff}
                    >
                        <ExternalLink className="h-4 w-4" />
                        查看全文对比
                    </Button>
                </div>

                {/* Diff 内容 */}
                <div className="flex-1 overflow-auto py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            <span className="ml-2 text-sm text-slate-500">加载中...</span>
                        </div>
                    ) : fromVersion && toVersion ? (
                        renderDiff()
                    ) : (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <p className="text-sm">请选择要对比的版本</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}





