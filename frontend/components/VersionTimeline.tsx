"use client"

import Link from "next/link"
import { Version } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { GitCommit, FileText, FileDiff } from "lucide-react"

import { Trash2 } from "lucide-react"
import { deleteVersion } from "@/lib/api"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Helper to generate consistent colors based on version number
const getVersionColor = (num: number) => {
    const colors = [
        "bg-blue-100 text-blue-700 border-blue-200",
        "bg-green-100 text-green-700 border-green-200",
        "bg-purple-100 text-purple-700 border-purple-200",
        "bg-orange-100 text-orange-700 border-orange-200",
        "bg-pink-100 text-pink-700 border-pink-200",
        "bg-indigo-100 text-indigo-700 border-indigo-200",
    ]
    return colors[(num - 1) % colors.length]
}

interface VersionTimelineProps {
    versions: Version[]
    contractId: number
    onDelete?: () => void
}

export function VersionTimeline({ versions, contractId, onDelete }: VersionTimelineProps) {
    const router = useRouter()
    const [versionToDelete, setVersionToDelete] = useState<number | null>(null)

    const handleDelete = async () => {
        if (!versionToDelete) return
        try {
            await deleteVersion(contractId, versionToDelete)
            setVersionToDelete(null)
            if (onDelete) {
                onDelete()
            } else {
                router.refresh()
            }
        } catch (error) {
            console.error("删除版本失败:", error)
            alert("删除失败，请重试")
        }
    }

    return (
        <TooltipProvider>
            <div className="space-y-8">
                {versions.map((version, index) => {
                    const colorClass = getVersionColor(version.version_number)
                    return (
                        <div key={version.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors",
                                    colorClass.replace("bg-", "bg-opacity-20 bg-") // Lighter bg for icon
                                )}>
                                    <GitCommit className="h-5 w-5" />
                                </div>
                                {index !== versions.length - 1 && (
                                    <div className="h-full w-px bg-border" />
                                )}
                            </div>
                            <div className="flex-1 pb-8">
                                <Card className="hover:shadow-md transition-shadow group relative">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("font-bold", colorClass)}>
                                                v{version.version_number}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(version.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {index < versions.length - 1 && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/contracts/${contractId}/diff?base=${versions[index + 1].version_number}&target=${version.version_number}`}>
                                                            <Button variant="outline" size="sm" className="h-8">
                                                                <FileDiff className="mr-2 h-4 w-4" />
                                                                查看对比差异
                                                            </Button>
                                                        </Link >
                                                    </TooltipTrigger >
                                                    <TooltipContent>
                                                        <p>对比当前版本 (v{version.version_number}) 与上一版本</p>
                                                    </TooltipContent>
                                                </Tooltip >
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setVersionToDelete(version.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader >
                                    <CardContent>
                                        <p className="text-sm font-medium">{version.commit_message}</p>
                                        <div className="mt-2 flex items-center text-xs text-muted-foreground">
                                            <FileText className="mr-1 h-3 w-3" />
                                            {version.file_path ? version.file_path.split('/').pop() : 'Unknown File'}
                                        </div>
                                    </CardContent>
                                </Card >
                            </div >
                        </div >
                    )
                })}
                {
                    versions.length === 0 && (
                        <div className="text-center text-muted-foreground py-10">
                            暂无版本提交记录。
                        </div>
                    )
                }

                <AlertDialog open={!!versionToDelete} onOpenChange={(open) => !open && setVersionToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>确认删除此版本?</AlertDialogTitle>
                            <AlertDialogDescription>
                                此操作无法撤销。该版本文件将被永久删除。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            >
                                删除
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div >
        </TooltipProvider >
    )
}
