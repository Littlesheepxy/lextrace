"use client"

import { DiffContent } from "@/lib/types"
import { cn } from "@/lib/utils"
import * as DiffLib from "diff"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState, useRef, useEffect } from "react"
import { ArrowLeftRight, Lock, Unlock, Eye, EyeOff } from "lucide-react"

interface InlineDiffViewerProps {
    diffs: DiffContent[]
}

export function InlineDiffViewer({ diffs }: InlineDiffViewerProps) {
    const [showChangesOnly, setShowChangesOnly] = useState(false)
    const [syncScroll, setSyncScroll] = useState(true)

    const leftScrollRef = useRef<HTMLDivElement>(null)
    const rightScrollRef = useRef<HTMLDivElement>(null)
    const isScrolling = useRef<"left" | "right" | null>(null)

    // Filter diffs based on toggle
    const visibleDiffs = showChangesOnly
        ? diffs.filter(d => d.type !== 'unchanged')
        : diffs

    // Sync Scroll Logic
    const handleScroll = (source: "left" | "right") => {
        if (!syncScroll) return
        if (isScrolling.current && isScrolling.current !== source) return

        isScrolling.current = source
        const sourceRef = source === "left" ? leftScrollRef.current : rightScrollRef.current
        const targetRef = source === "left" ? rightScrollRef.current : leftScrollRef.current

        if (sourceRef && targetRef) {
            const percentage = sourceRef.scrollTop / (sourceRef.scrollHeight - sourceRef.clientHeight)
            targetRef.scrollTop = percentage * (targetRef.scrollHeight - targetRef.clientHeight)
        }

        // Reset lock after a small delay
        setTimeout(() => {
            isScrolling.current = null
        }, 50)
    }

    // Render Left Side (Original): Show deletions in red, hide additions
    const renderLeftContent = (diff: DiffContent) => {
        if (diff.type === 'added') return null // Nothing existed here
        if (diff.type === 'deleted') {
            return <span className="bg-red-100 text-red-900 line-through decoration-red-400">{diff.original}</span>
        }
        if (diff.type === 'unchanged') {
            return <span className="text-slate-400">{diff.original}</span>
        }
        // Modified: Show deletions
        return (
            <span>
                {DiffLib.diffWords(diff.original || "", diff.modified || "").map((part, i) => {
                    if (part.removed) return <span key={i} className="bg-red-100 text-red-900 line-through decoration-red-400">{part.value}</span>
                    if (part.added) return null
                    return <span key={i} className="text-slate-400">{part.value}</span>
                })}
            </span>
        )
    }

    // Render Right Side (Target): Show additions in green, hide deletions
    const renderRightContent = (diff: DiffContent) => {
        if (diff.type === 'deleted') return null // Removed in new version
        if (diff.type === 'added') {
            return <span className="bg-green-100 text-green-900 font-semibold">{diff.modified}</span>
        }
        if (diff.type === 'unchanged') {
            return <span className="text-slate-900">{diff.modified}</span>
        }
        // Modified: Show additions
        return (
            <span>
                {DiffLib.diffWords(diff.original || "", diff.modified || "").map((part, i) => {
                    if (part.added) return <span key={i} className="bg-green-100 text-green-900 font-semibold">{part.value}</span>
                    if (part.removed) return null
                    return <span key={i} className="text-slate-900">{part.value}</span>
                })}
            </span>
        )
    }

    return (
        <div className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 text-sm">
                <div className="flex items-center gap-4 text-slate-600">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="show-changes"
                            checked={showChangesOnly}
                            onCheckedChange={setShowChangesOnly}
                        />
                        <Label htmlFor="show-changes" className="cursor-pointer flex items-center gap-1">
                            {showChangesOnly ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            仅显示变更
                        </Label>
                    </div>
                    <div className="w-px h-4 bg-slate-300" />
                    <div className="flex items-center gap-2">
                        <Switch
                            id="sync-scroll"
                            checked={syncScroll}
                            onCheckedChange={setSyncScroll}
                        />
                        <Label htmlFor="sync-scroll" className="cursor-pointer flex items-center gap-1">
                            {syncScroll ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            同步滚动
                        </Label>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-100 border border-red-200 block" /> 删除</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-100 border border-green-200 block" /> 新增</div>
                </div>
            </div>

            {/* Header Columns */}
            <div className="flex items-center border-b bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="flex-1 px-4 py-2 border-r bg-slate-50/50">修改前 (Base)</div>
                <div className="flex-1 px-4 py-2 bg-white">修改后 (Target)</div>
            </div>

            {/* Split View Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Column */}
                <div
                    ref={leftScrollRef}
                    onScroll={() => handleScroll("left")}
                    className="flex-1 overflow-y-auto border-r bg-slate-50/30"
                >
                    <div className="min-h-full py-4">
                        {visibleDiffs.map((diff) => (
                            <div
                                key={`left-${diff.clause_id}`}
                                className={cn(
                                    "px-6 py-1 text-sm leading-relaxed whitespace-pre-wrap min-h-[1.5rem] hover:bg-slate-100/50 transition-colors",
                                    diff.type === 'deleted' && "bg-red-50/30 hover:bg-red-50/50",
                                    diff.type === 'modified' && "bg-yellow-50/10 hover:bg-yellow-50/20"
                                )}
                            >
                                {renderLeftContent(diff)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div
                    ref={rightScrollRef}
                    onScroll={() => handleScroll("right")}
                    className="flex-1 overflow-y-auto bg-white"
                >
                    <div className="min-h-full py-4">
                        {visibleDiffs.map((diff) => (
                            <div
                                key={`right-${diff.clause_id}`}
                                className={cn(
                                    "px-6 py-1 text-sm leading-relaxed whitespace-pre-wrap min-h-[1.5rem] hover:bg-slate-50 transition-colors",
                                    diff.type === 'added' && "bg-green-50/30 hover:bg-green-50/50",
                                    diff.type === 'modified' && "bg-yellow-50/10 hover:bg-yellow-50/20"
                                )}
                            >
                                {renderRightContent(diff)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
