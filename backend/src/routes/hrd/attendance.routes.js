/**
 * @fileoverview Route HRD - Data Kehadiran & Laporan Absensi
 *
 * Endpoints:
 *   GET /attendance-daily-report  - Export laporan harian (Excel)
 *   GET /attendance               - Data kehadiran seluruh karyawan
 *   GET /attendance-summary       - Ringkasan rekap absensi per karyawan
 *   GET /employee-report/:userId  - Detail laporan absensi satu karyawan
 */
import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "../../db.js";
import { getLocalDateString } from "../../utils/date.js";
import { generateDailyReportExcel } from "../../services/report.service.js";

const router = Router();

/**
 * Mengembalikan nama hari dalam bahasa Indonesia dari string tanggal 'YYYY-MM-DD'.
 *
 * @param {string} dateStr - Tanggal dalam format 'YYYY-MM-DD'
 * @returns {string} Nama hari dalam bahasa Indonesia
 */
function getIndonesianDayName(dateStr) {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return days[d.getDay()] || "";
    }
    const d = new Date(dateStr);
    return days[d.getDay()] || "";
}

// GET /attendance-daily-report - Export laporan harian dalam format Excel
router.get("/attendance-daily-report", async (req, res) => {
    try {
        const { date, userId } = req.query;
        const targetDate = date || getLocalDateString();
        const buffer = await generateDailyReportExcel(targetDate, userId);

        const fileName = userId
            ? `laporan-kehadiran-karyawan-${targetDate}.xlsx`
            : `laporan-kehadiran-harian-${targetDate}.xlsx`;

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.send(buffer);
    } catch (err) {
        console.error("Error generating Excel report:", err);
        res.status(500).json({ message: "Gagal membuat laporan Excel." });
    }
});

// GET /attendance - Data kehadiran seluruh karyawan (filter tanggal/rentang)
router.get("/attendance", async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;

        let query = `
            SELECT a.id, u.name, 
                   COALESCE(u.employee_id, '-') as employeeId,
                   COALESCE(d.name, u.department, 'Staff') as department,
                   COALESCE(p.name, u.position, 'Staff') as position, 
                   u.email as email, a.status, 
                   DATE_FORMAT(a.check_in_time, '%H:%i') as checkInTime, 
                   DATE_FORMAT(a.check_out_time, '%H:%i') as checkOutTime,
                   a.check_in_lat, a.check_in_lng, a.check_in_photo_url,
                   a.check_out_lat, a.check_out_lng, a.check_out_photo_url,
                   DATE_FORMAT(a.date, '%Y-%m-%d') as date
            FROM attendance_records a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN master_departments d ON u.id_department = d.id
            LEFT JOIN master_positions p ON u.id_position = p.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate && endDate) {
            query += ` AND DATE(a.date) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        } else if (startDate) {
            query += ` AND DATE(a.date) >= ?`;
            params.push(startDate);
        } else if (date) {
            query += ` AND DATE(a.date) = ?`;
            params.push(date);
        }

        query += ` ORDER BY a.date DESC, a.check_in_time DESC`;

        const [rows] = await pool.query(query, params);
        res.json({ records: rows });
    } catch (err) {
        console.error("SQL Error pada /hrd/attendance:", err);
        res.status(500).json({ message: "Failed to Fetch Attendance Records." });
    }
});

// GET /attendance-summary - Ringkasan rekap absensi per karyawan
router.get("/attendance-summary", async (req, res) => {
    try {
        const { date, startDate, endDate, search } = req.query;

        let empQuery = `
            SELECT u.id, u.nik, u.employee_id,
                   COALESCE(u.employee_id, u.nik) as employeeId, 
                   u.name, 
                   COALESCE(d.name, 'Staff') as department, 
                   u.email, u.phone, 
                   COALESCE(p.name, 'Staff') as position, 
                   u.role, u.jam_masuk,
                   DATE_FORMAT(u.created_at, '%Y-%m-%d') as created_at
            FROM users u
            LEFT JOIN master_departments d ON u.id_department = d.id
            LEFT JOIN master_positions p ON u.id_position = p.id
            WHERE 1=1
        `;
        const empParams = [];
        if (search) {
            empQuery += ` AND (u.name LIKE ? OR u.nik LIKE ? OR u.employee_id LIKE ? OR d.name LIKE ?)`;
            const s = `%${search}%`;
            empParams.push(s, s, s, s);
        }
        empQuery += ` ORDER BY u.name ASC`;

        let [employees] = await pool.query(empQuery, empParams);

        if (employees.length === 0 && !search) {
            const [allUsers] = await pool.query(
                `SELECT u.id, u.nik, u.employee_id, COALESCE(u.employee_id, u.nik) as employeeId, u.name, 
                        COALESCE(d.name, 'Staff') as department, u.email, u.phone, 
                        COALESCE(p.name, 'Staff') as position, u.role, u.jam_masuk, 
                        DATE_FORMAT(u.created_at, '%Y-%m-%d') as created_at
                 FROM users u
                 LEFT JOIN master_departments d ON u.id_department = d.id
                 LEFT JOIN master_positions p ON u.id_position = p.id
                 ORDER BY u.name ASC`
            );
            employees = allUsers;
        }

        const [attendances] = await pool.query(
            `SELECT user_id, status, check_in_time, DATE_FORMAT(date, '%Y-%m-%d') as date FROM attendance_records`
        );
        const [requests] = await pool.query(
            `SELECT user_id, type, reason, status, DATE_FORMAT(date, '%Y-%m-%d') as date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date FROM requests`
        );

        // Ambil data manual override rekap absensi jika ada (aman bila tabel belum dimigrasi di server/VM)
        let overrides = [];
        try {
            const [rows] = await pool.query(`SELECT * FROM attendance_summary_overrides`);
            overrides = rows;
        } catch (tableErr) {
            console.warn("Tabel attendance_summary_overrides belum dibuat di server:", tableErr.message);
        }

        const targetDateStr = date || getLocalDateString();
        const [tYearStr, tMonthStr] = targetDateStr.split("-");
        const yearStartStr = `${tYearStr}-01-01`;
        const monthStartStr = `${tYearStr}-${tMonthStr}-01`;
        const dayNum = parseInt(targetDateStr.split("-")[2], 10);
        const weekStartStr = `${tYearStr}-${tMonthStr}-${String(Math.floor((dayNum - 1) / 7) * 7 + 1).padStart(2, "0")}`;

        let globalStartDate = targetDateStr;
        if (attendances.length > 0) {
            const minAtt = attendances.reduce((min, a) => (a.date < min ? a.date : min), attendances[0].date);
            if (minAtt < globalStartDate) globalStartDate = minAtt;
        }
        if (requests.length > 0) {
            const minReq = requests.reduce((min, r) => (r.date < min ? r.date : min), requests[0].date);
            if (minReq < globalStartDate) globalStartDate = minReq;
        }

        const isReqInRange = (r, sDate, eDate) => {
            const s = r.date;
            const e = r.end_date || r.date;
            return s <= eDate && e >= sDate;
        };

        const getWorkingDates = (sDate, eDate, empCreatedStr) => {
            const dates = [];
            let start = new Date(sDate);
            const end = new Date(eDate);
            const today = new Date(getLocalDateString());
            start.setHours(12, 0, 0, 0);
            end.setHours(12, 0, 0, 0);
            today.setHours(12, 0, 0, 0);
            if (empCreatedStr) {
                const empCreated = new Date(empCreatedStr);
                empCreated.setHours(12, 0, 0, 0);
                if (start < empCreated) start = empCreated;
            }
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const finalEnd = end < today ? end : yesterday;
            let d = new Date(start);
            while (d <= finalEnd) {
                const day = d.getDay();
                if (day >= 1 && day <= 5) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const dayStr = String(d.getDate()).padStart(2, "0");
                    dates.push(`${year}-${month}-${dayStr}`);
                }
                d.setDate(d.getDate() + 1);
            }
            return dates;
        };

        const calcDynamicAlpa = (workingDates, attList, reqList) => {
            let alpa = 0;
            const attSet = new Set(attList.map((a) => a.date));
            const reqSet = new Set();
            for (const r of reqList) {
                let current = new Date(r.date);
                current.setHours(12, 0, 0, 0);
                let endD = new Date(r.end_date || r.date);
                endD.setHours(12, 0, 0, 0);
                while (current <= endD) {
                    const y = current.getFullYear();
                    const m = String(current.getMonth() + 1).padStart(2, "0");
                    const ds = String(current.getDate()).padStart(2, "0");
                    reqSet.add(`${y}-${m}-${ds}`);
                    current.setDate(current.getDate() + 1);
                }
            }
            for (const wd of workingDates) {
                if (!attSet.has(wd) && !reqSet.has(wd)) alpa++;
            }
            return alpa;
        };

        const calcLateMins = (attList, jamMasuk) => {
            let totalMins = 0;
            for (const a of attList) {
                if (a.status === "LATE" && a.check_in_time) {
                    const checkIn = new Date(a.check_in_time);
                    const shiftStart = new Date(checkIn);
                    if (jamMasuk) {
                        const [h, m, s] = jamMasuk.split(":");
                        shiftStart.setHours(parseInt(h, 10), parseInt(m, 10), parseInt(s || 0, 10), 0);
                    } else {
                        shiftStart.setHours(8, 0, 0, 0);
                    }
                    const diffMs = checkIn.getTime() - shiftStart.getTime();
                    if (diffMs > 0) totalMins += Math.floor(diffMs / 60000);
                }
            }
            return totalMins;
        };

        const summary = employees.map((emp) => {
            const userAtt = attendances.filter((a) => a.user_id === emp.id);
            const userReq = requests.filter((r) => r.user_id === emp.id);
            const yearAtt = userAtt.filter((a) => a.date >= yearStartStr && a.date <= targetDateStr);
            const yearReq = userReq.filter((r) => isReqInRange(r, yearStartStr, targetDateStr));
            const monthAtt = userAtt.filter((a) => a.date >= monthStartStr && a.date <= targetDateStr);
            const monthReq = userReq.filter((r) => isReqInRange(r, monthStartStr, targetDateStr));
            const weekAtt = userAtt.filter((a) => a.date >= weekStartStr && a.date <= targetDateStr);
            const weekReq = userReq.filter((r) => isReqInRange(r, weekStartStr, targetDateStr));
            const todayAtt = userAtt.filter((a) => a.date === targetDateStr);
            const todayReq = userReq.filter((r) => isReqInRange(r, targetDateStr, targetDateStr));

            const getCounts = (attList, reqList, sDate, eDate) => {
                const telatCount = attList.filter((a) => a.status === "LATE").length;
                let alpaCount = attList.filter((a) => a.status === "ABSENT").length;
                const hadirCount = attList.filter((a) => a.status === "ON_TIME" || a.status === "LATE").length;
                const izinCount = reqList.filter((r) => (r.type === "PERMISSION" || r.type === "IZIN") && r.status !== "REJECTED").length;
                const sakitCount = reqList.filter((r) => (r.type === "SICK" || r.type === "SAKIT") && r.status !== "REJECTED").length;
                const cutiCount = reqList.filter((r) => (r.type === "LEAVE" || r.type === "CUTI") && r.status !== "REJECTED").length;
                const lateMins = calcLateMins(attList, emp.jam_masuk);
                if (sDate && eDate) {
                    const workingDates = getWorkingDates(sDate, eDate, emp.created_at);
                    alpaCount += calcDynamicAlpa(workingDates, attList, reqList.filter((r) => r.status !== "REJECTED"));
                }
                return { telat: telatCount, alpa: alpaCount, hadir: hadirCount, izin: izinCount, sakit: sakitCount, cuti: cutiCount, lateMins };
            };

            const yearCounts = getCounts(yearAtt, yearReq, yearStartStr, targetDateStr);
            const monthCounts = getCounts(monthAtt, monthReq, monthStartStr, targetDateStr);
            const weekCounts = getCounts(weekAtt, weekReq, weekStartStr, targetDateStr);
            const todayCounts = getCounts(todayAtt, todayReq, targetDateStr, targetDateStr);
            const hasAnyData = userAtt.length > 0 || userReq.length > 0;

            let activeCounts, activePeriode, activeSubtext;
            if (startDate && endDate) {
                const rangeAtt = userAtt.filter((a) => a.date >= startDate && a.date <= endDate);
                const rangeReq = userReq.filter((r) => isReqInRange(r, startDate, endDate));
                activeCounts = getCounts(rangeAtt, rangeReq, startDate, endDate);
                activePeriode = startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;
                activeSubtext = "Filter Tanggal";
            } else if (startDate) {
                const rangeAtt = userAtt.filter((a) => a.date >= startDate && a.date <= targetDateStr);
                const rangeReq = userReq.filter((r) => (r.end_date || r.date) >= startDate && r.date <= targetDateStr);
                activeCounts = getCounts(rangeAtt, rangeReq, startDate, targetDateStr);
                activePeriode = `Mulai ${startDate}`;
                activeSubtext = "Filter Tanggal";
            } else if (date) {
                activeCounts = todayCounts;
                activePeriode = date;
                activeSubtext = "Filter Tanggal";
            } else {
                if (hasAnyData) {
                    activeCounts = getCounts(userAtt, userReq, globalStartDate, targetDateStr);
                    activePeriode = `${globalStartDate} s/d Sekarang`;
                    activeSubtext = "Rekap Kumulatif";
                } else {
                    activeCounts = { telat: 0, alpa: 0, hadir: 0, izin: 0, sakit: 0, cuti: 0, lateMins: 0 };
                    if (globalStartDate && globalStartDate !== targetDateStr) {
                        const workingDates = getWorkingDates(globalStartDate, targetDateStr, emp.created_at);
                        activeCounts.alpa = calcDynamicAlpa(workingDates, [], []);
                    }
                    activePeriode = `${globalStartDate} s/d Sekarang`;
                    activeSubtext = "Rekap Kumulatif";
                }
            }

            // Tentukan key periode unik untuk pengecekan override
            let currentPeriodKey = "all";
            if (startDate && endDate) {
                currentPeriodKey = `${startDate}_${endDate}`;
            } else if (startDate) {
                currentPeriodKey = `from_${startDate}`;
            } else if (date) {
                currentPeriodKey = date;
            }

            // Cek apakah ada override manual untuk karyawan & periode ini
            const empOverride = overrides.find((o) => o.user_id === emp.id && o.period_key === currentPeriodKey) ||
                (currentPeriodKey === "all" ? overrides.find((o) => o.user_id === emp.id && o.period_key === "all") : null);

            const finalIzin = empOverride && empOverride.izin !== null ? empOverride.izin : activeCounts.izin;
            const finalSakit = empOverride && empOverride.sakit !== null ? empOverride.sakit : activeCounts.sakit;
            const finalAlpa = empOverride && empOverride.alpa !== null ? empOverride.alpa : activeCounts.alpa;
            const finalCuti = empOverride && empOverride.cuti !== null ? empOverride.cuti : activeCounts.cuti;
            const finalTelat = empOverride && empOverride.telat !== null ? empOverride.telat : activeCounts.telat;
            const finalTelatMenit = empOverride && empOverride.telat_menit !== null ? empOverride.telat_menit : activeCounts.lateMins;

            return {
                id: emp.id,
                name: emp.name,
                employeeId: emp.employee_id || emp.employeeId || emp.nik || `EMP-${emp.id.slice(0, 5)}`,
                department: emp.department || "Staff",
                position: emp.position || "Staff",
                email: emp.email || "-",
                phone: emp.phone || "-",
                izin: finalIzin,
                sakit: finalSakit,
                alpa: finalAlpa,
                cuti: finalCuti,
                telat: finalTelat,
                telatMenit: finalTelatMenit,
                hadir: activeCounts.hadir,
                periode: activePeriode,
                periodeSubtext: activeSubtext,
                periodKey: currentPeriodKey,
                isOverridden: !!empOverride,
                today: todayCounts,
                weekly: weekCounts,
                monthly: monthCounts,
                yearly: yearCounts,
                hasData: hasAnyData
            };
        });

        res.json({ summary });
    } catch (err) {
        console.error("SQL Error pada /hrd/attendance-summary:", err);
        res.status(500).json({ message: "Gagal mengambil ringkasan absensi karyawan." });
    }
});

// PUT /attendance-summary/override - Simpan / Update Edit Manual Rekap Absensi
router.put("/attendance-summary/override", async (req, res) => {
    try {
        const { user_id, period_key, izin, sakit, cuti, alpa, telat, telat_menit, notes } = req.body;

        if (!user_id || !period_key) {
            return res.status(400).json({ message: "user_id dan period_key wajib diisi." });
        }

        const parseVal = (v) => (v === "" || v === null || v === undefined) ? null : parseInt(v, 10);

        const valIzin = parseVal(izin);
        const valSakit = parseVal(sakit);
        const valCuti = parseVal(cuti);
        const valAlpa = parseVal(alpa);
        const valTelat = parseVal(telat);
        const valTelatMenit = parseVal(telat_menit);

        const [existing] = await pool.query(
            "SELECT id FROM attendance_summary_overrides WHERE user_id = ? AND period_key = ?",
            [user_id, period_key]
        );

        if (existing.length > 0) {
            await pool.query(
                `UPDATE attendance_summary_overrides
                 SET izin = ?, sakit = ?, cuti = ?, alpa = ?, telat = ?, telat_menit = ?, notes = ?, updated_at = NOW()
                 WHERE id = ?`,
                [valIzin, valSakit, valCuti, valAlpa, valTelat, valTelatMenit, notes || null, existing[0].id]
            );
        } else {
            const overrideId = randomUUID();
            await pool.query(
                `INSERT INTO attendance_summary_overrides
                 (id, user_id, period_key, izin, sakit, cuti, alpa, telat, telat_menit, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [overrideId, user_id, period_key, valIzin, valSakit, valCuti, valAlpa, valTelat, valTelatMenit, notes || null]
            );
        }

        res.status(200).json({ message: "Data rekap absensi karyawan berhasil diperbarui." });
    } catch (err) {
        console.error("Error update attendance summary override:", err);
        res.status(500).json({ message: "Gagal memperbarui rekap absensi: " + err.message });
    }
});

// POST /attendance/manual - Tambah Kehadiran Manual oleh HRD
router.post("/attendance/manual", async (req, res) => {
    try {
        const { user_id, date, check_in_time, check_out_time, status, hospital_id, custom_location_name, photo_url } = req.body;

        if (!user_id || !date) {
            return res.status(400).json({ message: "Karyawan dan Tanggal wajib diisi." });
        }

        const formattedCheckIn = check_in_time ? `${date} ${check_in_time.length === 5 ? check_in_time + ':00' : check_in_time}` : null;
        const formattedCheckOut = check_out_time ? `${date} ${check_out_time.length === 5 ? check_out_time + ':00' : check_out_time}` : null;
        const recordStatus = status || 'ON_TIME';

        // Hitung working_hours jika check_in dan check_out keduanya ada
        let workingHours = null;
        if (formattedCheckIn && formattedCheckOut) {
            const diffMs = new Date(formattedCheckOut).getTime() - new Date(formattedCheckIn).getTime();
            if (diffMs > 0) {
                workingHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
            }
        }

        const [existing] = await pool.query(
            "SELECT id, check_in_time, check_out_time, check_in_photo_url FROM attendance_records WHERE user_id = ? AND date = ?",
            [user_id, date]
        );

        if (existing.length > 0) {
            const existingRecord = existing[0];
            const finalCheckIn = formattedCheckIn || existingRecord.check_in_time;
            const finalCheckOut = formattedCheckOut !== undefined ? formattedCheckOut : existingRecord.check_out_time;
            const finalPhoto = photo_url || existingRecord.check_in_photo_url;

            await pool.query(
                `UPDATE attendance_records 
                 SET check_in_time = ?, 
                     check_out_time = ?, 
                     working_hours = ?,
                     status = ?, 
                     hospital_id = ?, 
                     custom_location_name = ?,
                     check_in_photo_url = COALESCE(?, check_in_photo_url),
                     updated_at = NOW()
                 WHERE id = ?`,
                [finalCheckIn, finalCheckOut, workingHours, recordStatus, hospital_id || null, custom_location_name || 'Input Manual HRD', finalPhoto, existingRecord.id]
            );
            return res.status(200).json({ message: "Kehadiran manual berhasil diperbarui.", id: existingRecord.id });
        } else {
            const recordId = randomUUID();
            await pool.query(
                `INSERT INTO attendance_records 
                 (id, user_id, date, check_in_time, check_out_time, working_hours, status, hospital_id, custom_location_name, check_in_photo_url, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [recordId, user_id, date, formattedCheckIn, formattedCheckOut, workingHours, recordStatus, hospital_id || null, custom_location_name || 'Input Manual HRD', photo_url || null]
            );
            return res.status(201).json({ message: "Kehadiran manual berhasil ditambahkan.", id: recordId });
        }
    } catch (err) {
        console.error("Error Tambah Kehadiran Manual:", err);
        res.status(500).json({ message: "Gagal menyimpan data kehadiran manual: " + err.message });
    }
});

// GET /settings/work-days - Pengaturan Hari Kerja (Cron & Sistem)
router.get("/settings/work-days", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'work_days'");
        const workDays = rows.length > 0 ? rows[0].setting_value : '1-5';
        res.status(200).json({ workDays });
    } catch (err) {
        console.error("Error GET work-days:", err);
        res.status(500).json({ message: "Gagal memuat pengaturan hari kerja." });
    }
});

// POST /settings/work-days - Simpan Pengaturan Hari Kerja
router.post("/settings/work-days", async (req, res) => {
    try {
        const { workDays } = req.body;
        if (!workDays || !['1-5', '1-6'].includes(workDays)) {
            return res.status(400).json({ message: "Pilihan hari kerja tidak valid. Gunakan '1-5' (Senin-Jumat) atau '1-6' (Senin-Sabtu)." });
        }
        await pool.query(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES ('work_days', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
            [workDays, workDays]
        );
        res.status(200).json({ message: `Jadwal hari kerja berhasil disimpan (${workDays === '1-6' ? 'Senin - Sabtu' : 'Senin - Jumat'}).`, workDays });
    } catch (err) {
        console.error("Error POST work-days:", err);
        res.status(500).json({ message: "Gagal menyimpan pengaturan hari kerja." });
    }
});

// GET /employee-report/:userId - Detail laporan absensi satu karyawan
router.get("/employee-report/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { date, startDate, endDate } = req.query;

        const [users] = await pool.query(
            `SELECT u.id, u.nik, u.employee_id, COALESCE(u.employee_id, u.nik) as employeeId, u.name, 
                    COALESCE(d.name, 'Staff') as department, COALESCE(p.name, 'Staff') as position, u.email, u.phone 
             FROM users u
             LEFT JOIN master_departments d ON u.id_department = d.id
             LEFT JOIN master_positions p ON u.id_position = p.id
             WHERE u.id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "Karyawan tidak ditemukan." });
        }
        const employee = users[0];

        let attQuery = `
            SELECT id, date, status, 
                   DATE_FORMAT(check_in_time, '%H:%i') as checkInTime,
                   DATE_FORMAT(check_out_time, '%H:%i') as checkOutTime,
                   working_hours as workingHours
            FROM attendance_records
            WHERE user_id = ?
        `;
        const attParams = [userId];
        if (startDate && endDate) { attQuery += ` AND date BETWEEN ? AND ?`; attParams.push(startDate, endDate); }
        else if (startDate) { attQuery += ` AND date >= ?`; attParams.push(startDate); }
        else if (date) { attQuery += ` AND date <= ?`; attParams.push(date); }
        attQuery += ` ORDER BY date DESC`;
        const [attendances] = await pool.query(attQuery, attParams);

        let reqQuery = `
            SELECT id, type, reason, status, DATE_FORMAT(date, '%Y-%m-%d') as date, rejection_reason
            FROM requests
            WHERE user_id = ?
        `;
        const reqParams = [userId];
        if (startDate && endDate) { reqQuery += ` AND date BETWEEN ? AND ?`; reqParams.push(startDate, endDate); }
        else if (startDate) { reqQuery += ` AND date >= ?`; reqParams.push(startDate); }
        else if (date) { reqQuery += ` AND date <= ?`; reqParams.push(date); }
        reqQuery += ` ORDER BY date DESC`;
        const [requests] = await pool.query(reqQuery, reqParams);

        const details = [];
        for (const att of attendances) {
            const dateFormatted = typeof att.date === "string" ? att.date : (att.date ? new Date(att.date).toISOString().slice(0, 10) : "");
            details.push({
                date: dateFormatted,
                dayName: getIndonesianDayName(dateFormatted),
                category: att.status === "LATE" ? "TERLAMBAT" : "HADIR",
                categoryLabel: att.status === "LATE" ? "Terlambat Masuk" : "Hadir Tepat Waktu",
                keterangan: att.status === "LATE" ? `Check-in pukul ${att.checkInTime}` : "Hadir sesuai jadwal",
                status: "Tercatat di Sistem"
            });
        }

        for (const r of requests) {
            const dateFormatted = typeof r.date === "string" ? r.date : (r.date ? new Date(r.date).toISOString().slice(0, 10) : "");
            let categoryLabel = "Izin";
            if (r.type === "LEAVE" || r.type === "CUTI") categoryLabel = "Cuti Kerja";
            else if (r.type === "SICK" || r.type === "SAKIT") categoryLabel = "Izin Sakit";
            details.push({
                date: dateFormatted,
                dayName: getIndonesianDayName(dateFormatted),
                category: (r.type === "LEAVE" || r.type === "CUTI") ? "CUTI" : "IZIN",
                categoryLabel,
                keterangan: r.reason || `Pengajuan ${categoryLabel}`,
                status: r.status === "APPROVED" ? "Disetujui HRD" : "Menunggu"
            });
        }

        details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalIzin = details.filter((d) => d.category === "IZIN").length;
        const totalCuti = details.filter((d) => d.category === "CUTI").length;
        const totalTelat = details.filter((d) => d.category === "TERLAMBAT").length;
        const totalHadir = details.filter((d) => d.category === "HADIR").length;

        res.json({
            employee: {
                id: employee.id,
                name: employee.name,
                employeeId: employee.employeeId || employee.nik || `EMP-${employee.id.slice(0, 5)}`,
                department: employee.department || "Staff",
                position: employee.position || "Staff",
                email: employee.email || "-",
                phone: employee.phone || "-"
            },
            summary: { totalIzin, totalCuti, totalTelat, totalHadir, totalHariAktif: details.length },
            periode: (startDate && endDate)
                ? (startDate === endDate ? startDate : `${startDate} s/d ${endDate}`)
                : (date ? `s/d ${date}` : "Periode Berjalan"),
            details,
            incidentDetails: details.filter((d) => ["IZIN", "CUTI", "TERLAMBAT"].includes(d.category))
        });
    } catch (err) {
        console.error("SQL Error pada /hrd/employee-report:", err);
        res.status(500).json({ message: "Gagal mengambil rincian laporan absensi karyawan." });
    }
});

export default router;
