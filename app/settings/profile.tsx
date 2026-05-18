// Settings Profile — Shows current user's Employee profile using EmployeeViewModal + EmployeeFormModal
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useAuthStore, useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights } from '@/constants/Tokens';
import { employeeApi, Employee, UpdateEmployeeDto } from '@/lib/employee-api';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import EmployeeViewModal from '@/components/ui/EmployeeViewModal';
import EmployeeFormModal from '@/components/ui/EmployeeFormModal';

export default function ProfileScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(false);
    const [viewVisible, setViewVisible] = useState(false);
    const [editVisible, setEditVisible] = useState(false);

    // Auto-open view modal once employee loaded
    useEffect(() => {
        if (user?.employeeId) loadEmployee(user.employeeId);
    }, [user?.employeeId]);

    const loadEmployee = async (empId: string) => {
        try {
            setLoading(true);
            const emp = await employeeApi.getEmployeeById(empId);
            setEmployee(emp);
            setViewVisible(true);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể tải thông tin nhân viên');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: UpdateEmployeeDto, id?: string) => {
        if (!id) return;
        try {
            await employeeApi.updateEmployee(id, data);
            // Reload employee data
            const updated = await employeeApi.getEmployeeById(id);
            setEmployee(updated);
            showDialog('Thành công', 'Đã cập nhật thông tin nhân viên');
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể cập nhật thông tin');
        }
    };

    const isAdmin = user?.role === 'ADMIN';
    const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

    return (
        <View style={{ flex: 1 }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.iconBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={20} color={colors.textSecondary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.textPrimary }]}>Thông tin cá nhân</Text>
                        <Text style={[s.sub, { color: colors.textMuted }]}>Hồ sơ nhân viên</Text>
                    </View>
                </Animated.View>

                {/* Content */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={s.center}>
                    {loading ? (
                        <>
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text style={[s.loadingT, { color: colors.textMuted }]}>Đang tải hồ sơ...</Text>
                        </>
                    ) : !user?.employeeId ? (
                        /* No employee linked */
                        <View style={s.emptyWrap}>
                            <LinearGradient colors={['#6366F1', '#818CF8']} style={s.avatarCircle}>
                                <Text style={s.avatarT}>{initial}</Text>
                            </LinearGradient>
                            <Text style={[s.empName, { color: colors.textPrimary }]}>{user?.name || 'User'}</Text>
                            <Text style={[s.empSub, { color: colors.textMuted }]}>{user?.email}</Text>
                            <View style={[s.noEmpBadge, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]}>
                                <Text style={{ fontSize: FontSizes.xs, color: '#F59E0B', fontWeight: FontWeights.medium }}>
                                    Tài khoản chưa được liên kết với hồ sơ nhân viên
                                </Text>
                            </View>
                        </View>
                    ) : employee ? (
                        /* Tap to reopen modal */
                        <Pressable onPress={() => setViewVisible(true)} style={[s.reopenBtn, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', borderColor: '#6366F1' + '40' }]}>
                            <Text style={{ fontSize: FontSizes.sm, color: '#6366F1', fontWeight: FontWeights.semibold }}>
                                Xem hồ sơ nhân viên
                            </Text>
                        </Pressable>
                    ) : null}
                </Animated.View>
            </SafeAreaView>

            {/* Employee View Modal */}
            <EmployeeViewModal
                visible={viewVisible}
                employee={employee}
                onClose={() => { setViewVisible(false); router.back(); }}
                onEdit={() => setEditVisible(true)}
                isAdmin={isAdmin || (employee?.userId === user?.id)}
            />

            {/* Employee Edit Modal — accessible to own employee or admin */}
            <EmployeeFormModal
                visible={editVisible}
                employee={employee}
                onClose={() => setEditVisible(false)}
                onSave={handleSave}
            />

            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    iconBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    sub: { fontSize: FontSizes.xs, marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xl },
    loadingT: { fontSize: FontSizes.sm },
    emptyWrap: { alignItems: 'center', gap: Spacing.md },
    avatarCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
    avatarT: { fontSize: 36, fontWeight: FontWeights.bold, color: '#FFF' },
    empName: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold },
    empSub: { fontSize: FontSizes.sm },
    noEmpBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 4 },
    reopenBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
});
