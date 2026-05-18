// Register Screen — Light Theme with VietinBank Blue
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mail, Lock, Eye, EyeOff, User, ChevronLeft, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import TinPhatLogo from '@/components/TinPhatLogo';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading } = useAuthStore();
    const { showDialog, DialogComponent } = useDarkDialog();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    const loading = isLoading || localLoading;

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            showDialog('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        if (password !== confirmPassword) {
            showDialog('Mật khẩu không khớp', 'Vui lòng kiểm tra lại mật khẩu xác nhận');
            return;
        }
        if (password.length < 6) {
            showDialog('Mật khẩu yếu', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        try {
            setLocalLoading(true);
            await register({ email, password, name });
            router.replace({ pathname: '/verify-email', params: { email } });
        } catch (err: any) {
            showDialog('Đăng ký thất bại', err.response?.data?.message || 'Email đã tồn tại hoặc có lỗi xảy ra');
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <View style={s.root}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F0F8FF', '#F9F9F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            {/* Decorative orbs */}
            <View style={[s.orb, { top: -60, left: -60, width: 240, height: 240, backgroundColor: 'rgba(1, 86, 167, 0.05)' }]} />
            <View style={[s.orb, { bottom: 60, right: -80, width: 200, height: 200, backgroundColor: 'rgba(1, 86, 167, 0.08)' }]} />

            <SafeAreaView style={s.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
                    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        {/* Header back button */}
                        <Animated.View entering={FadeInDown.duration(400)} style={s.headerRow}>
                            <Pressable style={s.backBtn} onPress={() => router.back()} disabled={loading}>
                                <ChevronLeft size={22} color="#0156A7" />
                            </Pressable>
                        </Animated.View>

                        {/* Logo small */}
                        <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={s.logoWrap}>
                            <TinPhatLogo size={80} showText={true} />
                            <Text style={s.pageTitle}>Tạo tài khoản</Text>
                            <Text style={s.pageSub}>Điền thông tin để bắt đầu</Text>
                        </Animated.View>

                        {/* Card */}
                        <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={s.card}>
                            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                            <View style={s.cardInner}>
                                <GlassInput
                                    label="Họ và tên"
                                    theme="light"
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                    editable={!loading}
                                    icon={<User size={18} color="#0156A7" />}
                                />
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
                                            {showPass ? <EyeOff size={18} color="#0156A7" /> : <Eye size={18} color="#0156A7" />}
                                        </Pressable>
                                    }
                                />
                                <GlassInput
                                    label="Xác nhận mật khẩu"
                                    theme="light"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirm}
                                    editable={!loading}
                                    icon={<Lock size={18} color="#0156A7" />}
                                    rightIcon={
                                        <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                                            {showConfirm ? <EyeOff size={18} color="#0156A7" /> : <Eye size={18} color="#0156A7" />}
                                        </Pressable>
                                    }
                                />

                                <GlassButton
                                    title="Đăng ký"
                                    onPress={handleRegister}
                                    loading={loading}
                                    disabled={loading}
                                    gradient={['#0156A7', '#013B78']}
                                    icon={!loading ? <ArrowRight size={18} color="#FFF" /> : undefined}
                                />

                                <Text style={s.terms}>
                                    Bằng việc đăng ký, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật
                                </Text>
                            </View>
                        </Animated.View>

                        {/* Footer */}
                        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={s.footer}>
                            <Text style={s.footerText}>Đã có tài khoản? </Text>
                            <Pressable onPress={() => router.back()} disabled={loading}>
                                <Text style={s.footerLink}>Đăng nhập ngay</Text>
                            </Pressable>
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
    scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
    orb: { position: 'absolute', borderRadius: 999 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(1, 86, 167, 0.1)', justifyContent: 'center', alignItems: 'center' },
    logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
    pageTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: '#212529', marginTop: Spacing.md },
    pageSub: { fontSize: FontSizes.sm, color: '#59677B', marginTop: 4 },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(1, 86, 167, 0.15)', marginBottom: Spacing.xl },
    cardInner: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: Spacing.xl, gap: Spacing.md },
    terms: { fontSize: FontSizes.xs, color: '#59677B', textAlign: 'center', lineHeight: 18 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: Spacing.xl },
    footerText: { fontSize: FontSizes.sm, color: '#59677B' },
    footerLink: { fontSize: FontSizes.sm, color: '#0156A7', fontWeight: FontWeights.semibold },
});
