// Product Outputs API (Sản lượng công nhân)
import { apiClient } from './api-client';

// ===== TYPES =====

export interface ProductOutput {
    id: string;
    employeeId: string;
    productionOrderId?: string;
    productId: string;
    outputDate: string;
    quantity: number;
    salaryAmount: number;
    verified: boolean;
    isDailyRate?: boolean;
    note?: string;
    warehouseId?: string;
    createdAt: string;
    updatedAt: string;
    Employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    ProductionOrder?: {
        id: string;
        orderNumber: string;
    };
    Product?: {
        id: string;
        code: string;
        name: string;
        description?: string;
        salaryPrice?: number;
        salePrice?: number;
        MeasurementUnit?: {
            id: string;
            name: string;
            symbol: string;
        };
    };
    RoutingStep?: {
        id: string;
        salaryPrice?: number;
    };
    Warehouse?: {
        id: string;
        name: string;
    };
}

export interface CreateProductOutputDto {
    employeeId: string;
    productionOrderId?: string;
    productId: string;
    outputDate: string;
    quantity: number;
    salaryAmount?: number;
    note?: string;
    warehouseId?: string;
}

export interface UpdateProductOutputDto {
    quantity?: number;
    salaryAmount?: number;
    verified?: boolean;
    note?: string;
    warehouseId?: string;
}

export interface ProductOutputFilters {
    employeeId?: string;
    productionOrderId?: string;
    month?: number;
    year?: number;
    verified?: boolean;
    search?: string;
    teamId?: string;
    page?: number;
    limit?: number;
}

// ===== API FUNCTIONS =====

export const productOutputApi = {
    async getOutputs(filters?: ProductOutputFilters): Promise<ProductOutput[]> {
        const params = new URLSearchParams();
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);
        if (filters?.productionOrderId) params.append('productionOrderId', filters.productionOrderId);
        if (filters?.month !== undefined) params.append('month', filters.month.toString());
        if (filters?.year !== undefined) params.append('year', filters.year.toString());
        if (filters?.verified !== undefined) params.append('verified', filters.verified.toString());
        if (filters?.search) params.append('search', filters.search);
        if (filters?.teamId) params.append('teamId', filters.teamId);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const res = await apiClient.get<any>(`/payroll/product-outputs${queryString ? `?${queryString}` : ''}`);
        return res; // Trả về nguyên payload { data, meta }
    },

    async getOutput(id: string): Promise<ProductOutput> {
        return apiClient.get<ProductOutput>(`/payroll/product-outputs/${id}`);
    },

    async createOutput(data: CreateProductOutputDto): Promise<ProductOutput> {
        return apiClient.post<ProductOutput>('/payroll/product-outputs', data);
    },

    async updateOutput(id: string, data: UpdateProductOutputDto): Promise<ProductOutput> {
        return apiClient.patch<ProductOutput>(`/payroll/product-outputs/${id}`, data);
    },

    async deleteOutput(id: string): Promise<void> {
        return apiClient.delete<void>(`/payroll/product-outputs/${id}`);
    },
};
