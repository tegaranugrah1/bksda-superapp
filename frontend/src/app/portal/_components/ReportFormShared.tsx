"use client";

import { toast } from "sonner";

export const ALLOWED_REPORT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_REPORT_IMAGE_BYTES = 10 * 1024 * 1024;

export function filterValidReportImageFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter((file) => {
    if (!ALLOWED_REPORT_IMAGE_MIMES.includes(file.type)) {
      toast.error(`File ${file.name} bukan format gambar.`);
      return false;
    }
    if (file.size > MAX_REPORT_IMAGE_BYTES) {
      toast.error(`File ${file.name} melebihi batas maksimal 10 MB.`);
      return false;
    }
    return true;
  });
}
