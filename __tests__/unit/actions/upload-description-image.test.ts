import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  uploadToR2: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/storage/images", () => ({ uploadToR2: mocks.uploadToR2 }));
vi.mock("nanoid", () => ({ nanoid: () => "testid123" }));

import { uploadDescriptionImage } from "@/actions/admin/upload-description-image";

function makeFormData(file: File | null): FormData {
  const fd = new FormData();
  if (file) fd.append("file", file);
  return fd;
}

function imageFile(name: string, type = "image/jpeg", size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("uploadDescriptionImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.uploadToR2.mockResolvedValue(undefined);
  });

  it("returns success with key on valid image upload", async () => {
    const result = await uploadDescriptionImage(makeFormData(imageFile("photo.jpg")));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.key).toBe("description-images/testid123.jpg");
    }
    expect(mocks.uploadToR2).toHaveBeenCalledOnce();
  });

  it("returns error when no file provided", async () => {
    const result = await uploadDescriptionImage(makeFormData(null));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("returns error for non-image MIME type", async () => {
    const result = await uploadDescriptionImage(makeFormData(imageFile("doc.pdf", "application/pdf")));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("returns error when file exceeds 5 MB", async () => {
    const result = await uploadDescriptionImage(makeFormData(imageFile("big.jpg", "image/jpeg", 6 * 1024 * 1024)));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/5/);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("returns error for disallowed extension (svg)", async () => {
    const result = await uploadDescriptionImage(makeFormData(imageFile("evil.svg", "image/svg+xml")));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("returns error for disallowed extension (html)", async () => {
    const result = await uploadDescriptionImage(makeFormData(imageFile("evil.html", "image/png")));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("accepts webp extension", async () => {
    const result = await uploadDescriptionImage(makeFormData(imageFile("photo.webp", "image/webp")));
    expect(result.success).toBe(true);
    if (result.success) expect(result.key).toMatch(/\.webp$/);
  });

  it("returns error when uploadToR2 throws", async () => {
    mocks.uploadToR2.mockRejectedValue(new Error("R2 unavailable"));
    const result = await uploadDescriptionImage(makeFormData(imageFile("photo.jpg")));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });
});
