"use client"

import { useState } from "react"
import { Version } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { X, ArrowLeftRight, Play, Clock, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { HistoryDialog } from "@/components/HistoryDialog"

interface VersionComparisonPanelProps {
    versions: Version[]
    contractId: number
}

export function VersionComparisonPanel({ versions, contractId }: VersionComparisonPanelProps) {
    const router = useRouter()
    const [baseVersion, setBaseVersion] = useState<Version | null>(null)
    const [targetVersion, setTargetVersion] = useState<Version | null>(null)

    // Sort versions desc (newest first)
    const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number)

    const handleDragStart = (e: React.DragEvent, version: Version) => {
        e.dataTransfer.setData("versionId", version.id.toString())
        e.dataTransfer.effectAllowed = "copy"
    }

    const handleDrop = (e: React.DragEvent, slot: 'base' | 'target') => {
        e.preventDefault()
        const versionId = Number(e.dataTransfer.getData("versionId"))
        const version = versions.find(v => v.id === versionId)

        if (!version) return

        if (slot === 'base') {
            if (targetVersion?.id === versionId) setTargetVersion(null) // Prevent same version
            setBaseVersion(version)
        } else {
            if (baseVersion?.id === versionId) setBaseVersion(null) // Prevent same version
            setTargetVersion(version)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
    }

    const handleCompare = () => {
        if (baseVersion && targetVersion) {
            router.push(`/contracts/${contractId}/diff?base=${baseVersion.version_number}&target=${targetVersion.version_number}`)
        }
    }

    const handleReset = () => {
        setBaseVersion(null)
        setTargetVersion(null)
    }

    const [isHovered, setIsHovered] = useState(false)

    const [showHistory, setShowHistory] = useState(false)

    // Helper to generate consistent colors based on version number
    const getVersionColor = (num: number) => {
        const colors = [
            "bg-blue-100 text-blue-700 border-blue-200 group-hover:bg-blue-200",
            "bg-green-100 text-green-700 border-green-200 group-hover:bg-green-200",
            "bg-purple-100 text-purple-700 border-purple-200 group-hover:bg-purple-200",
            "bg-orange-100 text-orange-700 border-orange-200 group-hover:bg-orange-200",
            "bg-pink-100 text-pink-700 border-pink-200 group-hover:bg-pink-200",
            "bg-indigo-100 text-indigo-700 border-indigo-200 group-hover:bg-indigo-200",
        ]
        return colors[(num - 1) % colors.length]
    }

    return (
        <div
            className={cn(
                "fixed bottom-0 left-0 right-0 z-50 flex justify-center transition-transform duration-300 ease-in-out",
                isHovered ? "translate-y-0" : "translate-y-[calc(100%-12px)]"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Trigger Strip */}
            <div className="absolute -top-3 left-0 right-0 h-4 flex justify-center cursor-pointer">
                <div className="w-32 h-1.5 bg-slate-300 rounded-full" />
            </div>

            <div className="w-full max-w-5xl bg-white/95 backdrop-blur-sm border-t border-x rounded-t-2xl shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] p-6 pb-8 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                        版本对比分析
                    </h3>
                    <div className="flex items-center gap-3">
                        <HistoryDialog
                            contractId={contractId}
                            open={showHistory}
                            onOpenChange={setShowHistory}
                            trigger={
                                <Button variant="outline" size="sm" className="h-8 rounded-full">
                                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                                    历史记录
                                </Button>
                            }
                        />
                        <div className="h-4 w-px bg-slate-200" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            disabled={!baseVersion && !targetVersion}
                            className="text-xs h-8 rounded-full px-4"
                        >
                            重置
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCompare}
                            disabled={!baseVersion || !targetVersion}
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-xs rounded-full px-6 shadow-md shadow-blue-200"
                        >
                            <Play className="mr-1.5 h-3 w-3" />
                            开始对比
                        </Button>
                    </div>
                </div>

                {/* Version Strip (Horizontal) */}
                <div className="space-y-2">
                    <ScrollArea className="w-full whitespace-nowrap pb-2">
                        <div className="flex w-max space-x-3 px-1">
                            {sortedVersions.map((version) => {
                                const colorClass = getVersionColor(version.version_number)
                                return (
                                    <div
                                        key={version.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, version)}
                                        className={cn(
                                            "flex flex-col w-[140px] p-2.5 rounded-xl border bg-white shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all shrink-0 group",
                                            (baseVersion?.id === version.id || targetVersion?.id === version.id) && "opacity-50 cursor-not-allowed bg-slate-50 border-slate-100 shadow-none"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5", colorClass)}>
                                                v{version.version_number}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(version.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="text-xs font-medium truncate text-slate-700 group-hover:text-slate-900" title={version.commit_message}>
                                            {version.commit_message}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                {/* Drop Slots */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {/* Base Slot */}
                    <div
                        className={cn(
                            "md:col-span-5 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all relative px-4",
                            baseVersion
                                ? "border-blue-300 bg-blue-50 shadow-sm"
                                : "border-slate-300 hover:border-blue-400 hover:bg-white bg-white/50"
                        )}
                        onDrop={(e) => handleDrop(e, 'base')}
                        onDragOver={handleDragOver}
                    >
                        {baseVersion ? (
                            <div className="flex items-center gap-3 w-full">
                                <Badge className={cn("shadow-none shrink-0", getVersionColor(baseVersion.version_number).replace("group-hover:", ""))}>
                                    原始 v{baseVersion.version_number}
                                </Badge>
                                <span className="text-sm text-slate-600 truncate flex-1">{baseVersion.commit_message}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 shrink-0"
                                    onClick={() => setBaseVersion(null)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="text-slate-400 text-xs flex items-center gap-2 pointer-events-none">
                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                拖拽版本至此作为 <span className="font-medium text-slate-500">原始版本</span>
                            </div>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex md:col-span-1 items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </div>

                    {/* Target Slot */}
                    <div
                        className={cn(
                            "md:col-span-5 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all relative px-4",
                            targetVersion
                                ? "border-green-300 bg-green-50 shadow-sm"
                                : "border-slate-300 hover:border-green-400 hover:bg-white bg-white/50"
                        )}
                        onDrop={(e) => handleDrop(e, 'target')}
                        onDragOver={handleDragOver}
                    >
                        {targetVersion ? (
                            <div className="flex items-center gap-3 w-full">
                                <Badge className={cn("shadow-none shrink-0", getVersionColor(targetVersion.version_number).replace("group-hover:", ""))}>
                                    对比 v{targetVersion.version_number}
                                </Badge>
                                <span className="text-sm text-slate-600 truncate flex-1">{targetVersion.commit_message}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-green-100 text-green-400 hover:text-green-600 shrink-0"
                                    onClick={() => setTargetVersion(null)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="text-slate-400 text-xs flex items-center gap-2 pointer-events-none">
                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                拖拽版本至此作为 <span className="font-medium text-slate-500">对比版本</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
