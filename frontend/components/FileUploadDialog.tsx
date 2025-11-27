"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, File, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadDialogProps {
    trigger?: React.ReactNode
    title: string
    onSubmit: (file: File, message: string) => Promise<void>
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function FileUploadDialog({ trigger, title, onSubmit, open, onOpenChange }: FileUploadDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setIsOpen = isControlled ? onOpenChange! : setInternalOpen

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = async () => {
        if (!file) return
        try {
            setLoading(true)
            await onSubmit(file, message)
            setIsOpen(false)
            setFile(null)
            setMessage("")
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
                            dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
                            file ? "bg-muted/30" : ""
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            accept=".docx"
                            onChange={handleChange}
                        />
                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <File className="h-8 w-8 text-primary" />
                                <span className="text-sm font-medium text-center break-all">{file.name}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setFile(null)
                                    }}
                                >
                                    移除
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Upload className="h-8 w-8" />
                                <span className="text-sm">点击或拖拽文件至此</span>
                                <span className="text-xs text-muted-foreground/70">支持 .docx 格式</span>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="message">提交信息 (Commit Message)</Label>
                        <Input
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="例如：更新了付款条款..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>取消</Button>
                    <Button onClick={handleSubmit} disabled={!file || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        上传
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
