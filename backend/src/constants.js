/**
 * @fileoverview Konstanta aplikasi yang digunakan bersama di seluruh backend.
 * Semua nilai konfigurasi dan angka-angka yang sebelumnya hardcoded
 * didefinisikan di sini sebagai konstanta bernama.
 */

// Batas ukuran body JSON (MB) - untuk foto absen/profil yang dikirim sebagai base64
export const BODY_LIMIT_MB = 20;

// Radius default geofencing rumah sakit/kantor (meter)
export const DEFAULT_HOSPITAL_RADIUS_METERS = 200;

// Jumlah putaran bcrypt untuk hashing password
export const BCRYPT_SALT_ROUNDS = 10;

// Interval pengecekan cron job (10 menit dalam milidetik)
export const CRON_CHECK_INTERVAL_MS = 10 * 60 * 1000;

// Jam target pengecekan absen harian (23:50)
export const CRON_TARGET_HOUR = 23;
export const CRON_TARGET_MINUTE = 50;

// Masa berlaku token JWT untuk karyawan
export const JWT_EMPLOYEE_EXPIRES_IN = "7d";

// Masa berlaku token JWT untuk admin/HRD
export const JWT_ADMIN_EXPIRES_IN = "12h";

// Batas koneksi pool database MySQL
export const DB_POOL_LIMIT = 10;

// Waktu toleransi check-in sebelum jam masuk (menit)
export const CHECKIN_WINDOW_MINUTES = 10;
