// Sales Orders API Client (Đơn đặt hàng)
import { apiClient } from './api-client';

// ===== TYPES =====

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';

export interface SalesOrder {
    id: string;
    orderNumber: string;
    customerId: string;
    orderDate: string;
    deliveryDate?: string;
    totalAmount: number;
    status: OrderStatus;
    note?: string;
    images?: any;
    createdAt: string;
    updatedAt: string;
    Customer?: {
        id: string;
        name: string;
        code: string;
    };
    OrderItem?: OrderItem[];
}

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    price: number;
    createdAt: string;
    updatedAt: string;
    Product?: {
        id: string;
        name: string;
        code: string;
    };
}

export interface SalesOrderFilters {
    status?: OrderStatus;
    customerId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateSalesOrderDto {
    customerId: string;
    orderDate?: string;
    deliveryDate?: string;
    note?: string;
    images?: any;
    items: {
        productId: string;
        quantity: number;
        price?: number;
    }[];
}

// ===== API FUNCTIONS =====

export const salesOrderApi = {
    getOrders: async (filters?: SalesOrderFilters): Promise<SalesOrder[]> => {
        return apiClient.get<SalesOrder[]>('/sales/orders', { params: filters });
    },

    getOrder: async (id: string): Promise<SalesOrder> => {
        return apiClient.get<SalesOrder>(`/sales/orders/${id}`);
    },

    createOrder: async (data: CreateSalesOrderDto): Promise<SalesOrder> => {
        return apiClient.post<SalesOrder>('/sales/orders', data);
    },

    updateOrder: async (id: string, data: Partial<CreateSalesOrderDto>): Promise<SalesOrder> => {
        return apiClient.patch<SalesOrder>(`/sales/orders/${id}`, data);
    },

    deleteOrder: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/sales/orders/${id}`);
    },

    confirmOrder: async (id: string): Promise<SalesOrder> => {
        return apiClient.post<SalesOrder>(`/sales/orders/${id}/confirm`);
    },

    addItem: async (id: string, item: { productId: string; quantity: number; price?: number }): Promise<SalesOrder> => {
        return apiClient.post<SalesOrder>(`/sales/orders/${id}/items`, item);
    },

    updateItem: async (id: string, itemId: string, data: { quantity?: number; price?: number }): Promise<SalesOrder> => {
        return apiClient.patch<SalesOrder>(`/sales/orders/${id}/items/${itemId}`, data);
    },

    deleteItem: async (id: string, itemId: string): Promise<void> => {
        return apiClient.delete<void>(`/sales/orders/${id}/items/${itemId}`);
    },
};
