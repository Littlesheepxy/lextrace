"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { DiffContent, Analysis } from "@/lib/types"
import { getDiff, getAnalysis, getVersion } from "@/lib/api"
import { DiffViewer } from "@/components/DiffViewer"
import { InlineDiffViewer } from "@/components/InlineDiffViewer"
import { CommentPanel } from "@/components/CommentPanel"
import { HighFidelityViewer } from "@/components/HighFidelityViewer"
import { FloatingRemarkButton } from "@/components/FloatingRemarkButton"
import { AISummaryCard } from "@/components/AISummaryCard"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, AlertTriangle, CheckCircle, ExternalLink, Loader2, ArrowRight, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Version } from "@/lib/types"

export default function ArbitraryDiffPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const contractId = Number(params.id)

    // Get version Numbers from query params (User sees v1, v2 etc in URL)
    const baseVersionNumber = Number(searchParams.get('base'))
    const targetVersionNumber = Number(searchParams.get('target'))

    const [diffs, setDiffs] = useState<DiffContent[]>([])
    const [analysis, setAnalysis] = useState<Analysis | null>(null)
    const [loading, setLoading] = useState(true)
    const [aiLoading, setAiLoading] = useState(false)
    const [view, setView] = useState<'summary' | 'inline' | 'split'>('inline')
    const [targetVersion, setTargetVersion] = useState<Version | null>(null)
    const [baseVersion, setBaseVersion] = useState<Version | null>(null)
    const [activeDiffIndex, setActiveDiffIndex] = useState<number>(-1)
    const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([])
    const [selectedQuote, setSelectedQuote] = useState<string | null>(null)
    const [showComments, setShowComments] = useState(true)

    const [buttonPosition, setButtonPosition] = useState<{ x: number, y: number } | undefined>(undefined)

    const handleChunkClick = (chunkId: string, content: string, e?: React.MouseEvent | MouseEvent) => {
        if (e && (e.metaKey || e.ctrlKey || e.shiftKey)) {
            // Multi-select mode
            setSelectedChunkIds(prev => {
                if (prev.includes(chunkId)) {
                    return prev.filter(id => id !== chunkId)
                } else {
                    return [...prev, chunkId]
                }
            })
        } else {
            // Single select mode
            setSelectedChunkIds([chunkId])
        }

        // Update quote only if it's a single selection or the latest one
        setSelectedQuote(content)

        // Calculate button position
        if (e) {
            // Position the button near the click, slightly offset
            setButtonPosition({ x: e.clientX + 20, y: e.clientY - 40 })
        }

        // Don't auto-open comments on multi-select to avoid jumping, 
        // unless it's the first one or user explicitly wants to add remark.
        // Actually, let's keep it open if it was open.
        if (!showComments && !e?.shiftKey && !e?.metaKey && !e?.ctrlKey) {
            // setShowComments(true) // Disable auto-open for now to prefer floating button
        }
    }

    const changeIndices = diffs.map((d, i) => (d.type as string) !== 'unchanged' ? i : -1).filter(i => i !== -1)

    // Global keyboard navigation for Split View
    useEffect(() => {
        if (view !== 'split' || !diffs.length || !changeIndices.length) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowDown') {
                e.preventDefault()
                setActiveDiffIndex(prev => {
                    const currIdx = changeIndices.indexOf(prev)
                    const nextIdx = (currIdx + 1) % changeIndices.length
                    return changeIndices[nextIdx]
                })
            } else if (e.code === 'ArrowUp') {
                e.preventDefault()
                setActiveDiffIndex(prev => {
                    const currIdx = changeIndices.indexOf(prev)
                    const prevIdx = currIdx - 1 < 0 ? changeIndices.length - 1 : currIdx - 1
                    return changeIndices[prevIdx]
                })
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [view, diffs, changeIndices])

    const [comments, setComments] = useState<any[]>([]) // Use 'any' or 'Comment' type if imported

    const fetchComments = async () => {
        if (!targetVersion) return
        try {
            const data = await import("@/lib/api").then(m => m.getComments(contractId, targetVersion.id))
            setComments(data)
        } catch (error) {
            console.error("Failed to fetch comments:", error)
        }
    }

    useEffect(() => {
        if (targetVersion) {
            fetchComments()
        }
    }, [targetVersion])

    useEffect(() => {
        const fetchData = async () => {
            if (!baseVersionNumber || !targetVersionNumber) return

            try {
                setLoading(true)
                setAiLoading(true) // Start AI loading but don't block UI

                // 1. Fetch all versions to resolve IDs from Numbers
                // Note: In a real app, we might want a specific API for this, but fetching all is fine for now
                const allVersions = await import("@/lib/api").then(m => m.getVersions(contractId)) as Version[]

                const targetVer = allVersions.find(v => v.version_number === targetVersionNumber)
                const baseVer = allVersions.find(v => v.version_number === baseVersionNumber)

                if (!targetVer || !baseVer) {
                    console.error("Versions not found")
                    setLoading(false)
                    setAiLoading(false)
                    return
                }

                setTargetVersion(targetVer)
                setBaseVersion(baseVer)

                // 2. Fetch Diff using real IDs
                const diffData = await getDiff(contractId, targetVer.id, baseVer.id)
                const content = diffData.content
                    ? (typeof diffData.content === 'string' ? JSON.parse(diffData.content) : diffData.content)
                    : []
                setDiffs(content)

                // CRITICAL: Stop main loading here to show UI immediately
                setLoading(false)

                // 3. Only fetch analysis if there are changes (Background)
                const hasChanges = content.some((d: DiffContent) => (d.type as string) !== 'unchanged')
                if (hasChanges) {
                    try {
                        const analysisData = await getAnalysis(contractId, targetVer.id, baseVer.id)
                        setAnalysis(analysisData)
                    } catch (aiError) {
                        console.error("AI Analysis failed:", aiError)
                    }
                } else {
                    setAnalysis({ summary: "No changes detected.", risk_assessments: {} })
                }
            } catch (error) {
                console.error("Failed to fetch data:", error)
                setLoading(false) // Ensure loading stops on error
            } finally {
                setAiLoading(false)
            }
        }

        fetchData()
    }, [contractId, baseVersionNumber, targetVersionNumber])

    const handleExternalAI = (url: string) => {
        if (!diffs || diffs.length === 0) return

        const context = `你是一位法律专家。请分析以下合同变更内容：\n\n${JSON.stringify(diffs.filter(d => (d.type as string) !== 'unchanged'), null, 2)}\n\n请提供详细的风险评估和建议。`

        navigator.clipboard.writeText(context).then(() => {
            window.open(url, '_blank')
            alert("变更内容已复制到剪贴板！请在打开的 AI 页面中粘贴 (Ctrl+V) 并提问。")
        }).catch(err => {
            console.error('Failed to copy text: ', err)
            alert("复制失败，请手动复制。")
        })
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-slate-500">正在对比版本差异...</p>
                </div>
            </div>
        )
    }

    if (!baseVersionNumber || !targetVersionNumber) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="text-lg font-medium">无效的对比参数</div>
                <Button variant="outline" onClick={() => router.back()}>
                    返回
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">版本对比</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Base: v{baseVersion?.version_number}</Badge>
                            <ArrowRight className="h-3 w-3" />
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Target: v{targetVersion?.version_number}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showComments ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {showComments ? "隐藏备注" : "显示备注"}
                    </Button>
                </div>

                {/* View Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('summary')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            view === 'summary' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        变更摘要
                    </button>
                    <button
                        onClick={() => setView('inline')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            view === 'inline' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        单列对比
                    </button>
                    <button
                        onClick={() => setView('split')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            view === 'split' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        双列对比
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-hidden flex flex-col">
                {view === 'summary' ? (
                    <div className="flex gap-6 h-full">
                        {/* Left: Diff List */}
                        <div className="flex-1 overflow-auto">
                            <DiffViewer diffs={diffs.filter(d => (d.type as string) !== 'unchanged')} />
                        </div>

                        {/* Right: AI Summary */}
                        <div className="w-[400px] shrink-0 overflow-auto">
                            <AISummaryCard
                                summary={analysis?.summary}
                                risks={analysis?.risk_assessments}
                                isLoading={aiLoading}
                            />

                            <div className="bg-white border rounded-lg p-4 mt-4 shadow-sm">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Sparkles className="h-3 w-3" />
                                    外部 AI 深度分析
                                </h4>
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex-1"
                                        onClick={() => handleExternalAI("https://chat.deepseek.com/")}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        DeepSeek
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 flex-1"
                                        onClick={() => handleExternalAI("https://www.doubao.com/")}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        豆包
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-white hover:bg-green-50 hover:text-green-600 hover:border-green-200 flex-1"
                                        onClick={() => handleExternalAI("https://chatgpt.com/")}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        ChatGPT
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                                    * 点击按钮将自动复制变更内容到剪贴板，并打开对应 AI 网站，请直接粘贴 (Ctrl+V) 提问。
                                </p>
                            </div>
                        </div>
                    </div>
                ) : view === 'split' ? (
                    <div className="h-full flex gap-4 overflow-hidden">
                        {/* Left Pane: Base Version */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="bg-slate-100 p-2 text-center text-sm font-medium text-slate-600 border-b">
                                Base Version (v{baseVersion?.version_number})
                            </div>
                            <div className="flex-1 overflow-auto bg-white border rounded-b-xl">
                                {baseVersion?.html_content ? (
                                    <HighFidelityViewer
                                        htmlContent={baseVersion.html_content}
                                        diffs={diffs}
                                        variant="base"
                                        className="border-none shadow-none min-h-full"
                                        activeDiffIndex={activeDiffIndex}
                                        onDiffClick={setActiveDiffIndex}
                                        onChunkClick={handleChunkClick}
                                        selectedChunkIds={selectedChunkIds}
                                    />
                                ) : (
                                    <div className="p-8 text-center text-slate-500">Base version has no HTML content.</div>
                                )}
                            </div>
                        </div>

                        {/* Right Pane: Target Version */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="bg-slate-100 p-2 text-center text-sm font-medium text-slate-600 border-b">
                                Target Version (v{targetVersion?.version_number})
                            </div>
                            <div className="flex-1 overflow-auto bg-white border rounded-b-xl">
                                {targetVersion?.html_content ? (
                                    <HighFidelityViewer
                                        htmlContent={targetVersion.html_content}
                                        diffs={diffs}
                                        variant="target"
                                        className="border-none shadow-none min-h-full"
                                        activeDiffIndex={activeDiffIndex}
                                        onDiffClick={setActiveDiffIndex}
                                        onChunkClick={handleChunkClick}
                                        selectedChunkIds={selectedChunkIds}
                                        comments={comments}
                                    />
                                ) : (
                                    <div className="p-8 text-center text-slate-500">Target version has no HTML content.</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col overflow-auto flex-1"> {/* Added flex-1 */}
                        {targetVersion?.html_content ? (
                            <HighFidelityViewer
                                htmlContent={targetVersion.html_content}
                                diffs={diffs}
                                variant="inline"
                                className="w-full" // Removed max-w-4xl mx-auto
                                onChunkClick={handleChunkClick}
                                selectedChunkIds={selectedChunkIds}
                                comments={comments}
                                showMarginComments={!showComments} // Toggle based on sidebar
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <p>该版本未生成 HTML 预览，显示结构化对比：</p>
                                <InlineDiffViewer
                                    diffs={diffs}
                                    onChunkClick={handleChunkClick}
                                    selectedChunkIds={selectedChunkIds}
                                />
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* Comment Sidebar - Fixed Position */}
            {showComments && (
                <div className="fixed right-0 top-[73px] bottom-0 z-40 bg-white shadow-xl border-l animate-in slide-in-from-right duration-200">
                    <CommentPanel
                        contractId={contractId}
                        versionId={targetVersion?.id}
                        selectedElementIds={selectedChunkIds}
                        selectedQuote={selectedQuote}
                        comments={comments}
                        onCommentsChange={fetchComments}
                        onClose={() => setShowComments(false)}
                    />
                </div>
            )}

            {/* Floating Remark Button */}
            <FloatingRemarkButton
                visible={selectedChunkIds.length > 0 && !showComments}
                onClick={() => setShowComments(true)}
                position={buttonPosition}
            />
        </div>
    )
}
