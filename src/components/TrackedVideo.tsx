import React, { useEffect, useRef, useState } from "react";
import { rectAtTime, type MediaEdit } from "@/lib/playerMedia";

interface Props {
  src: string;
  edit?: MediaEdit | null;
  /** When true, applies the crop/track as a zoom. Defaults to true if any keyframes exist. */
  applyCrop?: boolean;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
}

/**
 * Plays a video with optional trim (clamps currentTime to in/out) and a crop
 * window that follows interpolated keyframes. The crop is implemented as a CSS
 * transform on the video element so playback stays smooth and free.
 */
export function TrackedVideo({
  src,
  edit,
  applyCrop,
  className = "",
  controls = true,
  autoPlay = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("none");

  const trim = edit?.trim ?? null;
  const track = edit?.track ?? [];
  const cropOn = (applyCrop ?? track.length > 0) && track.length > 0;

  // Clamp currentTime to trim window
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !trim) return;
    const onLoaded = () => {
      if (v.currentTime < trim.in) v.currentTime = trim.in;
    };
    const onTimeUpdate = () => {
      if (v.currentTime < trim.in) v.currentTime = trim.in;
      if (v.currentTime > trim.out) {
        v.pause();
        v.currentTime = trim.in;
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [trim?.in, trim?.out]);

  // Animate crop transform via rAF
  useEffect(() => {
    if (!cropOn) {
      setTransform("none");
      return;
    }
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c) return;
    let raf = 0;
    const tick = () => {
      const rect = rectAtTime(track, v.currentTime);
      if (rect) {
        // Clamp width/height
        const w = Math.max(0.05, Math.min(1, rect.w));
        const h = Math.max(0.05, Math.min(1, rect.h));
        const cx = Math.max(0, Math.min(1, rect.cx));
        const cy = Math.max(0, Math.min(1, rect.cy));
        // Scale = container/crop. Use min of width/height ratios so the rect fits.
        const scale = Math.min(1 / w, 1 / h);
        // Translate so that (cx,cy) sits at container center.
        // After scale, the video extends from -50% to +50% of (originalSize*scale).
        // We want point (cx,cy) of the source to land at (0.5, 0.5) of the container.
        // CSS transform-origin is center; translate in % of element's own size.
        const tx = (0.5 - cx) * 100;
        const ty = (0.5 - cy) * 100;
        setTransform(`translate(${tx}%, ${ty}%) scale(${scale})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cropOn, JSON.stringify(track)]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls={controls}
        autoPlay={autoPlay}
        className="w-full h-full object-contain origin-center"
        style={{ transform, transition: cropOn ? "transform 80ms linear" : "none" }}
      />
    </div>
  );
}
