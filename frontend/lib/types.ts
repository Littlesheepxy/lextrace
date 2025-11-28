export interface Project {
    id: number
    name: string
    description?: string
    created_at: string
}

export interface Contract {
    id: number;
    project_id: number;
    name: string;
    created_at: string;
    version_count: number;
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
    change_type?: 'renumbered' | 'renamed' | 'modified' | 'moved' | 'unchanged' | 'added' | 'deleted' | 'renumbered_and_renamed';
    original: string | null;
    modified: string | null;
    risk?: 'high' | 'medium' | 'low';
    indent?: number;
    similarity?: number;
    old_number?: string;
    new_number?: string;
    old_title?: string;
    new_title?: string;
}

export interface OperationLog {
    id: number;
    contract_id: number;
    action: string;
    details: string;
    created_at: string;
}

export interface Comment {
    id: number;
    contract_id: number;
    version_id: number;
    element_id: string;
    quote?: string;
    content: string;
    created_at: string;
}
