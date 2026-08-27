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
import { Spacing, FontSizes, FontWeights, BorderRadius, TouchTargets } from '@/constants/Tokens';
import { ResponsiveSpacing, ResponsiveFontSizes, ResponsiveBorderRadius } from '@/constants/ResponsiveTokens';
import { useResponsive } from '@/hooks/useResponsive';
import { getErrorMessage } from '@/lib/api-client';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

export default function LoginScreen() {
    const router = useRouter();
    const { login, isLoading } = useAuthStore();
    const { showDialog, DialogComponent } = useDarkDialog();
    const { getValue, getValues, isMobile, isTablet, isDesktop } = useResponsive();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    const loading = isLoading || localLoading;

    // Responsive values - resolve entire records
    const rSpacing = getValues(ResponsiveSpacing);
    const rFontSizes = getValues(ResponsiveFontSizes);
    const rBorderRadius = getValues(ResponsiveBorderRadius);

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

    // Compute styles inline with responsive values
    const styles = {
        root: { flex: 1 } as const,
        safe: { flex: 1 } as const,
        kav: { flex: 1 } as const,
        scroll: {
            flexGrow: 1,
            paddingHorizontal: rSpacing.xl,
            justifyContent: 'center' as const,
            paddingVertical: rSpacing.xxxl,
        } as const,
        orb: { position: 'absolute' as const, borderRadius: 999 } as const,
        logoWrap: { alignItems: 'center' as const, marginBottom: Spacing.xxl } as const,
        card: {
            borderRadius: rBorderRadius.xl,
            overflow: 'hidden' as const,
            borderWidth: 1,
            borderColor: 'rgba(1, 86, 167, 0.15)',
            marginBottom: Spacing.xl,
        } as const,
        cardInner: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: rSpacing.xl,
            gap: rSpacing.lg,
        } as const,
        cardTitle: {
            fontSize: rFontSizes.xxl,
            fontWeight: FontWeights.bold,
            color: '#212529',
            textAlign: 'center' as const,
        } as const,
        cardSub: {
            fontSize: rFontSizes.sm,
            color: '#59677B',
            textAlign: 'center' as const,
            marginTop: -rSpacing.sm,
        } as const,
        fields: { gap: rSpacing.md } as const,
        forgotBtn: { alignItems: 'flex-end' as const } as const,
        forgotText: {
            fontSize: rFontSizes.sm,
            color: '#0156A7',
            fontWeight: FontWeights.medium,
        } as const,
        footer: { flexDirection: 'row' as const, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
        footerText: {
            fontSize: rFontSizes.sm,
            color: '#59677B',
        } as const,
        footerLink: {
            fontSize: rFontSizes.sm,
            color: '#0156A7',
            fontWeight: FontWeights.semibold,
        } as const,
        versionWrap: {
            alignItems: 'center' as const,
            marginTop: rSpacing.lg,
        } as const,
        versionText: {
            fontSize: rFontSizes.xs,
            color: 'rgba(89, 103, 123, 0.5)',
        } as const,
    };

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            {/* Decorative orbs */}
            <View style={[styles.orb, { top: -80, right: -60, width: 280, height: 280, backgroundColor: 'rgba(1, 86, 167, 0.05)' }]} />
            <View style={[styles.orb, { bottom: 80, left: -80, width: 220, height: 220, backgroundColor: 'rgba(1, 86, 167, 0.08)' }]} />
            <View style={[styles.orb, { top: '40%', right: -40, width: 160, height: 160, backgroundColor: 'rgba(1, 86, 167, 0.06)' }]} />

            <SafeAreaView style={styles.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        {/* Logo */}
                        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.logoWrap}>
                            <TinPhatLogo size={isMobile ? 90 : isTablet ? 100 : 110} showText={true} />
                        </Animated.View>

                        {/* Card */}
                        <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={styles.card}>
                            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                            <View style={styles.cardInner}>
                                <Text style={styles.cardTitle}>Đăng nhập</Text>
                                <Text style={styles.cardSub}>Chào mừng bạn trở lại</Text>

                                <View style={styles.fields}>
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

                                <Pressable style={styles.forgotBtn} onPress={() => router.push('/forgot-password')} disabled={loading}>
                                    <Text style={styles.forgotText}>Quên mật khẩu?</Text>
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
                        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.footer}>
                            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                            <Pressable onPress={() => router.push('/register')} disabled={loading}>
                                <Text style={styles.footerLink}>Đăng ký ngay</Text>
                            </Pressable>
                        </Animated.View>

                        {/* Version */}
                        <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.versionWrap}>
                            <Text style={styles.versionText}>
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