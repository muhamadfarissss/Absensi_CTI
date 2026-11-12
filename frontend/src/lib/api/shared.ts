/**
 * @fileoverview Utilitas bersama untuk modul API frontend.
 * Menyediakan HTTP request helper, token management, error handling,
 * dan URL construction untuk file upload.
 */

/** Base URL untuk semua API calls ke backend */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

/** Base URL untuk file yang diupload ke backend */
export const UPLOADS_BASE_URL =
  import.meta.env.VITE_UPLOADS_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, "");

const TOKEN_KEY = "employee-pwa-token";

/**
 * Mengambil JWT token dari localStorage.
 * @returns Token string atau null jika belum login
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Menyimpan JWT token ke localStorage.
 * @param token - JWT token dari response login
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Menghapus JWT token dari localStorage (logout).
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Membangun URL lengkap untuk file yang diupload dengan menambahkan
 * UPLOADS_BASE_URL di depan relative path dari API response.
 * Mengembalikan null untuk input falsy.
 * Jika path sudah absolute (dimulai dengan "http"), dikembalikan apa adanya.
 *
 * @param relativePath - Relative path dari API response atau null/undefined
 * @returns URL lengkap atau null
 */
export function getUploadUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (relativePath.startsWith("http")) return relativePath;
  return `${UPLOADS_BASE_URL}${relativePath}`;
}

/**
 * Error kustom untuk membedakan pesan error dari server
 * (mis. akurasi GPS rendah, di luar radius kantor) dari error jaringan biasa.
 */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * HTTP request helper yang menangani autentikasi JWT dan error parsing.
 * Menyertakan Authorization header jika token tersedia.
 * Melempar ApiError untuk response HTTP yang tidak berhasil.
 *
 * @param path - API endpoint path (mis. "/auth/login")
 * @param options - RequestInit options untuk fetch
 * @returns Parsed JSON response
 * @throws {ApiError} Jika response HTTP tidak berhasil (status >= 400)
 */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message || "Terjadi kesalahan pada server.", res.status, data.code);
  }

  return data as T;
}

/**
 * HTTP request helper khusus untuk multipart/form-data upload.
 * Sama seperti `request` tetapi tidak menetapkan Content-Type header
 * sehingga browser dapat menetapkan boundary yang benar untuk FormData.
 *
 * @param path - API endpoint path
 * @param formData - FormData objek yang akan dikirim
 * @returns Parsed JSON response
 * @throws {ApiError} Jika response HTTP tidak berhasil
 */
export async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message || "Terjadi kesalahan pada server.", res.status, data.code);
  }

  return data as T;
}
