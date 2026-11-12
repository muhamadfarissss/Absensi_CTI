/**
 * @fileoverview Route HRD - Registrasi Admin
 *
 * Endpoints:
 *   POST /admins/register - Mendaftarkan akun admin/HRD baru
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS } from "../../constants.js";

const router = Router();

// POST /admins/register - Daftarkan akun admin baru
router.post("/admins/register", async (req, res) => {
    try {
        const { name, email, nik, password } = req.body;

        if (!name || !email || !nik || !password) {
            return res.status(400).json({
                message: "Data tidak lengkap, Silahkan isi Informasi dengan Lengkap."
            });
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const password_hash = await bcrypt.hash(password, salt);
        const userId = randomUUID();

        await pool.query(
            `INSERT INTO users (id, employee_id, nik, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, 'ADMIN')`,
            [userId, nik, nik, email, name, password_hash]
        );

        res.status(201).json({ message: "Akun Admin Berhasil Terdaftar." });
    } catch (err) {
        console.error("Error saat mendaftarkan Admin:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email atau NIK/Employee ID sudah digunakan." });
        }
        res.status(500).json({ message: "Gagal membuat akun admin." });
    }
});

export default router;
