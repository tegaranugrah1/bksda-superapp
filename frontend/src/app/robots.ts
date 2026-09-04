import type { MetadataRoute } from "next";

/**
 * Agar mesin pencari (seperti Google) dapat membaca instruksi `noindex`,
 * bot harus diizinkan mengakses halaman untuk melihat tag `noindex`.
 * Jika di-disallow di robots.txt, Googlebot tidak bisa membaca `noindex`
 * dan URL masih berisiko muncul di hasil pencarian.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
