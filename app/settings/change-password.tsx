// Change Password Screen — Glassmorphism
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView,
    TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ChevronLeft, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { apiClient } from '@/lib/api-client';
import { useDarkDialog } from '@/components/ui/DarkDialog';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const handleChange = async () => {
        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            return showDialog('Thiếu thông tin', 'Vui lòng điền đầy đủ tất cả các trường');
        }
        if (form.newPassword !== form.confirmPassword) {
            return showDialog('Không khớp', 'Mật khẩu mới và xác nhận không khớp');
        }
        if (form.newPassword.length < 6) {
            return showDialog('Quá ngắn', 'Mật khẩu mới phải có ít nhất 6 ký tự');
        }
        try {
            setLoading(true);
            await apiClient.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
            showDialog('Thành công', 'Đổi mật khẩu thành công!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            showDialog('Lỗi', e.response?.data?.message || 'Không thể đổi mật khẩu');
        } finally { setLoading(false); }
    };

    const fields = [
        { key: 'currentPassword', label: 'Mật khẩu hiện tại', showKey: 'current' as const },
        { key: 'newPassword', label: 'Mật khẩu mới', showKey: 'new' as const },
        { key: 'confirmPassword', label: 'Xác nhận mật khẩu mới', showKey: 'confirm' as const },
    ];

    return (
        <View style={s.root}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={s.safe} edges={['top']}>
                <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
                    <Pressable style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <ChevronLeft size={22} color={colors.textSecondary} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Đổi mật khẩu</Text>
                        <Text style={[s.headerSub, { color: colors.textMuted }]}>Bảo mật tài khoản</Text>
                    </View>
                </Animated.View>

                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                    {/* Icon hero */}
                    <Animated.View entering={FadeInUp.duration(400).delay(60).springify().damping(18)} style={s.hero}>
                        <LinearGradient colors={['#6366F1', '#818CF8']} style={s.heroIcon}>
                            <ShieldCheck size={36} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={[s.heroT, { color: colors.textPrimary }]}>Bảo mật tài khoản</Text>
                        <Text style={[s.heroSub, { color: colors.textMuted }]}>Sử dụng mật khẩu mạnh ít nhất 6 ký tự</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(400).delay(130).springify().damping(18)} style={[s.card, { borderColor: colors.cardBorder }]}>
                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                        <View style={[s.cardInner, { backgroundColor: colors.cardBg }]}>
                            {fields.map((f, i) => (
                                <View key={f.key} style={[s.field, i < fields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                                    <Text style={[s.label, { color: colors.textMuted }]}>{f.label}</Text>
                                    <View style={s.inputRow}>
                                        <Lock size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={[s.input, { color: colors.textPrimary }]}
                                            value={(form as any)[f.key]}
                                            onChangeText={t => setForm({ ...form, [f.key]: t })}
                                            placeholder="••••••••"
                                            placeholderTextColor={colors.textMuted}
                                            secureTextEntry={!(showPw as any)[f.showKey]}
                                        />
                                        <Pressable onPress={() => setShowPw(p => ({ ...p, [f.showKey]: !p[f.showKey] }))}>
                                            {(showPw as any)[f.showKey]
                                                ? <Eye size={18} color={colors.textMuted} />
                                                : <EyeOff size={18} color={colors.textMuted} />
                                            }
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(400).delay(200).springify().damping(18)}>
                        <Pressable style={[s.saveBtn, loading && { opacity: 0.6 }]} onPress={handleChange} disabled={loading}>
                            <LinearGradient colors={['#6366F1', '#818CF8']} style={s.saveBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {loading
                                    ? <ActivityIndicator color="#FFFFFF" />
                                    : <Text style={s.saveBtnT}>Đổi mật khẩu</Text>
                                }
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                    <View style={{ height: 80 }} />
                </ScrollView>
            </SafeAreaView>
            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 }, safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
    headerSub: { fontSize: FontSizes.xs, marginTop: 2 },
    scroll: { paddingHorizontal: Spacing.xl },
    hero: { alignItems: 'center', paddingVertical: Spacing.xxl },
    heroIcon: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
    heroT: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 4 },
    heroSub: { fontSize: FontSizes.sm, textAlign: 'center' },
    card: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.lg },
    cardInner: { paddingVertical: Spacing.sm },
    field: { paddingHorizontal: Spacing.lg, paddingVertical: 12 },
    label: { fontSize: FontSizes.xs, marginBottom: 4 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, fontSize: FontSizes.base, paddingVertical: 4 },
    saveBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
    saveBtnInner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
    saveBtnT: { fontSize: FontSizes.base, fontWeight: FontWeights.bold, color: '#FFFFFF' },
});
