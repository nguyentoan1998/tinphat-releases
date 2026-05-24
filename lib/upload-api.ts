import axios from 'axios';
import { secureStorage } from '@/lib/secure-storage';
import { API_BASE_URL, buildApiUrl } from '@/lib/api-client';

export interface UploadedChatFile {
  url: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}

export const uploadFile = async (fileUri: string, fileName: string, mimeType: string): Promise<UploadedChatFile> => {
  const token = await secureStorage.getToken();
  const form = new FormData();
  form.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
  const res = await axios.post(`${API_BASE_URL}/upload/chat`, form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`,
    },
  });
  return {
    ...res.data,
    url: buildApiUrl(res.data?.url) || res.data?.url,
  };
};
