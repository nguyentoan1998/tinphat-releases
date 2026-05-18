// Reset Password Screen — Light Theme with VietinBank Blue
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Lock, Eye, EyeOff, ChevronLeft, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/lib/api-client';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import { useDarkDialog } from '@/components/ui/DarkDialog';

function getPasswordStrength(pwd: string): { level: number; label: string; color: string } {
    if (!pwd) return { level: 0, label: '', color: 'rgba(1, 86, 167, 0.15)' };
    if (pwd.length < 6) return { level: 1, label: 'Yếu', color: '#D0202F' };
    if (pwd.length < 8) return { level: 2, label: 'Trung bình', color: '#F9C74F' };
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*]/.test(pwd);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score >= 2) return { level: 4, label: 'Rất mạnh', color: '#0ACF83' };
    return { level: 3, label: 'Mạnh', color: '#0156A7' };
}

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { email, token } = useLocalSearchParams<{ email?: string; token?: string }>();
    const { showDialog, DialogComponent } = useDarkDialog();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const strength = getPasswordStrength(newPassword);

    const handleReset = useCallback(async () => {
        if (!newPassword || newPassword.length < 8) {
            showDialog('Lỗi xác thực', 'Mật khẩu mới phải có ít nhất 8 ký tự');
            return;
        }
        if (newPassword !== confirmPassword) {
            showDialog('Lỗi xác thực', 'Mật khẩu xác nhận không khớp');
            return;
        }
        try {
            setLoading(true);
            await apiClient.resetPassword({
                email: email || '',
                code: token || '',
                newPassword: newPassword,
            });
            setSuccess(true);
        } catch (err: any) {
            showDialog('Thất bại', err.response?.data?.message || 'Mã không đúng hoặc đã hết hạn');
        } finally {
            setLoading(false);
        }
    }, [newPassword, confirmPassword, email, token, showDialog]);

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            {/* Decorative orbs */}
            <View style={[s.orb, { top: -100, right: -70, width: 300, height: 300, backgroundColor: 'rgba(1, 86, 167, 0.05)' }]} />
            <View style={[s.orb, { bottom: 60, left: -80, width: 240, height: 240, backgroundColor: 'rgba(1, 86, 167, 0.08)' }]} />

            <SafeAreaView style={s.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
                    <ScrollView
                        contentContainerStyle={s.scroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Back button */}
                        <Animated.View entering={FadeInDown.duration(400)} style={s.backRow}>
                            <Pressable style={s.backBtn} onPress={() => router.back()} disabled={loading}>
                                <ChevronLeft size={22} color="#0156A7" />
                            </Pressable>
                        </Animated.View>

                        {/* Icon + title */}
                        <Animated.View entering={FadeInDown.duration(500).delay(100).springify()} style={s.header}>
                            <LinearGradient
                                colors={['#0156A7', '#013B78']}
                                style={s.iconCircle}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Lock size={32} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={s.title}>Đặt lại mật khẩu</Text>
                            <Text style={s.subtitle}>Tạo mật khẩu mới cho tài khoản của bạn</Text>
                        </Animated.View>

                        {/* Card */}
                        <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={s.card}>
                            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

                            {success ? (
                                /* Success state */
                                <View style={s.cardInner}>
                                    <LinearGradient
                                        colors={['#0ACF83', '#089F6B']}
                                        style={s.successIconCircle}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <ShieldCheck size={36} color="#FFFFFF" />
                                    </LinearGradient>
                                    <Text style={s.successTitle}>Đặt lại thành công</Text>
                                    <Text style={s.successMsg}>
                                        Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại với mật khẩu mới.
                                    </Text>
                                    <GlassButton
                                        title="Về trang đăng nhập"
                                        onPress={() => router.replace('/login')}
                                        gradient={['#0156A7', '#013B78']}
                                        icon={<ArrowRight size={18} color="#FFF" />}
                                    />
                                </View>
                            ) : (
                                /* Form state */
                                <View style={s.cardInner}>
                                    {/* New password */}
                                    <GlassInput
                                        label="Mật khẩu mới"
                                        theme="light"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry={!showNew}
                                        editable={!loading}
                                        icon={<Lock size={18} color="#0156A7" />}
                                        rightIcon={
                                            <Pressable onPress={() => setShowNew(v => !v)} hitSlop={8}>
                                                {showNew
                                                    ? <EyeOff size={18} color="#0156A7" />
                                                    : <Eye size={18} color="#0156A7" />}
                                            </Pressable>
                                        }
                                    />

                                    {/* Password strength indicator */}
                                    {newPassword.length > 0 && (
                                        <View style={s.strengthWrap}>
                                            <View style={s.strengthBars}>
                                                {[1, 2, 3, 4].map(lvl => (
                                                    <View
                                                        key={lvl}
                                                        style={[
                                                            s.strengthBar,
                                                            {
                                                                backgroundColor: lvl <= strength.level
                                                                    ? strength.color
                                                                    : 'rgba(1, 86, 167, 0.12)',
                                                            },
                                                        ]}
                                                    />
                                                ))}
                                            </View>
                                            <Text style={[s.strengthLabel, { color: strength.color }]}>
                                                {strength.label}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Confirm password */}
                                    <GlassInput
                                        label="Xác nhận mật khẩu"
                                        theme="light"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirm}
                                        editable={!loading}
                                        icon={<Lock size={18} color="#0156A7" />}
                                        rightIcon={
                                            <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={8}>
                                                {showConfirm
                                                    ? <EyeOff size={18} color="#0156A7" />
                                                    : <Eye size={18} color="#0156A7" />}
                                            </Pressable>
                                        }
                                    />

                                    <GlassButton
                                        title="Đặt lại mật khẩu"
                                        onPress={handleReset}
                                        loading={loading}
                                        disabled={loading}
                                        gradient={['#0156A7', '#013B78']}
                                        icon={!loading ? <ArrowRight size={18} color="#FFF" /> : undefined}
                                    />
                                </View>
                            )}
                        </Animated.View>

                        {/* Footer link */}
                        {!success && (
                            <Animated.View entering={FadeInUp.duration(600).delay(400)} style={s.footer}>
                                <Pressable onPress={() => router.replace('/login')} disabled={loading}>
                                    <Text style={s.footerLink}>Quay lại đăng nhập</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {DialogComponent}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    kav: { flex: 1 },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xxxl,
        justifyContent: 'center',
    },
    orb: { position: 'absolute', borderRadius: 999 },

    backRow: { marginBottom: Spacing.lg },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(1, 86, 167, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    header: { alignItems: 'center', marginBottom: Spacing.xxl },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: '#212529',
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: '#59677B',
        textAlign: 'center',
    },

    card: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(1, 86, 167, 0.15)',
        marginBottom: Spacing.xl,
    },
    cardInner: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: Spacing.xl,
        gap: Spacing.lg,
    },

    strengthWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: -Spacing.sm,
    },
    strengthBars: {
        flex: 1,
        flexDirection: 'row',
        gap: 4,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.medium,
        minWidth: 60,
        textAlign: 'right',
    },

    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    successTitle: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: '#212529',
        textAlign: 'center',
    },
    successMsg: {
        fontSize: FontSizes.sm,
        color: '#59677B',
        textAlign: 'center',
        lineHeight: 22,
    },

    footer: { alignItems: 'center', paddingVertical: Spacing.md },
    footerLink: {
        fontSize: FontSizes.sm,
        color: '#0156A7',
        fontWeight: FontWeights.medium,
    },
});
