"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Clock, ChevronRight, AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { Contract } from "@/lib/types"
import { createContract, deleteContract, getContracts } from "@/lib/api"
import { useRouter } from "next/navigation"
import { CreateContractDialog } from "@/components/CreateContractDialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ContractList({ projectId }: { projectId: number }) {
    const router = useRouter()
    const [contracts, setContracts] = useState<Contract[]>([])
    const [loading, setLoading] = useState(true)
    const [contractToDelete, setContractToDelete] = useState<number | null>(null)

    const loadContracts = async () => {
        try {
            const data = await getContracts(projectId)
            setContracts(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadContracts()
    }, [projectId])

    async function handleCreate(name: string) {
        try {
            const newContract = await createContract(projectId, name)
            router.push(`/contracts/${newContract.id}`)
        } catch (error) {
            console.error("创建合同失败:", error)
            alert("创建失败，请重试")
        }
    }

    async function handleDelete() {
        if (!contractToDelete) return
        try {
            await deleteContract(contractToDelete)
            setContractToDelete(null)
            loadContracts()
        } catch (error) {
            console.error("删除失败:", error)
            alert("删除失败，请重试")
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
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">合同列表</h2>
                    <p className="text-slate-500">
                        管理该项目下的所有合同
                    </p>
                </div>
                <CreateContractDialog onSubmit={handleCreate} />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {contracts.map((contract) => (
                    <Card
                        key={contract.id}
                        className="hover:bg-slate-50 transition-all cursor-pointer h-full group relative border-slate-200 hover:border-blue-200 hover:shadow-md"
                        onClick={() => router.push(`/contracts/${contract.id}`)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-medium flex items-center gap-2 text-slate-900">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    {contract.name}
                                </CardTitle>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                    {contract.version_count || 0} 个版本
                                </Badge>
                            </div>
                            <CardDescription>
                                创建于 {new Date(contract.created_at).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-slate-500">
                                <Clock className="mr-1 h-4 w-4" />
                                <span>最新更新: {new Date(contract.created_at).toLocaleDateString()}</span>
                            </div>
                        </CardContent>

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setContractToDelete(contract.id)
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}

                {contracts.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-slate-50 border border-dashed rounded-lg">
                        <FileText className="mx-auto h-12 w-12 mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900">暂无合同</h3>
                        <p className="text-slate-500 mb-4">创建一个新合同开始管理版本</p>
                        <CreateContractDialog onSubmit={handleCreate} />
                    </div>
                )}
            </div>

            <AlertDialog open={!!contractToDelete} onOpenChange={(open) => !open && setContractToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除?</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。这将永久删除该合同及其所有版本历史。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
