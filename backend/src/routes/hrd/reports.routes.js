/**
 * @fileoverview Route HRD - Laporan Karyawan
 *
 * Endpoints:
 *   GET /reports/employees  - Laporan daftar data karyawan
 *   GET /reports/export     - Export rekap absensi karyawan
 */
import { Router } from "express";
import { pool } from "../../db.js";

const router = Router();

// GET /reports/employees - Laporan daftar data karyawan
router.get("/reports/employees", async (req, res) => {
    try {
        const { name, department } = req.query;
        let query = `
            SELECT u.name, u.nik, u.email, u.phone, u.address, u.status_karyawan,
                d.name as department_name, p.name as position_name, 
                u.jam_masuk, u.jam_keluar
            FROM users u
            LEFT JOIN master_departments d ON u.id_department = d.id
            LEFT JOIN master_positions p ON u.id_position = p.id
            WHERE u.role = 'EMPLOYEE'
        `;
        const params = [];

        if (name) {
            query += ` AND u.name LIKE ?`;
            params.push(`%${name}%`);
        }
        if (department) {
            query += ` AND d.name LIKE ?`;
            params.push(`%${department}%`);
        }

        query += ` ORDER BY d.name ASC, u.name ASC`;

        const [employees] = await pool.query(query, params);
        res.status(200).json({ total: employees.length, data: employees });
    } catch (err) {
        console.error("Error Laporan Karyawan:", err);
        res.status(500).json({ message: "Gagal memuat data karyawan." });
    }
});

// GET /reports/export - Export rekap absensi karyawan pada rentang tanggal
router.get("/reports/export", async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Parameter startDate dan endDate wajib diisi." });
        }

        let userQuery = `
            SELECT u.id, u.name, u.nik, d.name as department 
            FROM users u
            LEFT JOIN master_departments d ON u.id_department = d.id
            WHERE u.role = 'EMPLOYEE' AND u.status_karyawan = 'ACTIVE'
        `;
        const userParams = [];

        if (name) {
            userQuery += ` AND u.name LIKE ?`;
            userParams.push(`%${name}%`);
        }

        const [users] = await pool.query(userQuery, userParams);

        if (users.length === 0) {
            return res.status(404).json({ message: "Data karyawan tidak ditemukan." });
        }

        const matchedUserIds = users.map((u) => u.id);

        let attQuery = `
            SELECT a.user_id, DATE_FORMAT(a.date, '%Y-%m-%d') as date, a.status,
                DATE_FORMAT(a.check_in_time, '%H:%i:%s') as check_in_time,
                DATE_FORMAT(a.check_out_time, '%H:%i:%s') as check_out_time,
                a.working_hours, a.custom_location_name, h.nama_rs
            FROM attendance_records a
            LEFT JOIN hospitals h ON a.hospital_id = h.id
            WHERE a.date BETWEEN ? AND ?
        `;
        const attParams = [startDate, endDate];

        if (name) {
            attQuery += ` AND a.user_id IN (?)`;
            attParams.push(matchedUserIds);
        }
        const [attendances] = await pool.query(attQuery, attParams);

        let reqQuery = `
            SELECT user_id, DATE_FORMAT(date, '%Y-%m-%d') as date, type 
            FROM requests 
            WHERE status = 'APPROVED' AND date BETWEEN ? AND ?
        `;
        const reqParams = [startDate, endDate];

        if (name) {
            reqQuery += ` AND user_id IN (?)`;
            reqParams.push(matchedUserIds);
        }
        const [requests] = await pool.query(reqQuery, reqParams);

        const exportData = users.map((user) => {
            const userAtt = attendances.filter((a) => a.user_id === user.id);
            const userReq = requests.filter((r) => r.user_id === user.id);

            const telat = userAtt.filter((a) => a.status === "LATE");
            const alfa = userAtt.filter((a) => a.status === "ABSENT");
            const izin = userReq.filter((r) => r.type === "IZIN");
            const cuti = userReq.filter((r) => r.type === "CUTI");
            const sakit = userReq.filter((r) => r.type === "SAKIT");

            return {
                informasi_karyawan: {
                    id: user.id,
                    nama: user.name,
                    nik: user.nik,
                    divisi: user.department || "Tidak Ada Divisi",
                },
                ringkasan: {
                    total_hadir: userAtt.filter((a) => a.status === "ON_TIME" || a.status === "LATE").length,
                    total_telat: telat.length,
                    tanggal_telat: telat.map((a) => a.date),
                    total_alfa: alfa.length,
                    tanggal_alfa: alfa.map((a) => a.date),
                    total_izin: izin.length,
                    tanggal_izin: izin.map((r) => r.date),
                    total_cuti: cuti.length,
                    tanggal_cuti: cuti.map((r) => r.date),
                    total_sakit: sakit.length,
                    tanggal_sakit: sakit.map((r) => r.date),
                },
                detail_harian: userAtt.map((a) => ({
                    tanggal: a.date,
                    status: a.status,
                    jam_masuk: a.check_in_time,
                    jam_keluar: a.check_out_time,
                    total_jam_kerja: a.working_hours,
                    lokasi: a.nama_rs || a.custom_location_name || "Tidak Diketahui",
                })),
            };
        });

        res.status(200).json({
            periode: `${startDate} hingga ${endDate}`,
            data: exportData,
        });
    } catch (err) {
        console.error("Error Export Laporan:", err);
        res.status(500).json({ message: "Gagal menghasilkan data export." });
    }
});

export default router;
