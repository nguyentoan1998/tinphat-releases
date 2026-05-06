// Production Orders API Client (Lệnh sản xuất)
import { apiClient } from './api-client';

// ===== TYPES =====

export type ProductionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ProductionOrder {
    id: string;
    orderNumber: string;
    productionPlanId?: string;
    bomId: string;
    productId: string;
    quantity: number;
    producedQty: number;
    status: ProductionStatus;
    startDate?: string;
    endDate?: string;
    createdAt: string;
    updatedAt: string;
    BOM?: {
        id: string;
        productId: string;
        Product?: { id: string; name: string; code: string };
    };
    Product?: { id: string; name: string; code: string };
    ProductionPlan?: { id: string; planNumber: string };
}

export interface ProductionOrderFilters {
    status?: ProductionStatus;
    productionPlanId?: string;
    bomId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateProductionOrderDto {
    orderNumber?: string;
    productionPlanId?: string;
    bomId: string;
    productId: string;
    quantity: number;
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
// Correct path: /production/orders (NOT /production/production-orders)

export const productionOrderApi = {
    getOrders: async (filters?: ProductionOrderFilters): Promise<ProductionOrder[]> => {
        const res = await apiClient.get<any>('/production/orders', { params: filters });
        return unwrap<ProductionOrder>(res);
    },

    getOrder: async (id: string): Promise<ProductionOrder> => {
        return apiClient.get<ProductionOrder>(`/production/orders/${id}`);
    },

    createOrder: async (data: CreateProductionOrderDto): Promise<ProductionOrder> => {
        return apiClient.post<ProductionOrder>('/production/orders', data);
    },

    updateOrder: async (id: string, data: Partial<CreateProductionOrderDto>): Promise<ProductionOrder> => {
        return apiClient.patch<ProductionOrder>(`/production/orders/${id}`, data);
    },

    deleteOrder: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/production/orders/${id}`);
    },
};
