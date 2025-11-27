"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Diff, DiffContent, Analysis } from "@/lib/types"
import { getDiff, getAnalysis } from "@/lib/api"
import { DiffViewer } from "@/components/DiffViewer"
import { AISummaryCard } from "@/components/AISummaryCard"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function DiffPage() {
    const params = useParams()
    const contractId = Number(params.id)
    const versionId = Number(params.vid)

    const [diffData, setDiffData] = useState<Diff | null>(null)
    const [parsedContent, setParsedContent] = useState<DiffContent[]>([])
    const [analysis, setAnalysis] = useState<Analysis | null>(null)
    const [loadingDiff, setLoadingDiff] = useState(true)
    const [loadingAnalysis, setLoadingAnalysis] = useState(false)

    useEffect(() => {
        if (contractId && versionId) {
            loadDiff()
        }
    }, [contractId, versionId])

    async function loadDiff() {
        try {
            setLoadingDiff(true)
            const data = await getDiff(contractId, versionId)
            setDiffData(data)
            if (data.content) {
                setParsedContent(JSON.parse(data.content))
            }

            // Start loading analysis after diff is loaded
            loadAnalysis()
        } catch (error) {
            console.error("加载 Diff 失败:", error)
        } finally {
            setLoadingDiff(false)
        }
    }

    async function loadAnalysis() {
        try {
            setLoadingAnalysis(true)
            const data = await getAnalysis(contractId, versionId)
            setAnalysis(data)

            // Merge risk assessments into diff content for display
            if (data.risk_assessments) {
                setParsedContent(prev => prev.map(item => ({
                    ...item,
                    risk: data.risk_assessments[item.clause_id]?.risk
                })))
            }
        } catch (error) {
            console.error("加载 AI 分析失败:", error)
        } finally {
            setLoadingAnalysis(false)
        }
    }

    if (loadingDiff) return <div className="flex items-center justify-center h-full">正在加载差异...</div>
    if (!diffData) return <div>无法加载差异数据</div>

    return (
        <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center gap-4 flex-shrink-0">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/contracts/${contractId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">版本比对</h2>
                    <p className="text-muted-foreground">
                        正在查看版本 v{versionId} 的变更详情
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-2 overflow-y-auto pr-2">
                    <h3 className="text-lg font-semibold mb-4">条款级变更详情</h3>
                    <DiffViewer diffs={parsedContent} />
                </div>
                <div className="overflow-y-auto">
                    <div className="sticky top-0 space-y-6">
                        {loadingAnalysis ? (
                            <div className="border rounded-lg p-6 bg-muted/30 flex flex-col items-center justify-center space-y-2">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">AI 正在分析风险...</p>
                            </div>
                        ) : analysis ? (
                            <AISummaryCard summary={analysis.summary} />
                        ) : null}
                        {/* 这里可以放置更多辅助信息，如风险统计图表等 */}
                    </div>
                </div>
            </div>
        </div>

    )
}
