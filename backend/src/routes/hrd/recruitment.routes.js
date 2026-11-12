/**
 * @fileoverview Route HRD - Manajemen Rekrutmen
 *
 * Endpoints:
 *   POST   /recruitment/jobs                        - Buat lowongan baru
 *   GET    /recruitment/overview                    - Ringkasan semua lowongan
 *   PUT    /recruitment/jobs/:id                    - Perbarui lowongan
 *   DELETE /recruitment/jobs/:id                    - Hapus lowongan
 *   GET    /recruitment/candidates                  - Daftar kandidat
 *   POST   /recruitment/candidates                  - Tambah kandidat baru
 *   PUT    /recruitment/candidates/:id              - Perbarui data kandidat
 *   PATCH  /recruitment/candidates/:id/stage        - Ubah tahapan kandidat
 *   DELETE /recruitment/candidates/:id              - Hapus kandidat
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";

const router = Router();

// POST /recruitment/jobs - Buat lowongan pekerjaan baru
router.post("/recruitment/jobs", async (req, res) => {
    try {
        const title = req.body.title;
        const role = req.body.role || req.body.department;
        if (!title || !role) return res.status(400).json({ message: "Data not complete." });

        const id = randomUUID();
        await pool.query(
            "INSERT INTO job_openings (id, title, role, department, status) VALUES (?, ?, ?, ?, 'OPEN')",
            [id, title, role, role]
        );
        res.status(201).json({ message: "Job opening created successfully.", jobId: id });
    } catch (err) {
        console.error("Error creating job opening:", err);
        res.status(500).json({ message: "Failed to create job opening." });
    }
});

// GET /recruitment/overview - Ringkasan semua lowongan beserta jumlah kandidat
router.get("/recruitment/overview", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT j.id, j.title, 
                    COALESCE(j.role, j.department, '') as role, 
                    COALESCE(j.department, j.role, '') as department,
                    CASE WHEN j.status = 'ACTIVE' THEN 'OPEN' ELSE j.status END as status, 
                    j.created_at,
                    COUNT(c.id) as total_candidates,
                    COALESCE(SUM(CASE WHEN c.stage = 'INTERVIEW' THEN 1 ELSE 0 END), 0) as interview_count
            FROM job_openings j
            LEFT JOIN candidates c ON j.id = c.job_opening_id
            GROUP BY j.id
            ORDER BY j.created_at DESC`
        );
        res.json({ recruitment: rows });
    } catch (err) {
        console.error("Error fetching recruitment overview:", err);
        res.status(500).json({ message: "Failed to fetch recruitment overview." });
    }
});

// PUT /recruitment/jobs/:id - Perbarui lowongan pekerjaan
router.put("/recruitment/jobs/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const title = req.body.title;
        const role = req.body.role || req.body.department;
        const status = req.body.status;

        if (!title || !role || !status) {
            return res.status(400).json({ message: "Data not complete." });
        }

        if (!["OPEN", "ACTIVE", "CLOSED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }

        const [result] = await pool.query(
            "UPDATE job_openings SET title = ?, role = ?, department = ?, status = ? WHERE id = ?",
            [title, role, role, status === "ACTIVE" ? "OPEN" : status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Job opening not found." });
        }

        res.json({ message: "Job opening updated successfully." });
    } catch (err) {
        console.error("Error updating job opening:", err);
        res.status(500).json({ message: "Failed to update job opening." });
    }
});

// DELETE /recruitment/jobs/:id - Hapus lowongan pekerjaan
router.delete("/recruitment/jobs/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM job_openings WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Job opening not found." });
        }
        res.json({ message: "Job opening deleted successfully." });
    } catch (err) {
        console.error("Error deleting job opening:", err);
        res.status(500).json({ message: "Failed to delete job opening." });
    }
});

// GET /recruitment/candidates - Daftar kandidat (bisa difilter per lowongan)
router.get("/recruitment/candidates", async (req, res) => {
    try {
        const { job_opening_id } = req.query;
        let query = `SELECT c.*, j.title as job_title, j.role as job_role
                     FROM candidates c
                     JOIN job_openings j ON c.job_opening_id = j.id`;
        const params = [];
        if (job_opening_id) {
            query += " WHERE c.job_opening_id = ?";
            params.push(job_opening_id);
        }
        query += " ORDER BY c.created_at DESC";
        const [rows] = await pool.query(query, params);
        res.json({ candidates: rows });
    } catch (err) {
        console.error("Error fetching candidates:", err);
        res.status(500).json({ message: "Failed to fetch candidates." });
    }
});

// POST /recruitment/candidates - Tambah kandidat baru
router.post("/recruitment/candidates", async (req, res) => {
    try {
        const {
            job_opening_id, name, stage = "SCREENING",
            tempat_tanggal_lahir, umur, no_ktp, jenis_kelamin,
            no_telepon, status_pernikahan, email, alamat,
            pendidikan, jurusan, pengalaman, cv_lamaran,
            tgl_dipanggil, hasil_interview
        } = req.body;

        if (!job_opening_id || !name) {
            return res.status(400).json({ message: "Data candidate not complete." });
        }
        const id = randomUUID();
        await pool.query(
            `INSERT INTO candidates (
                id, job_opening_id, name, stage, tempat_tanggal_lahir, umur, no_ktp, jenis_kelamin, 
                no_telepon, status_pernikahan, email, alamat, pendidikan, jurusan, pengalaman, 
                cv_lamaran, tgl_dipanggil, hasil_interview
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, job_opening_id, name, stage,
                tempat_tanggal_lahir || null, umur || null, no_ktp || null, jenis_kelamin || null,
                no_telepon || null, status_pernikahan || null, email || null, alamat || null,
                pendidikan || null, jurusan || null, pengalaman || null, cv_lamaran || null,
                tgl_dipanggil || null, hasil_interview || null
            ]
        );
        res.status(201).json({ message: "Candidate added successfully.", candidateId: id });
    } catch (err) {
        console.error("Error adding candidate:", err);
        res.status(500).json({ message: "Failed to add candidate." });
    }
});

// PUT /recruitment/candidates/:id - Perbarui data kandidat
router.put("/recruitment/candidates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, stage, tempat_tanggal_lahir, umur, no_ktp, jenis_kelamin,
            no_telepon, status_pernikahan, email, alamat, pendidikan, jurusan,
            pengalaman, cv_lamaran, tgl_dipanggil, hasil_interview
        } = req.body;

        await pool.query(
            `UPDATE candidates SET 
                name = ?, stage = ?, tempat_tanggal_lahir = ?, umur = ?, no_ktp = ?, 
                jenis_kelamin = ?, no_telepon = ?, status_pernikahan = ?, email = ?, 
                alamat = ?, pendidikan = ?, jurusan = ?, pengalaman = ?, cv_lamaran = ?, 
                tgl_dipanggil = ?, hasil_interview = ?
            WHERE id = ?`,
            [
                name, stage, tempat_tanggal_lahir || null, umur || null, no_ktp || null,
                jenis_kelamin || null, no_telepon || null, status_pernikahan || null, email || null,
                alamat || null, pendidikan || null, jurusan || null, pengalaman || null,
                cv_lamaran || null, tgl_dipanggil || null, hasil_interview || null,
                id
            ]
        );
        res.json({ message: "Candidate updated successfully." });
    } catch (err) {
        console.error("Error updating candidate:", err);
        res.status(500).json({ message: "Failed to update candidate." });
    }
});

// PATCH /recruitment/candidates/:id/stage - Ubah tahapan kandidat
router.patch("/recruitment/candidates/:id/stage", async (req, res) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;
        if (!["SCREENING", "INTERVIEW", "HIRED", "REJECTED"].includes(stage)) {
            return res.status(400).json({ message: "Invalid candidate stage." });
        }
        await pool.query("UPDATE candidates SET stage = ? WHERE id = ?", [stage, id]);
        res.json({ message: "Candidate stage updated successfully." });
    } catch (err) {
        console.error("Error updating candidate stage:", err);
        res.status(500).json({ message: "Failed to update candidate stage." });
    }
});

// DELETE /recruitment/candidates/:id - Hapus kandidat
router.delete("/recruitment/candidates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM candidates WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Candidate not found." });
        }
        res.json({ message: "Candidate deleted successfully." });
    } catch (err) {
        console.error("Error deleting candidate:", err);
        res.status(500).json({ message: "Failed to delete candidate." });
    }
});

export default router;
