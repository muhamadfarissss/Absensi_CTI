/**
 * @fileoverview Route HRD - Manajemen Posisi/Jabatan
 *
 * Endpoints:
 *   POST   /positions          - Tambah posisi baru
 *   PUT    /positions/:id      - Perbarui nama posisi
 *   DELETE /positions/:id      - Hapus posisi
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";

const router = Router();

// POST /positions - Tambah posisi baru
router.post("/positions", async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Nama posisi tidak boleh kosong. Silahkan isi nama posisi." });
        }

        const id = randomUUID();
        await pool.query("INSERT INTO master_positions (id, name) VALUES (?, ?)", [id, name]);
        res.status(201).json({ message: "Posisi berhasil ditambahkan." });
    } catch (err) {
        console.error("Error saat menambahkan posisi:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Nama posisi sudah ada." });
        }
        res.status(500).json({ message: "Gagal menambahkan posisi." });
    }
});

// PUT /positions/:id - Perbarui nama posisi
router.put("/positions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const [result] = await pool.query("UPDATE master_positions SET name = ? WHERE id = ?", [name, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Posisi tidak ditemukan." });
        }
        res.status(200).json({ message: "Posisi berhasil diperbarui." });
    } catch (err) {
        console.error("Error saat memperbarui posisi:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Nama posisi sudah ada." });
        }
        res.status(500).json({ message: "Gagal memperbarui posisi." });
    }
});

// DELETE /positions/:id - Hapus posisi
router.delete("/positions/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM master_positions WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Posisi tidak ditemukan." });
        }
        res.status(200).json({ message: "Posisi berhasil dihapus." });
    } catch (err) {
        console.error("Error saat menghapus posisi:", err);
        res.status(500).json({ message: "Gagal menghapus posisi." });
    }
});

export default router;
