import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uploadGPlayImage, type GPlayImageType } from "@/lib/gplay";
import { getEditableVersion, getLocalizationId, uploadAscScreenshot, type AscImageType } from "@/lib/asc";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appId } = await params;
  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const platform = formData.get("platform") as string;       // "ios" | "android"
  const imageType = formData.get("imageType") as string;
  const language = formData.get("language") as string ?? "ja";

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });
  if (!imageType) return NextResponse.json({ error: "imageType required" }, { status: 400 });

  const imageData = await file.arrayBuffer();
  const mimeType = file.type || "image/png";

  let result: Record<string, unknown>;

  if (platform === "android") {
    if (!app.googlePlayId) return NextResponse.json({ error: "googlePlayId not set" }, { status: 400 });
    const locale = language === "ja" ? "ja-JP" : "en-US";
    result = await uploadGPlayImage(app.googlePlayId, locale, imageType as GPlayImageType, imageData, mimeType);
    result = { platform: "android", imageType, locale, ...result };

  } else if (platform === "ios") {
    if (!app.iosId) return NextResponse.json({ error: "iosId not set" }, { status: 400 });

    const editable = await getEditableVersion(app.iosId);
    if (!editable) {
      return NextResponse.json({
        error: "no_editable_version",
        waitingForVersion: true,
      }, { status: 409 });
    }

    const locale = language === "ja" ? "ja" : "en-US";
    const locId = await getLocalizationId(editable.versionId, locale);
    if (!locId) return NextResponse.json({ error: "localization not found" }, { status: 400 });

    const screenshotId = await uploadAscScreenshot(
      editable.versionId, locId,
      imageType as AscImageType,
      imageData, file.name, mimeType,
    );
    result = { platform: "ios", imageType, locale, screenshotId, versionString: editable.versionString };

  } else {
    return NextResponse.json({ error: "invalid platform" }, { status: 400 });
  }

  await writeAuditLog({
    action: "aso_image_upload",
    targetTable: "AsoApp",
    targetId: appId,
    afterValue: { platform, imageType, fileName: file.name, size: file.size },
    req,
  });

  return NextResponse.json({ success: true, ...result });
}
