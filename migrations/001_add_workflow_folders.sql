-- Migration: Add workflow_folders table and update workflows table
-- Date: 2025-01-XX
-- Description: Adds workflow folder functionality for organizing workflows

-- Create workflow_folders table
CREATE TABLE IF NOT EXISTS workflow_folders (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    parent_id VARCHAR(36) REFERENCES workflow_folders(id),
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on parent_id for faster lookups
CREATE INDEX IF NOT EXISTS workflow_folders_parent_id_idx ON workflow_folders(parent_id);

-- Add folder columns to workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36) REFERENCES workflow_folders(id),
ADD COLUMN IF NOT EXISTS folder_path TEXT;

-- Create index on folder_id for faster lookups
CREATE INDEX IF NOT EXISTS workflows_folder_id_idx ON workflows(folder_id);

-- Add comment for documentation
COMMENT ON TABLE workflow_folders IS '워크플로우 폴더 테이블 - 워크플로우를 폴더로 정리할 수 있도록 함';
COMMENT ON COLUMN workflows.folder_id IS '워크플로우가 속한 폴더 ID';
COMMENT ON COLUMN workflows.folder_path IS '폴더 계층 구조 경로 (예: "folder1/subfolder1")';

