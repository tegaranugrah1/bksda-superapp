import { ApiError } from '@/types/api';

/**
 * Normalizes HTTP/network/server errors into a standardized ApiError shape.
 * Protects users from raw server stack traces, SQL errors, or HTML error pages.
 */
export function normalizeError(error: any): ApiError {
  let status: number | undefined = undefined;
  let message = 'Terjadi kesalahan yang tidak diketahui';
  let kind: ApiError['kind'] = 'unknown';
  let fieldErrors: Record<string, string[]> | undefined = undefined;

  // 1. Check if error is an Axios-like or Fetch-like error object
  if (error && typeof error === 'object') {
    // Check if it's an Axios error structure
    const response = error.response;
    if (response && typeof response === 'object') {
      status = response.status;
      const data = response.data;

      // Extract user-friendly message and field errors
      if (data && typeof data === 'object') {
        // Laravel validation errors are returned in data.errors
        if (data.errors && typeof data.errors === 'object') {
          fieldErrors = data.errors;
        } else if (data.fieldErrors && typeof data.fieldErrors === 'object') {
          fieldErrors = data.fieldErrors;
        }

        if (data.message && typeof data.message === 'string' && !isRawServerOutput(data.message)) {
          message = data.message;
        } else {
          message = getDefaultMessageForStatus(status);
        }
      } else {
        message = getDefaultMessageForStatus(status);
      }
    } else if (error.request) {
      // Axios request was made but no response was received (network error)
      message = 'Koneksi internet terganggu. Silakan periksa koneksi Anda dan coba lagi.';
      kind = 'network';
      return { status, message, kind };
    } else if (error.status) {
      // Fetch-like response error
      status = error.status;
      message = error.message || getDefaultMessageForStatus(status);
    } else if (error.message) {
      // Generic JS error
      message = error.message;
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        kind = 'network';
        message = 'Koneksi internet terganggu. Silakan periksa koneksi Anda dan coba lagi.';
      }
    }
  }

  // 2. Classify error kind and format message based on status code
  if (status) {
    switch (status) {
      case 401:
        kind = 'auth';
        if (message === 'Terjadi kesalahan yang tidak diketahui') {
          message = 'Sesi Anda telah berakhir. Silakan login kembali.';
        }
        break;
      case 403:
        kind = 'forbidden';
        if (message === 'Terjadi kesalahan yang tidak diketahui') {
          message = 'Anda tidak memiliki hak akses untuk tindakan ini.';
        }
        break;
      case 404:
        kind = 'not_found';
        if (message === 'Terjadi kesalahan yang tidak diketahui') {
          message = 'Data tidak ditemukan.';
        }
        break;
      case 422:
        kind = 'validation';
        if (message === 'Terjadi kesalahan yang tidak diketahui') {
          message = 'Validasi data gagal. Periksa kembali input Anda.';
        }
        break;
      case 429:
        kind = 'rate_limit';
        message = 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.';
        break;
      default:
        if (status >= 500) {
          kind = 'server';
          message = 'Terjadi gangguan pada server. Silakan hubungi admin atau coba lagi nanti.';
        } else {
          kind = 'unknown';
        }
        break;
    }
  } else if (kind === 'unknown') {
    // If no status code but error details suggest network issues
    const errorMsg = String(error?.message || '').toLowerCase();
    if (
      errorMsg.includes('network') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('failed to fetch')
    ) {
      kind = 'network';
      message = 'Koneksi internet terganggu. Silakan periksa koneksi Anda dan coba lagi.';
    }
  }

  // Safeguard: Never display raw exception, SQL error, or HTML error pages
  if (isRawServerOutput(message)) {
    message = status ? getDefaultMessageForStatus(status) : 'Terjadi kesalahan internal pada sistem.';
  }

  return {
    status,
    message,
    kind,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

/**
 * Detects if a message looks like raw HTML, SQL error, or stack trace.
 */
function isRawServerOutput(msg: string): boolean {
  const lowercase = msg.toLowerCase();
  return (
    lowercase.includes('<!doctype html>') ||
    lowercase.includes('<html>') ||
    lowercase.includes('sqlstate') ||
    lowercase.includes('syntax error or access violation') ||
    lowercase.includes('stack trace') ||
    lowercase.includes('exception') ||
    lowercase.includes('fatal error') ||
    lowercase.includes('uncaught error')
  );
}

function getDefaultMessageForStatus(status: number | undefined): string {
  if (status === undefined) return 'Terjadi kesalahan pada sistem.';
  if (status === 401) return 'Sesi Anda telah berakhir. Silakan login kembali.';
  if (status === 403) return 'Anda tidak memiliki hak akses untuk tindakan ini.';
  if (status === 404) return 'Data tidak ditemukan.';
  if (status === 422) return 'Validasi data gagal. Periksa kembali input Anda.';
  if (status === 429) return 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.';
  if (status >= 500) return 'Terjadi gangguan pada server. Silakan hubungi admin atau coba lagi nanti.';
  return 'Terjadi kesalahan pada sistem.';
}
