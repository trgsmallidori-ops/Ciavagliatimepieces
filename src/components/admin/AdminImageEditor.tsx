"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/cropImage";

type AdminImageEditorProps = {
  open: boolean;
  onClose: () => void;
  imageSource: string | null; // object URL or data URL from selected file
  onSave: (url: string) => void;
  onUpload: (formData: FormData) => Promise<{ url: string }>;
  aspect?: number; // e.g. 16/9 for hero; undefined = free crop
  label?: string;
  locale?: string;
  /** Optional background image (e.g. watch preview) so user can position crop over it */
  backgroundImageUrl?: string | null;
  /** Min zoom (default 0.3 so admin can zoom out to fit layer over watch) */
  minZoom?: number;
  /** Max zoom (default 3) */
  maxZoom?: number;
};

const DEFAULT_MIN_ZOOM = 0.3;
const DEFAULT_MAX_ZOOM = 3;
const INITIAL_ZOOM = 1.3;

export default function AdminImageEditor({
  open,
  onClose,
  imageSource,
  onSave,
  onUpload,
  aspect = undefined,
  label,
  locale = "en",
  backgroundImageUrl = null,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
}: AdminImageEditorProps) {
  const isFr = locale === "fr";
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(INITIAL_ZOOM);
    setCroppedAreaPixels(null);
  }, [open, imageSource]);

  const handleSave = useCallback(async () => {
    if (!imageSource || !croppedAreaPixels) return;
    setError(null);
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSource, croppedAreaPixels);
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("image", file);
      const { url } = await onUpload(formData);
      onSave(url);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop/upload failed");
    } finally {
      setSaving(false);
    }
  }, [imageSource, croppedAreaPixels, onUpload, onSave, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/20 bg-[var(--background)] shadow-xl">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-medium text-foreground">
            {label ?? (isFr ? "Recadrer et centrer l'image" : "Crop, centre & adjust image")}
          </h2>
          <p className="mt-0.5 text-sm text-foreground/60">
            {isFr ? "Ajustez le zoom et la position, puis enregistrez." : "Adjust zoom and position, then save."}
          </p>
        </div>
        <div className="relative h-[50vh] min-h-[280px] shrink-0 overflow-hidden rounded-b-2xl bg-foreground/10">
          {backgroundImageUrl && (
            <div
              className="absolute inset-0 z-0 flex items-center justify-center bg-[var(--background)]"
              aria-hidden
            >
              <img
                src={backgroundImageUrl}
                alt=""
                className="max-h-full max-w-full object-contain opacity-40"
                style={{ maxHeight: "100%", maxWidth: "100%" }}
              />
            </div>
          )}
          <div className={backgroundImageUrl ? "relative z-10 h-full w-full" : "absolute inset-0"}>
            {imageSource && (
              <Cropper
                image={imageSource}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
                style={{ containerStyle: { borderRadius: "0 0 1rem 1rem" } }}
              />
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 px-4 pb-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-foreground/60">
              {isFr ? "Zoom" : "Zoom"}
            </label>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-foreground"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-foreground/20 px-4 py-2 text-sm uppercase tracking-wide text-foreground hover:bg-foreground/5"
            >
              {isFr ? "Annuler" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !croppedAreaPixels}
              className="rounded-full bg-foreground px-4 py-2 text-sm uppercase tracking-wide text-white hover:bg-foreground/90 disabled:opacity-50"
            >
              {saving ? (isFr ? "Enregistrement…" : "Saving…") : isFr ? "Enregistrer" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
