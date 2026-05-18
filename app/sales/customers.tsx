// Customers Screen — Glassmorphism
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, Modal, ScrollView, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Users, Search, X, Phone, Mail, MapPin, CreditCard, ChevronRight, Info } from 'lucide-react-native';

import { customerApi, Customer } from '@/lib/customer-api';
import { Timings } from '@/constants/GlassTokens';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import GlassDataScreen, { GlassListCard, StatusBadge } from '@/components/ui/GlassDataScreen';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

const AVATAR_COLORS: [string, string][] = [
    ['#6366F1', '#818CF8'], ['#14B8A6', '#5EEAD4'], ['#EC4899', '#F472B6'],
    ['#F59E0B', '#FBBF24'], ['#8B5CF6', '#A78BFA'], ['#EF4444', '#F87171'],
];
const getGrad = (name: string): [string, string] => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

export default function CustomersScreen() {
    const [data, setData] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Customer | null>(null);
    const { isDark } = useThemeStore();
    const colors = ThemeColors.light;

    useEffect(() => { load(); }, []);
    const load = async () => {
        try { setLoading(true); const d = await customerApi.getAll(); setData(Array.isArray(d) ? d : []); }
        catch { setData([]); } finally { setLoading(false); setRefreshing(false); }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone?.includes(q));
    }, [data, search]);

    return (
        <>
            <GlassDataScreen title="Khách hàng" subtitle={`${filtered.length} / ${data.length} khách`} loading={loading} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
                headerContent={
                    <View style={s.hE}>
                        <Animated.View entering={FadeInUp.duration(Timings.entrance).delay(100)}>
                            <View style={[s.sBar, { borderColor: colors.cardBorder }]}><BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                <View style={[s.sInner, { backgroundColor: colors.cardBg }]}><Search size={18} color={colors.textMuted} />
                                    <TextInput style={[s.sInput, { color: colors.textPrimary }]} placeholder="Tìm khách hàng..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
                                    {search.length > 0 && <Pressable onPress={() => setSearch('')} hitSlop={8}><X size={16} color={colors.textMuted} /></Pressable>}
                                </View>
                            </View>
                        </Animated.View>
                    </View>
                }
            >
                {filtered.length === 0 && !loading ? (
                    <View style={s.emptyW}><Users size={48} color={colors.textMuted} /><Text style={[s.emptyT, { color: colors.textMuted }]}>{search ? 'Không tìm thấy' : 'Chưa có khách hàng'}</Text></View>
                ) : (
                    <View style={s.gap}>
                        {filtered.map((c, i) => (
                            <Pressable key={c.id} onPress={() => setSelected(c)}>
                                <GlassListCard index={i}>
                                    <View style={s.row}>
                                        <LinearGradient colors={getGrad(c.name)} style={s.avatar}><Text style={s.avatarT}>{getInitials(c.name)}</Text></LinearGradient>
                                        <View style={s.info}>
                                            <Text style={[s.name, { color: colors.textPrimary }]} numberOfLines={1}>{c.name}</Text>
                                            <Text style={[s.code, { color: colors.textMuted }]}>{c.code}</Text>
                                            {c.phone && <View style={s.metaRow}><Phone size={11} color="#34D399" /><Text style={s.phone}>{c.phone}</Text></View>}
                                        </View>
                                        <ChevronRight size={16} color={colors.chevronColor} />
                                    </View>
                                </GlassListCard>
                            </Pressable>
                        ))}
                    </View>
                )}
            </GlassDataScreen>

            {selected && (
                <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
                    <View style={md.container}>
                        <LinearGradient colors={colors.gradientColors} style={StyleSheet.absoluteFill} />
                        <View style={[md.header, { borderBottomColor: colors.divider }]}>
                            <Text style={[md.headerTitle, { color: colors.textPrimary }]}>Chi tiết khách hàng</Text>
                            <Pressable onPress={() => setSelected(null)} style={[md.closeBtn, { backgroundColor: colors.inputBg }]}><X size={20} color={colors.textSecondary} /></Pressable>
                        </View>
                        <ScrollView contentContainerStyle={md.scroll} showsVerticalScrollIndicator={false}>
                            <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={md.profile}>
                                <LinearGradient colors={getGrad(selected.name)} style={md.bigAvatar}><Text style={md.bigAvatarT}>{getInitials(selected.name)}</Text></LinearGradient>
                                <Text style={[md.profileName, { color: colors.textPrimary }]}>{selected.name}</Text>
                                <Text style={[md.profileCode, { color: colors.textMuted }]}>{selected.code}</Text>
                            </Animated.View>
                            <Animated.View entering={FadeInUp.duration(400).delay(100).springify().damping(18)} style={md.infoList}>
                                {[
                                    { Icon: Phone, label: 'Điện thoại', value: selected.phone || 'Chưa cập nhật', action: selected.phone ? () => Linking.openURL(`tel:${selected.phone}`) : undefined },
                                    { Icon: Mail, label: 'Email', value: selected.email || 'Chưa cập nhật' },
                                    { Icon: MapPin, label: 'Địa chỉ', value: selected.address || 'Chưa cập nhật' },
                                    { Icon: CreditCard, label: 'Mã số thuế', value: selected.taxCode || 'Chưa cập nhật' },
                                ].map(({ Icon, label, value, action }, idx) => (
                                    <Pressable key={idx} style={[md.infoCard, { borderColor: colors.cardBorder }]} onPress={action} disabled={!action}>
                                        <BlurView intensity={20} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                                        <View style={[md.infoInner, { backgroundColor: colors.cardBg }]}>
                                            <View style={md.infoIcon}><Icon size={18} color="#38BDF8" /></View>
                                            <View style={md.infoText}><Text style={[md.infoLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[md.infoValue, { color: colors.textPrimary }, action && { color: '#34D399' }]}>{value}</Text></View>
                                        </View>
                                    </Pressable>
                                ))}
                            </Animated.View>
                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </View>
                </Modal>
            )}
        </>
    );
}

const s = StyleSheet.create({
    hE: { paddingHorizontal: Spacing.xl },
    sBar: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.md },
    sInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
    sInput: { flex: 1, fontSize: FontSizes.base, padding: 0 },
    emptyW: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
    emptyT: { fontSize: FontSizes.base },
    gap: { gap: Spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarT: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    info: { flex: 1 },
    name: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
    code: { fontSize: FontSizes.xs, marginTop: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    phone: { fontSize: FontSizes.xs, color: '#34D399', fontWeight: '500' },
});

const md = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, paddingTop: 50, borderBottomWidth: 1 },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, flex: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 60 },
    profile: { alignItems: 'center', paddingVertical: Spacing.xxl },
    bigAvatar: { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
    bigAvatarT: { fontSize: 34, fontWeight: '800', color: '#FFFFFF' },
    profileName: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, textAlign: 'center' },
    profileCode: { fontSize: FontSizes.sm, marginTop: 4, marginBottom: Spacing.md },
    infoList: { gap: Spacing.sm, marginBottom: Spacing.xl },
    infoCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1 },
    infoInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
    infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(56,189,248,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    infoText: { flex: 1 },
    infoLabel: { fontSize: FontSizes.xs },
    infoValue: { fontSize: FontSizes.base, fontWeight: FontWeights.medium, marginTop: 2 },
});
