import type { DocxMediaAsset, DocxRelationship } from './docxTypes';

const IMAGE_RELATIONSHIP = '/relationships/image';

export function parseMedia(
  relationships: Record<string, DocxRelationship>,
  entries: Record<string, Uint8Array>,
): Record<string, DocxMediaAsset> {
  const media: Record<string, DocxMediaAsset> = {};

  for (const relationship of Object.values(relationships)) {
    if (relationship.isExternal || !relationship.targetPath || !relationship.type.includes(IMAGE_RELATIONSHIP)) continue;
    const bytes = entries[relationship.targetPath];
    if (!bytes) continue;
    const contentType = contentTypeFromPath(relationship.targetPath);
    media[relationship.id] = {
      relationshipId: relationship.id,
      path: relationship.targetPath,
      contentType,
      dataUrl: `data:${contentType};base64,${uint8ToBase64(bytes)}`,
    };
  }

  return media;
}

function contentTypeFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'bmp') return 'image/bmp';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}
