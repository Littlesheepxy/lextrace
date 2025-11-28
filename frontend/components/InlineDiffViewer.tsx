"use client"

import { DiffContent } from "@/lib/types"
import { cn } from "@/lib/utils"
import * as Diff from 'diff'
import { useMemo } from "react"

interface InlineDiffViewerProps {
    diffs: DiffContent[]
    onChunkClick?: (chunkId: string, content: string, e: React.MouseEvent) => void
    selectedChunkIds?: string[]
}

export function InlineDiffViewer({ diffs, onChunkClick, selectedChunkIds = [] }: InlineDiffViewerProps) {
    return (
        <div className="font-mono text-sm bg-white rounded-lg border shadow-sm">
            {diffs.map((item, index) => (
                <DiffRow
                    key={index}
                    item={item}
                    onClick={(e) => onChunkClick && onChunkClick(item.clause_id, item.modified || item.original || "", e)}
                    isSelected={selectedChunkIds.includes(item.clause_id)}
                />
            ))}
        </div>
    )
}

function DiffRow({ item, onClick, isSelected }: { item: DiffContent, onClick?: (e: React.MouseEvent) => void, isSelected?: boolean }) {
    // Calculate indentation style
    // Base padding 16px, plus 20px per indent level
    const indentStyle = { paddingLeft: `${(item.indent || 0) * 24 + 16}px` }
    const baseClasses = cn(
        "py-2 border-b last:border-0 transition-colors cursor-pointer relative group",
        isSelected ? "ring-2 ring-inset ring-blue-500 z-10" : ""
    )

    if (item.type === 'unchanged') {
        return (
            <div className={cn(baseClasses, "hover:bg-slate-50 border-slate-100")} style={indentStyle} onClick={onClick}>
                <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">{item.modified || item.original}</div>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border shadow-sm">备注</span>
                </div>
            </div>
        )
    }

    if (item.type === 'added') {
        return (
            <div className={cn(baseClasses, "bg-green-50/40 border-green-100 hover:bg-green-50/60")} style={indentStyle} onClick={onClick}>
                <div className="text-green-800 whitespace-pre-wrap leading-relaxed">
                    <span className="select-none mr-2 text-green-500 font-bold">+</span>
                    {item.modified}
                </div>
            </div>
        )
    }

    if (item.type === 'modified') {
        // Merge View: Compute word-level diff
        // We use useMemo to avoid re-calculating on every render
        const diffResult = useMemo(() => {
            if (!item.original || !item.modified) return []
            return Diff.diffChars(item.original, item.modified)
        }, [item.original, item.modified])

        return (
            <div className={cn(baseClasses, "bg-yellow-50/30 border-yellow-100 hover:bg-yellow-50/50")} style={indentStyle} onClick={onClick}>
                <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                    <span className="select-none mr-2 text-yellow-500 font-bold">•</span>
                    {diffResult.map((part, i) => {
                        if (part.added) {
                            return (
                                <span key={i} className="bg-green-100 text-green-800 border-b-2 border-green-300 px-0.5 mx-0.5 rounded-sm decoration-clone">
                                    {part.value}
                                </span>
                            )
                        }
                        if (part.removed) {
                            return (
                                <span key={i} className="bg-red-50 text-red-800 line-through decoration-red-400 decoration-2 px-0.5 mx-0.5 rounded-sm opacity-70 decoration-clone">
                                    {part.value}
                                </span>
                            )
                        }
                        return <span key={i}>{part.value}</span>
                    })}
                </div>
                {item.change_type && (
                    <div className="mt-1.5 ml-6 flex flex-wrap gap-2">
                        {item.change_type === 'renumbered' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                编号变更: {item.old_number} → {item.new_number}
                            </span>
                        )}
                        {item.change_type === 'renamed' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                标题变更
                            </span>
                        )}
                        {item.similarity !== undefined && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600" title="文本相似度">
                                Sim: {(item.similarity * 100).toFixed(0)}%
                            </span>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return null
}
