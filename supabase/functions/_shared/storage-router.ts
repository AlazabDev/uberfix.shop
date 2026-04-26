/**
 * Storage router for partner uploads.
 * 
 * Routes file uploads to the correct storage backend based on the
 * consumer's `storage_target` field:
 *  - "local"  → self-hosted Supabase Storage at supabase.alazab.com
 *  - "gcp"    → Google Cloud Storage (GCS) buckets
 *  - "aws"    → AWS S3 (azab-* buckets)
 *  - "oci"    → Oracle Cloud Object Storage (alazab-media)
 * 
 * For Phase 2 we ship the LOCAL implementation fully and stub the
 * cloud providers behind signed-URL handoff so partners can integrate
 * progressively without breaking.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export type StorageTarget = 'local' | 'gcp' | 'aws' | 'oci';

export interface StoredFile {
  path: string;
  url: string;
  bucket: string;
  target: StorageTarget;
  size?: number;
  mime?: string;
}

const DEFAULT_BUCKET_BY_TARGET: Record<StorageTarget, string> = {
  local: 'supabase-public',
  gcp: 'alazab-487922-public',
  aws: 'azab-media',
  oci: 'alazab-media',
};

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

/**
 * Upload a base64 / Uint8Array payload to the partner's storage backend.
 * Falls back to local Supabase storage if the cloud provider is not configured.
 */
export async function routeUpload(opts: {
  target: StorageTarget;
  consumerId: string;
  filename: string;
  data: Uint8Array;
  contentType?: string;
  bucket?: string;
}): Promise<StoredFile> {
  const target = opts.target ?? 'local';
  const bucket = opts.bucket ?? DEFAULT_BUCKET_BY_TARGET[target];
  const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `gateway/${opts.consumerId}/${Date.now()}_${safeName}`;

  // For now: GCP/AWS/OCI all defer to local Supabase storage
  // (real cloud SDKs would be wired here when partner credentials are added).
  if (target !== 'local') {
    console.log(`[storage-router] ${target} not yet wired, using local fallback`);
  }

  const sb = admin();
  const { error } = await sb.storage.from(bucket).upload(path, opts.data, {
    contentType: opts.contentType ?? 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed (${target}/${bucket}): ${error.message}`);
  }

  const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    url: pub.publicUrl,
    bucket,
    target,
    size: opts.data.byteLength,
    mime: opts.contentType,
  };
}

/**
 * Resolve the bucket name for a partner without uploading.
 * Useful for generating direct-upload signed URLs.
 */
export function resolveBucket(target: StorageTarget, override?: string): string {
  return override ?? DEFAULT_BUCKET_BY_TARGET[target] ?? DEFAULT_BUCKET_BY_TARGET.local;
}