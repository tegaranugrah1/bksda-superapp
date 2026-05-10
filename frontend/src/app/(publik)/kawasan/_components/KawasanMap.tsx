"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// ══════════════════════════════════════════════════
// KONFIGURASI WARNA MARKER PER TIPE KAWASAN
// ══════════════════════════════════════════════════

const MARKER_COLORS: Record<string, string> = {
  "Cagar Alam": "#16a34a", // Hijau
  "Suaka Margasatwa": "#2563eb", // Biru
  "Taman Wisata Alam": "#ea580c", // Oranye
  "Taman Buru": "#9333ea", // Ungu
  default: "#059669", // Hijau Gelap
};

/** Membuat ikon lingkaran berwarna kustom */
function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    html: `<div style="
            width: 28px; height: 28px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        "></div>`,
  });
}

// ══════════════════════════════════════════════════
// KONFIGURASI PETA DASAR (TILE LAYERS)
// ══════════════════════════════════════════════════

const TILE_LAYERS = {
  street: {
    name: "Peta Jalan",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
  },
  satellite: {
    name: "Satelit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: '&copy; <a href="https://www.esri.com">Esri</a>',
  },
  terrain: {
    name: "Topografi",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

// ══════════════════════════════════════════════════
// PROPS INTERFACE
// ══════════════════════════════════════════════════

interface MarkerData {
  lat: number;
  lng: number;
  nama: string;
  slug: string;
  tipe_kawasan?: string;
  luas_ha?: number;
  thumbnail_path?: string;
}

interface KawasanMapProps {
  /** Satu titik untuk halaman detail */
  center?: { lat: number; lng: number; nama: string };
  /** Banyak titik untuk halaman daftar */
  markers?: MarkerData[];
  /** Tinggi peta */
  height?: string;
}

// ══════════════════════════════════════════════════
// TYPE EXTENSIONS
// ══════════════════════════════════════════════════
// Note: Using L.MarkerClusterGroup from @types/leaflet

// ══════════════════════════════════════════════════
// KOMPONEN UTAMA
// ══════════════════════════════════════════════════

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

export default function KawasanMap({
  center,
  markers = [],
  height = "500px",
}: KawasanMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Hitung pusat peta
    const mapCenter: [number, number] = center
      ? [center.lat, center.lng]
      : markers.length > 0
        ? [
            markers.reduce((s, m) => s + m.lat, 0) / markers.length,
            markers.reduce((s, m) => s + m.lng, 0) / markers.length,
          ]
        : [-2.5, 118.0];

    const zoom = center ? 12 : 6;

    // Inisialisasi Peta
    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // ── Layer Peta Dasar + Kontrol Switcher ──
    const streetLayer = L.tileLayer(TILE_LAYERS.street.url, {
      attribution: TILE_LAYERS.street.attr,
    });
    const satelliteLayer = L.tileLayer(TILE_LAYERS.satellite.url, {
      attribution: TILE_LAYERS.satellite.attr,
    });
    const terrainLayer = L.tileLayer(TILE_LAYERS.terrain.url, {
      attribution: TILE_LAYERS.terrain.attr,
    });

    streetLayer.addTo(map); // Default

    L.control
      .layers({
        [TILE_LAYERS.street.name]: streetLayer,
        [TILE_LAYERS.satellite.name]: satelliteLayer,
        [TILE_LAYERS.terrain.name]: terrainLayer,
      })
      .addTo(map);

    // ── Mode Detail: 1 Marker ──
    if (center) {
      const icon = createColoredIcon(MARKER_COLORS.default);
      L.marker([center.lat, center.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${center.nama}</strong>`)
        .openPopup();
    }

    // ── Mode Daftar: Cluster Banyak Marker ──
    if (markers.length > 0) {
      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
      });

      markers.forEach((m) => {
        const color =
          MARKER_COLORS[m.tipe_kawasan || ""] || MARKER_COLORS.default;
        const icon = createColoredIcon(color);

        const popupHtml = `
                    <div style="width: 220px; font-family: system-ui, sans-serif;">
                        ${
                          m.thumbnail_path
                            ? `<img src="${STORAGE}/${m.thumbnail_path}" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />`
                            : ""
                        }
                        <p style="font-size:10px; color:#16a34a; font-weight:800; text-transform:uppercase; margin:0;">
                            ${m.tipe_kawasan || "Kawasan Konservasi"}
                        </p>
                        <p style="font-size:14px; font-weight:900; color:#111; margin:4px 0;">
                            ${m.nama}
                        </p>
                        ${m.luas_ha ? `<p style="font-size:11px; color:#888; margin:0;">📐 ${Number(m.luas_ha).toLocaleString()} Hektar</p>` : ""}
                        <a href="/kawasan/${m.slug}"
                           style="display:block; text-align:center; background:#16a34a; color:white; padding:6px; border-radius:8px; font-size:12px; font-weight:700; margin-top:8px; text-decoration:none;">
                            Lihat Detail →
                        </a>
                    </div>
                `;

        const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(popupHtml);
        clusterGroup.addLayer(marker);
      });

      map.addLayer(clusterGroup);
    }

    // ── Tombol Fullscreen Kustom ──
    const FullscreenControl = L.Control.extend({
      options: { position: "topleft" as L.ControlPosition },
      onAdd: () => {
        const btn = L.DomUtil.create("button", "");
        btn.innerHTML = "⛶";
        btn.title = "Layar Penuh";
        btn.style.cssText =
          "width:34px; height:34px; background:white; border:2px solid rgba(0,0,0,0.2); border-radius:4px; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;";
        btn.onclick = (e) => {
          e.stopPropagation();
          const el = mapRef.current;
          if (!el) return;
          if (!document.fullscreenElement) {
            el.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        };
        return btn;
      },
    });
    new FullscreenControl().addTo(map);

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [center, markers]);

  return (
    <div>
      <div
        ref={mapRef}
        style={{ height }}
        className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg"
      />

      {/* Legenda Warna */}
      {markers.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(MARKER_COLORS)
            .filter(([k]) => k !== "default")
            .map(([tipe, color]) => (
              <div
                key={tipe}
                className="flex items-center gap-1.5 text-xs text-gray-500"
              >
                <span
                  style={{ background: color }}
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                />
                {tipe}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
