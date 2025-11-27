import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2, AlertTriangle } from "lucide-react"

interface AISummaryCardProps {
    summary?: string
    risks?: Record<string, { risk: string; reason: string }>
    isLoading?: boolean
}

export function AISummaryCard({ summary, risks, isLoading }: AISummaryCardProps) {
    return (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Sparkles className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    AI 变更摘要
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-4 text-blue-800/60">
                        <Loader2 className="h-5 w-5 animate-spin mb-2" />
                        <span className="text-xs">AI 正在分析变更风险...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                            {summary || "暂无分析结果"}
                        </p>
                        {risks && Object.keys(risks).length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-blue-200/50">
                                <h4 className="text-xs font-semibold text-blue-900 flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    风险评估
                                </h4>
                                <div className="space-y-2">
                                    {Object.entries(risks).map(([clauseId, risk]) => (
                                        <div key={clauseId} className="text-xs bg-white/50 p-2 rounded border border-blue-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-slate-700">条款 {clauseId}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${risk.risk === 'high' ? 'bg-red-100 text-red-700' :
                                                        risk.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                    }`}>
                                                    {risk.risk.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 leading-tight">{risk.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
