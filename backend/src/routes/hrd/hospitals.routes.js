/**
 * @fileoverview Route HRD - Manajemen Rumah Sakit/Lokasi
 *
 * Endpoints:
 *   GET    /hospitals          - Daftar semua rumah sakit
 *   POST   /hospitals          - Tambah rumah sakit baru
 *   PUT    /hospitals/:id      - Perbarui data rumah sakit
 *   DELETE /hospitals/:id      - Hapus rumah sakit
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";
import { DEFAULT_HOSPITAL_RADIUS_METERS } from "../../constants.js";

const router = Router();

// GET /hospitals - Daftar semua rumah sakit
router.get("/hospitals", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, nama_rs, nama_rs as name, address, latitude, longitude, radius_meters FROM hospitals WHERE type = 'rumah_sakit' ORDER BY nama_rs ASC"
        );
        res.json({ hospitals: rows });
    } catch (err) {
        console.error("Error saat mengambil data rumah sakit:", err);
        res.status(500).json({ message: "Gagal memuat daftar rumah sakit." });
    }
});

// POST /hospitals - Tambah rumah sakit baru
router.post("/hospitals", async (req, res) => {
    try {
        const nama_rs = req.body.nama_rs || req.body.name;
        const { address, latitude, longitude } = req.body;
        const radius_meters = req.body.radius_meters || req.body.radiusMeters || DEFAULT_HOSPITAL_RADIUS_METERS;

        if (!nama_rs || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: "Data tidak lengkap, Silahkan isi semua field." });
        }

        const id = randomUUID();
        await pool.query(
            "INSERT INTO hospitals (id, nama_rs, address, latitude, longitude, radius_meters, type) VALUES (?, ?, ?, ?, ?, ?, 'rumah_sakit')",
            [id, nama_rs, address, latitude, longitude, radius_meters]
        );
        res.status(201).json({
            message: "Rumah sakit berhasil ditambahkan.",
            hospital: { id, nama_rs, name: nama_rs, address, latitude, longitude, radius_meters }
        });
    } catch (err) {
        console.error("Error saat menambahkan rumah sakit:", err);
        res.status(500).json({ message: "Gagal menambahkan rumah sakit." });
    }
});

// PUT /hospitals/:id - Perbarui data rumah sakit
router.put("/hospitals/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const nama_rs = req.body.nama_rs || req.body.name;
        const { address, latitude, longitude } = req.body;
        const radius_meters = req.body.radius_meters || req.body.radiusMeters || DEFAULT_HOSPITAL_RADIUS_METERS;

        if (!nama_rs || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: "Data tidak lengkap, Silahkan isi semua field." });
        }

        const [result] = await pool.query(
            "UPDATE hospitals SET nama_rs = ?, address = ?, latitude = ?, longitude = ?, radius_meters = ? WHERE id = ? AND type = 'rumah_sakit'",
            [nama_rs, address, latitude, longitude, radius_meters, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Rumah sakit tidak ditemukan." });
        }
        res.status(200).json({
            message: "Rumah sakit berhasil diperbarui.",
            hospital: { id, nama_rs, name: nama_rs, address, latitude, longitude, radius_meters }
        });
    } catch (err) {
        console.error("Error saat memperbarui rumah sakit:", err);
        res.status(500).json({ message: "Gagal memperbarui rumah sakit." });
    }
});

// DELETE /hospitals/:id - Hapus rumah sakit
router.delete("/hospitals/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            "DELETE FROM hospitals WHERE id = ? AND type = 'rumah_sakit'",
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Rumah sakit tidak ditemukan." });
        }
        res.status(200).json({ message: "Rumah sakit berhasil dihapus." });
    } catch (err) {
        console.error("Error saat menghapus rumah sakit:", err);
        res.status(500).json({ message: "Gagal menghapus rumah sakit." });
    }
});

export default router;
