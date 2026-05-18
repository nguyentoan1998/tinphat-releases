import { UpdateConfig } from './types';
import { GitHubApiConfig } from './github-types';

/**
 * Default UpdateConfig for the app.
 *
 * Sử dụng GitHub Releases API để kiểm tra và tải APK mới.
 *
 * Cơ chế hoạt động:
 * - App gọi GitHub Releases API: GET /repos/{owner}/{repo}/releases/latest
 * - API trả về thông tin release mới nhất, bao gồm APK asset URL
 * - App so sánh version tag với version hiện tại
 * - Nếu có bản mới → hiển thị dialog cập nhật
 *
 * Quy trình release mới (v1.0.2):
 * 1. Push tag "v1.0.2" lên GitHub
 * 2. GitHub Actions tự động build và ký APK
 * 3. GitHub Actions tạo Release với APK đính kèm
 * 4. App tự phát hiện và thông báo cập nhật
 */
export const DEFAULT_UPDATE_CONFIG: UpdateConfig = {
  github: {
    owner: 'nguyentoan1998',
    repo: 'tinphat-releases',
  },
  connectTimeoutMs: 10_000,
  maxRetries: 3,
  retryIntervalMs: 5_000,
};

/**
 * Tạo UpdateConfig với GitHub repo tùy chỉnh.
 * @param owner - GitHub username hoặc organization (ví dụ: "nguyentoan1998")
 * @param repo  - Tên repository (ví dụ: "tinphat-releases")
 * @param token - Optional GitHub Personal Access Token (cho private repos)
 */
export function createUpdateConfig(
  owner: string,
  repo: string,
  token?: string,
): UpdateConfig {
  const github: GitHubApiConfig = { owner, repo };
  if (token) {
    github.token = token;
  }
  return {
    ...DEFAULT_UPDATE_CONFIG,
    github,
  };
}
