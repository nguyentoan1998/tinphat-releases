// Role-based permission config for UI visibility
import type { User } from './api-client';

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

// Bottom tabs visible per role (tab id from CustomTabBar)
const VISIBLE_TABS: Record<UserRole, string[]> = {
    ADMIN: ['inventory', 'calls', 'home', 'messages', 'plans'],
    MANAGER: ['inventory', 'calls', 'home', 'messages', 'plans'],
    USER: ['calls', 'home', 'messages'],
};

// Inventory cards visible per role (ADMIN sees all)
const MANAGER_INVENTORY_CARDS = ['current-stock', 'products'];

// Home menu sections - which roles can access each menu id
const HOME_MENU_ROLES: Record<string, UserRole[]> = {
    // Lương (salary)
    'attendance': ['ADMIN', 'MANAGER', 'USER'],
    'product-outputs': ['ADMIN', 'MANAGER', 'USER'],
    'salary': ['ADMIN', 'MANAGER', 'USER'],
    // Nhân sự (HR)
    'employees': ['ADMIN', 'MANAGER', 'USER'],
    'leave-request': ['ADMIN', 'MANAGER', 'USER'],
    'resign-request': ['ADMIN', 'MANAGER', 'USER'],
    // Công nợ (debt) — ADMIN only
    'receivables': ['ADMIN'],
    'payables': ['ADMIN'],
    'report-sales': ['ADMIN'],
    'report-purchase': ['ADMIN'],
    // Video tutorials
    'tutorial-drill': ['ADMIN', 'MANAGER', 'USER'],
    'tutorial-weld': ['ADMIN', 'MANAGER', 'USER'],
    'tutorial-punch': ['ADMIN', 'MANAGER', 'USER'],
    'tutorial-polish': ['ADMIN', 'MANAGER', 'USER'],
    'tutorial-assembly': ['ADMIN', 'MANAGER', 'USER'],
    'tutorial-laser': ['ADMIN', 'MANAGER', 'USER'],
    // Settings
    'users': ['ADMIN'],
};

// Salary screens - what data each role sees
export function getSalaryScope(role?: UserRole): 'all' | 'team' | 'self' {
    if (!role || role === 'ADMIN') return 'all';
    if (role === 'MANAGER') return 'team';
    return 'self';
}

// Leave/Resignation screens - what data each role sees
export function getRequestScope(role?: UserRole): 'all' | 'team' | 'self' {
    if (!role || role === 'ADMIN') return 'all';
    if (role === 'MANAGER') return 'team';
    return 'self';
}

export function isTabVisible(tabName: string, role?: UserRole): boolean {
    if (!role) return false;
    return VISIBLE_TABS[role]?.includes(tabName) ?? false;
}

export function isInventoryCardVisible(cardId: string, role?: UserRole): boolean {
    if (!role || role === 'ADMIN') return true;
    if (role === 'MANAGER') return MANAGER_INVENTORY_CARDS.includes(cardId);
    return false;
}

export function isHomeMenuVisible(menuId: string, role?: UserRole): boolean {
    if (!role) return false;
    const allowed = HOME_MENU_ROLES[menuId];
    if (!allowed) {
        // Unknown menu items are hidden by default for security
        return false;
    }
    return allowed.includes(role);
}

export function getRoleLabel(role?: string): string {
    switch (role) {
        case 'ADMIN': return 'Quản trị viên';
        case 'MANAGER': return 'Quản lý';
        default: return 'Nhân viên';
    }
}
