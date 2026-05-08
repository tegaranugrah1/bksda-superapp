"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix ikon Leaflet yang pecah di Webpack/Next.js
const customIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

interface KawasanMapProps {
    /** Satu titik untuk halaman detail */
    center?: { lat: number; lng: number; nama: string };
    /** Banyak titik untuk halaman daftar */
    markers?: { lat: number; lng: number; nama: string; slug: string }[];
    /** Tinggi peta dalam pixel */
    height?: string;
}

export default function KawasanMap({ center, markers = [], height = "400px" }: KawasanMapProps) {
    // Tentukan pusat peta: dari props center, atau rata-rata semua marker, atau Indonesia
    const mapCenter: [number, number] = center
        ? [center.lat, center.lng]
        : markers.length > 0
            ? [
                markers.reduce((s, m) => s + m.lat, 0) / markers.length,
                markers.reduce((s, m) => s + m.lng, 0) / markers.length,
              ]
            : [-2.5, 118.0]; // Pusat Indonesia

    const zoom = center ? 12 : 6;

    return (
        <div style={{ height }} className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
            <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Mode Detail: 1 Marker */}
                {center && (
                    <Marker position={[center.lat, center.lng]} icon={customIcon}>
                        <Popup><strong>{center.nama}</strong></Popup>
                    </Marker>
                )}
                {/* Mode Daftar: Banyak Marker */}
                {markers.map(m => (
                    <Marker key={m.slug} position={[m.lat, m.lng]} icon={customIcon}>
                        <Popup>
                            <a href={`/kawasan/${m.slug}`} className="font-bold text-green-700 hover:underline">
                                {m.nama}
                            </a>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
