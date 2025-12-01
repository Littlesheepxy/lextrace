"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Contract, Version } from "@/lib/types"
import { getContract, getVersions, uploadVersion } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, GitBranch, ClipboardCheck } from "lucide-react"
import Link from "next/link"
import { VersionTimeline } from "@/components/VersionTimeline"
import { UploadDialog } from "@/components/UploadDialog"
import { VersionComparisonPanel } from "@/components/VersionComparisonPanel"

export default function ContractDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = Number(params.id)

    const [contract, setContract] = useState<Contract | null>(null)
    const [versions, setVersions] = useState<Version[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            loadData()
        }
    }, [id])

    async function loadData() {
        try {
            const [c, v] = await Promise.all([
                getContract(id),
                getVersions(id)
            ])
            setContract(c)
            setVersions(v)
        } catch (error) {
            console.error("加载失败:", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleUpload(file: File, message: string) {
        try {
            await uploadVersion(id, file, message || "更新版本")
            loadData() // Reload versions
        } catch (error) {
            console.error("上传失败:", error)
            alert("上传失败，请重试")
        }
    }

    if (loading) return <div>加载中...</div>
    if (!contract) return <div>合同不存在</div>

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {contract.name}
                            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                ID: {contract.id}
                            </span>
                        </h2>
                        <p className="text-muted-foreground">
                            查看版本历史和变更记录
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        asChild
                        className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                    >
                        <Link href={`/contracts/${id}/review`}>
                            <ClipboardCheck className="h-4 w-4" />
                            条款审查
                        </Link>
                    </Button>
                    <UploadDialog contractId={id} onUploadSuccess={loadData} />
                </div>
            </div>


            <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-6">
                <div className="flex-1 overflow-y-auto">
                    <VersionTimeline versions={versions} contractId={id} onDelete={loadData} /> {/* Keep VersionTimeline */}
                </div>
                <div className="flex-shrink-0 pt-2 border-t">
                    <VersionComparisonPanel versions={versions} contractId={id} />
                </div>
            </div>
        </div>
    )
}
