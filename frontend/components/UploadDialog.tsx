"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, File, X, Calendar, GripVertical } from "lucide-react"
import { stageBatchVersions, commitBatchVersions, uploadVersion } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useDropzone } from "react-dropzone"

interface UploadDialogProps {
    contractId: number
    onUploadSuccess: () => void
}

interface StagedFile {
    file_id: string
    original_filename: string
    detected_date: string | null
    commit_message: string
}

export function UploadDialog({ contractId, onUploadSuccess }: UploadDialogProps) {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')
    const [loading, setLoading] = useState(false)

    // Single Upload State
    const [singleFile, setSingleFile] = useState<File | null>(null)
    const [singleMessage, setSingleMessage] = useState("")

    // Batch Upload State
    const [batchStep, setBatchStep] = useState<'upload' | 'review'>('upload')
    const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

    // Reset state on close
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setTimeout(() => {
                setSingleFile(null)
                setSingleMessage("")
                setBatchStep('upload')
                setStagedFiles([])
                setActiveTab('single')
            }, 300)
        }
    }

    // --- Single Upload Dropzone ---
    const onDropSingle = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.[0]) setSingleFile(acceptedFiles[0])
    }, [])

    const onDropRejected = useCallback(() => {
        alert("文件格式不支持或文件过多，请上传 .docx 文件")
    }, [])

    const {
        getRootProps: getSingleRootProps,
        getInputProps: getSingleInputProps,
        isDragActive: isSingleDragActive
    } = useDropzone({
        onDrop: onDropSingle,
        onDropRejected,
        maxFiles: 1,
        accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/zip': ['.docx'],
            'application/octet-stream': ['.docx']
        }
    })

    const handleSingleSubmit = async () => {
        if (!singleFile) return
        setLoading(true)
        try {
            await uploadVersion(contractId, singleFile, singleMessage || "更新版本")
            handleOpenChange(false)
            onUploadSuccess()
        } catch (error) {
            console.error(error)
            alert("上传失败")
        } finally {
            setLoading(false)
        }
    }

    // --- Batch Upload Dropzone ---
    const onDropBatch = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setLoading(true)
            try {
                const staged = await stageBatchVersions(contractId, acceptedFiles)

                const mappedFiles = staged.map((f: any) => ({
                    ...f,
                    commit_message: f.detected_date
                        ? `文档日期: ${new Date(f.detected_date).toLocaleDateString()}`
                        : f.original_filename
                }))

                setStagedFiles(mappedFiles)
                setBatchStep('review')
            } catch (error) {
                console.error("Staging failed:", error)
                alert("文件解析失败")
            } finally {
                setLoading(false)
            }
        }
    }, [contractId])

    const {
        getRootProps: getBatchRootProps,
        getInputProps: getBatchInputProps,
        isDragActive: isBatchDragActive
    } = useDropzone({
        onDrop: onDropBatch,
        onDropRejected,
        multiple: true,
        accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/zip': ['.docx'],
            'application/octet-stream': ['.docx']
        }
    })

    const handleBatchCommit = async () => {
        setLoading(true)
        try {
            await commitBatchVersions(contractId, stagedFiles)
            handleOpenChange(false)
            onUploadSuccess()
        } catch (error) {
            console.error("Commit failed:", error)
            alert("保存版本失败")
        } finally {
            setLoading(false)
        }
    }

    // Drag and Drop Logic (Reordering)
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = "move"
        const img = new Image()
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        e.dataTransfer.setDragImage(img, 0, 0)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return

        const newFiles = [...stagedFiles]
        const draggedItem = newFiles[draggedIndex]
        newFiles.splice(draggedIndex, 1)
        newFiles.splice(index, 0, draggedItem)

        setStagedFiles(newFiles)
        setDraggedIndex(index)
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    上传新版本
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header with Tabs */}
                <div className="px-6 pt-6 pb-4 border-b bg-slate-50/50">
                    <DialogTitle className="mb-4 text-xl">上传版本</DialogTitle>
                    <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('single')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'single'
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            单文件上传
                        </button>
                        <button
                            onClick={() => setActiveTab('batch')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'batch'
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            批量上传
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'single' ? (
                        <div className="space-y-6">
                            <div
                                {...getSingleRootProps()}
                                className={cn(
                                    "border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all",
                                    isSingleDragActive ? "border-blue-500 bg-blue-50" : (singleFile ? "bg-blue-50 border-blue-200" : "hover:bg-slate-50 border-slate-200 hover:border-blue-400")
                                )}
                            >
                                <input {...getSingleInputProps()} />
                                {singleFile ? (
                                    <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <File className="h-6 w-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-slate-900">{singleFile.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{(singleFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSingleFile(null)
                                            }}
                                        >
                                            移除文件
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center transition-colors", isSingleDragActive ? "bg-blue-100 text-blue-600" : "bg-slate-100")}>
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-slate-600">
                                                {isSingleDragActive ? "释放文件以上传" : "点击或拖拽文件至此"}
                                            </p>
                                            <p className="text-xs mt-1">仅支持 .docx 格式</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>版本备注</Label>
                                <Input
                                    placeholder="例如：更新了第 3 条款..."
                                    value={singleMessage}
                                    onChange={(e) => setSingleMessage(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        // Batch Tab
                        <div className="h-full flex flex-col">
                            {batchStep === 'upload' ? (
                                <div
                                    {...getBatchRootProps()}
                                    className={cn(
                                        "flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all",
                                        isBatchDragActive ? "border-blue-500 bg-blue-50" : "hover:bg-slate-50 border-slate-200 hover:border-blue-400"
                                    )}
                                >
                                    <input {...getBatchInputProps()} />
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                            <p className="text-sm text-slate-500">正在分析文件日期...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <div className={cn("h-12 w-12 rounded-full flex items-center justify-center transition-colors", isBatchDragActive ? "bg-blue-100 text-blue-600" : "bg-slate-100")}>
                                                <Upload className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-slate-600">
                                                    {isBatchDragActive ? "释放文件以批量上传" : "点击选择多个文件"}
                                                </p>
                                                <p className="text-xs mt-1">自动识别日期并排序</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 h-full flex flex-col">
                                    <div className="flex items-center justify-between text-sm text-slate-500 px-1">
                                        <span>请确认版本顺序 (从旧到新)</span>
                                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                            可拖拽调整顺序
                                        </span>
                                    </div>
                                    <ScrollArea className="flex-1 -mx-2 px-2">
                                        <div className="space-y-2 pb-4">
                                            {stagedFiles.map((file, index) => (
                                                <div
                                                    key={file.file_id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, index)}
                                                    onDragOver={(e) => handleDragOver(e, index)}
                                                    onDragEnd={handleDragEnd}
                                                    className={cn(
                                                        "flex items-start gap-3 p-3 bg-white border rounded-lg shadow-sm group transition-all cursor-move",
                                                        draggedIndex === index ? "opacity-50 border-blue-400 bg-blue-50 scale-[0.98]" : "hover:border-blue-300 hover:shadow-md"
                                                    )}
                                                >
                                                    <div className="mt-2 text-slate-300 group-hover:text-slate-500">
                                                        <GripVertical className="h-5 w-5" />
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">
                                                                {index + 1}
                                                            </div>
                                                            <span className="font-medium text-sm truncate text-slate-700" title={file.original_filename}>
                                                                {file.original_filename}
                                                            </span>
                                                            {file.detected_date && (
                                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 font-normal">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(file.detected_date).toLocaleDateString()}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <Input
                                                            value={file.commit_message}
                                                            onChange={(e) => {
                                                                const newFiles = [...stagedFiles]
                                                                newFiles[index].commit_message = e.target.value
                                                                setStagedFiles(newFiles)
                                                            }}
                                                            className="h-8 text-xs bg-slate-50/50"
                                                            placeholder="输入版本备注..."
                                                        />
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-300 hover:text-red-500 -mr-1"
                                                        onClick={() => {
                                                            const newFiles = [...stagedFiles]
                                                            newFiles.splice(index, 1)
                                                            setStagedFiles(newFiles)
                                                            if (newFiles.length === 0) setBatchStep('upload')
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50/50 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                        取消
                    </Button>
                    {activeTab === 'single' ? (
                        <Button onClick={handleSingleSubmit} disabled={!singleFile || loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            确认上传
                        </Button>
                    ) : (
                        batchStep === 'review' ? (
                            <>
                                <Button variant="ghost" onClick={() => setBatchStep('upload')} disabled={loading}>
                                    重新选择
                                </Button>
                                <Button onClick={handleBatchCommit} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    确认导入 ({stagedFiles.length})
                                </Button>
                            </>
                        ) : (
                            <Button disabled className="opacity-50">
                                请先选择文件
                            </Button>
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
