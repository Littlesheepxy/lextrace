const IS_SERVER = typeof window === 'undefined';
const API_BASE_URL = IS_SERVER
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export async function getContracts() {
    const res = await fetch(`${API_BASE_URL}/contracts/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return res.json();
}

export async function createContract(name: string) {
    const res = await fetch(`${API_BASE_URL}/contracts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create contract');
    return res.json();
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
