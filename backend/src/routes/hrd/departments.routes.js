/**
 * @fileoverview Route HRD - Manajemen Divisi/Departemen
 *
 * Endpoints:
 *   POST   /departments        - Tambah divisi baru
 *   PUT    /departments/:id    - Perbarui nama divisi
 *   DELETE /departments/:id    - Hapus divisi
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";

const router = Router();

// POST /departments - Tambah divisi baru
router.post("/departments", async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Nama divisi tidak boleh kosong. Silahkan isi nama divisi." });
        }

        const id = randomUUID();
        await pool.query("INSERT INTO master_departments (id, name) VALUES (?, ?)", [id, name]);
        res.status(201).json({ message: "Divisi berhasil ditambahkan." });
    } catch (err) {
        console.error("Error saat menambahkan divisi:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Nama divisi sudah ada." });
        }
        res.status(500).json({ message: "Gagal menambahkan divisi." });
    }
});

// PUT /departments/:id - Perbarui nama divisi
router.put("/departments/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const [result] = await pool.query("UPDATE master_departments SET name = ? WHERE id = ?", [name, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Divisi tidak ditemukan." });
        }
        res.status(200).json({ message: "Divisi berhasil diperbarui." });
    } catch (err) {
        console.error("Error saat memperbarui divisi:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Nama divisi sudah ada." });
        }
        res.status(500).json({ message: "Gagal memperbarui divisi." });
    }
});

// DELETE /departments/:id - Hapus divisi
router.delete("/departments/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM master_departments WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Divisi tidak ditemukan." });
        }
        res.status(200).json({ message: "Divisi berhasil dihapus." });
    } catch (err) {
        console.error("Error saat menghapus divisi:", err);
        res.status(500).json({ message: "Gagal menghapus divisi." });
    }
});

export default router;
