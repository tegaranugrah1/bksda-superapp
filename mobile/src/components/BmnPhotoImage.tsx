import React from "react";
import { Image, Platform, type ImageProps, type ImageURISource } from "react-native";
import { useOptionalAuth } from "@/features/auth/AuthProvider";
import { apiClient } from "@/lib/api/client";
import { resolveBmnMediaUrl } from "@/lib/files/bmnMedia";

/** Photo credentials belong in headers, never in URLs or image DOM attributes. */
export function BmnPhotoImage({ source, onError, ...props }: Omit<ImageProps, "source"> & { source: ImageURISource }) {
  const token = useOptionalAuth()?.token ?? null;
  const photoUri = resolveBmnMediaUrl(source.uri);

  const [preview, setPreview] = React.useState<{ uri: string; photoUri: string; token: string | null } | null>(null);
  const errorHandler = React.useRef(onError);
  React.useEffect(() => { errorHandler.current = onError; }, [onError]);
  React.useEffect(() => {
    if (Platform.OS !== "web" || !photoUri) return;
    let current = true;
    let blobUri: string | null = null;
    void apiClient.get<Blob>(photoUri, { responseType: "blob" }).then(response => {
      if (!current) return;
      if (!/^image\/(jpeg|png|webp|gif)$/i.test(response.data.type.split(";")[0].trim())) throw new Error("Format foto tidak didukung.");
      blobUri = URL.createObjectURL(response.data);
      setPreview({ uri: blobUri, photoUri, token });
    }).catch(() => {
      if (current) errorHandler.current?.({ nativeEvent: { error: "Foto belum dapat dimuat." } } as Parameters<NonNullable<ImageProps["onError"]>>[0]);
    });
    return () => { current = false; if (blobUri) URL.revokeObjectURL(blobUri); };
  }, [photoUri, token]);

  const imageSource = !photoUri ? source : Platform.OS === "web"
    ? preview?.photoUri === photoUri && preview.token === token ? { uri: preview.uri } : undefined
    : { ...source, uri: photoUri, headers: { ...source.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
  return <Image {...props} source={imageSource} onError={onError} />;
}
