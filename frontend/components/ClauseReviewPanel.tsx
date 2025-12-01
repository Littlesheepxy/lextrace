"use client"

import { useState, useEffect } from "react"
import { ClauseHistory, ClauseReviewStatus, ReviewStatusType } from "@/lib/types"
import { getClauseReview, saveClauseReview } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    MessageCircle,
    Clock,
    Save,
    Loader2,
    TrendingUp,
    FileWarning,
    ExternalLink
} from "lucide-react"

interface ClauseReviewPanelProps {
    clauseHistory: ClauseHistory;
    contractId: number;
    latestVersionId?: number;
    onStatusChange?: () => void;
}

// Review 状态配置
const reviewStatusConfig: Record<ReviewStatusType, {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
}> = {
    confirmed: {
        label: "已确认",
        color: "text-green-700",
        bgColor: "bg-green-50 border-green-200 hover:bg-green-100",
        icon: CheckCircle2,
    },
    risky: {
        label: "有风险",
        color: "text-red-700",
        bgColor: "bg-red-50 border-red-200 hover:bg-red-100",
        icon: AlertTriangle,
    },
    needs_discussion: {
        label: "需沟通",
        color: "text-amber-700",
        bgColor: "bg-amber-50 border-amber-200 hover:bg-amber-100",
        icon: MessageCircle,
    },
    pending: {
        label: "待审查",
        color: "text-slate-600",
        bgColor: "bg-slate-50 border-slate-200 hover:bg-slate-100",
        icon: Clock,
    },
}

export function ClauseReviewPanel({
    clauseHistory,
    contractId,
    latestVersionId,
    onStatusChange,
}: ClauseReviewPanelProps) {
    const [reviewStatus, setReviewStatus] = useState<ReviewStatusType>('pending')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<string | null>(null)

    // 加载已有的 Review 状态
    useEffect(() => {
        const saved = getClauseReview(contractId, clauseHistory.clauseId)
        if (saved) {
            setReviewStatus(saved.status)
            setNotes(saved.notes || '')
            setLastSaved(saved.updatedAt)
        } else {
            setReviewStatus('pending')
            setNotes('')
            setLastSaved(null)
        }
    }, [contractId, clauseHistory.clauseId])

    // 保存 Review 状态
    const handleSave = async () => {
        setSaving(true)
        try {
            const review: ClauseReviewStatus = {
                clauseId: clauseHistory.clauseId,
                contractId,
                versionId: latestVersionId,
                status: reviewStatus,
                notes,
                updatedAt: new Date().toISOString(),
            }
            saveClauseReview(review)
            setLastSaved(review.updatedAt)
            // 通知父组件刷新审查状态
            onStatusChange?.()
        } catch (error) {
            console.error('保存失败:', error)
        } finally {
            setSaving(false)
        }
    }

    // 跳转外部 AI
    const handleExternalAI = (url: string) => {
        const context = `请分析以下合同条款的多版本演变：

条款路径：${clauseHistory.clausePath.join(' > ')}

版本演变历史：
${clauseHistory.versionStates.map(s => `V${s.versionNumber}: ${s.preview}`).join('\n')}

请提供：
1. 主要变更点总结
2. 潜在风险评估
3. 审查建议`

        navigator.clipboard.writeText(context).then(() => {
            window.open(url, '_blank')
            alert("条款信息已复制到剪贴板！请在打开的 AI 页面中粘贴 (Ctrl+V) 提问。")
        })
    }

    const aiSummary = clauseHistory.aiSummary

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* AI 总结卡片 */}
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-600" />
                                AI 分析总结
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {aiSummary ? (
                                <>
                                    {/* 一句话摘要 */}
                                    <div>
                                        <p className="text-sm text-blue-800 leading-relaxed">
                                            {aiSummary.oneLiner}
                                        </p>
                                    </div>

                                    {/* 演进总结 */}
                                    <div className="pt-3 border-t border-blue-200/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                                            <span className="text-xs font-semibold text-blue-900">
                                                多版本演进
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            {aiSummary.evolutionSummary}
                                        </p>
                                    </div>

                                    {/* 风险提示 */}
                                    {aiSummary.riskNotes && (
                                        <div className="pt-3 border-t border-blue-200/50">
                                            <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-md border border-amber-200">
                                                <FileWarning className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-amber-800 leading-relaxed">
                                                    {aiSummary.riskNotes}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-blue-600/60 text-center py-4">
                                    暂无 AI 分析结果
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* 外部 AI 分析 */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                深度 AI 分析
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500 mb-3">
                                复制条款信息到外部 AI 获取更详细分析
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs gap-1"
                                    onClick={() => handleExternalAI("https://chat.deepseek.com/")}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    DeepSeek
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs gap-1"
                                    onClick={() => handleExternalAI("https://chatgpt.com/")}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    ChatGPT
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Separator />

                    {/* Review 状态选择 */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-slate-600" />
                            审查状态
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.entries(reviewStatusConfig) as [ReviewStatusType, typeof reviewStatusConfig[ReviewStatusType]][]).map(
                                ([status, config]) => {
                                    const Icon = config.icon
                                    const isSelected = reviewStatus === status
                                    return (
                                        <button
                                            key={status}
                                            className={cn(
                                                "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                                                isSelected
                                                    ? cn(config.bgColor, "ring-2 ring-offset-1", config.color.replace('text-', 'ring-'))
                                                    : "bg-white border-slate-200 hover:bg-slate-50"
                                            )}
                                            onClick={() => setReviewStatus(status)}
                                        >
                                            <Icon className={cn(
                                                "h-5 w-5",
                                                isSelected ? config.color : "text-slate-400"
                                            )} />
                                            <span className={cn(
                                                "text-sm font-medium",
                                                isSelected ? config.color : "text-slate-600"
                                            )}>
                                                {config.label}
                                            </span>
                                        </button>
                                    )
                                }
                            )}
                        </div>
                    </div>

                    {/* 备注 */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-slate-600" />
                            审查备注
                        </h4>
                        <Textarea
                            placeholder="输入您的审查意见或备注..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[120px] resize-none text-sm"
                        />
                    </div>

                    {/* 保存按钮 */}
                    <Button
                        className="w-full gap-2"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        保存审查状态
                    </Button>

                    {/* 上次保存时间 */}
                    {lastSaved && (
                        <p className="text-xs text-slate-400 text-center">
                            上次保存：{new Date(lastSaved).toLocaleString()}
                        </p>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

