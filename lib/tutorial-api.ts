// Tutorial Videos API Client
import { apiClient } from './api-client';

export interface TutorialVideo {
    id: string;
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number; // seconds
    order: number;
    tags?: string[];
    teamId?: string;
    createdAt: string;
    updatedAt: string;
    Team?: {
        id: string;
        code: string;
        name: string;
    };
}

export interface CreateTutorialDto {
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number;
    order?: number;
    tags?: string[];
    teamId?: string;
}

export interface UpdateTutorialDto {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    order?: number;
    tags?: string[];
    teamId?: string;
}

export interface TutorialFilters {
    teamId?: string;
    tags?: string; // comma-separated
}

// Video source detection
export enum VideoSource {
    YOUTUBE = 'youtube',
    TIKTOK = 'tiktok',
    FACEBOOK = 'facebook',
    INSTAGRAM = 'instagram',
    TWITTER = 'twitter',
    VIMEO = 'vimeo',
    CLOUDINARY = 'cloudinary',
    DIRECT = 'direct',
}

export function detectVideoSource(url: string): VideoSource {
    if (/youtube\.com|youtu\.be/.test(url)) return VideoSource.YOUTUBE;
    if (/tiktok\.com/.test(url)) return VideoSource.TIKTOK;
    if (/facebook\.com|fb\.watch/.test(url)) return VideoSource.FACEBOOK;
    if (/instagram\.com/.test(url)) return VideoSource.INSTAGRAM;
    if (/twitter\.com|x\.com/.test(url)) return VideoSource.TWITTER;
    if (/vimeo\.com/.test(url)) return VideoSource.VIMEO;
    if (/cloudinary\.com/.test(url)) return VideoSource.CLOUDINARY;
    return VideoSource.DIRECT;
}

// Transform URL to embeddable format
export function getEmbedUrl(videoUrl: string): string {
    const source = detectVideoSource(videoUrl);

    switch (source) {
        case VideoSource.YOUTUBE: {
            // Extract video ID from various YouTube URL formats
            const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
            if (match) {
                return `https://www.youtube.com/embed/${match[1]}`;
            }
            return videoUrl;
        }
        case VideoSource.TIKTOK: {
            // TikTok embed (may need adjustment based on actual TikTok embed API)
            return videoUrl.replace('/video/', '/embed/v2/');
        }
        case VideoSource.FACEBOOK: {
            // Facebook video plugin
            return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false`;
        }
        case VideoSource.VIMEO: {
            // Extract Vimeo ID
            const match = videoUrl.match(/vimeo\.com\/(\d+)/);
            if (match) {
                return `https://player.vimeo.com/video/${match[1]}`;
            }
            return videoUrl;
        }
        case VideoSource.INSTAGRAM:
        case VideoSource.TWITTER:
        case VideoSource.CLOUDINARY:
        case VideoSource.DIRECT:
        default:
            return videoUrl;
    }
}

// Extract YouTube thumbnail
export function getYouTubeThumbnail(videoUrl: string): string | null {
    const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (match) {
        // Use hqdefault as it's more reliably available than maxresdefault
        return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return null;
}

// Auto-detect and extract thumbnail from any video URL
export function getAutoThumbnail(videoUrl: string): string | null {
    if (!videoUrl) return null;
    const source = detectVideoSource(videoUrl);

    switch (source) {
        case VideoSource.YOUTUBE: {
            return getYouTubeThumbnail(videoUrl);
        }
        case VideoSource.VIMEO: {
            // Vimeo thumbnails need API call, return null for now
            return null;
        }
        default:
            return null;
    }
}

class TutorialApi {
    private basePath = '/tutorials';

    async getTutorials(filters?: TutorialFilters): Promise<TutorialVideo[]> {
        const params = new URLSearchParams();
        if (filters?.teamId) params.append('teamId', filters.teamId);
        if (filters?.tags) params.append('tags', filters.tags);

        const query = params.toString();
        const url = query ? `${this.basePath}?${query}` : this.basePath;

        // apiClient.get() already returns response.data
        return apiClient.get<TutorialVideo[]>(url);
    }

    async getTutorial(id: string): Promise<TutorialVideo> {
        return apiClient.get<TutorialVideo>(`${this.basePath}/${id}`);
    }

    async createTutorial(data: CreateTutorialDto): Promise<TutorialVideo> {
        return apiClient.post<TutorialVideo>(this.basePath, data);
    }

    async updateTutorial(id: string, data: UpdateTutorialDto): Promise<TutorialVideo> {
        return apiClient.patch<TutorialVideo>(`${this.basePath}/${id}`, data);
    }

    async deleteTutorial(id: string): Promise<void> {
        await apiClient.delete(`${this.basePath}/${id}`);
    }
}

export const tutorialApi = new TutorialApi();
