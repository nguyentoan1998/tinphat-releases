// Position API
import { apiClient } from './api-client';

export interface Position {
    id: string;
    name: string;
    code: string;
    baseSalary?: number;
}

export const positionApi = {
    async getPositions(): Promise<Position[]> {
        return apiClient.get<Position[]>('/positions');
    },
};
