/**
 * @fileoverview Route HRD - Dashboard Overview
 *
 * Endpoints:
 *   GET /dashboard/overview - Ringkasan dashboard (total karyawan, hadir, telat, cuti pending)
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { getLocalDateString } from "../../utils/date.js";

const router = Router();

// GET /dashboard/overview - Data ringkasan dashboard HRD
router.get("/dashboard/overview", async (req, res) => {
    try {
        const today = getLocalDateString();
        const [totalEmp] = await pool.query("SELECT COUNT(*) AS count FROM users");
        const [present] = await pool.query(
            "SELECT COUNT(*) AS count FROM attendance_records WHERE date = ? AND status = 'ON_TIME'",
            [today]
        );
        const [late] = await pool.query(
            "SELECT COUNT(*) AS count FROM attendance_records WHERE date = ? AND status = 'LATE'",
            [today]
        );
        const [pendingLeaves] = await pool.query(
            "SELECT COUNT(*) AS count FROM requests WHERE status = 'PENDING'"
        );

        // Aktivitas terbaru
        const [recentActivities] = await pool.query(
            `SELECT a.id, u.name, u.id_position as role, 'Check-in/out' as action, 
                    DATE_FORMAT(a.check_in_time, '%h:%i %p') as time, a.status
            FROM attendance_records a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC LIMIT 5`
        );

        // Tren kehadiran 7 hari terakhir
        const [attendanceTrends] = await pool.query(
            `SELECT 
                date,
                SUM(CASE WHEN status = 'ON_TIME' THEN 1 ELSE 0 END) as on_time,
                SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status IN ('SICK', 'LEAVE', 'CUTI') THEN 1 ELSE 0 END) as leaves
            FROM attendance_records
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY date
            ORDER BY date ASC`
        );

        res.json({
            metrics: {
                totalEmployees: totalEmp[0].count,
                presentToday: present[0].count,
                lateToday: late[0].count,
                pendingLeaves: pendingLeaves[0].count
            },
            recentActivities,
            attendanceTrends
        });
    } catch (err) {
        console.error("Error pada /hrd/dashboard/overview:", err);
        res.status(500).json({ message: "Gagal mengambil data dashboard." });
    }
});

export default router;
