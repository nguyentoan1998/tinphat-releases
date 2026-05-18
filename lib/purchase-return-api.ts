// Purchase Returns API Client (Trả hàng mua)
import { apiClient } from './api-client';

// ===== TYPES =====

export type PurchaseReturnStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseReturn {
    id: string;
    returnNumber: string;
    purchaseOrderId?: string;
    supplierId?: string;
    warehouseId: string;
    returnDate: string;
    totalAmount?: number;
    status: PurchaseReturnStatus;
    note?: string;
    images?: any;
    createdAt: string;
    updatedAt: string;
    PurchaseOrder?: { id: string; poNumber: string };
    Supplier?: { id: string; name: string; code: string };
    Warehouse?: { id: string; name: string; code: string };
    PurchaseReturnItem?: PurchaseReturnItem[];
}

export interface PurchaseReturnItem {
    id: string;
    returnId: string;
    productId: string;
    quantity: number;
    unitPrice?: number;
    reason?: string;
    createdAt: string;
    updatedAt: string;
    Product?: { id: string; code: string; name: string };
}

export interface PurchaseReturnFilters {
    status?: PurchaseReturnStatus;
    supplierId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreatePurchaseReturnDto {
    purchaseOrderId?: string;
    supplierId?: string;
    warehouseId: string;
    returnDate?: string;
    note?: string;
    images?: any;
    items: { productId: string; quantity: number; reason?: string }[];
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
// Correct base path: /purchasing/returns (NOT /purchasing/purchase-returns)

export const purchaseReturnApi = {
    getReturns: async (filters?: PurchaseReturnFilters): Promise<PurchaseReturn[]> => {
        const res = await apiClient.get<any>('/purchasing/returns', { params: filters });
        return unwrap<PurchaseReturn>(res);
    },

    getReturn: async (id: string): Promise<PurchaseReturn> => {
        return apiClient.get<PurchaseReturn>(`/purchasing/returns/${id}`);
    },

    createReturn: async (data: CreatePurchaseReturnDto): Promise<PurchaseReturn> => {
        return apiClient.post<PurchaseReturn>('/purchasing/returns', data);
    },

    updateReturn: async (id: string, data: Partial<CreatePurchaseReturnDto>): Promise<PurchaseReturn> => {
        return apiClient.patch<PurchaseReturn>(`/purchasing/returns/${id}`, data);
    },

    deleteReturn: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/purchasing/returns/${id}`);
    },

    confirmReturn: async (id: string): Promise<PurchaseReturn> => {
        return apiClient.post<PurchaseReturn>(`/purchasing/returns/${id}/confirm`);
    },
};
