"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ContractList } from "@/components/ContractList"
import { getProject } from "@/lib/api"
import { Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function ProjectPage() {
    const params = useParams()
    const router = useRouter()
    const projectId = parseInt(params.id as string)
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projectId) return
        getProject(projectId)
            .then(setProject)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [projectId])

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="container mx-auto py-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">项目不存在</h2>
                <Button variant="link" onClick={() => router.push('/')} className="mt-4">
                    返回首页
                </Button>
            </div>
        )
    }

    return (
        <main className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 -ml-2 text-slate-500 hover:text-slate-900"
                    onClick={() => router.push('/')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回项目列表
                </Button>
                <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
                {project.description && (
                    <p className="text-slate-500 mt-2">{project.description}</p>
                )}
            </div>

            <ContractList projectId={projectId} />
        </main>
    )
}
