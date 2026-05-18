// Tutorials Screen — YouTube-Style Video Hướng Dẫn
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    Dimensions,
    Linking,
    TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Play, MoreVertical, Globe, Users, Clock, Plus, Search, X } from 'lucide-react-native';
import { ScrollView as HScrollView } from 'react-native';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

import { tutorialApi, TutorialVideo, CreateTutorialDto, UpdateTutorialDto, detectVideoSource, getAutoThumbnail, VideoSource } from '@/lib/tutorial-api';
import { useAuthStore } from '@/store';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import GlassDataScreen from '@/components/ui/GlassDataScreen';
import TutorialFormModal from '@/components/ui/TutorialFormModal';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { teamApi, Team } from '@/lib/team-api';

const { width } = Dimensions.get('window');

export default function TutorialsScreen() {
    const { user } = useAuthStore();
    const [tutorials, setTutorials] = useState<TutorialVideo[]>([]);
    const [filtered, setFiltered] = useState<TutorialVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [teamFilter, setTeamFilter] = useState<string>('all');
    const [teams, setTeams] = useState<Team[]>([]);

    const [editingTutorial, setEditingTutorial] = useState<TutorialVideo | null>(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const { showDialog, DialogComponent } = useDarkDialog();

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => { loadTutorials(); loadTeams(); }, []);
    useEffect(() => { applyFilter(); }, [tutorials, search, teamFilter]);

    const loadTutorials = async () => {
        try {
            setLoading(true);
            const data = await tutorialApi.getTutorials();
            setTutorials(Array.isArray(data) ? data : []);
        } catch {
            setTutorials([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadTeams = async () => {
        try {
            const data = await teamApi.getTeams();
            setTeams(Array.isArray(data) ? data : (data as any)?.data || []);
        } catch {
            setTeams([]);
        }
    };

    const applyFilter = () => {
        let result = tutorials;
        if (teamFilter === 'none') {
            result = result.filter(t => !t.teamId);
        } else if (teamFilter !== 'all') {
            result = result.filter(t => t.teamId === teamFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q)
            );
        }
        setFiltered(result);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadTutorials();
    };

    const handleAddVideo = () => {
        setEditingTutorial(null);
        setShowFormModal(true);
    };

    const handleEditVideo = (tutorial: TutorialVideo) => {
        setEditingTutorial(tutorial);
        setShowFormModal(true);
    };

    const handleDeleteVideo = (tutorial: TutorialVideo) => {
        showDialog(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${tutorial.title}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await tutorialApi.deleteTutorial(tutorial.id);
                            loadTutorials();
                            showDialog('Thành công', 'Đã xóa video thành công');
                        } catch (e: any) {
                            const msg = e?.response?.data?.message
                                || e?.message
                                || 'Không thể xóa video';
                            showDialog('Lỗi xóa video', msg);
                        }
                    },
                },
            ]
        );
    };


    const handleSaveVideo = async (data: CreateTutorialDto | UpdateTutorialDto) => {
        if (editingTutorial) {
            await tutorialApi.updateTutorial(editingTutorial.id, data as UpdateTutorialDto);
        } else {
            await tutorialApi.createTutorial(data as CreateTutorialDto);
        }
        await loadTutorials();
    };


    const getTimeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 30) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return null;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getThumbnail = (tutorial: TutorialVideo) => {
        if (tutorial.thumbnailUrl) return tutorial.thumbnailUrl;
        return getAutoThumbnail(tutorial.videoUrl);
    };

    const getSourceLabel = (url: string) => {
        const source = detectVideoSource(url);
        const labels: Record<string, string> = {
            youtube: 'YouTube',
            tiktok: 'TikTok',
            facebook: 'Facebook',
            instagram: 'Instagram',
            twitter: 'Twitter',
            vimeo: 'Vimeo',
            cloudinary: 'Cloud',
            direct: 'Video',
        };
        return labels[source] || 'Video';
    };

    return (
        <>
            <GlassDataScreen
                title="Video Hướng Dẫn"
                subtitle={`${filtered.length} / ${tutorials.length} video`}
                loading={loading}
                refreshing={refreshing}
                onRefresh={onRefresh}
            >
                {/* Search bar */}
                <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                    <Search size={16} color={colors.textMuted} />
                    <TextInput
                        style={[s.searchInput, { color: colors.textPrimary }]}
                        placeholder="Tìm kiếm video..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <Pressable onPress={() => setSearch('')} hitSlop={8}>
                            <X size={16} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>

                {/* Team filter chips */}
                <HScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.chipScroll}
                    contentContainerStyle={s.chipRow}
                >
                    <Pressable
                        style={[
                            s.chip,
                            { backgroundColor: colors.inputBg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.1)' },
                            teamFilter === 'all' && s.chipActive
                        ]}
                        onPress={() => setTeamFilter('all')}
                    >
                        <Text style={[s.chipText, { color: colors.textMuted }, teamFilter === 'all' && s.chipTextActive]}>
                            Tất cả
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            s.chip,
                            { backgroundColor: colors.inputBg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.1)' },
                            teamFilter === 'none' && s.chipActive
                        ]}
                        onPress={() => setTeamFilter('none')}
                    >
                        <Text style={[s.chipText, { color: colors.textMuted }, teamFilter === 'none' && s.chipTextActive]}>
                            Chung
                        </Text>
                    </Pressable>
                    {teams.map(team => (
                        <Pressable
                            key={team.id}
                            style={[
                                s.chip,
                                { backgroundColor: colors.inputBg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.1)' },
                                teamFilter === team.id && s.chipActive
                            ]}
                            onPress={() => setTeamFilter(team.id)}
                        >
                            <Text style={[s.chipText, { color: colors.textMuted }, teamFilter === team.id && s.chipTextActive]}>
                                {team.name}
                            </Text>
                        </Pressable>
                    ))}
                </HScrollView>
                {(!filtered || filtered.length === 0) && !loading ? (
                    <View style={s.empty}>
                        <View style={[s.emptyIcon, { backgroundColor: colors.inputBg }]}>
                            <Play size={40} color={colors.textMuted} />
                        </View>
                        <Text style={[s.emptyTitle, { color: colors.textMuted }]}>
                            {search || teamFilter !== 'all' ? 'Không tìm thấy video' : 'Chưa có video hướng dẫn'}
                        </Text>
                        <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                            {search || teamFilter !== 'all'
                                ? 'Thử tìm kiếm khác hoặc xóa bộ lọc'
                                : isAdmin
                                    ? 'Nhấn nút + để thêm video đầu tiên'
                                    : 'Video hướng dẫn sẽ sớm được cập nhật'}
                        </Text>
                    </View>
                ) : (
                    <View style={s.list}>
                        {filtered && filtered.map((tutorial, index) => {
                            const thumbnail = getThumbnail(tutorial);
                            const duration = formatDuration(tutorial.duration);
                            const sourceLabel = getSourceLabel(tutorial.videoUrl);
                            const timeAgo = getTimeAgo(tutorial.createdAt);
                            const teamName = tutorial.Team?.name || null;

                            return (
                                <Animated.View
                                    key={tutorial.id}
                                    entering={FadeInDown.duration(400).delay(index * 80).springify().damping(18)}
                                >
                                    <Pressable
                                        style={[s.card, { backgroundColor: colors.cardBg }]}
                                        onPress={() => Linking.openURL(tutorial.videoUrl)}
                                        onLongPress={isAdmin ? () => {
                                            showDialog(
                                                tutorial.title,
                                                'Chọn hành động',
                                                [
                                                    { text: 'Hủy', style: 'cancel' },
                                                    { text: 'Sửa', onPress: () => handleEditVideo(tutorial) },
                                                    { text: 'Xóa', style: 'destructive', onPress: () => handleDeleteVideo(tutorial) },
                                                ]
                                            );
                                        } : undefined}
                                        android_ripple={{ color: colors.cardBorder }}
                                    >
                                        {/* Thumbnail - Full width like YouTube */}
                                        <View style={s.thumbnailContainer}>
                                            {thumbnail ? (
                                                <Image
                                                    source={{ uri: thumbnail }}
                                                    style={s.thumbnailImage}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={[s.thumbnailPlaceholder, {
                                                    backgroundColor: sourceLabel === 'Facebook' ? '#1877F2'
                                                        : sourceLabel === 'TikTok' ? '#010101'
                                                            : sourceLabel === 'YouTube' ? '#FF0000'
                                                                : sourceLabel === 'Instagram' ? '#E1306C'
                                                                    : sourceLabel === 'Twitter / X' ? '#1DA1F2'
                                                                        : '#1a1a2e',
                                                }]}>
                                                    <Text style={s.placeholderIcon}>{
                                                        sourceLabel === 'Facebook' ? 'FB'
                                                            : sourceLabel === 'TikTok' ? 'TT'
                                                                : sourceLabel === 'YouTube' ? 'YT'
                                                                    : sourceLabel === 'Instagram' ? 'IG'
                                                                        : 'VD'
                                                    }</Text>
                                                    <Text style={s.placeholderLabel}>{sourceLabel}</Text>
                                                </View>
                                            )}

                                            {/* Play button overlay */}
                                            <View style={s.playBtn}>
                                                <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                                            </View>

                                            {/* Duration badge */}
                                            {duration && (
                                                <View style={s.durationBadge}>
                                                    <Text style={s.durationText}>{duration}</Text>
                                                </View>
                                            )}

                                            {/* Source badge */}
                                            <View style={s.sourceBadge}>
                                                <Globe size={10} color="#FFFFFF" />
                                                <Text style={s.sourceText}>{sourceLabel}</Text>
                                            </View>
                                        </View>

                                        {/* Video Info - Below thumbnail like YouTube */}
                                        <View style={s.info}>
                                            <View style={s.infoContent}>
                                                <Text style={[s.title, { color: colors.textPrimary }]} numberOfLines={2}>
                                                    {tutorial.title}
                                                </Text>

                                                <View style={s.meta}>
                                                    {teamName && (
                                                        <View style={s.metaItem}>
                                                            <Users size={12} color={colors.textMuted} />
                                                            <Text style={[s.metaText, { color: colors.textSecondary }]}>{teamName}</Text>
                                                        </View>
                                                    )}
                                                    <Text style={[s.metaDot, { color: colors.textMuted }]}>•</Text>
                                                    <Text style={[s.metaText, { color: colors.textSecondary }]}>{timeAgo}</Text>
                                                </View>
                                                {tutorial.description && (
                                                    <Text style={[s.description, { color: colors.textMuted }]} numberOfLines={1}>
                                                        {tutorial.description}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* More menu for admin */}
                                            {isAdmin && (
                                                <Pressable
                                                    style={s.moreBtn}
                                                    onPress={() => {
                                                        showDialog(
                                                            tutorial.title,
                                                            undefined,
                                                            [
                                                                { text: 'Hủy', style: 'cancel' },
                                                                { text: 'Sửa', onPress: () => handleEditVideo(tutorial) },
                                                                { text: 'Xóa', style: 'destructive', onPress: () => handleDeleteVideo(tutorial) },
                                                            ]
                                                        );
                                                    }}
                                                >
                                                    <MoreVertical size={18} color={colors.textMuted} />
                                                </Pressable>
                                            )}
                                        </View>
                                    </Pressable>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}
            </GlassDataScreen>

            {/* FAB - Floating Add Button */}
            {isAdmin && (
                <Pressable style={s.fab} onPress={handleAddVideo}>
                    <Plus size={28} color="#FFFFFF" />
                </Pressable>
            )}


            {/* Form Modal */}
            <TutorialFormModal
                visible={showFormModal}
                tutorial={editingTutorial}
                onClose={() => setShowFormModal(false)}
                onSave={handleSaveVideo}
            />

            {/* Custom Dark Dialog */}
            {DialogComponent}
        </>
    );
}

const s = StyleSheet.create({
    // Empty state
    empty: {
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
    },
    emptyDesc: {
        fontSize: FontSizes.sm,
        textAlign: 'center',
    },

    // Video list
    list: {
        paddingHorizontal: 0,
        gap: Spacing.lg,
        paddingBottom: Spacing.xl,
    },

    // Video card - YouTube style
    card: {
        backgroundColor: 'rgba(30,30,50,0.3)',
        overflow: 'hidden',
    },

    // Thumbnail
    thumbnailContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: 'rgba(20,20,40,0.9)',
        position: 'relative',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15,15,35,0.95)',
        gap: 8,
    },
    placeholderIcon: {
        fontSize: 36,
    },
    placeholderLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
    },
    playBtn: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ translateX: -28 }, { translateY: -28 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    durationText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        fontVariant: ['tabular-nums'],
    },
    sourceBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    sourceText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },

    // Info section - YouTube style
    info: {
        flexDirection: 'row',
        padding: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    infoContent: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
    },
    metaDot: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
    },
    description: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.35)',
        marginTop: 2,
    },
    moreBtn: {
        padding: 4,
        marginTop: -2,
    },

    // Search & filter
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: {
        flex: 1,
        fontSize: FontSizes.sm,
        padding: 0,
    },
    chipScroll: {
        marginBottom: Spacing.md,
    },
    chipRow: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        flexDirection: 'row',
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    chipActive: {
        backgroundColor: 'rgba(99,102,241,0.25)',
        borderColor: '#6366F1',
    },
    chipText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.medium,
        color: 'rgba(255,255,255,0.55)',
    },
    chipTextActive: {
        color: '#A5B4FC',
        fontWeight: FontWeights.semibold,
    },
    fab: {
        position: 'absolute',
        bottom: 28,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
});
