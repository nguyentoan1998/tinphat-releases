// Purchase Quotation API Client
import { apiClient } from './api-client';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED' | 'CANCELLED';

export interface PurchaseQuotationItem {
    id: string;
    quotationId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    amount: number;
    note?: string;
    Product?: { id: string; name: string; code: string };
}

export interface PurchaseQuotation {
    id: string;
    quotationNumber: string;
    supplierId: string;
    quotationDate: string;
    validUntil?: string;
    status: QuotationStatus;
    totalAmount: number;
    discount: number;
    tax: number;
    note?: string;
    terms?: string;
    purchaseOrderId?: string;
    createdAt: string;
    updatedAt: string;
    Supplier?: { id: string; name: string; code: string };
    PurchaseQuotationItem?: PurchaseQuotationItem[];
}

export const purchaseQuotationApi = {
    getAll: async (): Promise<PurchaseQuotation[]> =>
        apiClient.get<PurchaseQuotation[]>('/purchasing/quotations'),

    getOne: async (id: string): Promise<PurchaseQuotation> =>
        apiClient.get<PurchaseQuotation>(`/purchasing/quotations/${id}`),

    create: async (data: Partial<PurchaseQuotation>): Promise<PurchaseQuotation> =>
        apiClient.post<PurchaseQuotation>('/purchasing/quotations', data),

    update: async (id: string, data: Partial<PurchaseQuotation>): Promise<PurchaseQuotation> =>
        apiClient.patch<PurchaseQuotation>(`/purchasing/quotations/${id}`, data),

    delete: async (id: string): Promise<void> =>
        apiClient.delete<void>(`/purchasing/quotations/${id}`),

    send: async (id: string): Promise<PurchaseQuotation> =>
        apiClient.post<PurchaseQuotation>(`/purchasing/quotations/${id}/send`, {}),

    accept: async (id: string): Promise<PurchaseQuotation> =>
        apiClient.post<PurchaseQuotation>(`/purchasing/quotations/${id}/accept`, {}),

    reject: async (id: string): Promise<PurchaseQuotation> =>
        apiClient.post<PurchaseQuotation>(`/purchasing/quotations/${id}/reject`, {}),

    convert: async (id: string): Promise<PurchaseQuotation> =>
        apiClient.post<PurchaseQuotation>(`/purchasing/quotations/${id}/convert`, {}),
};
