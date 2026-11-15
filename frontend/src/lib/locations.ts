import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type MasterLocationType = "balai" | "seksi" | "room" | "resor";

export interface MasterLocation {
  id: string;
  parent_id?: string | null;
  location_type?: MasterLocationType;
  unit_kerja: string;
  drive_unit_id?: number | null;
  name: string;
  code?: string | null;
  description?: string | null;
  is_restricted?: boolean;
  is_active?: boolean;
  assets_count?: number;
  children_count?: number;
  active_employees_count?: number;
  parent?: {
    id: string;
    name: string;
    unit_kerja: string;
    location_type?: MasterLocationType;
    drive_unit_id?: number | null;
    code?: string | null;
  } | null;
  drive_unit?: {
    id: number;
    slug: string;
    name: string;
  } | null;
}

export async function fetchMasterLocations(activeOnly = false): Promise<MasterLocation[]> {
  const res = await api.get("/locations", {
    params: activeOnly ? { active_only: 1 } : undefined,
  });
  return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
}

export function useMasterLocations(activeOnly = true) {
  return useQuery<MasterLocation[]>({
    queryKey: ["master-locations", activeOnly ? "active" : "all"],
    queryFn: () => fetchMasterLocations(activeOnly),
    staleTime: 60_000,
  });
}

export function getLocationHierarchy(locations: MasterLocation[]) {
  const isParent = (loc: MasterLocation) =>
    loc.location_type === "balai" || loc.location_type === "seksi" || (!loc.parent_id && !loc.location_type);

  const parents = locations
    .filter(isParent)
    .sort((a, b) => {
      if (a.location_type === "balai" && b.location_type !== "balai") return -1;
      if (a.location_type !== "balai" && b.location_type === "balai") return 1;
      return a.name.localeCompare(b.name, "id");
    });

  const childrenByParentId = new Map<string, MasterLocation[]>();
  const orphans: MasterLocation[] = [];

  for (const loc of locations) {
    if (isParent(loc)) continue;
    if (loc.parent_id) {
      const list = childrenByParentId.get(loc.parent_id) ?? [];
      list.push(loc);
      childrenByParentId.set(loc.parent_id, list);
    } else {
      orphans.push(loc);
    }
  }

  for (const [, list] of childrenByParentId) {
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }

  return { parents, childrenByParentId, orphans };
}

export function resolveLocationPlacement(
  locations: MasterLocation[],
  locationId?: string | null,
  satuanKerja?: string | null,
  resor?: string | null
): { parentId: string; childId: string; selectedLocation: MasterLocation | null } {
  if (!locations.length) {
    return { parentId: "", childId: "", selectedLocation: null };
  }

  let matched: MasterLocation | undefined;
  if (locationId) {
    matched = locations.find((l) => l.id === locationId);
  }
  if (!matched && resor) {
    const r = resor.trim().toLowerCase();
    matched = locations.find(
      (l) => l.code?.toLowerCase() === r || l.name.toLowerCase() === r
    );
  }
  if (!matched && satuanKerja) {
    const sk = satuanKerja.trim().toLowerCase();
    matched =
      locations.find((l) => !l.parent_id && (l.name.toLowerCase() === sk || l.unit_kerja.toLowerCase() === sk)) ??
      locations.find((l) => l.name.toLowerCase() === sk);
    if (!matched) {
      if (/\b(wilayah|wil|skw)[\s_-]*(iii|3)\b/.test(sk) || sk.includes("balikpapan")) {
        matched = locations.find((l) => l.code === "skw-3-balikpapan");
      } else if (/\b(wilayah|wil|skw)[\s_-]*(ii|2)\b/.test(sk) || sk.includes("tenggarong")) {
        matched = locations.find((l) => l.code === "skw-2-tenggarong");
      } else if (/\b(wilayah|wil|skw)[\s_-]*(i|1)\b/.test(sk) || sk.includes("berau")) {
        matched = locations.find((l) => l.code === "skw-1-berau");
      } else if (sk.includes("balai")) {
        matched = locations.find((l) => l.code === "balai-samarinda");
      }
    }
  }

  if (!matched) {
    return { parentId: "", childId: "", selectedLocation: null };
  }

  if (matched.parent_id) {
    return { parentId: matched.parent_id, childId: matched.id, selectedLocation: matched };
  }

  return { parentId: matched.id, childId: "", selectedLocation: matched };
}

export function resolveAtasanFromSatuanKerja(
  satuanKerja?: string | null,
  resor?: string | null
): { kota: string; atasanTitle: string; atasanNama: string; atasanNip: string } {
  const combined = `${resor || ""} ${satuanKerja || ""}`.toLowerCase();

  if (
    /resor[_\s-]*0?(10|11|12|13|14)\b/.test(combined) ||
    /\b(wilayah|wil|skw)[\s_-]*(iii|3)\b/.test(combined) ||
    combined.includes("balikpapan")
  ) {
    return {
      kota: "Balikpapan",
      atasanTitle: "Kepala Seksi KSDA Wilayah III Balikpapan",
      atasanNama: "BAMBANG HARI TRIMARSITO, S.Si., M.P.",
      atasanNip: "19740626 200112 1 004",
    };
  }
  if (
    /resor[_\s-]*0?[5-9]\b/.test(combined) ||
    /\b(wilayah|wil|skw)[\s_-]*(ii|2)\b/.test(combined) ||
    combined.includes("tenggarong")
  ) {
    return {
      kota: "Tenggarong",
      atasanTitle: "Kepala Seksi KSDA Wilayah II Tenggarong",
      atasanNama: "SURIAWATI HALIM, S.Hut., M.P.",
      atasanNip: "19751127 200003 2 001",
    };
  }
  if (
    /resor[_\s-]*0?[1-4]\b/.test(combined) ||
    /\b(wilayah|wil|skw)[\s_-]*(i|1)\b/.test(combined) ||
    combined.includes("berau")
  ) {
    return {
      kota: "Tanjung Redeb",
      atasanTitle: "Kepala Seksi KSDA Wilayah I Berau",
      atasanNama: "YULIAN SADONO, S.Hut., M.T.",
      atasanNip: "19800707 200604 1 003",
    };
  }

  return {
    kota: "Samarinda",
    atasanTitle: "Kasubbag Tata Usaha",
    atasanNama: "DHENY MARDIONO, S.Hut., M.Sc.",
    atasanNip: "19750314 199903 1 004",
  };
}
