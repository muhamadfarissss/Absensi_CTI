/**
 * @fileoverview Route HRD - Manajemen Cuti & Izin
 *
 * Endpoints:
 *   GET   /leaves                   - Daftar semua pengajuan cuti/izin karyawan
 *   PATCH /leaves/:id/approval      - Setujui/tolak pengajuan cuti/izin
 */
import { Router } from "express";
import { pool } from "../../db.js";

const router = Router();

// GET /leaves - Daftar semua pengajuan cuti/izin
router.get("/leaves", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = `SELECT 
                r.id, 
                u.name, 
                r.type, 
                r.reason, 
                DATE_FORMAT(r.date, '%Y-%m-%d') as date, 
                DATE_FORMAT(r.end_date, '%Y-%m-%d') as end_date,
                r.status, 
                r.rejection_reason,
                r.attachment_url,
                r.created_at
            FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE 1=1`;
        const params = [];

        if (startDate && endDate) {
            query += ` AND DATE(r.date) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY r.created_at DESC`;

        const [rows] = await pool.query(query, params);
        res.json({ requests: rows });
    } catch (err) {
        console.error("Error mengambil data cuti:", err);
        res.status(500).json({ message: "Gagal memuat daftar permintaan cuti/izin." });
    }
});

// PATCH /leaves/:id/approval - Setujui atau tolak pengajuan
router.patch("/leaves/:id/approval", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }

        // Ambil data pengajuan untuk notifikasi ke karyawan
        const [reqRows] = await pool.query(
            "SELECT user_id, type, DATE_FORMAT(date, '%Y-%m-%d') as date FROM requests WHERE id = ?",
            [id]
        );

        await pool.query(
            "UPDATE requests SET status = ?, rejection_reason = ? WHERE id = ?",
            [status, status === "REJECTED" ? (rejection_reason || null) : null, id]
        );

        if (reqRows.length > 0) {
            const reqItem = reqRows[0];
            const typeLabel =
                reqItem.type === "LEAVE" ? "Cuti" :
                reqItem.type === "PERMISSION" ? "Izin" :
                reqItem.type === "SICK" ? "Sakit" : reqItem.type;
            const notifTitle =
                status === "APPROVED" ? `Pengajuan ${typeLabel} Disetujui` : `Pengajuan ${typeLabel} Ditolak`;
            const notifDesc =
                status === "APPROVED"
                    ? `Pengajuan ${typeLabel} Anda untuk tanggal ${reqItem.date} telah disetujui HRD.`
                    : `Pengajuan ${typeLabel} Anda untuk tanggal ${reqItem.date} ditolak. Alasan: ${rejection_reason || "Tidak ada alasan khusus."}`;

            await pool.query(
                "INSERT INTO notifications (id, user_id, title, description, type) VALUES (UUID(), ?, ?, ?, ?)",
                [reqItem.user_id, notifTitle, notifDesc, status === "APPROVED" ? "SUCCESS" : "WARNING"]
            ).catch((e) => console.error("Gagal mengirim notifikasi status cuti:", e));
        }

        res.json({ message: `Leave request updated to ${status.toLowerCase()} successfully.` });
    } catch (err) {
        console.error("Error pada /hrd/leaves/:id/approval:", err);
        res.status(500).json({ message: "Failed to update leave request." });
    }
});

export default router;
