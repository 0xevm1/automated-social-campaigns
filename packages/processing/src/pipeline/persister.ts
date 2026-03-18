/**
 * In the S3-based architecture, persisting is handled directly by the compositor
 * (which writes composite buffers to S3). This module is kept for the ManifestEntry
 * type used by the orchestrator.
 */
export interface ManifestEntry {
  product: string;
  ratio: string;
  s3Key: string;
}
