import { Project, Contract, ClauseNode, ClauseHistory, ClauseReviewStatus, VersionFilter, Version } from './types';

const IS_SERVER = typeof window === 'undefined';

// 生产环境 API 地址（通过同域代理避免跨域）
const PRODUCTION_API_URL = '/api';

// 开发环境或服务端渲染使用的地址
const DEV_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 浏览器端使用相对路径 /api，服务端使用完整地址
const API_BASE_URL = IS_SERVER ? DEV_API_URL : PRODUCTION_API_URL;

// Projects
export async function getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE_URL}/projects/`)
    if (!res.ok) throw new Error('Failed to fetch projects')
    return res.json()
}

export async function createProject(name: string, description?: string): Promise<Project> {
    const res = await fetch(`${API_BASE_URL}/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
    })
    if (!res.ok) throw new Error('Failed to create project')
    return res.json()
}

export async function getProject(id: number): Promise<Project> {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`)
    if (!res.ok) throw new Error('Failed to fetch project')
    return res.json()
}

// Contracts
export async function getContracts(projectId: number): Promise<Contract[]> {
    const res = await fetch(`${API_BASE_URL}/contracts/?project_id=${projectId}`)
    if (!res.ok) throw new Error('Failed to fetch contracts')
    return res.json()
}

export async function createContract(projectId: number, name: string): Promise<Contract> {
    const res = await fetch(`${API_BASE_URL}/contracts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, name })
    })
    if (!res.ok) throw new Error('Failed to create contract')
    return res.json()
}

export async function getContract(id: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${id}`);
    if (!res.ok) throw new Error('Failed to fetch contract');
    return res.json();
}

export async function getVersions(contractId: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/`);
    if (!res.ok) throw new Error('Failed to fetch versions');
    return res.json();
}

export async function getVersion(contractId: number, versionId: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/${versionId}`);
    if (!res.ok) throw new Error('Failed to fetch version');
    return res.json();
}

export async function uploadVersion(contractId: number, file: File, commitMessage: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('commit_message', commitMessage);

    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload version');
    return res.json();
}

export async function getDiff(contractId: number, versionId: number, compareWith?: number) {
    let url = `${API_BASE_URL}/contracts/${contractId}/versions/${versionId}/diff/`;
    if (compareWith) {
        url += `?compare_with=${compareWith}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch diff');
    return res.json();
}

export async function getAnalysis(contractId: number, versionId: number, compareWith?: number) {
    let url = `${API_BASE_URL}/contracts/${contractId}/versions/${versionId}/diff/analysis`;
    if (compareWith) {
        url += `?compare_with=${compareWith}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch analysis');
    return res.json();
}

export async function deleteContract(id: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete contract');
    return;
}

export async function deleteVersion(contractId: number, versionId: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/${versionId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete version');
    return;
}

export async function getContractLogs(contractId: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/logs`);
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
}

export async function stageBatchVersions(contractId: number, files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });

    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/batch-stage`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error('Failed to stage files');
    return res.json();
}

export async function commitBatchVersions(contractId: number, files: any[]) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/batch-commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(files),
    });
    if (!res.ok) throw new Error('Failed to commit versions');
    return res.json();
}

// Comments
export async function getComments(contractId: number, versionId: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/${versionId}/comments/`);
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
}

export async function createComment(contractId: number, versionId: number, elementId: string, content: string, quote?: string) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/${versionId}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ element_id: elementId, content, quote }),
    });
    if (!res.ok) throw new Error('Failed to create comment');
    return res.json();
}

export async function deleteComment(contractId: number, versionId: number, commentId: number) {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/versions/${versionId}/comments/${commentId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete comment');
    return;
}

// ===== 条款级 Review API（真实 API 实现）=====

/** 获取条款树 */
export async function getClauseTree(contractId: number): Promise<ClauseNode[]> {
    const res = await fetch(`${API_BASE_URL}/contracts/${contractId}/clauses/tree`);
    if (!res.ok) throw new Error('Failed to fetch clause tree');
    return res.json();
}

/** 获取条款多版本历史 */
export async function getClauseHistory(
    contractId: number, 
    clauseId: string,
    filter?: VersionFilter
): Promise<ClauseHistory> {
    const params = new URLSearchParams();
    if (filter?.fromVersion) params.append('from_version', String(filter.fromVersion));
    if (filter?.toVersion) params.append('to_version', String(filter.toVersion));
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/contracts/${contractId}/clauses/${encodeURIComponent(clauseId)}/history${queryString ? `?${queryString}` : ''}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch clause history');
    return res.json();
}

/** 获取条款 Review 状态（localStorage 实现） */
export function getClauseReview(contractId: number, clauseId: string): ClauseReviewStatus | null {
    if (typeof window === 'undefined') return null;
    
    const key = `clause_review_${contractId}_${clauseId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}

/** 保存条款 Review 状态（localStorage 实现） */
export function saveClauseReview(review: ClauseReviewStatus): void {
    if (typeof window === 'undefined') return;
    
    const key = `clause_review_${review.contractId}_${review.clauseId}`;
    const dataToSave = {
        ...review,
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(dataToSave));
}

/** 获取合同所有条款的 Review 状态 */
export function getAllClauseReviews(contractId: number): Record<string, ClauseReviewStatus> {
    if (typeof window === 'undefined') return {};
    
    const result: Record<string, ClauseReviewStatus> = {};
    const prefix = `clause_review_${contractId}_`;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
            const stored = localStorage.getItem(key);
            if (stored) {
                const review = JSON.parse(stored);
                result[review.clauseId] = review;
            }
        }
    }
    
    return result;
}
