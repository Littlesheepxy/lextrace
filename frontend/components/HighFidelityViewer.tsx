"use client"

import { useEffect, useRef, useState } from "react"
import * as DiffLib from 'diff';
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { DiffContent } from "@/lib/types"

import { MarginComment } from "./MarginComment"
import { Comment } from "@/lib/types"

interface HighFidelityViewerProps {
    htmlContent: string
    diffs?: DiffContent[]
    className?: string
    variant?: 'inline' | 'base' | 'target'
    activeDiffIndex?: number
    onDiffClick?: (index: number) => void
    onChunkClick?: (chunkId: string, content: string, e: MouseEvent) => void
    selectedChunkIds?: string[]
    comments?: Comment[] // New prop
    showMarginComments?: boolean // New prop
}

export function HighFidelityViewer({
    htmlContent,
    diffs,
    className,
    variant = 'inline',
    activeDiffIndex,
    onDiffClick,
    onChunkClick,
    selectedChunkIds = [],
    comments = [],
    showMarginComments = true // Default to true
}: HighFidelityViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [currentDiffIndex, setCurrentDiffIndex] = useState<number>(-1)
    const diffMapRef = useRef<Map<number, HTMLElement>>(new Map())
    const [commentPositions, setCommentPositions] = useState<{ comment: Comment, top: number }[]>([])

    // Helper to scroll to a diff by index in the diffs array
    const scrollToDiff = (index: number) => {
        let el = diffMapRef.current.get(index)

        // If element not found (e.g. Added diff in Base view), find nearest context
        if (!el && containerRef.current && diffs) {
            // Try searching backwards
            for (let i = index - 1; i >= 0; i--) {
                const diff = diffs[i]
                if (diffMapRef.current.has(i)) {
                    el = diffMapRef.current.get(i)
                    break
                }
                if ((diff.type as string) === 'unchanged') {
                    const contextEl = containerRef.current.querySelector(`[data-clause-id="${diff.clause_id}"]`)
                    if (contextEl) {
                        el = contextEl as HTMLElement
                        break
                    }
                }
            }
            // If still not found, search forwards
            if (!el) {
                for (let i = index + 1; i < diffs.length; i++) {
                    const diff = diffs[i]
                    if (diffMapRef.current.has(i)) {
                        el = diffMapRef.current.get(i)
                        break
                    }
                    if ((diff.type as string) === 'unchanged') {
                        const contextEl = containerRef.current.querySelector(`[data-clause-id="${diff.clause_id}"]`)
                        if (contextEl) {
                            el = contextEl as HTMLElement
                            break
                        }
                    }
                }
            }
        }

        if (!el) return

        el.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Remove highlight from all
        diffMapRef.current.forEach(e => {
            e.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500', 'z-10', 'relative')
        })

        // Add highlight to current (ONLY if it's the exact match)
        if (diffMapRef.current.has(index)) {
            diffMapRef.current.get(index)?.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500', 'z-10', 'relative')
        }
    }

    // React to external activeDiffIndex change
    useEffect(() => {
        if (activeDiffIndex !== undefined && activeDiffIndex !== -1) {
            scrollToDiff(activeDiffIndex)
        }
    }, [activeDiffIndex, diffs]) // Added diffs to dependency array for scrollToDiff

    // Internal keyboard navigation (only if not controlled externally)
    useEffect(() => {
        if (activeDiffIndex !== undefined) return // Disable internal nav if controlled

        const handleKeyDown = (e: KeyboardEvent) => {
            if (diffMapRef.current.size === 0) return

            // Get all available indices
            const indices = Array.from(diffMapRef.current.keys()).sort((a, b) => a - b)
            const currentPos = indices.indexOf(currentDiffIndex)

            if (e.code === 'Space' || e.code === 'ArrowDown') {
                e.preventDefault()
                const nextPos = (currentPos + 1) % indices.length
                const nextIndex = indices[nextPos]
                setCurrentDiffIndex(nextIndex)
                scrollToDiff(nextIndex)
            } else if (e.code === 'ArrowUp') {
                e.preventDefault()
                const prevPos = currentPos - 1 < 0 ? indices.length - 1 : currentPos - 1
                const prevIndex = indices[prevPos]
                setCurrentDiffIndex(prevIndex)
                scrollToDiff(prevIndex)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentDiffIndex, activeDiffIndex, diffs]) // Added diffs to dependency array for scrollToDiff

    // Calculate comment positions
    useEffect(() => {
        if (!containerRef.current || !comments.length || !showMarginComments) {
            setCommentPositions([])
            return
        }

        const positions: { comment: Comment, top: number }[] = []

        comments.forEach(comment => {
            // Find the element for this comment
            const el = containerRef.current?.querySelector(`[data-clause-id="${comment.element_id}"]`) as HTMLElement
            if (el) {
                // Calculate top relative to container
                const top = el.offsetTop
                positions.push({ comment, top })
            }
        })

        // Simple collision detection to prevent overlap
        positions.sort((a, b) => a.top - b.top)
        for (let i = 1; i < positions.length; i++) {
            const prev = positions[i - 1]
            const curr = positions[i]
            if (curr.top < prev.top + 80) { // Assume ~80px height per card
                curr.top = prev.top + 80
            }
        }

        setCommentPositions(positions)
    }, [comments, htmlContent, showMarginComments]) // Re-calc when comments or content changes

    // ... existing useEffect for diff rendering ...

    useEffect(() => {
        if (!containerRef.current) return

        // Reset content to base HTML
        containerRef.current.innerHTML = htmlContent

        if (!diffs) return

        let lastElement: Element | null = null;
        const newDiffMap = new Map<number, HTMLElement>()

        diffs.forEach((diff, index) => {
            if ((diff.type as string) === 'unchanged') {
                const el = containerRef.current?.querySelector(`[data-clause-id="${diff.clause_id}"]`)
                if (el) lastElement = el
                return
            }

            const elements = containerRef.current?.querySelectorAll(`[data-clause-id="${diff.clause_id}"]`)

            if (elements && elements.length > 0) {
                elements.forEach((el, elIndex) => {
                    const htmlEl = el as HTMLElement

                    // Add to navigation map (use the first element for the diff)
                    if (elIndex === 0 && (variant === 'target' || variant === 'inline' || variant === 'base')) {
                        // Logic to determine if this diff is visible in this variant
                        let isVisible = false
                        if (variant === 'target' || variant === 'inline') {
                            if (diff.type === 'added' || diff.type === 'modified') isVisible = true
                        } else if (variant === 'base') {
                            if (diff.type === 'modified' || diff.type === 'deleted') isVisible = true
                        }

                        // Apply highlighting
                        if (activeDiffIndex === index) {
                            htmlEl.style.backgroundColor = 'rgba(59, 130, 246, 0.1)' // blue-500 with opacity
                            htmlEl.style.outline = '2px solid #3b82f6'
                            htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        } else if (selectedChunkIds.includes(diff.clause_id)) {
                            // Multi-select highlighting
                            htmlEl.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                            htmlEl.style.outline = '2px dashed #3b82f6'
                        } else {
                            htmlEl.style.backgroundColor = ''
                            htmlEl.style.outline = ''
                        }

                        if (isVisible) {
                            newDiffMap.set(index, htmlEl)
                            htmlEl.style.cursor = 'pointer'
                            htmlEl.onclick = (e) => {
                                e.stopPropagation()
                                if (onDiffClick) onDiffClick(index)
                                else {
                                    setCurrentDiffIndex(index)
                                    scrollToDiff(index)
                                }
                                if (onChunkClick) onChunkClick(diff.clause_id, diff.modified || diff.original || "", e)
                            }
                        }
                    }

                    if (variant === 'target' || variant === 'inline') {
                        if (diff.type === 'added') {
                            htmlEl.style.backgroundColor = '#dcfce7'; // Green-50
                            htmlEl.style.borderLeft = '4px solid #22c55e'; // Green-500
                        } else if (diff.type === 'modified') {
                            if (variant === 'inline') {
                                // Granular Diff for Inline View
                                const diffParts = DiffLib.diffWords(diff.original || "", diff.modified || "");
                                const diffHtml = diffParts.map((part: DiffLib.Change) => {
                                    if (part.added) return `<span class="bg-green-100 text-green-900 font-semibold">${part.value}</span>`;
                                    if (part.removed) return `<span class="bg-red-100 text-red-900 line-through decoration-red-400">${part.value}</span>`;
                                    return `<span>${part.value}</span>`;
                                }).join('');
                                el.innerHTML = diffHtml;
                                htmlEl.style.borderLeft = '4px solid #eab308'; // Yellow-500
                            } else {
                                // Target View: Just highlight background
                                htmlEl.style.backgroundColor = '#fef9c3'; // Yellow-50
                                htmlEl.style.borderLeft = '4px solid #eab308'; // Yellow-500
                                el.setAttribute('title', `Original: ${diff.original?.substring(0, 100)}...`)
                            }
                        }
                    } else if (variant === 'base') {
                        if (diff.type === 'modified') {
                            htmlEl.style.backgroundColor = '#fffbeb'; // Amber-50
                            htmlEl.style.borderLeft = '4px solid #f59e0b'; // Amber-500
                        } else if (diff.type === 'deleted') {
                            htmlEl.style.backgroundColor = '#fef2f2'; // Red-50
                            htmlEl.style.borderLeft = '4px solid #ef4444'; // Red-500
                            htmlEl.style.textDecoration = 'line-through';
                            htmlEl.style.textDecorationColor = '#ef4444';
                        }
                    }
                    lastElement = el
                })
            } else if (diff.type === 'deleted') {
                if (variant === 'inline') {
                    // Inline mode: Insert deleted block
                    const createDelDiv = () => {
                        const delDiv = document.createElement('div')
                        delDiv.className = 'bg-red-50 border-l-4 border-red-500 p-2 my-2 text-slate-700 relative cursor-pointer'
                        delDiv.innerHTML = `<span class="absolute top-0 right-0 text-[10px] text-red-400 font-bold px-1">DELETED</span><del>${diff.original}</del>`

                        // Add to navigation
                        newDiffMap.set(index, delDiv)
                        delDiv.onclick = (e) => {
                            e.stopPropagation()
                            if (onDiffClick) onDiffClick(index)
                            else {
                                setCurrentDiffIndex(index)
                                scrollToDiff(index)
                            }
                            if (onChunkClick) onChunkClick(diff.clause_id, diff.original || "", e)
                        }
                        return delDiv
                    }

                    if (lastElement) {
                        const delDiv = createDelDiv()
                        lastElement.insertAdjacentElement('afterend', delDiv)
                        lastElement = delDiv
                    } else {
                        const delDiv = createDelDiv()
                        if (containerRef.current && containerRef.current.firstChild) {
                            containerRef.current.insertBefore(delDiv, containerRef.current.firstChild)
                        } else if (containerRef.current) {
                            containerRef.current.appendChild(delDiv)
                        }
                        lastElement = delDiv
                    }
                }
            }
        })

        diffMapRef.current = newDiffMap
    }, [htmlContent, diffs, variant, selectedChunkIds, activeDiffIndex])

    return (
        <div className={cn("relative w-full flex justify-center", className)}>
            {/* Main Document Content - Centered */}
            <div className="w-full max-w-4xl bg-white p-12 shadow-sm border rounded-xl min-h-[800px] relative">
                <div
                    ref={containerRef}
                    className="prose prose-slate max-w-none 
                        prose-headings:font-bold prose-headings:text-slate-900 
                        prose-p:text-slate-700 prose-p:leading-relaxed
                        prose-li:text-slate-700
                        prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-slate-300
                        prose-th:border prose-th:border-slate-300 prose-th:p-2 prose-th:bg-slate-50
                        prose-td:border prose-td:border-slate-300 prose-td:p-2"
                />
            </div>

            {/* Margin Column - Absolutely Positioned */}
            {(variant === 'target' || variant === 'inline') && showMarginComments && commentPositions.length > 0 && (
                <div className="absolute left-1/2 ml-[30rem] top-0 w-72 hidden 2xl:block">
                    {commentPositions.map((pos) => (
                        <MarginComment
                            key={pos.comment.id}
                            comment={pos.comment}
                            top={pos.top}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
