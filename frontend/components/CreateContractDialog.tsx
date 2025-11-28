"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus } from "lucide-react"

interface CreateContractDialogProps {
    onSubmit: (name: string) => Promise<void>
}

export function CreateContractDialog({ onSubmit }: CreateContractDialogProps) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!name.trim()) return
        try {
            setLoading(true)
            await onSubmit(name)
            setOpen(false)
            setName("")
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    新建合同
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>新建合同</DialogTitle>
                    <DialogDescription>
                        请输入合同名称以创建新合同。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">合同名称</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例如：2024年度服务协议"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>取消</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        创建
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
