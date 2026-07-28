import { apiRequest } from './api';

export const storageApi = {
  uploadFile: (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    
    return apiRequest<{ fileName: string; url: string; originalName: string; mimeType: string; size: number }>('/storage/upload', {
      method: 'POST',
      body: formData,
    });
  },
};
