// PaginationFooter — Shared footer for infinite-scroll FlatLists
// Shows: loading spinner, "Đã tải X/Y", "Tải thêm" button, and "Đã hết" state.
// Keeps infinite scroll (onEndReached) but adds a clear manual trigger for web/accessibility.
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { CheckCircle, ChevronDown } from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';

type PaginationFooterProps = {
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    isFetching?: boolean;
    totalCount?: number;
    loadedCount: number;
    onLoadMore?: () => void;
    accentColor?: string;
};

export default function PaginationFooter({
    hasNextPage,
    isFetchingNextPage,
    totalCount,
    loadedCount,
    onLoadMore,
    accentColor = '#6366F1',
}: PaginationFooterProps) {
    // Don't render for empty lists — ListEmptyComponent handles that
    if (loadedCount === 0 && !isFetchingNextPage) {
        return <View style={{ height: 24 }} />;
    }

    if (isFetchingNextPage) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={[styles.text, { color: '#6B7280' }]}>Đang tải thêm...</Text>
            </View>
        );
    }

    if (hasNextPage) {
        const label =
            totalCount !== undefined
                ? `Đã tải ${loadedCount} / ${totalCount.toLocaleString('vi-VN')}`
                : `Hiển thị ${loadedCount} mục`;
        return (
            <View style={styles.container}>
                <Text style={[styles.text, { color: '#6B7280' }]}>{label}</Text>
                {onLoadMore && (
                    <Pressable
                        onPress={onLoadMore}
                        style={({ pressed }) => [
                            styles.loadMoreBtn,
                            { borderColor: accentColor, backgroundColor: pressed ? `${accentColor}12` : '#FFFFFF' },
                        ]}
                    >
                        <Text style={[styles.loadMoreText, { color: accentColor }]}>Tải thêm</Text>
                        <ChevronDown size={14} color={accentColor} />
                    </Pressable>
                )}
                <Text style={[styles.hint, { color: '#9CA3AF' }]}>Kéo xuống để tải thêm</Text>
            </View>
        );
    }

    // hasNextPage === false && loadedCount > 0
    return (
        <View style={styles.container}>
            <View style={styles.endRow}>
                <CheckCircle size={14} color="#10B981" />
                <Text style={[styles.text, { color: '#6B7280' }]}>
                    Đã hiển thị tất cả {loadedCount} mục
                </Text>
            </View>
            <View style={{ height: 32 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    text: {
        fontSize: FontSizes.sm,
        textAlign: 'center',
    },
    hint: {
        fontSize: 11,
        textAlign: 'center',
    },
    loadMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1.5,
        marginTop: 2,
    },
    loadMoreText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
    },
    endRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
});
