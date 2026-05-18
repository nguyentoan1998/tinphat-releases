// Production Plans API Client (Kế hoạch sản xuất)
import { apiClient } from './api-client';

// ===== TYPES =====

export type PlanStatus = 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ProductionPlan {
    id: string;
    planNumber: string;
    month: number;
    year: number;
    orderId?: string;
    planDate: string;
    startDate?: string;
    endDate?: string;
    status: PlanStatus;
    createdAt: string;
    updatedAt: string;
    Order?: { id: string; orderNumber: string };
    ProductionOrder?: any[];
}

export interface ProductionPlanFilters {
    status?: PlanStatus;
    month?: number;
    year?: number;
    orderId?: string;
}

export interface CreateProductionPlanDto {
    planNumber?: string;
    month: number;
    year: number;
    orderId?: string;
    planDate?: string;
    startDate?: string;
    endDate?: string;
}

const unwrap = <T>(res: any): T[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res as T[];
    for (const key of ['data', 'items', 'results']) {
        if (res[key] && Array.isArray(res[key])) return res[key] as T[];
    }
    return [];
};

// ===== API FUNCTIONS =====
// Correct path: /production/plans (NOT /production/production-plans)

export const productionPlanApi = {
    getPlans: async (filters?: ProductionPlanFilters): Promise<ProductionPlan[]> => {
        const res = await apiClient.get<any>('/production/plans', { params: filters });
        return unwrap<ProductionPlan>(res);
    },

    getPlan: async (id: string): Promise<ProductionPlan> => {
        return apiClient.get<ProductionPlan>(`/production/plans/${id}`);
    },

    createPlan: async (data: CreateProductionPlanDto): Promise<ProductionPlan> => {
        return apiClient.post<ProductionPlan>('/production/plans', data);
    },

    updatePlan: async (id: string, data: Partial<CreateProductionPlanDto>): Promise<ProductionPlan> => {
        return apiClient.patch<ProductionPlan>(`/production/plans/${id}`, data);
    },

    deletePlan: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/production/plans/${id}`);
    },
};
