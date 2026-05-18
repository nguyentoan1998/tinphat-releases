// Accounts Payable API Client (Công nợ phải trả)
import { apiClient } from './api-client';

// ===== TYPES =====

export type APStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface AccountPayable {
    id: string;
    supplierId: string;
    purchaseOrderId?: string;
    amount: number;
    paidAmount: number;
    dueDate?: string;
    status: APStatus;
    createdAt: string;
    updatedAt: string;
    Supplier?: {
        id: string;
        name: string;
        code: string;
    };
    PurchaseOrder?: {
        id: string;
        poNumber: string;
    };
    APPayment?: APPayment[];
}

export interface APPayment {
    id: string;
    payableId: string;
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    note?: string;
    createdAt: string;
}

export interface AccountsPayableFilters {
    status?: APStatus;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
}

export interface APSummary {
    totalUnpaid: number;
    totalPartial: number;
    totalPaid: number;
    totalAmount: number;
    totalPaidAmount: number;
    overdueCount: number;
}

export interface CreateAPPaymentDto {
    amount: number;
    paymentDate?: string;
    paymentMethod?: string;
    note?: string;
}

// ===== API FUNCTIONS =====

export const accountsPayableApi = {
    getPayables: async (filters?: AccountsPayableFilters): Promise<AccountPayable[]> => {
        const params: Record<string, any> = { limit: 0, ...filters };
        const res = await apiClient.get<any>('/purchasing/accounts-payable', { params });
        // Backend trả về paginated response { data: [...], meta: {...} }
        return Array.isArray(res) ? res : (res?.data ?? []);
    },

    getSummary: async (): Promise<APSummary> => {
        return apiClient.get<APSummary>('/purchasing/accounts-payable/summary');
    },

    getPayable: async (id: string): Promise<AccountPayable> => {
        return apiClient.get<AccountPayable>(`/purchasing/accounts-payable/${id}`);
    },

    recordPayment: async (id: string, payment: CreateAPPaymentDto): Promise<AccountPayable> => {
        return apiClient.post<AccountPayable>(`/purchasing/accounts-payable/${id}/payments`, payment);
    },
};
