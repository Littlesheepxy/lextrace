"use client"

import { useState, useMemo, useEffect } from "react"
import { ClauseNode, RiskLevel, ClauseReviewStatus, ReviewStatusType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    ChevronRight,
    ChevronDown,
    Filter,
    AlertTriangle,
    Plus,
    Minus,
    Edit3,
    Hash,
    Circle,
    CheckCircle2,
    MessageCircle,
    Clock,
    X,
    Lightbulb
} from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TreeFilter {
    onlyChanges: boolean;
    onlyHighRisk: boolean;
    maxLevel: number;
    reviewStatus: ReviewStatusType | 'all';
}

interface ClauseTreeProps {
    clauses: ClauseNode[];
    selectedClauseId: string | null;
    onSelect: (clauseId: string) => void;
    filter: TreeFilter;
    onFilterChange: (filter: TreeFilter) => void;
    reviewStatuses: Record<string, ClauseReviewStatus>;
}

// 审查状态边框颜色配置
const reviewBorderConfig: Record<ReviewStatusType, string> = {
    confirmed: "border-l-green-500",
    risky: "border-l-red-500",
    needs_discussion: "border-l-amber-500",
    pending: "border-l-transparent",
}

// 审查状态配置
const reviewStatusConfig: Record<ReviewStatusType, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "已确认", color: "text-green-600", icon: CheckCircle2 },
    risky: { label: "有风险", color: "text-red-600", icon: AlertTriangle },
    needs_discussion: { label: "需沟通", color: "text-amber-600", icon: MessageCircle },
    pending: { label: "待审查", color: "text-slate-400", icon: Clock },
}

// 风险等级颜色和图标
const riskConfig: Record<RiskLevel, { color: string; bgColor: string; icon: React.ReactNode }> = {
    high: { 
        color: "text-red-600", 
        bgColor: "bg-red-500",
        icon: <Circle className="h-2 w-2 fill-current" />
    },
    medium: { 
        color: "text-amber-600", 
        bgColor: "bg-amber-500",
        icon: <Circle className="h-2 w-2 fill-current" />
    },
    low: { 
        color: "text-blue-600", 
        bgColor: "bg-blue-500",
        icon: <Circle className="h-2 w-2 fill-current" />
    },
    none: { 
        color: "text-slate-400", 
        bgColor: "bg-slate-300",
        icon: <Circle className="h-2 w-2 fill-current" />
    },
}

// 变更类型配置
const changeTypeConfig = {
    added: { label: "新增", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: Plus },
    deleted: { label: "删除", color: "bg-slate-100 text-slate-600 border-slate-300", icon: Minus },
    modified: { label: "修改", color: "bg-red-100 text-red-700 border-red-300", icon: Edit3 },
    renumbered: { label: "重编号", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Hash },
    unchanged: { label: "", color: "", icon: null },
}

// 单个条款节点组件
function ClauseTreeNode({
    node,
    selectedClauseId,
    onSelect,
    level = 0,
    filter,
    reviewStatuses,
}: {
    node: ClauseNode;
    selectedClauseId: string | null;
    onSelect: (clauseId: string) => void;
    level?: number;
    filter: TreeFilter;
    reviewStatuses: Record<string, ClauseReviewStatus>;
}) {
    const [isOpen, setIsOpen] = useState(true)
    const hasChildren = node.children && node.children.length > 0
    const isSelected = selectedClauseId === node.id
    
    // 获取审查状态
    const reviewStatus = reviewStatuses[node.id]?.status || 'pending'
    const reviewBorder = reviewBorderConfig[reviewStatus]
    
    const riskStyle = riskConfig[node.riskLevel || 'none']
    const changeConfig = changeTypeConfig[node.changeType || 'unchanged']
    const ChangeIcon = changeConfig.icon

    // 根据层级计算缩进
    const paddingLeft = level * 16 + 12

    // 过滤子节点
    const filteredChildren = useMemo(() => {
        if (!node.children) return []
        return node.children.filter(child => {
            if (filter.onlyChanges && !child.hasChanges) return false
            if (filter.onlyHighRisk && child.riskLevel !== 'high') return false
            if (child.level > filter.maxLevel) return false
            // 按审查状态筛选
            if (filter.reviewStatus !== 'all') {
                const childReviewStatus = reviewStatuses[child.id]?.status || 'pending'
                if (childReviewStatus !== filter.reviewStatus) return false
            }
            return true
        })
    }, [node.children, filter, reviewStatuses])

    // 如果没有子节点显示且当前节点被过滤，不渲染
    if (filter.onlyChanges && !node.hasChanges) return null
    if (filter.onlyHighRisk && node.riskLevel !== 'high' && filteredChildren.length === 0) return null
    if (node.level > filter.maxLevel) return null
    // 按审查状态筛选
    if (filter.reviewStatus !== 'all' && reviewStatus !== filter.reviewStatus && filteredChildren.length === 0) return null

    return (
        <div className="select-none">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div
                    className={cn(
                        "group flex items-center gap-2 py-2 px-2 cursor-pointer rounded-r-md transition-all border-l-3",
                        "hover:bg-slate-100",
                        isSelected ? "bg-amber-50 hover:bg-amber-100 !border-l-amber-500" : reviewBorder
                    )}
                    style={{ paddingLeft, borderLeftWidth: '3px' }}
                    onClick={() => onSelect(node.id)}
                >
                    {/* 展开/收起按钮 */}
                    {hasChildren && filteredChildren.length > 0 ? (
                        <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-0.5 hover:bg-slate-200 rounded">
                                {isOpen ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                )}
                            </button>
                        </CollapsibleTrigger>
                    ) : (
                        <span className="w-5" /> // 占位
                    )}

                    {/* 变更指示点 - 有变更时显示红点 */}
                    {node.hasChanges ? (
                        <span className="flex-shrink-0 text-red-500">
                            <Circle className="h-2 w-2 fill-current" />
                        </span>
                    ) : (
                        <span className="w-2" /> // 占位
                    )}

                    {/* 条款编号和标题 */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-sm font-medium truncate",
                                isSelected ? "text-amber-900" : "text-slate-700"
                            )}>
                                {node.number}
                            </span>
                            <span className={cn(
                                "text-sm truncate",
                                isSelected ? "text-amber-800" : "text-slate-600"
                            )}>
                                {node.title}
                            </span>
                        </div>
                    </div>

                    {/* 变更标签 */}
                    {node.hasChanges && ChangeIcon && (
                        <Badge 
                            variant="outline" 
                            className={cn(
                                "text-[10px] h-5 px-1.5 gap-1 flex-shrink-0",
                                changeConfig.color
                            )}
                        >
                            <ChangeIcon className="h-3 w-3" />
                            {changeConfig.label}
                        </Badge>
                    )}
                </div>

                {/* 子节点 */}
                {hasChildren && filteredChildren.length > 0 && (
                    <CollapsibleContent>
                        {filteredChildren.map((child) => (
                            <ClauseTreeNode
                                key={child.id}
                                node={child}
                                selectedClauseId={selectedClauseId}
                                onSelect={onSelect}
                                level={level + 1}
                                filter={filter}
                                reviewStatuses={reviewStatuses}
                            />
                        ))}
                    </CollapsibleContent>
                )}
            </Collapsible>
        </div>
    )
}

export function ClauseTree({
    clauses,
    selectedClauseId,
    onSelect,
    filter,
    onFilterChange,
    reviewStatuses,
}: ClauseTreeProps) {
    const [showFilters, setShowFilters] = useState(false)
    const [showGuide, setShowGuide] = useState(false)
    
    // 检查是否应该显示引导气泡
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const dismissed = localStorage.getItem('clause_filter_guide_dismissed')
            setShowGuide(dismissed !== 'true')
        }
    }, [])
    
    // 关闭引导气泡
    const dismissGuide = () => {
        setShowGuide(false)
        if (typeof window !== 'undefined') {
            localStorage.setItem('clause_filter_guide_dismissed', 'true')
        }
    }

    // 统计信息
    const stats = useMemo(() => {
        let total = 0
        let changed = 0
        let highRisk = 0
        const reviewCounts = { confirmed: 0, risky: 0, needs_discussion: 0, pending: 0 }

        function count(nodes: ClauseNode[]) {
            for (const node of nodes) {
                total++
                if (node.hasChanges) changed++
                if (node.riskLevel === 'high') highRisk++
                // 统计审查状态
                const status = reviewStatuses[node.id]?.status || 'pending'
                reviewCounts[status]++
                if (node.children) count(node.children)
            }
        }
        count(clauses)
        return { total, changed, highRisk, reviewCounts }
    }, [clauses, reviewStatuses])

    return (
        <div className="flex flex-col h-full">
            {/* 头部 */}
            <div className="p-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">条款目录</h3>
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 px-2",
                                showFilters && "bg-slate-100"
                            )}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-4 w-4 mr-1" />
                            筛选
                        </Button>
                        
                        {/* 引导气泡 */}
                        {showGuide && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-blue-600 text-white rounded-lg shadow-lg p-3 relative">
                                    {/* 箭头 */}
                                    <div className="absolute -top-2 right-4 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-blue-600" />
                                    
                                    <div className="flex items-start gap-2">
                                        <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium mb-1">筛选功能</p>
                                            <p className="text-xs opacity-90">
                                                可按变更状态、审查状态筛选条款，快速定位需要关注的内容
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button
                                        className="mt-2 text-xs text-blue-200 hover:text-white flex items-center gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            dismissGuide()
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                        不再提示
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 统计信息 */}
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span>共 {stats.total} 条</span>
                    {stats.changed > 0 && (
                        <span className="text-red-600 font-medium">{stats.changed} 条有变更</span>
                    )}
                </div>
                
                {/* 审查状态统计 */}
                <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-slate-400">审查:</span>
                    {stats.reviewCounts.confirmed > 0 && (
                        <span className="flex items-center gap-0.5 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />{stats.reviewCounts.confirmed}
                        </span>
                    )}
                    {stats.reviewCounts.risky > 0 && (
                        <span className="flex items-center gap-0.5 text-red-600">
                            <AlertTriangle className="h-3 w-3" />{stats.reviewCounts.risky}
                        </span>
                    )}
                    {stats.reviewCounts.needs_discussion > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-600">
                            <MessageCircle className="h-3 w-3" />{stats.reviewCounts.needs_discussion}
                        </span>
                    )}
                    <span className="flex items-center gap-0.5 text-slate-400">
                        <Clock className="h-3 w-3" />{stats.reviewCounts.pending}
                    </span>
                </div>

                {/* 筛选选项 */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="only-changes" className="text-sm text-slate-600">
                                仅显示有变更
                            </Label>
                            <Switch
                                id="only-changes"
                                checked={filter.onlyChanges}
                                onCheckedChange={(checked) => 
                                    onFilterChange({ ...filter, onlyChanges: checked })
                                }
                            />
                        </div>
                        
                        {/* 审查状态筛选 */}
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-slate-600">
                                审查状态
                            </Label>
                            <Select
                                value={filter.reviewStatus}
                                onValueChange={(value) => 
                                    onFilterChange({ ...filter, reviewStatus: value as ReviewStatusType | 'all' })
                                }
                            >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                    <SelectValue placeholder="全部" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部</SelectItem>
                                    <SelectItem value="pending">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-slate-400" /> 待审查
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="confirmed">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-green-600" /> 已确认
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="risky">
                                        <span className="flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-red-600" /> 有风险
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="needs_discussion">
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="h-3 w-3 text-amber-600" /> 需沟通
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-slate-600">
                                显示层级
                            </Label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3].map((level) => (
                                    <Button
                                        key={level}
                                        variant={filter.maxLevel === level ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => onFilterChange({ ...filter, maxLevel: level })}
                                    >
                                        {level}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 条款树列表 */}
            <ScrollArea className="flex-1">
                <div className="py-2">
                    {clauses.map((clause) => (
                        <ClauseTreeNode
                            key={clause.id}
                            node={clause}
                            selectedClauseId={selectedClauseId}
                            onSelect={onSelect}
                            filter={filter}
                            reviewStatuses={reviewStatuses}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* 图例 */}
            <div className="p-3 border-t bg-slate-50/50 flex-shrink-0 space-y-2">
                {/* 变更类型图例 */}
                <div>
                    <div className="text-[10px] text-slate-500 mb-1">变更标签</div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="flex items-center gap-1 text-emerald-600">
                            <Plus className="h-3 w-3" /> 新增
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                            <Edit3 className="h-3 w-3" /> 修改
                        </span>
                    </div>
                </div>
                
                {/* 审查状态图例 */}
                <div>
                    <div className="text-[10px] text-slate-500 mb-1">左侧边框 = 审查状态</div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="flex items-center gap-1">
                            <span className="w-1 h-3 bg-green-500 rounded-full" /> 已确认
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-1 h-3 bg-red-500 rounded-full" /> 有风险
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-1 h-3 bg-amber-500 rounded-full" /> 需沟通
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

