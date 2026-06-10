// GCS media hosting for SNS auto-posting.
// Imagen 3 outputs PNG base64 → convert to JPEG (IG requirement) → upload to public bucket.

import { Storage } from "@google-cloud/storage";
import sharp from "sharp";

const BUCKET = process.env.SNS_MEDIA_BUCKET ?? "twomi-sns-media";

function storage() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  const credentials = JSON.parse(json);
  return new Storage({ credentials, projectId: credentials.project_id });
}

/**
 * Convert a base64 PNG data-URI to JPEG and upload to GCS.
 * Returns the public HTTPS URL (IG-compatible: direct JPEG, no redirect).
 */
export async function hostImageAsJpeg(dataUri: string, keyPrefix: string): Promise<string> {
  const base64 = dataUri.replace(/^data:image\/\w+;base64,/, "");
  const png = Buffer.from(base64, "base64");

  // IG: JPEG only, max 8MB, aspect 4:5〜1.91:1. Imagen 1:1 output satisfies aspect.
  const jpeg = await sharp(png).jpeg({ quality: 90 }).toBuffer();

  const objectName = `${keyPrefix}/${Date.now()}.jpg`;
  const bucket = storage().bucket(BUCKET);
  await bucket.file(objectName).save(jpeg, {
    contentType: "image/jpeg",
    resumable: false,
  });

  return `https://storage.googleapis.com/${BUCKET}/${objectName}`;
}
