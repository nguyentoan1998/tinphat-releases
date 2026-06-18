// TinPhatLogo — Uses the actual logo image
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';

interface TinPhatLogoProps {
    size?: number;
    showText?: boolean;
}

export default function TinPhatLogo({ size = 110, showText = true }: TinPhatLogoProps) {
    const logoHeight = Math.round(size * 0.967);

    return (
        <View style={styles.wrapper}>
            <Image
                source={require('@/assets/icon.png')}
                style={{
                    width: size,
                    height: logoHeight,
                    borderRadius: size * 0.1,
                }}
                resizeMode="contain"
            />

            {showText && (
                <Svg width={size * 2} height={56} viewBox="0 0 240 56" style={styles.textSvg}>
                    <Defs>
                        <SvgLinearGradient id="nameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor="#0156A7" stopOpacity="1" />
                            <Stop offset="50%" stopColor="#0A85EA" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#0156A7" stopOpacity="1" />
                        </SvgLinearGradient>
                    </Defs>
                    {/* Brand Name */}
                    <SvgText
                        x="120" y="28"
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="800"
                        fill="url(#nameGrad)"
                        letterSpacing="3"
                    >
                        TÍN PHÁT
                    </SvgText>
                    {/* Subtitle */}
                    <SvgText
                        x="120" y="48"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="400"
                        fill="rgba(1, 86, 167, 0.5)"
                        letterSpacing="2"
                    >
                        Tín Phát Metech
                    </SvgText>
                </Svg>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
    },
    textSvg: {
        marginTop: 10,
    },
});
