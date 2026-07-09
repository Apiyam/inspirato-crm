import { getFileBinaryRequest } from 'pages/api/fileServer';
import { GetFileInfoParams } from 'utils/n8nFileInfo';

export interface DownloadedMediaFile {
  blob: Blob;
  blobUrl: string;
  filename: string;
  mimeType: string;
}

const FILE_NAME_PATTERN =
  /\.(jpe?g|png|gif|webp|bmp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|mp4|mp3|ogg|wav|m4a|webm|mov)(\?.*)?$/i;

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/mp4': '.m4a',
};

export function guessDownloadFilename(text?: string): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  if (FILE_NAME_PATTERN.test(trimmed)) return trimmed;
  return undefined;
}

function parseFilenameFromDisposition(header: string | null): string | undefined {
  if (!header) return undefined;

  const utf8Match = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = header.match(/filename="?([^";\n]+)"?/i);
  return plainMatch?.[1]?.trim() || undefined;
}

function defaultFilename(mimeType: string, mediaId?: string): string {
  const ext = MIME_EXTENSION[mimeType] || '';
  const suffix = mediaId?.slice(-8) || String(Date.now());
  return `archivo_${suffix}${ext || (mimeType.startsWith('image/') ? '.jpg' : '')}`;
}

async function parseDownloadError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return `No se pudo descargar el archivo (${response.status}).`;
  }

  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error || data.message || 'No se pudo descargar el archivo.';
  } catch {
    return 'No se pudo descargar el archivo.';
  }
}

export async function downloadMediaFileFromN8n(
  params: GetFileInfoParams,
  fallbackFilename?: string,
): Promise<DownloadedMediaFile> {
  const response = await getFileBinaryRequest(params);

  if (!response.ok) {
    throw new Error(await parseDownloadError(response));
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    throw new Error(await parseDownloadError(response));
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('El archivo recibido está vacío.');
  }

  const mimeType = blob.type || contentType.split(';')[0]?.trim() || 'application/octet-stream';
  const headerFilename = parseFilenameFromDisposition(response.headers.get('content-disposition'));
  const filename =
    headerFilename ||
    fallbackFilename ||
    guessDownloadFilename(fallbackFilename) ||
    defaultFilename(mimeType, params.mediaId);

  const blobUrl = URL.createObjectURL(blob);

  return { blob, blobUrl, filename, mimeType };
}

export function triggerBlobDownload(blobUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function triggerFileDownload(url: string, filename?: string) {
  const link = document.createElement('a');
  link.href = url;
  if (filename) link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Descarga el binario desde N8N y dispara la descarga en el navegador. */
export async function fetchAndAutoDownloadMedia(
  params: GetFileInfoParams,
  fallbackFilename?: string,
): Promise<DownloadedMediaFile> {
  const file = await downloadMediaFileFromN8n(params, fallbackFilename);
  triggerBlobDownload(file.blobUrl, file.filename);
  return file;
}
