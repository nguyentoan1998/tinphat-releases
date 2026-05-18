// Video Player Modal — Plays video IN-APP, prevents redirect to external apps
import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Dimensions,
    Linking,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, AlertTriangle, ExternalLink, RefreshCcw, Globe } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { detectVideoSource, getEmbedUrl, VideoSource } from '@/lib/tutorial-api';

const { width } = Dimensions.get('window');

// Desktop user agent to prevent mobile app redirect
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface VideoPlayerModalProps {
    visible: boolean;
    videoUrl: string;
    videoTitle: string;
    onClose: () => void;
}

export default function VideoPlayerModal({
    visible,
    videoUrl,
    videoTitle,
    onClose,
}: VideoPlayerModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const source = videoUrl ? detectVideoSource(videoUrl) : VideoSource.DIRECT;

    const sourceLabels: Record<string, string> = {
        youtube: 'YouTube',
        tiktok: 'TikTok',
        facebook: 'Facebook',
        instagram: 'Instagram',
        twitter: 'Twitter / X',
        vimeo: 'Vimeo',
        cloudinary: 'Cloudinary',
        direct: 'Direct Video',
    };

    const handleClose = useCallback(() => {
        setLoading(true);
        setError(false);
        setRetryCount(0);
        onClose();
    }, [onClose]);

    const handleRetry = () => {
        setError(false);
        setLoading(true);
        setRetryCount(prev => prev + 1);
    };

    const handleOpenExternal = async () => {
        try { await Linking.openURL(videoUrl); } catch { /* silent */ }
    };

    // Block navigation to app deep links (fb://, youtube://, etc.)
    const onShouldStartLoad = (event: any) => {
        const { url } = event;
        // Allow http/https URLs
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return true;
        }
        // Block app deep links (fb://, youtube://, intent://, etc.)
        return false;
    };

    // Build the video source for WebView
    const getWebViewSource = () => {
        if (source === VideoSource.YOUTUBE) {
            const embedUrl = getEmbedUrl(videoUrl);
            return {
                html: `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}
iframe{width:100%;height:100%;border:none}</style>
</head><body>
<iframe src="${embedUrl}?autoplay=1&playsinline=1&rel=0"
  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen"
  allowfullscreen></iframe>
</body></html>`
            };
        }

        if (source === VideoSource.FACEBOOK) {
            // Facebook: use the Facebook Video embed player
            const encodedUrl = encodeURIComponent(videoUrl);
            return {
                html: `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}
iframe{width:100%;height:100%;border:none}</style>
</head><body>
<iframe src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=560"
  allow="autoplay;clipboard-write;encrypted-media;picture-in-picture;web-share;fullscreen"
  allowfullscreen></iframe>
</body></html>`
            };
        }

        if (source === VideoSource.TIKTOK) {
            // TikTok: extract video ID and use embed
            const tiktokMatch = videoUrl.match(/\/video\/(\d+)/);
            if (tiktokMatch) {
                return {
                    html: `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center}
iframe{width:100%;height:100%;border:none;max-width:340px}</style>
</head><body>
<iframe src="https://www.tiktok.com/embed/v2/${tiktokMatch[1]}"
  allow="autoplay;encrypted-media" allowfullscreen></iframe>
</body></html>`
                };
            }
        }

        // For all other sources: load URL directly with desktop user agent
        // The user agent prevents the website from redirecting to mobile app
        return { uri: videoUrl };
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

                <Animated.View
                    entering={FadeIn.duration(250)}
                    exiting={FadeOut.duration(200)}
                    style={styles.container}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.title} numberOfLines={1}>
                                {videoTitle}
                            </Text>
                            <View style={styles.sourcePill}>
                                <Globe size={10} color="#FFFFFF" />
                                <Text style={styles.sourceLabel}>
                                    {sourceLabels[source] || 'Video'}
                                </Text>
                            </View>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={handleClose}>
                            <X size={22} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    {/* Video Player */}
                    <View style={styles.playerWrapper}>
                        {loading && !error && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#FF0000" />
                                <Text style={styles.loadingText}>Đang tải video...</Text>
                            </View>
                        )}

                        {error ? (
                            <View style={styles.errorOverlay}>
                                <View style={styles.errorIcon}>
                                    <AlertTriangle size={36} color="#FF6B6B" />
                                </View>
                                <Text style={styles.errorTitle}>Video không khả dụng</Text>
                                <Text style={styles.errorDesc}>
                                    Không thể phát video này trong ứng dụng.{'\n'}
                                    Hãy mở trong trình duyệt để xem.
                                </Text>
                                <View style={styles.errorActions}>
                                    <Pressable style={styles.retryBtn} onPress={handleRetry}>
                                        <RefreshCcw size={16} color="#FFFFFF" />
                                        <Text style={styles.retryText}>Thử lại</Text>
                                    </Pressable>
                                    <Pressable style={styles.externalBtn} onPress={handleOpenExternal}>
                                        <ExternalLink size={16} color="#818CF8" />
                                        <Text style={styles.externalText}>Mở trình duyệt</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <WebView
                                key={`video-${retryCount}`}
                                source={getWebViewSource()}
                                style={styles.webview}
                                userAgent={DESKTOP_UA}
                                allowsFullscreenVideo
                                allowsInlineMediaPlayback
                                mediaPlaybackRequiresUserAction={false}
                                javaScriptEnabled
                                domStorageEnabled
                                setSupportMultipleWindows={false}
                                onShouldStartLoadWithRequest={onShouldStartLoad}
                                startInLoadingState={false}
                                onLoadStart={() => setLoading(true)}
                                onLoadEnd={() => setLoading(false)}
                                onError={() => {
                                    setLoading(false);
                                    setError(true);
                                }}
                                onHttpError={(e) => {
                                    if (e.nativeEvent.statusCode >= 400) {
                                        setLoading(false);
                                        setError(true);
                                    }
                                }}
                            />
                        )}
                    </View>

                    {/* Bottom bar */}
                    <View style={styles.bottomBar}>
                        <Pressable style={styles.openLink} onPress={handleOpenExternal}>
                            <ExternalLink size={14} color="rgba(255,255,255,0.5)" />
                            <Text style={styles.openLinkText}>Mở trong trình duyệt</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    container: {
        width: width * 0.96,
        maxWidth: 640,
        backgroundColor: '#0F0F1A',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(15,15,30,0.95)',
        gap: 12,
    },
    headerLeft: { flex: 1, gap: 4 },
    title: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    sourcePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    sourceLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
    closeBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    playerWrapper: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000000',
        position: 'relative',
    },
    webview: { flex: 1, backgroundColor: 'transparent' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.95)',
        gap: 12,
        zIndex: 10,
    },
    loadingText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F0F1A',
        padding: 24,
        gap: 10,
        zIndex: 20,
    },
    errorIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,107,107,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    errorTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
    errorDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        textAlign: 'center',
        lineHeight: 19,
    },
    errorActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#EF4444',
        borderRadius: 20,
    },
    retryText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
    externalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
    },
    externalText: { fontSize: 13, fontWeight: '500', color: '#818CF8' },
    bottomBar: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(15,15,30,0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    openLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-end',
    },
    openLinkText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
