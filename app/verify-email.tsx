// Verify Email Screen - Light Theme with VietinBank Blue OTP
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Mail, ChevronLeft, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/lib/api-client';
import GlassButton from '@/components/ui/GlassButton';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();
    const { showDialog, DialogComponent } = useDarkDialog();

    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
    const [canResend, setCanResend] = useState(false);
    const [verified, setVerified] = useState(false);

    const inputRefs = useRef<(TextInput | null)[]>([]);
    const shakeX = useSharedValue(0);

    const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

    const triggerShake = () => {
        shakeX.value = withSequence(
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
    };

    useEffect(() => {
        if (resendTimer <= 0) { setCanResend(true); return; }
        const interval = setInterval(() => setResendTimer(p => p - 1), 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleCodeChange = (text: string, index: number) => {
        const digit = text.replace(/[^0-9]/g, '').slice(-1);
        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);
        if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
        if (digit && index === CODE_LENGTH - 1 && newCode.join('').length === CODE_LENGTH) {
            handleVerify(newCode.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (fullCode?: string) => {
        const verifyCode = fullCode || code.join('');
        if (verifyCode.length !== CODE_LENGTH) {
            showDialog('Thiếu mã', 'Vui lòng nhập đủ 6 chữ số');
            return;
        }
        try {
            setLoading(true);
            await apiClient.verifyEmail({ email: email || '', code: verifyCode });
            setVerified(true);
        } catch (err: any) {
            triggerShake();
            setCode(Array(CODE_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
            showDialog('Xác thực thất bại', err.response?.data?.message || 'Mã xác thực không đúng hoặc đã hết hạn');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        try {
            setLoading(true);
            await apiClient.resendVerification(email || '');
            setResendTimer(RESEND_COOLDOWN);
            setCanResend(false);
            setCode(Array(CODE_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
            showDialog('Đã gửi', 'Mã xác thực mới đã được gửi đến email của bạn');
        } catch (err: any) {
            showDialog('Lỗi', err.response?.data?.message || 'Không thể gửi lại mã');
        } finally {
            setLoading(false);
        }
    };

    const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <View style={st.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />
            <View style={[st.orb, { top: -60, right: -60, width: 220, height: 220, backgroundColor: 'rgba(1, 86, 167, 0.05)' }]} />
            <View style={[st.orb, { bottom: 80, left: -60, width: 180, height: 180, backgroundColor: 'rgba(1, 86, 167, 0.08)' }]} />

            <SafeAreaView style={st.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.kav}>
                    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        <Animated.View entering={FadeInDown.duration(400)} style={st.headerRow}>
                            <Pressable style={st.backBtn} onPress={() => router.back()} disabled={loading}>
                                <ChevronLeft size={22} color="#0156A7" />
                            </Pressable>
                        </Animated.View>

                        {verified ? (
                            <Animated.View entering={FadeInDown.duration(600).springify()} style={st.successWrap}>
                                <LinearGradient colors={['#0ACF83', '#089F6B']} style={st.successIcon}>
                                    <ShieldCheck size={48} color="#FFF" strokeWidth={2} />
                                </LinearGradient>
                                <Text style={st.successTitle}>Xác thực thành công!</Text>
                                <Text style={st.successSub}>Tài khoản đã được kích hoạt. Vui lòng đăng nhập.</Text>
                                <GlassButton
                                    title="Đăng nhập ngay"
                                    onPress={() => router.replace('/login')}
                                    gradient={['#0156A7', '#013B78']}
                                    icon={<ArrowRight size={18} color="#FFF" />}
                                    style={{ marginTop: Spacing.xl }}
                                />
                            </Animated.View>
                        ) : (
                            <>
                                <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={st.iconWrap}>
                                    <LinearGradient colors={['#0156A7', '#013B78']} style={st.iconCircle}>
                                        <Mail size={36} color="#FFF" strokeWidth={2} />
                                    </LinearGradient>
                                    <Text style={st.title}>Xác thực email</Text>
                                    <Text style={st.sub}>Nhập mã 6 chữ số đã gửi đến</Text>
                                    <Text style={st.emailText}>{email}</Text>
                                </Animated.View>

                                <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={st.card}>
                                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                                    <View style={st.cardInner}>
                                        <Animated.View style={[st.otpRow, shakeStyle]}>
                                            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                                                <TextInput
                                                    key={i}
                                                    ref={r => { inputRefs.current[i] = r; }}
                                                    style={[st.otpInput, { borderColor: code[i] ? '#0156A7' : 'rgba(1, 86, 167, 0.15)', backgroundColor: code[i] ? 'rgba(1, 86, 167, 0.1)' : 'rgba(1, 86, 167, 0.05)' }]}
                                                    value={code[i]}
                                                    onChangeText={t => handleCodeChange(t, i)}
                                                    onKeyPress={e => handleKeyPress(e, i)}
                                                    keyboardType="number-pad"
                                                    maxLength={1}
                                                    editable={!loading}
                                                    selectTextOnFocus
                                                />
                                            ))}
                                        </Animated.View>

                                        <View style={st.timerRow}>
                                            {!canResend ? (
                                                <Text style={st.timerText}>Mã hết hạn sau {formatTimer(resendTimer)}</Text>
                                            ) : (
                                                <Text style={[st.timerText, { color: '#D0202F' }]}>Mã đã hết hạn</Text>
                                            )}
                                        </View>

                                        <GlassButton
                                            title="Xác thực"
                                            onPress={() => handleVerify()}
                                            loading={loading}
                                            disabled={loading || code.join('').length !== CODE_LENGTH}
                                            gradient={['#0156A7', '#013B78']}
                                            icon={!loading ? <ShieldCheck size={18} color="#FFF" /> : undefined}
                                        />

                                        <Pressable style={st.resendRow} onPress={handleResend} disabled={!canResend || loading}>
                                            <RefreshCw size={14} color={canResend ? '#0156A7' : 'rgba(1, 86, 167, 0.3)'} />
                                            <Text style={[st.resendText, { color: canResend ? '#0156A7' : 'rgba(1, 86, 167, 0.3)' }]}>
                                                {canResend ? 'Gửi lại mã xác thực' : 'Không nhận được mã? Chờ hết giờ'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </Animated.View>
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
            {DialogComponent}
        </View>
    );
}

const st = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
    orb: { position: 'absolute', borderRadius: 999 },
    headerRow: { flexDirection: 'row', marginBottom: Spacing.lg },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(1, 86, 167, 0.1)', justifyContent: 'center', alignItems: 'center' },
    iconWrap: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
    iconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
    title: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#212529', textAlign: 'center' },
    sub: { fontSize: FontSizes.sm, color: '#59677B', textAlign: 'center' },
    emailText: { fontSize: FontSizes.sm, color: '#0156A7', fontWeight: FontWeights.semibold, textAlign: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(1, 86, 167, 0.15)' },
    cardInner: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: Spacing.xl, gap: Spacing.lg },
    otpRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
    otpInput: { width: 46, height: 54, borderWidth: 1.5, borderRadius: 12, fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#212529', textAlign: 'center' },
    timerRow: { alignItems: 'center' },
    timerText: { fontSize: FontSizes.sm, color: '#59677B' },
    resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
    resendText: { fontSize: FontSizes.sm },
    successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxxl, gap: Spacing.md },
    successIcon: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
    successTitle: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: '#212529', textAlign: 'center' },
    successSub: { fontSize: FontSizes.base, color: '#59677B', textAlign: 'center', lineHeight: 22 },
});
