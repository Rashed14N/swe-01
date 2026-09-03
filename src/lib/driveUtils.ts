/**
 * Utility helpers to handle Google Drive and external document links.
 * Converts Google Drive share links into instant direct download links and preview links.
 */

export interface ParsedDriveLink {
  isGoogleDrive: boolean;
  fileId: string | null;
  directDownloadUrl: string;
  previewUrl: string;
}

/**
 * Extracts Google Drive File ID from various Drive URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://docs.google.com/document/d/FILE_ID/...
 * - https://docs.google.com/spreadsheets/d/FILE_ID/...
 * - https://docs.google.com/presentation/d/FILE_ID/...
 */
export function parseGoogleDriveLink(url: string): ParsedDriveLink {
  if (!url || typeof url !== 'string') {
    return {
      isGoogleDrive: false,
      fileId: null,
      directDownloadUrl: '',
      previewUrl: '',
    };
  }

  const trimmed = url.trim();

  // Regex patterns to capture file ID
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  const docsDMatch = trimmed.match(/\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]{15,})/);

  const fileId = fileDMatch?.[1] || idParamMatch?.[1] || docsDMatch?.[1] || null;

  if (fileId) {
    return {
      isGoogleDrive: true,
      fileId,
      // Direct instant download URL from Google Drive:
      directDownloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      // In-browser preview URL:
      previewUrl: `https://drive.google.com/file/d/${fileId}/view`,
    };
  }

  const isDriveDomain = trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');

  return {
    isGoogleDrive: isDriveDomain,
    fileId: null,
    directDownloadUrl: trimmed,
    previewUrl: trimmed,
  };
}

/**
 * Returns the best URL for instant downloading.
 * If given a Google Drive link, converts to instant download parameter.
 */
export function getInstantDownloadUrl(url: string): string {
  if (!url) return '';
  const parsed = parseGoogleDriveLink(url);
  return parsed.directDownloadUrl || url.trim();
}

/**
 * Returns the best URL for in-browser preview or reading.
 */
export function getPreviewUrl(url: string): string {
  if (!url) return '';
  const parsed = parseGoogleDriveLink(url);
  return parsed.previewUrl || url.trim();
}
