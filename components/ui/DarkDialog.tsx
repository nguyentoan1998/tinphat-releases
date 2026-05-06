// Theme-aware custom dialog to replace Alert.alert
import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useThemeStore } from '@/store';
import { ThemeColors } from '@/constants/ThemeColors';

const { width } = Dimensions.get('window');

export interface DialogButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface DarkDialogProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: DialogButton[];
    onDismiss?: () => void;
}

export default function DarkDialog({
    visible,
    title,
    message,
    buttons = [{ text: 'OK', style: 'default' }],
    onDismiss,
}: DarkDialogProps) {
    const { isDark } = useThemeStore();
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    if (!visible) return null;

    const dialogBg = '#FFFFFF';
    const borderColor = 'rgba(1, 86, 167, 0.3)'; // VietinBank Blue border
    const dividerColor = 'rgba(1, 86, 167, 0.15)'; // Light blue divider
    const pressedBg = 'rgba(1, 86, 167, 0.05)'; // Light blue pressed background
    const cancelColor = '#59677B'; // Secondary text color

    const handleButtonPress = (button: DialogButton) => {
        onDismiss?.();
        if (button.onPress) {
            setTimeout(() => {
                button.onPress!();
            }, 300);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

                <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(120)}
                    style={[styles.dialog, { backgroundColor: dialogBg, borderColor }]}
                >
                    <View style={styles.content}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                        {message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}
                    </View>

                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                    <View style={[
                        styles.buttons,
                        buttons.length <= 2 && styles.buttonsRow,
                    ]}>
                        {buttons.map((button, index) => {
                            const isDestructive = button.style === 'destructive';
                            const isCancel = button.style === 'cancel';

                            return (
                                <Pressable
                                    key={index}
                                    style={({ pressed }) => [
                                        styles.button,
                                        buttons.length <= 2 && styles.buttonFlex,
                                        index > 0 && buttons.length <= 2 && [styles.buttonBorderLeft, { borderLeftColor: dividerColor }],
                                        pressed && { backgroundColor: pressedBg },
                                    ]}
                                    onPress={() => handleButtonPress(button)}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        isDestructive && styles.destructiveText,
                                        isCancel && { color: cancelColor },
                                        !isDestructive && !isCancel && styles.defaultText,
                                    ]}>
                                        {button.text}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// Hook for easy dialog management
export function useDarkDialog() {
    const [dialogState, setDialogState] = React.useState<{
        visible: boolean;
        title: string;
        message?: string;
        buttons?: DialogButton[];
    }>({
        visible: false,
        title: '',
        message: undefined,
        buttons: undefined,
    });

    const showDialog = (
        title: string,
        message?: string,
        buttons?: DialogButton[],
    ) => {
        setDialogState({
            visible: true,
            title,
            message,
            buttons: buttons || [{ text: 'OK', style: 'default' }],
        });
    };

    const hideDialog = () => {
        setDialogState(prev => ({ ...prev, visible: false }));
    };

    // Return JSX element (not a component function) so React never remounts DarkDialog
    const DialogComponent = (
        <DarkDialog
            visible={dialogState.visible}
            title={dialogState.title}
            message={dialogState.message}
            buttons={dialogState.buttons}
            onDismiss={hideDialog}
        />
    );

    return { showDialog, hideDialog, DialogComponent };
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    dialog: {
        width: width * 0.82,
        maxWidth: 360,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 20,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        gap: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    divider: {
        height: 1,
    },
    buttons: {
        flexDirection: 'column',
    },
    buttonsRow: {
        flexDirection: 'row',
    },
    button: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonFlex: {
        flex: 1,
    },
    buttonBorderLeft: {
        borderLeftWidth: 1,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    defaultText: {
        color: '#0156A7', // VietinBank Blue
    },
    destructiveText: {
        color: '#EF4444',
    },
});
