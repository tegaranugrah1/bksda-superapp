<?php

namespace App\Support\Security;

/**
 * Pure PHP RFC 6238 TOTP & RFC 4226 HOTP Engine.
 * Sesuai prinsip ponytail: standard library native implementation tanpa bloat dependency.
 * Kompatibel 100% dengan Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden, dan Apple Keychain.
 */
class Totp
{
    /**
     * Generate random Base32 secret (16-32 bytes).
     */
    public static function generateSecret(int $length = 16): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bytes = random_bytes($length);
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= $alphabet[ord($bytes[$i]) % 32];
        }
        return $secret;
    }

    /**
     * Generate otpauth:// URI untuk rendering QR code di browser/frontend.
     */
    public static function getQrUri(string $company, string $holder, string $secret): string
    {
        $label = rawurlencode($company) . ':' . rawurlencode($holder);
        $issuer = rawurlencode($company);
        return "otpauth://totp/{$label}?secret={$secret}&issuer={$issuer}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Verifikasi kode 6-digit TOTP dengan window toleransi drift waktu (default ±1 window = 30s).
     */
    public static function verify(string $secret, string $code, int $window = 1): bool
    {
        $cleanCode = trim(str_replace(' ', '', $code));
        if (strlen($cleanCode) !== 6 || ! ctype_digit($cleanCode)) {
            return false;
        }

        $timeSlice = (int) floor(time() / 30);
        for ($i = -$window; $i <= $window; $i++) {
            $calculated = self::calculateCode($secret, $timeSlice + $i);
            if (hash_equals($calculated, $cleanCode)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Hitung kode 6-digit untuk timeslice tertentu.
     */
    public static function calculateCode(string $secret, int $timeSlice): string
    {
        $secretKey = self::base32Decode($secret);
        $time = pack('N*', 0) . pack('N*', $timeSlice);
        $hm = hash_hmac('sha1', $time, $secretKey, true);
        $offset = ord(substr($hm, -1)) & 0x0F;
        $hashpart = substr($hm, $offset, 4);
        $value = unpack('N', $hashpart);
        $value = $value[1] & 0x7FFFFFFF;
        $modulo = 1000000;
        return str_pad((string) ($value % $modulo), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Decode string Base32 menjadi biner.
     */
    private static function base32Decode(string $b32): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $b32 = strtoupper(rtrim($b32, '='));
        $binaryString = '';
        $len = strlen($b32);
        for ($i = 0; $i < $len; $i++) {
            $char = $b32[$i];
            $pos = strpos($alphabet, $char);
            if ($pos === false) {
                continue;
            }
            $binaryString .= sprintf('%05b', $pos);
        }
        $bytes = '';
        $binLen = strlen($binaryString);
        for ($i = 0; $i + 8 <= $binLen; $i += 8) {
            $bytes .= chr(bindec(substr($binaryString, $i, 8)));
        }
        return $bytes;
    }
}
