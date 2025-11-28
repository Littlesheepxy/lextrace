"use client"

import { useState, useEffect } from "react"
import { Comment } from "@/lib/types"
import { createComment, deleteComment } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Trash2, X, Plus } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CommentPanelProps {
    contractId: number
    versionId: number
    selectedElementIds?: string[]
    selectedQuote?: string | null
    comments: Comment[] // New prop
    onCommentsChange: () => void // New prop to trigger refresh
    onClose?: () => void
}

export function CommentPanel({ contractId, versionId, selectedElementIds = [], selectedQuote, comments, onCommentsChange, onClose }: CommentPanelProps) {
    const [newComment, setNewComment] = useState("")
    const [loading, setLoading] = useState(false)

    // Removed internal useEffect and loadComments

    const handleSubmit = async () => {
        if (!newComment.trim() || selectedElementIds.length === 0) return
        setLoading(true)
        try {
            // Batch create comments for all selected elements
            await Promise.all(selectedElementIds.map(id =>
                createComment(contractId, versionId, id, newComment, selectedQuote || undefined)
            ))
            setNewComment("")
            onCommentsChange() // Trigger refresh
        } catch (error) {
            console.error("发表评论失败:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("确定删除这条备注吗？")) return
        try {
            await deleteComment(contractId, versionId, id)
            onCommentsChange() // Trigger refresh
        } catch (error) {
            console.error("删除评论失败:", error)
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 border-l w-80 shadow-xl z-20">
            <div className="p-4 border-b bg-white flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    备注列表
                </h3>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center text-slate-400 py-8 text-sm">
                            暂无备注
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className={cn(
                                "bg-white p-3 rounded-lg border shadow-sm transition-all",
                                selectedElementIds.includes(comment.element_id) ? "ring-2 ring-blue-500 ring-offset-2" : ""
                            )}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-slate-400">
                                        {format(new Date(comment.created_at), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 -mr-2 -mt-2 text-slate-300 hover:text-red-500"
                                        onClick={() => handleDelete(comment.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                {comment.quote && (
                                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mb-2 border-l-2 border-blue-300 italic">
                                        "{comment.quote}"
                                    </div>
                                )}
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {selectedElementIds.length > 0 ? (
                <div className="p-4 bg-white border-t flex-shrink-0">
                    <div className="mb-2 text-xs font-medium text-blue-600 flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        为选中的 {selectedElementIds.length} 个段落添加备注
                    </div>
                    {selectedQuote && (
                        <div className="text-xs text-slate-500 mb-2 line-clamp-2 italic">
                            引文: "{selectedQuote}"
                        </div>
                    )}
                    <Textarea
                        placeholder="输入备注内容..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px] mb-2 text-sm resize-none"
                    />
                    <Button
                        size="sm"
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={!newComment.trim() || loading}
                    >
                        {loading ? "提交中..." : "添加备注"}
                    </Button>
                </div>
            ) : (
                <div className="p-4 bg-slate-100 border-t text-center text-xs text-slate-500">
                    点击左侧变更段落以添加备注<br />
                    <span className="text-[10px] text-slate-400">(按住 Shift/Cmd 可多选)</span>
                </div>
            )}
        </div>
    )
}
