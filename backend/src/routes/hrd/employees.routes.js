/**
 * @fileoverview Route HRD - Manajemen Data Karyawan
 *
 * Endpoints:
 *   GET    /employees        - Daftar seluruh karyawan
 *   POST   /employees        - Tambah karyawan baru
 *   PUT    /employees/:id    - Perbarui data karyawan
 *   DELETE /employees/:id    - Hapus karyawan
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS, DEFAULT_HOSPITAL_RADIUS_METERS } from "../../constants.js";

const router = Router();

// GET /employees - Daftar seluruh karyawan
router.get("/employees", async (req, res) => {
    try {
        const { name, department } = req.query;
        let query = `
            SELECT u.id, u.employee_id as employeeId, u.nik, u.name, u.email, u.phone, u.address, u.emergency_contact,
                   u.status_karyawan, u.performance_status, u.photo_url as profile_photo_url,
                   u.tempat_tanggal_lahir, u.status_pernikahan, u.wilayah_kerja, 
                   DATE_FORMAT(u.tanggal_masuk, '%Y-%m-%d') as tanggal_masuk, u.masa_kerja,
                   COALESCE(d.name, u.department, 'Staff') as department_name, 
                   COALESCE(d.name, u.department, 'Staff') as department, 
                   COALESCE(p.name, u.position, 'Staff') as position_name, 
                   COALESCE(p.name, u.position, 'Staff') as position, 
                   u.jam_masuk, u.jam_keluar,
                   COALESCE(
                       CASE 
                           WHEN u.jam_masuk IS NOT NULL AND u.jam_keluar IS NOT NULL 
                           THEN CONCAT(DATE_FORMAT(u.jam_masuk, '%H:%i'), ' - ', DATE_FORMAT(u.jam_keluar, '%H:%i'))
                           ELSE NULL 
                       END,
                       NULLIF(u.schedule, ''),
                       '08:00 - 17:00'
                   ) as schedule,
                   u.hospital_id,
                   COALESCE(h.nama_rs, h.name, '-') as hospital_name,
                   u.role
            FROM users u
            LEFT JOIN master_departments d ON u.id_department = d.id
            LEFT JOIN master_positions p ON u.id_position = p.id
            LEFT JOIN hospitals h ON u.hospital_id = h.id
            WHERE 1=1
        `;
        const params = [];
        if (name) { query += ` AND u.name LIKE ?`; params.push(`%${name}%`); }
        if (department) { query += ` AND d.name LIKE ?`; params.push(`%${department}%`); }
        query += ` ORDER BY d.name ASC, u.name ASC`;

        const [employees] = await pool.query(query, params);
        res.status(200).json({ total: employees.length, employees, data: employees });
    } catch (err) {
        console.error("Error Laporan Karyawan:", err);
        res.status(500).json({ message: "Gagal memuat data karyawan." });
    }
});

// POST /employees - Tambah karyawan baru
router.post("/employees", async (req, res) => {
    try {
        let { name, email, nik, employee_id, phone, password, address, hospital_id, id_department, id_position,
              jam_masuk, jam_keluar, schedule, role,
              tempat_tanggal_lahir, status_pernikahan, status_karyawan, wilayah_kerja, tanggal_masuk, masa_kerja } = req.body;

        if (!name || !nik || !password) {
            return res.status(400).json({ message: "Data tidak lengkap. Nama, NIK, dan Password wajib diisi." });
        }

        // Resolusi id_department jika berupa nama (bukan UUID)
        if (id_department && !id_department.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
            const [depts] = await pool.query("SELECT id FROM master_departments WHERE name = ?", [id_department]);
            if (depts.length > 0) {
                id_department = depts[0].id;
            } else {
                const newDeptId = randomUUID();
                await pool.query("INSERT INTO master_departments (id, name) VALUES (?, ?)", [newDeptId, id_department]);
                id_department = newDeptId;
            }
        }

        // Resolusi hospital_id jika berupa nama (bukan UUID)
        if (hospital_id && !hospital_id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
            const [hosps] = await pool.query("SELECT id FROM hospitals WHERE nama_rs = ? OR name = ?", [hospital_id, hospital_id]);
            if (hosps.length > 0) {
                hospital_id = hosps[0].id;
            } else {
                const newHospId = randomUUID();
                await pool.query(
                    "INSERT INTO hospitals (id, nama_rs, address, latitude, longitude, radius_meters, type) VALUES (?, ?, ?, ?, ?, ?, 'kantor')",
                    [newHospId, hospital_id, "Alamat Belum Diatur", 0, 0, DEFAULT_HOSPITAL_RADIUS_METERS]
                );
                hospital_id = newHospId;
            }
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const password_hash = await bcrypt.hash(password, salt);
        const userId = randomUUID();

        // Tentukan abbreviasi dept untuk auto-generate employee_id
        let deptNameForAbbr = "CTI";
        if (id_department) {
            const [depts] = await pool.query("SELECT name FROM master_departments WHERE id = ?", [id_department]);
            if (depts.length > 0) deptNameForAbbr = depts[0].name;
        }

        const getDeptAbbreviation = (name) => {
            if (!name || typeof name !== "string") return "CTI";
            const n = name.trim().toUpperCase();
            if (n === "") return "CTI";
            const words = n.split(/\s+/);
            return words.length === 1 ? n.substring(0, 3) : words.map((w) => w[0]).join("").substring(0, 3);
        };

        let finalEmployeeId = employee_id;
        if (!finalEmployeeId) {
            const prefix = getDeptAbbreviation(deptNameForAbbr);
            const [rows] = await pool.query(`SELECT employee_id FROM users WHERE employee_id LIKE '${prefix}-%'`);
            let maxId = 0;
            rows.forEach((row) => {
                const numStr = row.employee_id.replace(`${prefix}-`, "");
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxId) maxId = num;
            });
            finalEmployeeId = `${prefix}-${String(maxId + 1).padStart(3, "0")}`;
        }

        await pool.query(
            `INSERT INTO users (id, employee_id, nik, email, name, phone, password_hash, role, address, hospital_id, 
              id_department, id_position, jam_masuk, jam_keluar, schedule, tempat_tanggal_lahir, 
              status_pernikahan, status_karyawan, wilayah_kerja, tanggal_masuk, masa_kerja) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, finalEmployeeId, nik, email || null, name, phone || null, password_hash,
                role || "EMPLOYEE", address || null, hospital_id || null, id_department || null,
                id_position || null, jam_masuk || null, jam_keluar || null, schedule || null,
                tempat_tanggal_lahir || null, status_pernikahan || null, status_karyawan || null,
                wilayah_kerja || null, tanggal_masuk || null, masa_kerja || null
            ]
        );

        res.status(201).json({
            message: "Karyawan Berhasil Didaftarkan.",
            employee: { id: userId, name, nik, email }
        });
    } catch (err) {
        console.error("SQL Error pada POST /hrd/employees:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email atau NIK/Employee ID sudah digunakan." });
        }
        res.status(500).json({ message: "Gagal membuat akun karyawan." });
    }
});

// PUT /employees/:id - Perbarui data karyawan
router.put("/employees/:id", async (req, res) => {
    try {
        const targetUserId = req.params.id;
        let { name, employeeId, employee_id, nik, jam_masuk, jam_keluar, id_department, id_position,
              email, phone, address, hospital_id, emergency_contact, status_karyawan, performance_status,
              schedule, role, tempat_tanggal_lahir, status_pernikahan, wilayah_kerja, tanggal_masuk, masa_kerja } = req.body;

        const targetEmployeeId = employeeId !== undefined ? employeeId : employee_id;

        // Ekstrak jam_masuk/jam_keluar jika schedule dikirim dalam format "HH:mm - HH:mm"
        if (schedule && typeof schedule === "string" && schedule.includes("-")) {
            const parts = schedule.split("-").map((s) => s.trim());
            if (parts[0]) jam_masuk = parts[0].length === 5 ? `${parts[0]}:00` : parts[0];
            if (parts[1]) jam_keluar = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
        }

        // Resolusi id_department jika berupa nama
        if (id_department && !id_department.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
            const [depts] = await pool.query("SELECT id FROM master_departments WHERE name = ?", [id_department]);
            if (depts.length > 0) {
                id_department = depts[0].id;
            } else {
                const newDeptId = randomUUID();
                await pool.query("INSERT INTO master_departments (id, name) VALUES (?, ?)", [newDeptId, id_department]);
                id_department = newDeptId;
            }
        }

        // Resolusi hospital_id jika berupa nama
        if (hospital_id && !hospital_id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
            const [hosps] = await pool.query("SELECT id FROM hospitals WHERE nama_rs = ? OR name = ?", [hospital_id, hospital_id]);
            if (hosps.length > 0) {
                hospital_id = hosps[0].id;
            } else {
                const newHospId = randomUUID();
                await pool.query(
                    "INSERT INTO hospitals (id, nama_rs, address, latitude, longitude, radius_meters, type) VALUES (?, ?, ?, ?, ?, ?, 'kantor')",
                    [newHospId, hospital_id, "Alamat Belum Diatur", 0, 0, DEFAULT_HOSPITAL_RADIUS_METERS]
                );
                hospital_id = newHospId;
            }
        }

        const [result] = await pool.query(
            `UPDATE users 
             SET name = COALESCE(?, name),
                 employee_id = COALESCE(?, employee_id),
                 nik = COALESCE(?, nik),
                 jam_masuk = COALESCE(?, jam_masuk), 
                 jam_keluar = COALESCE(?, jam_keluar), 
                 schedule = COALESCE(?, schedule),
                 id_department = ?, 
                 id_position = ?, 
                 email = COALESCE(?, email), 
                 phone = COALESCE(?, phone), 
                 address = COALESCE(?, address), 
                 hospital_id = ?,
                 emergency_contact = COALESCE(?, emergency_contact), 
                 status_karyawan = COALESCE(?, status_karyawan), 
                 performance_status = COALESCE(?, performance_status),
                 role = COALESCE(?, role),
                 tempat_tanggal_lahir = COALESCE(?, tempat_tanggal_lahir),
                 status_pernikahan = COALESCE(?, status_pernikahan),
                 wilayah_kerja = COALESCE(?, wilayah_kerja),
                 tanggal_masuk = COALESCE(?, tanggal_masuk),
                 masa_kerja = COALESCE(?, masa_kerja)
             WHERE id = ?`,
            [
                name, targetEmployeeId,
                nik !== undefined ? (nik || null) : null,
                jam_masuk, jam_keluar, schedule,
                id_department || null, id_position || null,
                email, phone, address,
                hospital_id || null, emergency_contact,
                status_karyawan, performance_status, role,
                tempat_tanggal_lahir || null, status_pernikahan || null,
                wilayah_kerja || null, tanggal_masuk || null, masa_kerja || null,
                targetUserId
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: "Karyawan tidak ditemukan." });
        res.status(200).json({ message: "Data karyawan berhasil diperbarui." });
    } catch (err) {
        console.error("SQL Error pada /hrd/employees/:id:", err);
        res.status(500).json({ message: "Gagal Memperbarui Data Karyawan." });
    }
});

// DELETE /employees/:id - Hapus karyawan
router.delete("/employees/:id", async (req, res) => {
    try {
        const targetUserId = req.params.id;
        if (targetUserId === req.userId) return res.status(400).json({ message: "Tidak dapat menghapus akun sendiri." });

        const [result] = await pool.query("DELETE FROM users WHERE id = ?", [targetUserId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Karyawan tidak ditemukan." });
        res.status(200).json({ message: "Karyawan berhasil dihapus." });
    } catch (err) {
        console.error("SQL Error pada /hrd/employees/:id:", err);
        res.status(500).json({ message: "Gagal Menghapus Karyawan." });
    }
});

export default router;
