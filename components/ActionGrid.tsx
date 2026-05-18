// ActionGrid — Grid menu component with grouped functionality
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/Tokens';
import { ThemeColors } from '@/constants/ThemeColors';

interface ActionItem {
    id: string;
    title: string;
    subtitle: string;
    Icon: any;
    gradient: readonly [string, string, ...string[]];
    onPress: () => void;
}

interface ActionGroup {
    title: string;
    items: ActionItem[];
}

interface ActionGridProps {
    groups: ActionGroup[];
}

export default function ActionGrid({ groups }: ActionGridProps) {
    const colors = ThemeColors.light;

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
        >
            {groups.map((group, groupIndex) => (
                <Animated.View
                    key={group.title}
                    entering={FadeInUp.duration(400).delay(groupIndex * 100)}
                    style={styles.groupContainer}
                >
                    <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>
                        {group.title}
                    </Text>
                    <View style={styles.grid}>
                        {group.items.map((item, index) => (
                            <Pressable
                                key={item.id}
                                style={styles.actionItem}
                                onPress={item.onPress}
                            >
                                <LinearGradient
                                    colors={item.gradient}
                                    style={styles.iconContainer}
                                >
                                    <item.Icon size={24} color="#FFFFFF" strokeWidth={2} />
                                </LinearGradient>
                                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                                    {item.subtitle}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    groupContainer: {
        marginBottom: Spacing.xl,
    },
    groupTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    actionItem: {
        width: '31%',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    actionTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        textAlign: 'center',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: FontSizes.xs,
        textAlign: 'center',
        lineHeight: 14,
    },
});
