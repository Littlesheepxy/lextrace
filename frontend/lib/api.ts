import { Project, Contract } from './types';

const IS_SERVER = typeof window === 'undefined';
const API_BASE_URL = IS_SERVER
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

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
