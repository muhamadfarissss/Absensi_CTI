/**
 * @fileoverview Barrel export untuk semua modul API frontend.
 * Re-export semua fungsi API dan tipe dari modul domain masing-masing
 * sehingga import path yang ada (mis. "../lib/api") tetap berfungsi.
 */

// Shared utilities
export {
  API_BASE_URL,
  UPLOADS_BASE_URL,
  getToken,
  setToken,
  clearToken,
  getUploadUrl,
  ApiError,
  request,
  requestFormData,
} from "./shared";

// Re-export semua fungsi dan tipe dari api.ts (domain functions)
// File api.ts di lib/ level masih menjadi sumber utama
export * from "../api";
