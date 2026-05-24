import { apiClient } from './api-client';
import { isMissingCallLogTableApiError } from './call-error';

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED';
  callType: 'VOICE' | 'VIDEO';
  startedAt: string;
  endedAt?: string;
  duration?: number;
  caller: { id: string; name: string };
  receiver: { id: string; name: string };
}

export const callApi = {
  getHistory: async (): Promise<CallLog[]> => {
    try {
      return await apiClient.get('/calls/history');
    } catch (error) {
      if (isMissingCallLogTableApiError(error)) return [];
      throw error;
    }
  },
  getHistoryWithUser: async (userId: string): Promise<CallLog[]> => {
    try {
      return await apiClient.get(`/calls/history/${userId}`);
    } catch (error) {
      if (isMissingCallLogTableApiError(error)) return [];
      throw error;
    }
  },
};
