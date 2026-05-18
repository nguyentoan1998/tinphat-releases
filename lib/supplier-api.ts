// Supplier API Client
import { apiClient } from './api-client';

export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface Supplier {
    id: string;
    code: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxCode?: string;
    paymentTerms?: string;
    status: SupplierStatus;
    createdAt: string;
    updatedAt: string;
}

export const supplierApi = {
    getAll: async (): Promise<Supplier[]> => {
        return apiClient.get<Supplier[]>('/purchasing/suppliers');
    },
    getOne: async (id: string): Promise<Supplier> => {
        return apiClient.get<Supplier>(`/purchasing/suppliers/${id}`);
    },
    create: async (data: Partial<Supplier>): Promise<Supplier> => {
        return apiClient.post<Supplier>('/purchasing/suppliers', data);
    },
    update: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
        return apiClient.patch<Supplier>(`/purchasing/suppliers/${id}`, data);
    },
    delete: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/purchasing/suppliers/${id}`);
    },
};
