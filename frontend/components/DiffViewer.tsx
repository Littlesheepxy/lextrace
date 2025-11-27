import { DiffContent } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import * as DiffLib from 'diff';

interface DiffViewerProps {
    diffs: DiffContent[]
}

export function DiffViewer({ diffs }: DiffViewerProps) {
    return (
        <div className="space-y-4">
            {diffs.map((diff, index) => (
                <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-muted-foreground">
                                条款 {diff.clause_id}
                            </span>
                            <Badge
                                variant={
                                    diff.type === "added"
                                        ? "default"
                                        : diff.type === "deleted"
                                            ? "destructive"
                                            : "secondary"
                                }
                                className={cn(
                                    diff.type === "modified" && "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
                                )}
                            >
                                {diff.type === "added"
                                    ? "新增"
                                    : diff.type === "deleted"
                                        ? "删除"
                                        : "修改"}
                            </Badge>
                        </div>
                        <Badge variant="outline" className={cn(
                            diff.risk === "high" ? "text-red-600 border-red-200 bg-red-50" :
                                diff.risk === "medium" ? "text-yellow-600 border-yellow-200 bg-yellow-50" :
                                    "text-green-600 border-green-200 bg-green-50"
                        )}>
                            {diff.risk === "high" ? "高风险" : diff.risk === "medium" ? "中风险" : "低风险"}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-red-50/50 rounded-md border border-red-100">
                            <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                变更前
                            </div>
                            <div className={cn("whitespace-pre-wrap text-sm leading-relaxed", diff.type === "added" && "text-muted-foreground italic")}>
                                {diff.type === 'modified' ? (
                                    <span>
                                        {DiffLib.diffWords(diff.original || "", diff.modified || "").map((part: DiffLib.Change, i: number) => (
                                            part.removed ? (
                                                <span key={i} className="bg-red-100 text-red-900 line-through decoration-red-400 mx-0.5 rounded-sm px-0.5">
                                                    {part.value}
                                                </span>
                                            ) : part.added ? null : (
                                                <span key={i} className="text-slate-600">{part.value}</span>
                                            )
                                        ))}
                                    </span>
                                ) : (
                                    <span className={cn(diff.type === 'deleted' && "bg-red-100 text-red-900 line-through decoration-red-400")}>
                                        {diff.original || "(无)"}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-3 bg-green-50/50 rounded-md border border-green-100">
                            <div className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                变更后
                            </div>
                            <div className={cn("whitespace-pre-wrap text-sm leading-relaxed", diff.type === "deleted" && "text-muted-foreground italic")}>
                                {diff.type === 'modified' ? (
                                    <span>
                                        {DiffLib.diffWords(diff.original || "", diff.modified || "").map((part: DiffLib.Change, i: number) => (
                                            part.added ? (
                                                <span key={i} className="bg-green-100 text-green-900 font-semibold mx-0.5 rounded-sm px-0.5">
                                                    {part.value}
                                                </span>
                                            ) : part.removed ? null : (
                                                <span key={i} className="text-slate-900">{part.value}</span>
                                            )
                                        ))}
                                    </span>
                                ) : (
                                    <span className={cn(diff.type === 'added' && "bg-green-100 text-green-900 font-semibold")}>
                                        {diff.modified || "(已删除)"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
