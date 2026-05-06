// Onboarding Screen - Light Theme with VietinBank Blue
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Backgrounds, TextColors } from '@/constants/Colors';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/Tokens';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: 1,
        icon: '[Kho]',
        title: 'Quản lý Kho hàng',
        description: 'Theo dõi nhập xuất tồn kho dễ dàng và chính xác',
        gradient: ['#0156A7', '#013B78'],
    },
    {
        id: 2,
        icon: '[NV]',
        title: 'Quản lý Nhân viên',
        description: 'Chấm công, tính lương và quản lý nhân sự hiệu quả',
        gradient: ['#0ACF83', '#089F6B'],
    },
    {
        id: 3,
        icon: '[BC]',
        title: 'Báo cáo Chi tiết',
        description: 'Thống kê sản lượng và doanh thu theo thời gian thực',
        gradient: ['#F9C74F', '#E5A61C'],
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            router.replace('/login');
        }
    };

    const handleSkip = () => {
        router.replace('/login');
    };

    const slide = slides[currentSlide];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            {/* Skip Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Bỏ qua</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Icon Circle */}
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, styles.iconCircleOuter]}>
                        <View style={styles.iconCircleInner}>
                            <Text style={styles.slideIcon}>{slide.icon}</Text>
                        </View>
                    </View>
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={styles.slideTitle}>{slide.title}</Text>
                    <Text style={styles.slideDescription}>{slide.description}</Text>
                </View>
            </View>

            {/* Bottom Section */}
            <View style={styles.bottom}>
                {/* Pagination Dots */}
                <View style={styles.pagination}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === currentSlide ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextButtonText}>
                        {currentSlide < slides.length - 1 ? 'Tiếp tục' : 'Bắt đầu'}
                    </Text>
                    <Text style={styles.nextButtonIcon}>{'>'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F8FF',
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        alignItems: 'flex-end',
    },
    skipButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    skipText: {
        fontSize: FontSizes.base,
        color: '#0156A7',
        fontWeight: FontWeights.medium,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxxl,
    },
    iconContainer: {
        marginBottom: Spacing.xxxl * 2,
    },
    iconCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircleOuter: {
        backgroundColor: 'rgba(1, 86, 167, 0.1)',
    },
    iconCircleInner: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(1, 86, 167, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideIcon: {
        fontSize: 80,
        color: '#0156A7',
    },
    textContainer: {
        alignItems: 'center',
    },
    slideTitle: {
        fontSize: FontSizes.xxxl,
        fontWeight: FontWeights.bold,
        color: '#212529',
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    slideDescription: {
        fontSize: FontSizes.lg,
        color: '#59677B',
        textAlign: 'center',
        lineHeight: 28,
        maxWidth: width * 0.8,
    },
    bottom: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: Spacing.xxxl,
        gap: Spacing.sm,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    dotInactive: {
        width: 8,
        backgroundColor: 'rgba(1, 86, 167, 0.3)',
    },
    dotActive: {
        width: 32,
        backgroundColor: '#0156A7',
    },
    nextButton: {
        flexDirection: 'row',
        backgroundColor: '#0156A7',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxxl,
        borderRadius: BorderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.large,
        gap: Spacing.md,
    },
    nextButtonText: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: '#FFFFFF',
    },
    nextButtonIcon: {
        fontSize: FontSizes.xl,
        color: '#FFFFFF',
        fontWeight: FontWeights.bold,
    },
});
