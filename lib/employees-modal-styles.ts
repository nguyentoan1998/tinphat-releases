// Modal styles for employee detail
import { StyleSheet } from 'react-native';
import { Colors, Backgrounds, TextColors } from '@/constants/Colors';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/Tokens';

export const modalStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: Backgrounds.secondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Backgrounds.primary,
        ...Shadows.small,
    },
    modalTitle: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: TextColors.primary,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        fontSize: 28,
        color: Colors.neutral.gray600,
    },
    modalContent: {
        flex: 1,
    },
    modalProfileSection: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        backgroundColor: Backgrounds.primary,
    },
    modalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalAvatarText: {
        fontSize: 36,
        fontWeight: FontWeights.bold,
        color: Colors.primary[600],
    },
    modalName: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: TextColors.primary,
        marginBottom: Spacing.xs,
    },
    modalCode: {
        fontSize: FontSizes.base,
        color: TextColors.secondary,
        marginBottom: Spacing.md,
    },
    modalStatusBadge: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    modalStatusText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
    },
    modalInfoSection: {
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    modalInfoCard: {
        flexDirection: 'row',
        backgroundColor: Backgrounds.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.small,
    },
    modalInfoIcon: {
        fontSize: 24,
        marginRight: Spacing.lg,
    },
    modalInfoText: {
        flex: 1,
    },
    modalInfoLabel: {
        fontSize: FontSizes.xs,
        color: TextColors.secondary,
        marginBottom: Spacing.xs,
    },
    modalInfoValue: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
        color: TextColors.primary,
    },
    modalActions: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        gap: Spacing.md,
    },
    modalActionButton: {
        flex: 1,
        backgroundColor: Backgrounds.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        ...Shadows.small,
    },
    modalActionIcon: {
        fontSize: 32,
        marginBottom: Spacing.sm,
    },
    modalActionText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.medium,
        color: TextColors.primary,
    },
});
