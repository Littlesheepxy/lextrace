"use client"

import { useState } from "react"
import { ClauseHistory, ClauseVersionState } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import {
    ChevronRight,
    ChevronDown,
    GitCompare,
    Clock,
    CheckCircle2,
    Plus,
    Minus,
    Edit3,
    ArrowRight,
    Eye,
    EyeOff,
    Loader2
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface ClauseVersionTimelineProps {
    clauseHistory: ClauseHistory;
    loading: boolean;
    latestVersion: number;
    onDiffCompare: (fromVersion: number, toVersion: number) => void;
    contractId: number;
}

// 变更类型配置
const changeTypeConfig = {
    added: { 
        label: "新增", 
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: Plus,
        dotColor: "bg-emerald-500"
    },
    deleted: { 
        label: "删除", 
        color: "bg-slate-200 text-slate-600 border-slate-300",
        icon: Minus,
        dotColor: "bg-slate-400"
    },
    modified: { 
        label: "修改", 
        color: "bg-red-100 text-red-700 border-red-300",
        icon: Edit3,
        dotColor: "bg-red-500"
    },
    renumbered: { 
        label: "重编号", 
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: ArrowRight,
        dotColor: "bg-blue-500"
    },
    unchanged: { 
        label: "无变化", 
        color: "bg-slate-100 text-slate-500 border-slate-200",
        icon: CheckCircle2,
        dotColor: "bg-slate-300"
    },
}

// 单个版本卡片组件
function VersionCard({
    state,
    index,
    isLatest,
    onDiffWithPrev,
    onDiffWithVersion,
}: {
    state: ClauseVersionState;
    index: number;
    isLatest: boolean;
    onDiffWithPrev: () => void;
    onDiffWithVersion: () => void;
}) {
    const [expanded, setExpanded] = useState(isLatest)
    
    const changeType = state.changeFromPrev?.type || (index === 0 ? 'added' : 'unchanged')
    const config = changeTypeConfig[changeType]
    const Icon = config.icon

    const hasContent = state.content && state.content.length > 0
    const isFirstVersion = index === 0

    return (
        <div className="relative flex gap-4">
            {/* 时间轴连接线和节点 */}
            <div className="flex flex-col items-center flex-shrink-0 w-8">
                {/* 节点 */}
                <div className={cn(
                    "w-4 h-4 rounded-full border-2 border-white shadow-sm z-10",
                    config.dotColor,
                    isLatest && "ring-2 ring-amber-300 ring-offset-1"
                )} />
                {/* 连接线 */}
                <div className="flex-1 w-px bg-slate-200 -mt-1" />
            </div>

            {/* 版本卡片 */}
            <Card className={cn(
                "flex-1 mb-4 overflow-hidden transition-all",
                isLatest && "border-amber-200 bg-amber-50/30",
                "hover:shadow-md"
            )}>
                {/* 卡片头部 */}
                <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            {/* 版本号 */}
                            <Badge 
                                variant="outline" 
                                className={cn(
                                    "font-bold text-sm h-7 px-2.5",
                                    isLatest 
                                        ? "bg-amber-100 text-amber-700 border-amber-300" 
                                        : "bg-slate-100 text-slate-700"
                                )}
                            >
                                V{state.versionNumber}
                            </Badge>

                            {/* 变更标签 */}
                            {!isFirstVersion && (
                                <Badge 
                                    variant="outline" 
                                    className={cn("text-xs h-6 gap-1", config.color)}
                                >
                                    <Icon className="h-3 w-3" />
                                    {config.label}
                                </Badge>
                            )}

                            {isLatest && (
                                <Badge className="bg-amber-500 text-white text-xs h-6">
                                    最新版本
                                </Badge>
                            )}
                        </div>

                        {/* 时间 */}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(state.createdAt), { 
                                addSuffix: true, 
                                locale: zhCN 
                            })}
                        </div>
                    </div>

                    {/* 变更摘要 */}
                    {state.changeFromPrev?.summary && state.changeFromPrev.summary !== '无变化' && (
                        <div className="mt-3 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-700 font-medium">
                                {state.changeFromPrev.summary}
                            </p>
                        </div>
                    )}

                    {/* 预览/展开提示 */}
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            {expanded ? (
                                <>
                                    <EyeOff className="h-3 w-3" />
                                    点击收起正文
                                </>
                            ) : (
                                <>
                                    <Eye className="h-3 w-3" />
                                    点击展开正文
                                </>
                            )}
                        </div>
                        <ChevronDown className={cn(
                            "h-4 w-4 text-slate-400 transition-transform",
                            expanded && "rotate-180"
                        )} />
                    </div>
                </div>

                {/* 展开的正文内容 */}
                {expanded && (
                    <div className="border-t">
                        {hasContent ? (
                            <div className="p-4 bg-slate-50/50">
                                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {state.content}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50/50 text-center text-sm text-slate-400">
                                本版本中该条款暂无内容
                            </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="px-4 pb-4 bg-slate-50/50 flex items-center gap-2">
                            {!isFirstVersion && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDiffWithPrev()
                                    }}
                                >
                                    <GitCompare className="h-3 w-3" />
                                    与上一版本对比
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDiffWithVersion()
                                }}
                            >
                                <GitCompare className="h-3 w-3" />
                                与指定版本对比
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}

export function ClauseVersionTimeline({
    clauseHistory,
    loading,
    latestVersion,
    onDiffCompare,
    contractId,
}: ClauseVersionTimelineProps) {
    const [showOnlyChanges, setShowOnlyChanges] = useState(false)
    const [selectingVersion, setSelectingVersion] = useState<number | null>(null)

    // 过滤版本列表
    const filteredStates = showOnlyChanges
        ? clauseHistory.versionStates.filter((s, i) => 
            i === 0 || s.changeFromPrev?.type !== 'unchanged'
          )
        : clauseHistory.versionStates

    // 按时间正序排列（旧→新）
    const sortedStates = [...filteredStates].sort((a, b) => 
        a.versionNumber - b.versionNumber
    )

    // 处理 diff 对比
    const handleDiffWithPrev = (state: ClauseVersionState) => {
        const prevState = clauseHistory.versionStates.find(
            s => s.versionNumber === state.versionNumber - 1
        )
        if (prevState) {
            onDiffCompare(prevState.versionNumber, state.versionNumber)
        }
    }

    const handleSelectVersionForDiff = (targetVersion: number) => {
        if (selectingVersion !== null) {
            onDiffCompare(
                Math.min(selectingVersion, targetVersion),
                Math.max(selectingVersion, targetVersion)
            )
            setSelectingVersion(null)
        } else {
            setSelectingVersion(targetVersion)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    <p className="text-sm text-slate-500">加载条款历史...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* 头部：条款路径 */}
            <div className="p-4 border-b bg-white flex-shrink-0">
                {/* 面包屑路径 */}
                <div className="flex items-center gap-2 text-sm mb-3">
                    {clauseHistory.clausePath.map((path, idx) => (
                        <span key={idx} className="flex items-center gap-2">
                            {idx > 0 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                            <span className={cn(
                                idx === clauseHistory.clausePath.length - 1
                                    ? "font-semibold text-slate-900"
                                    : "text-slate-500"
                            )}>
                                {path}
                            </span>
                        </span>
                    ))}
                </div>

                {/* 筛选和统计 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                            共 {clauseHistory.versionStates.length} 个版本
                        </span>
                        <span>
                            {clauseHistory.versionStates.filter(
                                (s, i) => i > 0 && s.changeFromPrev?.type !== 'unchanged'
                            ).length} 次修改
                        </span>
                    </div>
                    <Button
                        variant={showOnlyChanges ? "secondary" : "ghost"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setShowOnlyChanges(!showOnlyChanges)}
                    >
                        {showOnlyChanges ? "显示全部版本" : "仅显示有变化的"}
                    </Button>
                </div>

                {/* 选择版本对比提示 */}
                {selectingVersion !== null && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                        <span className="text-sm text-blue-700">
                            已选择 V{selectingVersion}，请点击另一个版本进行对比
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-blue-600"
                            onClick={() => setSelectingVersion(null)}
                        >
                            取消
                        </Button>
                    </div>
                )}
            </div>

            {/* 版本时间轴 */}
            <ScrollArea className="flex-1">
                <div className="p-4 pt-6">
                    {sortedStates.map((state, index) => (
                        <VersionCard
                            key={state.versionId}
                            state={state}
                            index={index}
                            isLatest={state.versionNumber === latestVersion}
                            onDiffWithPrev={() => handleDiffWithPrev(state)}
                            onDiffWithVersion={() => handleSelectVersionForDiff(state.versionNumber)}
                        />
                    ))}

                    {sortedStates.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <p>没有符合条件的版本</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

