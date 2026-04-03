import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_PREFIX = 'kanbanflow_dev_';
const FOLDER_ID_KEY = 'kanbanflow_folder_id';

/**
 * localStorage-backed mock of DriveService for dev/offline use.
 * Same public API so it can be swapped in via DI.
 */
@Injectable()
export class LocalDriveService {
  private folderId: string | null = null;

  constructor() {
    this.folderId = localStorage.getItem(FOLDER_ID_KEY);
  }

  getFolderId(): string | null {
    return this.folderId;
  }

  setFolderId(id: string): void {
    this.folderId = id;
    localStorage.setItem(FOLDER_ID_KEY, id);
  }

  clearFolderId(): void {
    this.folderId = null;
    localStorage.removeItem(FOLDER_ID_KEY);
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const id = uuidv4();
    const key = STORAGE_PREFIX + 'folder_' + id;
    localStorage.setItem(key, JSON.stringify({ id, name, parentId: parentId || null }));

    // Track child folders under parent
    if (parentId) {
      const childrenKey = STORAGE_PREFIX + 'children_' + parentId;
      const children = JSON.parse(localStorage.getItem(childrenKey) || '[]');
      children.push({ id, name });
      localStorage.setItem(childrenKey, JSON.stringify(children));
    }

    return id;
  }

  async readJsonFile<T>(fileId: string): Promise<{ data: T; revisionId: string }> {
    const key = STORAGE_PREFIX + 'file_' + fileId;
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error(`File not found: ${fileId}`);
    const record = JSON.parse(raw);
    return { data: record.content as T, revisionId: record.revision };
  }

  async writeJsonFile(
    fileId: string,
    content: any,
    _expectedRevisionId?: string
  ): Promise<{ revisionId: string }> {
    const key = STORAGE_PREFIX + 'file_' + fileId;
    const revision = uuidv4();
    const raw = localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : {};
    localStorage.setItem(key, JSON.stringify({ ...existing, content, revision }));
    return { revisionId: revision };
  }

  async createJsonFile(name: string, parentId: string, content: any): Promise<string> {
    const id = uuidv4();
    const key = STORAGE_PREFIX + 'file_' + id;
    const revision = uuidv4();
    localStorage.setItem(key, JSON.stringify({ id, name, parentId, content, revision }));

    // Index file under parent by name for findFileInFolder
    const indexKey = STORAGE_PREFIX + 'fileindex_' + parentId;
    const index = JSON.parse(localStorage.getItem(indexKey) || '{}');
    index[name] = id;
    localStorage.setItem(indexKey, JSON.stringify(index));

    return id;
  }

  async findFileInFolder(folderId: string, fileName: string): Promise<string | null> {
    const indexKey = STORAGE_PREFIX + 'fileindex_' + folderId;
    const index = JSON.parse(localStorage.getItem(indexKey) || '{}');
    return index[fileName] || null;
  }

  async listFoldersInFolder(folderId: string): Promise<{ id: string; name: string }[]> {
    const childrenKey = STORAGE_PREFIX + 'children_' + folderId;
    return JSON.parse(localStorage.getItem(childrenKey) || '[]');
  }

  async deleteFile(fileId: string): Promise<void> {
    const key = STORAGE_PREFIX + 'file_' + fileId;
    localStorage.removeItem(key);
  }

  buildAuthHeaders(): Headers | null {
    return new Headers({ 'Content-Type': 'application/json' });
  }
}
