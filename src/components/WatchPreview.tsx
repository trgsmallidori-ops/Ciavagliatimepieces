"use client";

import { LayerImage } from "@/components/LayerImage";
import { useMemo, useRef, useState } from "react";

type OptionWithLayers = {
  id: string;
  step_id: string;
  parent_option_id: string | null;
  image_url: string | null;
  preview_image_url: string | null;
  layer_image_url: string | null;
  layer_z_index: number;
};

type LayerOffset = { x: number; y: number };

const DEFAULT_Z_INDEX: Record<string, number> = {
  function: 1,
  size: 6,
  case: 11,
  dial: 21,
  hands: 31,
  strap: 41,
  extra: 51,
};

type WatchPreviewProps = {
  selections: Partial<Record<string, string>>;
  options: OptionWithLayers[];
  stepsForFunction: string[];
  functionId: string;
  stepIdsForFunction: string[];
  functionStepId: string | undefined;
  isExtraStepForGmtOrSub: boolean;
  extraStepImage: string | null;
  locale: string;
  /** Optional: when provided, layers become draggable in the admin preview and offsets are reported upward. */
  layerOffsets?: Record<string, LayerOffset>;
  onLayerOffsetChange?: (key: string, offset: LayerOffset) => void;
  /** Optional: per-layer scale (1 = 100%). Only used when editing in admin. */
  layerScales?: Record<string, number>;
  onLayerScaleChange?: (key: string, scale: number) => void;
};

export function WatchPreview({
  selections,
  options,
  stepsForFunction,
  functionId,
  stepIdsForFunction,
  functionStepId,
  isExtraStepForGmtOrSub,
  extraStepImage,
  locale,
  layerOffsets,
  onLayerOffsetChange,
  layerScales,
  onLayerScaleChange,
}: WatchPreviewProps) {
  const isFr = locale === "fr";

  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const dragStateRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const layers = useMemo(() => {
    const layerArray: { url: string; zIndex: number; key: string; stepKey: string; optionId: string | null }[] = [];

    stepsForFunction.forEach((stepKey, idx) => {
      const selectedId = selections[stepKey];
      if (!selectedId) return;

      const stepId = stepKey === "function" ? functionStepId : stepIdsForFunction[idx - 1];
      if (!stepId) return;

      const opts = options.filter(
        (o) =>
          o.step_id === stepId &&
          (o.parent_option_id === null || o.parent_option_id === functionId)
      );
      const opt = opts.find((o) => o.id === selectedId) as OptionWithLayers | undefined;
      if (!opt) return;

      let layerUrl = opt.layer_image_url || opt.image_url || opt.preview_image_url;
      if (!layerUrl && stepKey === "extra" && isExtraStepForGmtOrSub && extraStepImage) {
        layerUrl = extraStepImage;
      }
      if (!layerUrl) return;

      const defaultZ = DEFAULT_Z_INDEX[stepKey] ?? 0;
      const zIndex = (opt.layer_z_index ?? 0) > 0 ? opt.layer_z_index : defaultZ;

      layerArray.push({
        url: layerUrl,
        zIndex,
        key: `${stepKey}-${selectedId}`,
        stepKey,
        optionId: selectedId,
      });
    });

    if (isExtraStepForGmtOrSub && extraStepImage && layerArray.length > 0) {
      layerArray.push({
        url: extraStepImage,
        zIndex: 56,
        key: "extra-gmt-sub",
        stepKey: "extra",
        optionId: selections.extra ?? null,
      });
    }

    return layerArray.sort((a, b) => a.zIndex - b.zIndex);
  }, [
    selections,
    options,
    stepsForFunction,
    functionId,
    stepIdsForFunction,
    functionStepId,
    isExtraStepForGmtOrSub,
    extraStepImage,
  ]);

  if (layers.length === 0) {
    return (
      <span className="text-sm font-medium uppercase tracking-widest text-foreground/40">
        {isFr ? "Aperçu" : "Preview"}
      </span>
    );
  }

  return (
    <>
      {/* White base so transparent areas in PNG layers don’t show a dark layer underneath */}
      <div
        className="absolute inset-0 bg-white"
        style={{ zIndex: 0 }}
        aria-hidden
      />
      {layers.map((layer) => {
        const stepKeyKey = `${functionId}:${layer.stepKey}`;
        const optionKey = layer.optionId ? `${functionId}:${layer.stepKey}:${layer.optionId}` : stepKeyKey;
        const groupKey = optionKey;
        // Prefer option-specific transforms; fall back to legacy per-step transforms.
        const offset = layerOffsets?.[optionKey] ?? layerOffsets?.[stepKeyKey] ?? { x: 0, y: 0 };
        const scale = layerScales?.[optionKey] ?? layerScales?.[stepKeyKey] ?? 1;

        const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
          if (!onLayerOffsetChange && !onLayerScaleChange) return;
          e.preventDefault();
          e.stopPropagation();
          setActiveGroupKey(groupKey);
          if (onLayerOffsetChange) {
            dragStateRef.current = {
              key: groupKey,
              startX: e.clientX,
              startY: e.clientY,
              originX: offset.x,
              originY: offset.y,
            };
            setDraggingKey(layer.key);
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
              // ignore if pointer capture is not supported
            }
          }
        };

        const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
          if (!onLayerOffsetChange || !dragStateRef.current) return;
          if (dragStateRef.current.key !== groupKey) return;
          e.preventDefault();
          const { startX, startY, originX, originY, key } = dragStateRef.current;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          onLayerOffsetChange(key, { x: originX + dx, y: originY + dy });
        };

        const handlePointerEnd: React.PointerEventHandler<HTMLDivElement> = (e) => {
          if (!dragStateRef.current) return;
          if (dragStateRef.current.key !== groupKey) return;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          dragStateRef.current = null;
          setDraggingKey((k) => (k === groupKey ? null : k));
        };

        return (
          <div
            key={layer.key}
            className="absolute inset-0 touch-none"
            style={{
              zIndex: layer.zIndex,
              transform:
                offset.x || offset.y || scale !== 1
                  ? `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
                  : undefined,
              transformOrigin: "center center",
              cursor:
                onLayerOffsetChange || onLayerScaleChange
                  ? draggingKey === groupKey
                    ? "grabbing"
                    : "grab"
                  : "default",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <LayerImage
              src={layer.url}
              alt=""
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ position: "absolute" }}
              zIndex={0}
              removeSolidBackground="auto"
            />
          </div>
        );
      })}
      {onLayerScaleChange && activeGroupKey && (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 z-[999] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          <span>{isFr ? "Taille" : "Size"}</span>
          <input
            type="range"
            min={50}
            max={150}
            step={1}
            value={Math.round((layerScales?.[activeGroupKey] ?? 1) * 100)}
            onChange={(e) => {
              const scale = Number(e.target.value) / 100;
              onLayerScaleChange(activeGroupKey, scale);
            }}
          />
          <span className="w-10 text-right">
            {Math.round((layerScales?.[activeGroupKey] ?? 1) * 100)}%
          </span>
        </div>
      )}
    </>
  );
}
