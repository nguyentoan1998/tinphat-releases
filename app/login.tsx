// Login Screen — Light Theme with VietinBank Blue
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import TinPhatLogo from '@/components/TinPhatLogo';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { getErrorMessage } from '@/lib/api-client';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

export default function LoginScreen() {
    const router = useRouter();
    const { login, isLoading } = useAuthStore();
    const { showDialog, DialogComponent } = useDarkDialog();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    const loading = isLoading || localLoading;

    const handleLogin = async () => {
        if (!email || !password) {
            showDialog('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu');
            return;
        }
        try {
            setLocalLoading(true);
            await login({ email, password });
        } catch (err: any) {
            console.error('[Login] Error:', err.message, err.code, err.response?.status);
            showDialog('Đăng nhập thất bại', getErrorMessage(err, 'Vui lòng kiểm tra lại email và mật khẩu'));
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            {/* Decorative orbs */}
            <View style={[s.orb, { top: -80, right: -60, width: 280, height: 280, backgroundColor: 'rgba(1, 86, 167, 0.05)' }]} />
            <View style={[s.orb, { bottom: 80, left: -80, width: 220, height: 220, backgroundColor: 'rgba(1, 86, 167, 0.08)' }]} />
            <View style={[s.orb, { top: '40%', right: -40, width: 160, height: 160, backgroundColor: 'rgba(1, 86, 167, 0.06)' }]} />

            <SafeAreaView style={s.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
                    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        {/* Logo */}
                        <Animated.View entering={FadeInDown.duration(600).springify()} style={s.logoWrap}>
                            <TinPhatLogo size={100} showText={true} />
                        </Animated.View>

                        {/* Card */}
                        <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={s.card}>
                            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                            <View style={s.cardInner}>
                                <Text style={s.cardTitle}>Đăng nhập</Text>
                                <Text style={s.cardSub}>Chào mừng bạn trở lại</Text>

                                <View style={s.fields}>
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
                                    <GlassInput
                                        label="Mật khẩu"
                                        theme="light"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPass}
                                        editable={!loading}
                                        icon={<Lock size={18} color="#0156A7" />}
                                        rightIcon={
                                            <Pressable onPress={() => setShowPass(!showPass)}>
                                                {showPass
                                                    ? <EyeOff size={18} color="#0156A7" />
                                                    : <Eye size={18} color="#0156A7" />}
                                            </Pressable>
                                        }
                                    />
                                </View>

                                <Pressable style={s.forgotBtn} onPress={() => router.push('/forgot-password')} disabled={loading}>
                                    <Text style={s.forgotText}>Quên mật khẩu?</Text>
                                </Pressable>

                                <GlassButton
                                    title="Đăng nhập"
                                    onPress={handleLogin}
                                    loading={loading}
                                    disabled={loading}
                                    gradient={['#0156A7', '#013B78']}
                                    icon={!loading ? <ArrowRight size={18} color="#FFF" /> : undefined}
                                />
                            </View>
                        </Animated.View>

                        {/* Footer */}
                        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={s.footer}>
                            <Text style={s.footerText}>Chưa có tài khoản? </Text>
                            <Pressable onPress={() => router.push('/register')} disabled={loading}>
                                <Text style={s.footerLink}>Đăng ký ngay</Text>
                            </Pressable>
                        </Animated.View>

                        {/* Version */}
                        <Animated.View entering={FadeInUp.duration(600).delay(500)} style={s.versionWrap}>
                            <Text style={s.versionText}>
                                v{Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0'}
                            </Text>
                        </Animated.View>

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
    logoWrap: { alignItems: 'center', marginBottom: Spacing.xxl },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(1, 86, 167, 0.15)', marginBottom: Spacing.xl },
    cardInner: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: Spacing.xl, gap: Spacing.lg },
    cardTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#212529', textAlign: 'center' },
    cardSub: { fontSize: FontSizes.sm, color: '#59677B', textAlign: 'center', marginTop: -Spacing.sm },
    fields: { gap: Spacing.md },
    forgotBtn: { alignItems: 'flex-end' },
    forgotText: { fontSize: FontSizes.sm, color: '#0156A7', fontWeight: FontWeights.medium },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: FontSizes.sm, color: '#59677B' },
    footerLink: { fontSize: FontSizes.sm, color: '#0156A7', fontWeight: FontWeights.semibold },
    versionWrap: { alignItems: 'center', marginTop: Spacing.lg },
    versionText: { fontSize: FontSizes.xs, color: 'rgba(89, 103, 123, 0.5)' },
});
