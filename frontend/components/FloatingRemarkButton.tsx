"use client"

import { Button } from "@/components/ui/button"
import { MessageSquarePlus } from "lucide-react"
import { useEffect, useState } from "react"

interface FloatingRemarkButtonProps {
    visible: boolean
    onClick: () => void
    position?: { x: number, y: number }
}

export function FloatingRemarkButton({ visible, onClick, position }: FloatingRemarkButtonProps) {
    if (!visible) return null

    const style = position ? {
        top: position.y,
        left: position.x,
        position: 'fixed' as const,
        zIndex: 50
    } : {
        bottom: '2rem',
        right: '24rem', // Adjust based on sidebar width
        position: 'fixed' as const,
        zIndex: 50
    }

    return (
        <div style={style} className="animate-in fade-in zoom-in duration-200">
            <Button
                onClick={onClick}
                className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white gap-2 pr-4 pl-3 h-10"
            >
                <MessageSquarePlus className="h-5 w-5" />
                <span>添加备注</span>
            </Button>
        </div>
    )
}
