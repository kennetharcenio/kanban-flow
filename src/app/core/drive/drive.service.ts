import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

const FOLDER_ID_KEY = 'kanbanflow_folder_id';

@Injectable({ providedIn: 'root' })
export class DriveService {
  private folderId: string | null = null;

  constructor(private auth: AuthService) {
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

  buildAuthHeaders(): Headers | null {
    const token = this.auth.getAccessToken();
    if (!token) return null;
    return new Headers({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const headers = this.buildAuthHeaders();
    if (!headers) throw new Error('Not authenticated');

    const metadata: Record<string, any> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      metadata['parents'] = [parentId];
    }

    const response = await fetch(`${environment.driveApiUrl}/files`, {
      method: 'POST',
      headers,
      body: JSON.stringify(metadata),
    });
    const data = await response.json();
    return data.id;
  }

  async readJsonFile<T>(fileId: string): Promise<{ data: T; revisionId: string }> {
    const headers = this.buildAuthHeaders();
    if (!headers) throw new Error('Not authenticated');

    const metaResponse = await fetch(
      `${environment.driveApiUrl}/files/${fileId}?fields=headRevisionId`,
      { headers }
    );
    const meta = await metaResponse.json();

    const contentResponse = await fetch(
      `${environment.driveApiUrl}/files/${fileId}?alt=media`,
      { headers }
    );
    const data = await contentResponse.json();

    return { data, revisionId: meta.headRevisionId };
  }

  async writeJsonFile(
    fileId: string,
    content: any,
    expectedRevisionId?: string
  ): Promise<{ revisionId: string }> {
    const headers = this.buildAuthHeaders();
    if (!headers) throw new Error('Not authenticated');

    if (expectedRevisionId) {
      const metaResponse = await fetch(
        `${environment.driveApiUrl}/files/${fileId}?fields=headRevisionId`,
        { headers }
      );
      const meta = await metaResponse.json();
      if (meta.headRevisionId !== expectedRevisionId) {
        throw new ConflictError('File was modified by another user');
      }
    }

    const response = await fetch(
      `${environment.driveUploadUrl}/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: new Headers({
          Authorization: headers.get('Authorization')!,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(content),
      }
    );
    const data = await response.json();
    return { revisionId: data.headRevisionId };
  }

  async createJsonFile(name: string, parentId: string, content: any): Promise<string> {
    const token = this.auth.getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const metadata = {
      name,
      parents: [parentId],
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append(
      'file',
      new Blob([JSON.stringify(content)], { type: 'application/json' })
    );

    const response = await fetch(
      `${environment.driveUploadUrl}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: new Headers({ Authorization: `Bearer ${token}` }),
        body: form,
      }
    );
    const data = await response.json();
    return data.id;
  }

  async findFileInFolder(folderId: string, fileName: string): Promise<string | null> {
    const headers = this.buildAuthHeaders();
    if (!headers) throw new Error('Not authenticated');

    const query = `'${folderId}' in parents and name='${fileName}' and trashed=false`;
    const response = await fetch(
      `${environment.driveApiUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      { headers }
    );
    const data = await response.json();
    return data.files?.length > 0 ? data.files[0].id : null;
  }

  async listFoldersInFolder(folderId: string): Promise<{ id: string; name: string }[]> {
    const headers = this.buildAuthHeaders();
    if (!headers) throw new Error('Not authenticated');

    const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const response = await fetch(
      `${environment.driveApiUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      { headers }
    );
    const data = await response.json();
    return data.files || [];
  }

  async deleteFile(fileId: string): Promise<void> {
    const headers = this.buildAuthHeaders();
    if (!headers) throw new Error('Not authenticated');

    await fetch(`${environment.driveApiUrl}/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
