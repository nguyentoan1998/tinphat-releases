// TinPhatLogo — Custom SVG logo for Tin Phat ERP app
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
    Defs,
    LinearGradient as SvgLinearGradient,
    Stop,
    Path,
    Rect,
    Circle,
    Text as SvgText,
} from 'react-native-svg';

interface TinPhatLogoProps {
    size?: number;
    showText?: boolean;
}

export default function TinPhatLogo({ size = 110, showText = true }: TinPhatLogoProps) {
    const iconSize = size;

    return (
        <View style={styles.wrapper}>
            <Svg width={iconSize} height={iconSize} viewBox="0 0 120 120">
                <Defs>
                    {/* Background: white */}
                    <SvgLinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#F0F8FF" stopOpacity="1" />
                    </SvgLinearGradient>
                    {/* T letter: VietinBank Blue */}
                    <SvgLinearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#0156A7" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#013B78" stopOpacity="1" />
                    </SvgLinearGradient>
                    {/* P letter: Light Blue or Gold */}
                    <SvgLinearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#F9C74F" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#E5A61C" stopOpacity="1" />
                    </SvgLinearGradient>
                    {/* Glass highlight */}
                    <SvgLinearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
                        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                    </SvgLinearGradient>
                </Defs>

                {/* Rounded square background */}
                <Rect x="4" y="4" width="112" height="112" rx="24" ry="24" fill="url(#bgGrad)" />

                {/* Glass top-half overlay */}
                <Rect x="4" y="4" width="112" height="56" rx="24" ry="24" fill="url(#glassGrad)" />

                {/* Border: subtle blue */}
                <Rect
                    x="4" y="4" width="112" height="112" rx="24" ry="24"
                    fill="none" stroke="rgba(1, 86, 167, 0.2)" strokeWidth="1.5"
                />

                {/* T letter (left side) */}
                {/* T top horizontal bar */}
                <Rect x="14" y="26" width="36" height="10" rx="5" fill="url(#tGrad)" />
                {/* T vertical stem */}
                <Rect x="28" y="26" width="10" height="52" rx="5" fill="url(#tGrad)" />

                {/* P letter (right side) */}
                {/* P vertical bar */}
                <Rect x="64" y="26" width="10" height="52" rx="5" fill="url(#pGrad)" />
                {/* P top horizontal cap */}
                <Rect x="64" y="26" width="24" height="10" rx="5" fill="url(#pGrad)" />
                {/* P middle horizontal cap */}
                <Rect x="64" y="48" width="24" height="10" rx="5" fill="url(#pGrad)" />
                {/* P right vertical arc connector (top half) */}
                <Rect x="80" y="26" width="10" height="32" rx="5" fill="url(#pGrad)" />

                {/* Accent: 3 small dots bottom right (teal fading) */}
                <Circle cx="76" cy="90" r="4" fill="#14B8A6" opacity="0.9" />
                <Circle cx="89" cy="90" r="4" fill="#14B8A6" opacity="0.5" />
                <Circle cx="102" cy="90" r="4" fill="#14B8A6" opacity="0.2" />
            </Svg>

            {showText && (
                <Svg width={iconSize * 2} height={56} viewBox="0 0 240 56" style={styles.textSvg}>
                    <Defs>
                        <SvgLinearGradient id="nameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor="#14B8A6" stopOpacity="1" />
                            <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#818CF8" stopOpacity="1" />
                        </SvgLinearGradient>
                    </Defs>
                    {/* Main brand name */}
                    <SvgText
                        x="120" y="28"
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="800"
                        fill="url(#nameGrad)"
                        letterSpacing="4"
                    >
                        TIN PHAT
                    </SvgText>
                    {/* Subtitle */}
                    <SvgText
                        x="120" y="48"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="400"
                        fill="rgba(165,180,252,0.7)"
                        letterSpacing="2"
                    >
                        ERP System
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

