"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Camera, Video, Loader2, X, Play } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface Photo {
  id: number;
  judul?: string;
  album?: string;
  file_path: string;
}

interface VideoItem {
  id: number;
  judul?: string;
  deskripsi?: string;
  youtube_url: string;
}

export default function GaleriPage() {
  const [tab, setTab] = useState<"foto" | "video">("foto");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox untuk Foto
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState("");

  // Embed untuk Video
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    if (tab === "foto") {
      axios
        .get(`${API}/cms/public/photos`)
        .then((r) => setPhotos(r.data?.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      axios
        .get(`${API}/cms/public/videos`)
        .then((r) => setVideos(r.data?.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
          <Camera className="w-9 h-9 text-green-600" /> Galeri
        </h1>
        <p className="text-gray-500 mt-2">
          Dokumentasi visual kegiatan dan kawasan konservasi BKSDA.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("foto")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === "foto"
              ? "bg-white text-green-700 shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Camera className="w-4 h-4" /> Foto
        </button>
        <button
          onClick={() => setTab("video")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === "video"
              ? "bg-white text-green-700 shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Video className="w-4 h-4" /> Video
        </button>
      </div>

      {/* Konten */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : tab === "foto" ? (
        /* ═══ GRID FOTO (Masonry) ═══ */
        photos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Belum ada foto.</div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => {
                  setLightboxSrc(
                    `${process.env.NEXT_PUBLIC_STORAGE_URL}/${photo.file_path}`,
                  );
                  setLightboxCaption(photo.judul || "");
                }}
                className="break-inside-avoid cursor-pointer group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
              >
                <img
                  src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${photo.file_path}`}
                  alt={photo.judul || "Foto BKSDA"}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {photo.judul && (
                  <div className="bg-white px-3 py-2">
                    <p className="text-xs font-bold text-gray-700 line-clamp-1">
                      {photo.judul}
                    </p>
                    {photo.album && (
                      <p className="text-[10px] text-gray-400">{photo.album}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : /* ═══ GRID VIDEO ═══ */
      videos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Belum ada video.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => {
            const ytId = extractYoutubeId(video.youtube_url);
            const isActive = activeVideoId === ytId;
            return (
              <div
                key={video.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
              >
                <div className="relative aspect-video bg-gray-900">
                  {isActive && ytId ? (
                    /* Player YouTube Aktif */
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                    />
                  ) : (
                    /* Thumbnail + Tombol Play */
                    <div
                      className="relative w-full h-full cursor-pointer group"
                      onClick={() => ytId && setActiveVideoId(ytId)}
                    >
                      <img
                        src={
                          ytId
                            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                            : ""
                        }
                        alt={video.judul}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-green-700 ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2">
                    {video.judul}
                  </h3>
                  {video.deskripsi && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {video.deskripsi}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ LIGHTBOX MODAL (Foto) ═══ */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl max-h-[85vh]"
          >
            <img
              src={lightboxSrc}
              alt={lightboxCaption}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            {lightboxCaption && (
              <p className="text-center text-white text-sm mt-3 font-medium">
                {lightboxCaption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
