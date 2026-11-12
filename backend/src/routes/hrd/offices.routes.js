/**
 * @fileoverview Route HRD - Manajemen Lokasi Kantor
 *
 * Endpoints:
 *   GET    /offices          - Daftar semua kantor
 *   POST   /offices          - Tambah kantor baru
 *   PUT    /offices/:id      - Perbarui data kantor
 *   DELETE /offices/:id      - Hapus kantor
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";
import { DEFAULT_HOSPITAL_RADIUS_METERS } from "../../constants.js";

const router = Router();

// GET /offices - Daftar semua kantor
router.get("/offices", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, nama_rs as name, address, latitude, longitude, radius_meters FROM hospitals WHERE type = 'kantor' ORDER BY nama_rs ASC"
        );
        res.json({ offices: rows });
    } catch (err) {
        console.error("Error mengambil daftar kantor:", err);
        res.status(500).json({ message: "Gagal memuat daftar kantor." });
    }
});

// POST /offices - Tambah kantor baru
router.post("/offices", async (req, res) => {
    try {
        const { name, address, latitude, longitude } = req.body;
        const radius_meters = req.body.radius_meters || req.body.radiusMeters || DEFAULT_HOSPITAL_RADIUS_METERS;

        if (!name || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: "Data tidak lengkap." });
        }

        const id = randomUUID();
        await pool.query(
            "INSERT INTO hospitals (id, nama_rs, address, latitude, longitude, radius_meters, type) VALUES (?, ?, ?, ?, ?, ?, 'kantor')",
            [id, name, address, latitude, longitude, radius_meters]
        );

        res.status(201).json({
            message: "Kantor berhasil ditambahkan.",
            office: { id, name, address, latitude, longitude, radius_meters }
        });
    } catch (err) {
        console.error("Error menambahkan kantor:", err);
        res.status(500).json({ message: "Gagal menambahkan kantor." });
    }
});

// PUT /offices/:id - Perbarui data kantor
router.put("/offices/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, latitude, longitude } = req.body;
        const radius_meters = req.body.radius_meters || req.body.radiusMeters || DEFAULT_HOSPITAL_RADIUS_METERS;

        if (!name || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: "Data tidak lengkap." });
        }

        const [result] = await pool.query(
            "UPDATE hospitals SET nama_rs = ?, address = ?, latitude = ?, longitude = ?, radius_meters = ? WHERE id = ? AND type = 'kantor'",
            [name, address, latitude, longitude, radius_meters, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Kantor tidak ditemukan." });
        }
        res.status(200).json({
            message: "Kantor berhasil diperbarui.",
            office: { id, name, address, latitude, longitude, radius_meters }
        });
    } catch (err) {
        console.error("Error memperbarui kantor:", err);
        res.status(500).json({ message: "Gagal memperbarui kantor." });
    }
});

// DELETE /offices/:id - Hapus kantor
router.delete("/offices/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            "DELETE FROM hospitals WHERE id = ? AND type = 'kantor'",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Kantor tidak ditemukan." });
        }
        res.status(200).json({ message: "Kantor berhasil dihapus." });
    } catch (err) {
        console.error("Error menghapus kantor:", err);
        res.status(500).json({ message: "Gagal menghapus kantor." });
    }
});

export default router;
