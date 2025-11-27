"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Clock, ChevronRight, AlertTriangle } from "lucide-react"
import { Contract } from "@/lib/types"
import { createContract } from "@/lib/api"
import { useRouter } from "next/navigation"
import { CreateContractDialog } from "@/components/CreateContractDialog"

interface ContractListProps {
    contracts: Contract[]
}

import { Trash2 } from "lucide-react"
import { deleteContract } from "@/lib/api"
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

export function ContractList({ contracts }: ContractListProps) {
    const router = useRouter()

    async function handleCreate(name: string) {
        try {
            const newContract = await createContract(name)
            router.refresh()
            router.push(`/contracts/${newContract.id}`)
        } catch (error) {
            console.error("创建合同失败:", error)
            alert("创建失败，请重试")
        }
    }

    async function handleDelete(id: number, e: React.MouseEvent) {
        e.preventDefault() // Prevent Link navigation
        e.stopPropagation()
        try {
            await deleteContract(id)
            router.refresh()
        } catch (error) {
            console.error("删除失败:", error)
            alert("删除失败，请重试")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">合同列表</h2>
                    <p className="text-muted-foreground">
                        管理您的所有合同及其版本历史
                    </p>
                </div>
                <CreateContractDialog onSubmit={handleCreate} />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {contracts.map((contract) => (
                    <Link key={contract.id} href={`/contracts/${contract.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full group relative">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-500" />
                                        {contract.name}
                                    </CardTitle>
                                    <Badge variant="secondary">
                                        {contract.version_count || 0} 个版本
                                    </Badge>
                                </div>
                                <CardDescription>
                                    创建于 {new Date(contract.created_at).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Clock className="mr-1 h-4 w-4" />
                                    <span>最新更新: {new Date(contract.created_at).toLocaleDateString()}</span>
                                </div>
                            </CardContent>

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>确认删除?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                此操作无法撤销。这将永久删除该合同及其所有版本历史。
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>取消</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={(e) => handleDelete(contract.id, e)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                删除
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </Card>
                    </Link>
                ))}

                {contracts.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">暂无合同</p>
                        <p className="text-sm mb-4">创建一个新合同开始管理版本</p>
                        <CreateContractDialog onSubmit={handleCreate} />
                    </div>
                )}
            </div>
        </div>
    )
}
