// Purchase Orders API Client (Đơn mua hàng)
import { apiClient } from './api-client';

// ===== TYPES =====

export type POStatus = 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    orderDate: string;
    expectedDate?: string;
    status: POStatus;
    totalAmount: number;
    note?: string;
    images?: any;
    createdAt: string;
    updatedAt: string;
    Supplier?: {
        id: string;
        name: string;
        code: string;
    };
    PurchaseOrderItem?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
    id: string;
    purchaseOrderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    receivedQty: number;
    createdAt: string;
    updatedAt: string;
    Product?: {
        id: string;
        name: string;
        code: string;
    };
}

export interface PurchaseOrderFilters {
    status?: POStatus;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreatePurchaseOrderDto {
    poNumber?: string;
    supplierId: string;
    orderDate?: string;
    expectedDate?: string;
    note?: string;
    images?: any;
    items: {
        productId: string;
        quantity: number;
        unitPrice: number;
    }[];
}

// Helper to unwrap list responses
const unwrap = <T>(res: any): T[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res as T[];
    for (const key of ['data', 'items', 'results']) {
        if (res[key] && Array.isArray(res[key])) return res[key] as T[];
    }
    return [];
};

// ===== API FUNCTIONS =====
// Correct base path: /purchasing/orders (NOT /purchasing/purchase-orders)

export const purchaseOrderApi = {
    getOrders: async (filters?: PurchaseOrderFilters): Promise<PurchaseOrder[]> => {
        const res = await apiClient.get<any>('/purchasing/orders', { params: filters });
        return unwrap<PurchaseOrder>(res);
    },

    getOrder: async (id: string): Promise<PurchaseOrder> => {
        return apiClient.get<PurchaseOrder>(`/purchasing/orders/${id}`);
    },

    createOrder: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
        return apiClient.post<PurchaseOrder>('/purchasing/orders', data);
    },

    updateOrder: async (id: string, data: Partial<CreatePurchaseOrderDto>): Promise<PurchaseOrder> => {
        return apiClient.patch<PurchaseOrder>(`/purchasing/orders/${id}`, data);
    },

    deleteOrder: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/purchasing/orders/${id}`);
    },

    addItem: async (id: string, item: { productId: string; quantity: number; unitPrice: number }): Promise<PurchaseOrder> => {
        return apiClient.post<PurchaseOrder>(`/purchasing/orders/${id}/items`, item);
    },

    deleteItem: async (id: string, itemId: string): Promise<void> => {
        return apiClient.delete<void>(`/purchasing/orders/${id}/items/${itemId}`);
    },
};
