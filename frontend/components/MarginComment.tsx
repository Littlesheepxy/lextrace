import { Comment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MessageSquare } from "lucide-react"

interface MarginCommentProps {
    comment: Comment
    top: number
    onClick?: () => void
}

export function MarginComment({ comment, top, onClick }: MarginCommentProps) {
    return (
        <div
            className="absolute right-4 w-64 bg-white border shadow-sm rounded-lg p-3 cursor-pointer hover:shadow-md transition-all z-10 group"
            style={{ top: top }}
            onClick={(e) => {
                e.stopPropagation()
                onClick && onClick()
            }}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5 text-blue-500">
                    <MessageSquare className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-1 flex justify-between">
                        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 group-hover:line-clamp-none transition-all">
                        {comment.content}
                    </p>
                </div>
            </div>
        </div>
    )
}
