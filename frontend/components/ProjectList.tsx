"use client"

import { useState, useEffect } from "react"
import { Project } from "@/lib/types"
import { getProjects, createProject } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Folder, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

export function ProjectList() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [newProjectName, setNewProjectName] = useState("")
    const [newProjectDesc, setNewProjectDesc] = useState("")
    const [creating, setCreating] = useState(false)

    const loadProjects = async () => {
        try {
            const data = await getProjects()
            setProjects(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadProjects()
    }, [])

    const handleCreate = async () => {
        if (!newProjectName.trim()) return
        setCreating(true)
        try {
            await createProject(newProjectName, newProjectDesc)
            setOpen(false)
            setNewProjectName("")
            setNewProjectDesc("")
            loadProjects()
        } catch (error) {
            console.error(error)
            alert("创建项目失败")
        } finally {
            setCreating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">所有项目</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            新建项目
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>新建项目</DialogTitle>
                            <DialogDescription>
                                创建一个新的项目来组织您的合同。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>项目名称</Label>
                                <Input
                                    placeholder="例如：2024 年度采购合同"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>项目描述 (可选)</Label>
                                <Input
                                    placeholder="简要描述项目内容..."
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                            <Button onClick={handleCreate} disabled={!newProjectName.trim() || creating}>
                                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                创建
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
                    <Folder className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">暂无项目</h3>
                    <p className="text-slate-500 mt-1">创建一个新项目来开始管理合同</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Link key={project.id} href={`/projects/${project.id}`}>
                            <div className="group block p-6 bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                        <Folder className="h-5 w-5" />
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors -mr-2" />
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                                    {project.description || "无描述"}
                                </p>
                                <div className="text-xs text-slate-400 pt-4 border-t mt-auto">
                                    创建于 {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: zhCN })}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
