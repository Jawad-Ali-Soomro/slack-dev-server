import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";
import { logger } from "../helpers/index";

const LOGO_FOLDER = "slack-dev/group-logos";

let configured = false;

function readConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
  return { cloudName, apiKey, apiSecret };
}

function ensureConfig() {
  const { cloudName, apiKey, apiSecret } = readConfig();
  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudName;
}

export function isManagedLogoUrl(url: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!url || !cloudName) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/`)
    );
  } catch {
    return false;
  }
}

export function isManagedLogoPublicId(publicId?: string | null) {
  return Boolean(publicId && publicId.startsWith(`${LOGO_FOLDER}/`));
}

export function uploadGroupLogo(buffer: Buffer) {
  ensureConfig();
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: LOGO_FOLDER,
        resource_type: "image",
        unique_filename: true,
        overwrite: false,
        transformation: [
          {
            width: 512,
            height: 512,
            crop: "fill",
            gravity: "auto",
            quality: "auto:good",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Logo upload failed"));
          return;
        }
        resolve(result);
      },
    );
    Readable.from(buffer).pipe(upload);
  });
}

export async function deleteGroupLogo(publicId?: string | null) {
  if (!isManagedLogoPublicId(publicId)) return;
  try {
    ensureConfig();
    await cloudinary.uploader.destroy(publicId as string, {
      resource_type: "image",
    });
  } catch (error) {
    logger.error("Failed to delete previous group logo:", error);
  }
}
