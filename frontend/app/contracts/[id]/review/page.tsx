"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Contract, Version, ClauseNode, ClauseHistory, VersionFilter, ClauseReviewStatus, ReviewStatusType } from "@/lib/types"
import { getContract, getVersions, getClauseTree, getClauseHistory, getAllClauseReviews } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    ArrowLeft, 
    ArrowRight, 
    Filter, 
    Loader2, 
    GitCompare,
    ChevronDown
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ClauseTree } from "@/components/ClauseTree"
import { ClauseVersionTimeline } from "@/components/ClauseVersionTimeline"
import { ClauseReviewPanel } from "@/components/ClauseReviewPanel"
import { ClauseDiffDialog } from "@/components/ClauseDiffDialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ClauseReviewPage() {
    const params = useParams()
    const router = useRouter()
    const contractId = Number(params.id)

    // 基础数据
    const [contract, setContract] = useState<Contract | null>(null)
    const [versions, setVersions] = useState<Version[]>([])
    const [clauseTree, setClauseTree] = useState<ClauseNode[]>([])
    const [loading, setLoading] = useState(true)

    // 选中状态
    const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null)
    const [clauseHistory, setClauseHistory] = useState<ClauseHistory | null>(null)
    const [historyLoading, setHistoryLoading] = useState(false)

    // 审查状态
    const [reviewStatuses, setReviewStatuses] = useState<Record<string, ClauseReviewStatus>>({})

    // 过滤器
    const [versionFilter, setVersionFilter] = useState<VersionFilter>({})
    const [treeFilter, setTreeFilter] = useState<{
        onlyChanges: boolean;
        onlyHighRisk: boolean;
        maxLevel: number;
        reviewStatus: ReviewStatusType | 'all';
    }>({
        onlyChanges: false,
        onlyHighRisk: false,
        maxLevel: 3,
        reviewStatus: 'all'
    })

    // Diff 弹窗状态
    const [diffDialogOpen, setDiffDialogOpen] = useState(false)
    const [diffVersions, setDiffVersions] = useState<{ from: number; to: number } | null>(null)

    // 加载基础数据
    useEffect(() => {
        if (contractId) {
            loadData()
        }
    }, [contractId])

    async function loadData() {
        try {
            setLoading(true)
            const [c, v, tree] = await Promise.all([
                getContract(contractId),
                getVersions(contractId),
                getClauseTree(contractId)
            ])
            setContract(c)
            setVersions(v)
            setClauseTree(tree)
            
            // 加载审查状态
            const reviews = getAllClauseReviews(contractId)
            setReviewStatuses(reviews)
            
            // 默认选中第一个有变化的条款
            const firstChanged = findFirstChangedClause(tree)
            if (firstChanged) {
                setSelectedClauseId(firstChanged)
            }
        } catch (error) {
            console.error("加载失败:", error)
        } finally {
            setLoading(false)
        }
    }

    // 找到第一个有变化的条款
    function findFirstChangedClause(nodes: ClauseNode[]): string | null {
        for (const node of nodes) {
            if (node.hasChanges && node.riskLevel !== 'none') {
                return node.id
            }
            if (node.children) {
                const found = findFirstChangedClause(node.children)
                if (found) return found
            }
        }
        return nodes[0]?.id || null
    }

    // 加载选中条款的历史
    useEffect(() => {
        if (selectedClauseId) {
            loadClauseHistory(selectedClauseId)
        }
    }, [selectedClauseId, versionFilter])

    async function loadClauseHistory(clauseId: string) {
        try {
            setHistoryLoading(true)
            const history = await getClauseHistory(contractId, clauseId, versionFilter)
            setClauseHistory(history)
        } catch (error) {
            console.error("加载条款历史失败:", error)
        } finally {
            setHistoryLoading(false)
        }
    }

    // 处理条款选择
    const handleClauseSelect = useCallback((clauseId: string) => {
        setSelectedClauseId(clauseId)
    }, [])

    // 处理 diff 对比
    const handleDiffCompare = useCallback((fromVersion: number, toVersion: number) => {
        setDiffVersions({ from: fromVersion, to: toVersion })
        setDiffDialogOpen(true)
    }, [])

    // 刷新审查状态
    const refreshReviewStatuses = useCallback(() => {
        const reviews = getAllClauseReviews(contractId)
        setReviewStatuses(reviews)
    }, [contractId])

    // 跳转到全文 diff 页面
    const goToFullDiff = (baseVersion: number, targetVersion: number) => {
        router.push(`/contracts/${contractId}/diff?base=${baseVersion}&target=${targetVersion}`)
    }

    // 获取最新版本号
    const latestVersion = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) 
        : 0

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    <p className="text-sm text-slate-500">正在加载条款数据...</p>
                </div>
            </div>
        )
    }

    if (!contract) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="text-lg font-medium">合同不存在</div>
                <Button variant="outline" onClick={() => router.back()}>
                    返回
                </Button>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            条款审查
                            <Badge variant="outline" className="font-normal text-xs bg-amber-50 text-amber-700 border-amber-200">
                                {contract.name}
                            </Badge>
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span>共 {versions.length} 个版本</span>
                            <span>·</span>
                            <span>最新版本 V{latestVersion}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* 版本过滤器 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Filter className="h-4 w-4" />
                                版本范围
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>选择版本范围</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setVersionFilter({})}>
                                全部版本 (V1 ~ V{latestVersion})
                            </DropdownMenuItem>
                            {latestVersion > 3 && (
                                <DropdownMenuItem onClick={() => setVersionFilter({ fromVersion: latestVersion - 2 })}>
                                    最近 3 个版本
                                </DropdownMenuItem>
                            )}
                            {latestVersion > 5 && (
                                <DropdownMenuItem onClick={() => setVersionFilter({ fromVersion: latestVersion - 4 })}>
                                    最近 5 个版本
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => setVersionFilter({ ...versionFilter, onlyWithChanges: !versionFilter.onlyWithChanges })}
                            >
                                {versionFilter.onlyWithChanges ? '✓ ' : ''}仅显示有变化的版本
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 跳转全文 diff */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <GitCompare className="h-4 w-4" />
                                全文对比
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>快捷对比</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {latestVersion > 1 && (
                                <DropdownMenuItem onClick={() => goToFullDiff(latestVersion - 1, latestVersion)}>
                                    V{latestVersion - 1} → V{latestVersion} (最新变更)
                                </DropdownMenuItem>
                            )}
                            {latestVersion > 1 && (
                                <DropdownMenuItem onClick={() => goToFullDiff(1, latestVersion)}>
                                    V1 → V{latestVersion} (完整演变)
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/contracts/${contractId}`)}>
                                返回版本管理页选择...
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content - 三栏布局 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 左侧：条款树 */}
                <div className="w-[300px] border-r bg-white flex flex-col overflow-hidden">
                    <ClauseTree
                        clauses={clauseTree}
                        selectedClauseId={selectedClauseId}
                        onSelect={handleClauseSelect}
                        filter={treeFilter}
                        onFilterChange={setTreeFilter}
                        reviewStatuses={reviewStatuses}
                    />
                </div>

                {/* 中间：多版本时间轴 */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {selectedClauseId && clauseHistory ? (
                        <ClauseVersionTimeline
                            clauseHistory={clauseHistory}
                            loading={historyLoading}
                            latestVersion={latestVersion}
                            onDiffCompare={handleDiffCompare}
                            contractId={contractId}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <p className="text-sm">请从左侧选择一个条款</p>
                                <p className="text-xs mt-1">查看该条款在所有版本中的演变历史</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 右侧：AI 总结 + Review 面板 */}
                <div className="w-[360px] border-l bg-white flex flex-col overflow-hidden">
                    {selectedClauseId && clauseHistory ? (
                        <ClauseReviewPanel
                            clauseHistory={clauseHistory}
                            contractId={contractId}
                            latestVersionId={versions.find(v => v.version_number === latestVersion)?.id}
                            onStatusChange={refreshReviewStatuses}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <p className="text-sm">选择条款后显示 AI 分析和审查状态</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Diff 弹窗 */}
            <ClauseDiffDialog
                open={diffDialogOpen}
                onOpenChange={setDiffDialogOpen}
                contractId={contractId}
                clauseId={selectedClauseId}
                fromVersion={diffVersions?.from}
                toVersion={diffVersions?.to}
                versions={versions}
            />
        </div>
    )
}

