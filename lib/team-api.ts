// Team API Client
import { apiClient } from './api-client';

export interface Team {
    id: string;
    code: string;
    name: string;
    description?: string;
    outputVisible: boolean;
}

export interface UpdateTeamDto {
    name?: string;
    code?: string;
    description?: string;
    outputVisible?: boolean;
}

class TeamApi {
    async getTeams(): Promise<Team[]> {
        return apiClient.get<Team[]>('/teams');
    }

    async updateTeam(id: string, data: UpdateTeamDto): Promise<Team> {
        return apiClient.patch<Team>(`/teams/${id}`, data);
    }
}

export const teamApi = new TeamApi();
