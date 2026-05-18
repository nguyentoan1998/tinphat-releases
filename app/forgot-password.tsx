// Forgot Password Screen — Light Theme with VietinBank Blue
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mail, ChevronLeft, ArrowRight, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api-client';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import TinPhatLogo from '@/components/TinPhatLogo';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { showDialog, DialogComponent } = useDarkDialog();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!email) {
            showDialog('Thiếu thông tin', 'Vui lòng nhập email của bạn');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showDialog('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email');
            return;
        }
        try {
            setLoading(true);
            await apiClient.forgotPassword(email);
            setSuccess(true);
        } catch (err: any) {
            showDialog(
                'Gửi thất bại',
                err.response?.data?.message || 'Không thể gửi hướng dẫn. Vui lòng kiểm tra lại email.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            {/* Decorative orbs */}
            <View style={[s.orb, { top: -80, right: -60, width: 260, height: 260, backgroundColor: 'rgba(1, 86, 167, 0.05)' }]} />
            <View style={[s.orb, { bottom: 100, left: -80, width: 220, height: 220, backgroundColor: 'rgba(1, 86, 167, 0.08)' }]} />

            <SafeAreaView style={s.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
                    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        {/* Back button */}
                        <Animated.View entering={FadeInDown.duration(400)} style={s.backRow}>
                            <Pressable style={s.backBtn} onPress={() => router.back()} disabled={loading}>
                                <ChevronLeft size={20} color="#0156A7" />
                            </Pressable>
                        </Animated.View>

                        {/* Logo */}
                        <Animated.View entering={FadeInDown.duration(600).springify()} style={s.logoWrap}>
                            <TinPhatLogo size={80} showText={false} />
                        </Animated.View>

                        {success ? (
                            /* Success state */
                            <Animated.View entering={FadeInUp.duration(600).springify()} style={s.card}>
                                <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                                <View style={s.cardInner}>
                                    {/* Big mail icon with blue gradient circle */}
                                    <View style={s.successIconWrap}>
                                        <LinearGradient
                                            colors={['#0156A7', '#013B78']}
                                            style={s.successIconCircle}
                                        >
                                            <Mail size={36} color="#FFFFFF" />
                                        </LinearGradient>
                                    </View>

                                    <Text style={s.cardTitle}>Đã gửi hướng dẫn</Text>
                                    <Text style={s.cardSub}>
                                        Vui lòng kiểm tra hộp thư đến của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
                                    </Text>
                                    <Text style={s.emailHighlight}>{email}</Text>

                                    <GlassButton
                                        title="Quay lại đăng nhập"
                                        onPress={() => router.replace('/login')}
                                        gradient={['#0156A7', '#013B78']}
                                        icon={<ArrowRight size={18} color="#FFF" />}
                                    />

                                    <Pressable style={s.resendBtn} onPress={() => setSuccess(false)}>
                                        <Text style={s.resendText}>Gửi lại hướng dẫn</Text>
                                    </Pressable>
                                </View>
                            </Animated.View>
                        ) : (
                            /* Form state */
                            <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={s.card}>
                                <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                                <View style={s.cardInner}>
                                    <Text style={s.cardTitle}>Quên mật khẩu</Text>
                                    <Text style={s.cardSub}>
                                        Nhập email để nhận hướng dẫn đặt lại mật khẩu
                                    </Text>

                                    <GlassInput
                                        label="Email"
                                        theme="light"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!loading}
                                        icon={<Mail size={18} color="#0156A7" />}
                                    />

                                    <GlassButton
                                        title="Gửi hướng dẫn"
                                        onPress={handleSubmit}
                                        loading={loading}
                                        disabled={loading}
                                        gradient={['#0156A7', '#013B78']}
                                        icon={!loading ? <Send size={18} color="#FFF" /> : undefined}
                                    />
                                </View>
                            </Animated.View>
                        )}

                        {/* Footer */}
                        {!success && (
                            <Animated.View entering={FadeInUp.duration(600).delay(400)} style={s.footer}>
                                <Text style={s.footerText}>Đã nhớ mật khẩu? </Text>
                                <Pressable onPress={() => router.replace('/login')} disabled={loading}>
                                    <Text style={s.footerLink}>Đăng nhập</Text>
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
    scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center', paddingVertical: Spacing.xxxl },
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
    logoWrap: { alignItems: 'center', marginBottom: Spacing.xxl },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(1, 86, 167, 0.15)', marginBottom: Spacing.xl },
    cardInner: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: Spacing.xl, gap: Spacing.lg },
    cardTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#212529', textAlign: 'center' },
    cardSub: { fontSize: FontSizes.sm, color: '#59677B', textAlign: 'center', lineHeight: 20, marginTop: -Spacing.sm },
    successIconWrap: { alignItems: 'center', marginBottom: Spacing.sm },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emailHighlight: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: '#0156A7',
        textAlign: 'center',
        marginTop: -Spacing.sm,
    },
    resendBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
    resendText: { fontSize: FontSizes.sm, color: '#0156A7', fontWeight: FontWeights.medium },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: FontSizes.sm, color: '#59677B' },
    footerLink: { fontSize: FontSizes.sm, color: '#0156A7', fontWeight: FontWeights.semibold },
});
