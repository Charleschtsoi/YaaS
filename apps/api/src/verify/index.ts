import exifr from "exifr";
import type { ProofType } from "@yaas/shared";
import { isWithinRadius } from "../lib/geo.js";

export interface VerificationInput {
  proofType: ProofType;
  fileBuffer?: Buffer;
  submittedLat?: number;
  submittedLng?: number;
  text?: string;
  taskLocation?: { lat: number; lng: number; radius_km: number };
}

export interface VerificationResult {
  passed: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function verifyProof(
  input: VerificationInput
): Promise<VerificationResult> {
  switch (input.proofType) {
    case "photo":
      return verifyPhoto(input);
    case "gps":
      return verifyGps(input);
    case "text":
      return verifyText(input);
    case "signature":
      return verifySignature(input);
    case "video":
      return verifyVideo(input);
    default:
      return { passed: false, reason: "Unknown proof type" };
  }
}

async function verifyPhoto(input: VerificationInput): Promise<VerificationResult> {
  if (!input.fileBuffer || input.fileBuffer.length < 100) {
    return { passed: false, reason: "Photo file missing or too small" };
  }

  const metadata: Record<string, unknown> = { size: input.fileBuffer.length };

  if (input.taskLocation) {
    let lat = input.submittedLat;
    let lng = input.submittedLng;

    try {
      const exif = await exifr.gps(input.fileBuffer);
      if (exif?.latitude && exif?.longitude) {
        lat = exif.latitude;
        lng = exif.longitude;
        metadata.exifGps = { lat, lng };
      }
    } catch {
      // EXIF extraction failed, fall back to submitted coords
    }

    if (lat === undefined || lng === undefined) {
      return { passed: false, reason: "GPS coordinates required for photo proof" };
    }

    const within = isWithinRadius(
      lat,
      lng,
      input.taskLocation.lat,
      input.taskLocation.lng,
      input.taskLocation.radius_km
    );

    if (!within) {
      return {
        passed: false,
        reason: "Photo GPS outside required radius",
        metadata,
      };
    }

    metadata.verifiedGps = { lat, lng };
  }

  return { passed: true, metadata };
}

function verifyGps(input: VerificationInput): VerificationResult {
  if (input.submittedLat === undefined || input.submittedLng === undefined) {
    return { passed: false, reason: "GPS coordinates required" };
  }

  if (input.taskLocation) {
    const within = isWithinRadius(
      input.submittedLat,
      input.submittedLng,
      input.taskLocation.lat,
      input.taskLocation.lng,
      input.taskLocation.radius_km
    );
    if (!within) {
      return { passed: false, reason: "GPS outside required radius" };
    }
  }

  return {
    passed: true,
    metadata: { lat: input.submittedLat, lng: input.submittedLng },
  };
}

function verifyText(input: VerificationInput): VerificationResult {
  if (!input.text || input.text.trim().length < 10) {
    return { passed: false, reason: "Text proof must be at least 10 characters" };
  }
  return { passed: true, metadata: { textLength: input.text.length } };
}

function verifySignature(input: VerificationInput): VerificationResult {
  if (!input.text || input.text.trim().length < 1) {
    return { passed: false, reason: "Signature attestation required" };
  }
  const hash = Buffer.from(input.text).toString("base64");
  return { passed: true, metadata: { signatureHash: hash } };
}

function verifyVideo(input: VerificationInput): VerificationResult {
  if (!input.fileBuffer || input.fileBuffer.length < 1000) {
    return { passed: false, reason: "Video file missing or too small" };
  }
  return { passed: true, metadata: { size: input.fileBuffer.length } };
}
