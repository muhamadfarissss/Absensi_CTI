/**
 * @fileoverview Route HRD - Manajemen Notifikasi/Informasi
 *
 * Endpoints:
 *   POST   /notifications  - Kirim informasi ke karyawan
 *   GET    /notifications  - Riwayat informasi yang dikirim
 *   DELETE /notifications  - Hapus informasi
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";

const router = Router();

// POST /notifications - Kirim informasi ke karyawan
router.post("/notifications", async (req, res) => {
    try {
        const { title, description, targetUserId } = req.body;
        if (!title || !description || !targetUserId) {
            return res.status(400).json({ message: "Judul, Deskripsi, dan Target wajib diisi." });
        }

        if (targetUserId === "ALL") {
            const [users] = await pool.query("SELECT id FROM users");
            if (users.length > 0) {
                const values = users.map((u) => [randomUUID(), u.id, title, description, "INFO", true]);
                const placeholders = values.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
                const flatValues = values.flat();
                await pool.query(
                    `INSERT INTO notifications (id, user_id, title, description, type, is_global) VALUES ${placeholders}`,
                    flatValues
                );
            }
        } else {
            await pool.query(
                "INSERT INTO notifications (id, user_id, title, description, type, is_global) VALUES (?, ?, ?, ?, ?, ?)",
                [randomUUID(), targetUserId, title, description, "INFO", false]
            );
        }

        res.json({ message: "Informasi berhasil dikirim." });
    } catch (err) {
        console.error("SQL Error pada POST /hrd/notifications:", err);
        res.status(500).json({ message: "Gagal mengirim informasi." });
    }
});

// GET /notifications - Riwayat informasi yang pernah dikirim
router.get("/notifications", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT title, description, type, is_global, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at, GROUP_CONCAT(user_id) as target_user_id
            FROM notifications 
            WHERE type = 'INFO'
            GROUP BY title, description, type, is_global, created_at
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("SQL Error pada GET /hrd/notifications:", err);
        res.status(500).json({ message: "Gagal mengambil data informasi." });
    }
});

// DELETE /notifications - Hapus informasi berdasarkan judul dan deskripsi
router.delete("/notifications", async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.status(400).json({ message: "Judul dan deskripsi wajib disertakan." });
        }
        await pool.query(
            "DELETE FROM notifications WHERE title = ? AND description = ? AND type = 'INFO'",
            [title, description]
        );
        res.json({ message: "Informasi berhasil dihapus dari sistem." });
    } catch (err) {
        console.error("SQL Error pada DELETE /hrd/notifications:", err);
        res.status(500).json({ message: "Gagal menghapus informasi." });
    }
});

export default router;
