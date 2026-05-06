// Tutorial Form Modal — Simplified (Title, URL, Team only)
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,

    ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Video, Link, Users } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';

import { TutorialVideo, CreateTutorialDto, UpdateTutorialDto, getAutoThumbnail } from '@/lib/tutorial-api';
import { useDarkDialog } from '@/components/ui/DarkDialog';
import { teamApi, Team } from '@/lib/team-api';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

interface TutorialFormModalProps {
    visible: boolean;
    tutorial?: TutorialVideo | null;
    onClose: () => void;
    onSave: (data: CreateTutorialDto | UpdateTutorialDto) => Promise<void>;
}

export default function TutorialFormModal({
    visible,
    tutorial,
    onClose,
    onSave,
}: TutorialFormModalProps) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const modalBg = isDark ? 'rgba(20,20,40,0.98)' : 'rgba(245,247,255,0.98)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.15)';
    const dividerColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.08)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.06)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.15)';
    const iconColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(99,102,241,0.5)';
    const closeBtnBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const pickerItemStyle = isDark
        ? { backgroundColor: '#1a1a2e', color: '#FFFFFF' }
        : { backgroundColor: '#FFFFFF', color: '#1E1B4B' };
    const pickerDropdownColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(99,102,241,0.6)';

    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [teamId, setTeamId] = useState('');
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [saving, setSaving] = useState(false);
    const { showDialog, DialogComponent } = useDarkDialog();

    const isEdit = !!tutorial;

    // Load teams
    useEffect(() => {
        if (visible) {
            loadTeams();
        }
    }, [visible]);

    // Load tutorial data for editing
    useEffect(() => {
        if (tutorial) {
            setTitle(tutorial.title);
            setVideoUrl(tutorial.videoUrl);
            setTeamId(tutorial.teamId || '');
        } else {
            resetForm();
        }
    }, [tutorial, visible]);

    const loadTeams = async () => {
        try {
            setLoadingTeams(true);
            const data = await teamApi.getTeams();
            const teamsArray = Array.isArray(data) ? data : (data as any)?.data || [];
            setTeams(Array.isArray(teamsArray) ? teamsArray : []);
        } catch (e: any) {
            // Graceful fallback if teams API fails (404 = endpoint not ready)
            const status = e.response?.status;
            if (status === 404) {
                // Teams endpoint not available yet (404) — graceful fallback
            } else {
                // Failed to load teams — graceful fallback
            }
            setTeams([]);
        } finally {
            setLoadingTeams(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setVideoUrl('');
        setTeamId('');
    };

    const handleClose = () => {
        if (!saving) {
            resetForm();
            onClose();
        }
    };

    const handleSave = async () => {
        // Validation
        if (!title.trim()) {
            showDialog('Lỗi', 'Vui lòng nhập tiêu đề video');
            return;
        }
        if (!videoUrl.trim()) {
            showDialog('Lỗi', 'Vui lòng nhập URL video');
            return;
        }

        setSaving(true);
        try {
            const data: CreateTutorialDto | UpdateTutorialDto = {
                title: title.trim(),
                videoUrl: videoUrl.trim(),
                teamId: teamId || undefined,
                thumbnailUrl: getAutoThumbnail(videoUrl.trim()) || undefined,
            };

            await onSave(data);
            showDialog('Thành công', isEdit ? 'Đã cập nhật video' : 'Đã thêm video mới');
            handleClose();
        } catch (e: any) {
            const status = e.response?.status;
            const message = e.response?.data?.message || e.message || 'Không thể lưu video';
            console.error('Save error:', {
                status: status,
                message: message,
                url: e.config?.url,
                data: e.config?.data,
            });
            showDialog('Lỗi', `${message} (${status || 'Network error'})`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={handleClose}
            >
                <View style={styles.overlay}>
                    <BlurView intensity={40} tint={colors.blurTint} style={StyleSheet.absoluteFill} />

                    <Animated.View
                        entering={FadeIn.duration(300)}
                        exiting={FadeOut.duration(200)}
                        style={[styles.container, { backgroundColor: modalBg, borderColor }]}
                    >
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: dividerColor }]}>
                            <Video size={24} color="#818CF8" />
                            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                                {isEdit ? 'Chỉnh sửa video' : 'Thêm video mới'}
                            </Text>
                            <Pressable style={[styles.closeBtn, { backgroundColor: closeBtnBg }]} onPress={handleClose} disabled={saving}>
                                <X size={22} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Form */}
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Title */}
                            <View style={styles.field}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>
                                    Tiêu đề <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                    <Video size={18} color={iconColor} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textPrimary }]}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="VD: Hướng dẫn chấm công"
                                        placeholderTextColor={colors.textMuted}
                                        editable={!saving}
                                    />
                                </View>
                            </View>

                            {/* Video URL */}
                            <View style={styles.field}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>
                                    URL video <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                    <Link size={18} color={iconColor} />
                                    <TextInput
                                        style={[styles.input, { color: colors.textPrimary }]}
                                        value={videoUrl}
                                        onChangeText={setVideoUrl}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        placeholderTextColor={colors.textMuted}
                                        autoCapitalize="none"
                                        editable={!saving}
                                    />
                                </View>
                            </View>

                            {/* Team Picker */}
                            <View style={styles.field}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Tổ (tùy chọn)</Text>
                                {loadingTeams ? (
                                    <View style={[styles.pickerWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <ActivityIndicator size="small" color="#818CF8" />
                                        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Đang tải danh sách tổ...</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.pickerWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <Users size={18} color={iconColor} style={styles.pickerIcon} />
                                        <Picker
                                            selectedValue={teamId}
                                            onValueChange={(value) => setTeamId(value)}
                                            style={[styles.picker, { color: colors.textPrimary }]}
                                            dropdownIconColor={pickerDropdownColor}
                                            enabled={!saving}
                                            mode="dropdown"
                                        >
                                            <Picker.Item
                                                label="-- Không phân loại --"
                                                value=""
                                                color="#999"
                                                style={pickerItemStyle}
                                            />
                                            {teams && teams.length > 0 && teams.map((team) => (
                                                <Picker.Item
                                                    key={team.id}
                                                    label={`${team.code} - ${team.name}`}
                                                    value={team.id}
                                                    style={pickerItemStyle}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Footer */}
                        <View style={[styles.footer, { borderTopColor: dividerColor }]}>
                            <Pressable
                                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>
                                        {isEdit ? 'Cập nhật' : 'Thêm video'}
                                    </Text>
                                )}
                            </Pressable>
                            <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={saving}>
                                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Hủy</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
            {DialogComponent}
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        height: '75%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        gap: Spacing.md,
        borderBottomWidth: 1,
    },
    headerTitle: {
        flex: 1,
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
    },
    closeBtn: {
        padding: Spacing.sm,
        borderRadius: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xl * 2,
    },
    field: {
        marginBottom: Spacing.xl,
    },
    label: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        marginBottom: Spacing.sm,
    },
    required: {
        color: '#EF4444',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: FontSizes.base,
    },
    pickerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        minHeight: 52,
    },
    pickerIcon: {
        marginRight: Spacing.sm,
    },
    picker: {
        flex: 1,
        color: '#FFFFFF',
    },
    loadingText: {
        marginLeft: Spacing.md,
        fontSize: FontSizes.sm,
    },
    footer: {
        padding: Spacing.xl,
        gap: Spacing.md,
        borderTopWidth: 1,
    },
    saveBtn: {
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
        color: '#FFFFFF',
    },
    cancelBtn: {
        padding: Spacing.md,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.medium,
    },
});
