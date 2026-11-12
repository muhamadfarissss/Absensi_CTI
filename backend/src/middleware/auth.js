/**
 * @fileoverview Middleware otentikasi dan otorisasi untuk route handler Express.
 * Menyediakan `requireAuth` untuk memvalidasi JWT token dan `requireAdmin` untuk
 * memastikan hanya pengguna dengan role ADMIN yang dapat mengakses endpoint HRD.
 */

import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { JWT_EMPLOYEE_EXPIRES_IN, JWT_ADMIN_EXPIRES_IN } from "../constants.js";

/**
 * Middleware yang memvalidasi JWT token dari header Authorization.
 * Jika token valid, menyimpan userId dan userRole di req dan memanggil next().
 * Jika token tidak ada atau tidak valid, mengembalikan response 401.
 *
 * @param {import('express').Request} req - Objek request Express
 * @param {import('express').Response} res - Objek response Express
 * @param {import('express').NextFunction} next - Fungsi next Express
 * @returns {void}
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan. Silakan login kembali." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token tidak valid atau sudah kedaluwarsa." });
  }
}

/**
 * Middleware yang memastikan pengguna yang sudah terautentikasi memiliki role ADMIN.
 * Harus digunakan setelah `requireAuth` (membutuhkan req.userId yang sudah diset).
 * Jika pengguna bukan ADMIN, mengembalikan response 403.
 * Jika pengguna ADMIN, memanggil next() untuk melanjutkan ke handler berikutnya.
 *
 * @param {import('express').Request} req - Objek request Express (membutuhkan req.userId)
 * @param {import('express').Response} res - Objek response Express
 * @param {import('express').NextFunction} next - Fungsi next Express
 * @returns {Promise<void>}
 */
export async function requireAdmin(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT role FROM users WHERE id = ?", [req.userId]);
    if (rows.length === 0 || rows[0].role !== "ADMIN") {
      return res.status(403).json({ message: "Akses ditolak. Hanya Admin/HRD yang diizinkan." });
    }
    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    res.status(500).json({ message: "Terjadi kesalahan pada server saat memverifikasi izin akses." });
  }
}
