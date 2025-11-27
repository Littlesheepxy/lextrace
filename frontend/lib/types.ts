export interface Contract {
    id: number;
    name: string;
    created_at: string;
    version_count?: number;
}

export interface Version {
    id: number;
    contract_id: number;
    version_number: number;
    commit_message: string;
    created_at: string;
    file_path: string;
    html_content?: string;
}

export interface Diff {
    id: number;
    content: string; // JSON string
    summary: string;
}

export interface Analysis {
    summary: string;
    risk_assessments: Record<string, { risk: 'high' | 'medium' | 'low'; reason: string }>;
}

export interface DiffContent {
    clause_id: string;
    type: 'added' | 'modified' | 'deleted' | 'unchanged';
    original: string | null;
    modified: string | null;
    risk?: 'high' | 'medium' | 'low';
}

export interface OperationLog {
    id: number;
    contract_id: number;
    action: string;
    details: string;
    created_at: string;
}
