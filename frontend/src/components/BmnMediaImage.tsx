"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ImgHTMLAttributes } from "react";
import { authStore } from "@/lib/auth-store";
import { getApiSessionSnapshot } from "@/lib/api";
import { fetchBmnMedia, getBmnMediaUrl } from "@/lib/bmn-media";

/** Keep the original img and styling; fetch protected media through the authenticated API. */
export function BmnMediaImage({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const session = useSyncExternalStore(authStore.subscribe, getApiSessionSnapshot, () => "");
  const mediaUrl = typeof src === "string" ? getBmnMediaUrl(src) : null;
  const image = useRef<HTMLImageElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const lazy = props.loading === "lazy" && typeof IntersectionObserver !== "undefined";
  const [preview, setPreview] = useState<{ url: string; session: string; blob?: string; failed?: boolean } | null>(null);
  useEffect(() => {
    if (!mediaUrl || !lazy || nearViewport) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setNearViewport(true);
    }, { rootMargin: "150px" });
    if (image.current) observer.observe(image.current);
    return () => observer.disconnect();
  }, [mediaUrl, lazy, nearViewport]);
  useEffect(() => {
    if (!mediaUrl || (lazy && !nearViewport)) return;
    let current = true;
    let blob: string | null = null;
    const controller = new AbortController();
    void fetchBmnMedia(mediaUrl, controller.signal).then(data => {
      if (!current) return;
      if (!/^image\/(jpeg|png|webp|gif)$/i.test(data.type.split(";")[0].trim())) throw new Error("Format foto tidak didukung.");
      blob = URL.createObjectURL(data);
      setPreview({ url: mediaUrl, session, blob });
    }).catch(() => { if (current) setPreview({ url: mediaUrl, session, failed: true }); });
    return () => { current = false; controller.abort(); if (blob) URL.revokeObjectURL(blob); };
  }, [mediaUrl, session, lazy, nearViewport]);
  const active = preview?.url === mediaUrl && preview.session === session ? preview : null;
  useEffect(() => { if (active?.failed) image.current?.dispatchEvent(new Event("error")); }, [active?.failed]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={mediaUrl && !active ? "" : alt} aria-busy={Boolean(mediaUrl && !active)} ref={image} src={mediaUrl ? active?.blob : src} />;
}
