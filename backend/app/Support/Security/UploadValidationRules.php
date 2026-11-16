<?php

namespace App\Support\Security;

final class UploadValidationRules
{
    /**
     * Validation rules for spreadsheet imports.
     *
     * Laravel's mimes rule validates detected MIME type. The extensions rule
     * adds a visible filename extension whitelist so disguised uploads fail
     * before being parsed by PhpSpreadsheet.
     */
    public static function spreadsheet(int $maxKilobytes = 20480): array
    {
        return [
            'required',
            'file',
            'mimes:xlsx,xls,csv',
            'extensions:xlsx,xls,csv',
            "max:{$maxKilobytes}",
        ];
    }

    public static function image(bool $required = true, int $maxKilobytes = 5120): array
    {
        return [
            $required ? 'required' : 'nullable',
            'image',
            'mimes:jpg,jpeg,png,webp',
            'extensions:jpg,jpeg,png,webp',
            "max:{$maxKilobytes}",
        ];
    }

    /**
     * Sanitasi nama berkas/folder agar tahan terhadap Zip-Slip, OS Reserved Devices,
     * Path Traversal, Null Bytes, dan Unicode Directional Overrides (CWE-22, CWE-73).
     */
    public static function sanitizeFilename(string $name, string $default = 'item'): string
    {
        $name = str_replace(["\0", "\u{202E}", "\u{202D}", "\u{202C}", "\u{200E}", "\u{200F}"], '', $name);
        $name = preg_replace('/(\.\.[\/\\\\])+/', '', $name);
        $name = preg_replace('/[\x00-\x1F\x7F\/\\\\:*?"<>|]/', '_', $name);
        $clean = trim($name, " .\t\n\r\0\x0B");

        if (preg_match('/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i', $clean)) {
            $clean = "safe_{$clean}";
        }

        return $clean !== '' ? $clean : $default;
    }
}
