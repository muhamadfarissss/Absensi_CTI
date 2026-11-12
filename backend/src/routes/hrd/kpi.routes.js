/**
 * @fileoverview Route HRD - Manajemen KPI (Statis & Dinamis)
 *
 * Endpoints:
 *   GET  /kpi                          - Rekap skor KPI seluruh karyawan per bulan
 *   POST /kpi                          - Input/update penilaian KPI manual
 *   GET  /kpi-templates                - Daftar semua KPI template
 *   POST /kpi-templates                - Buat KPI template baru
 *   PUT  /kpi-templates/:id            - Perbarui KPI template
 *   DELETE /kpi-templates/:id          - Hapus KPI template
 *   GET  /kpi-dynamic/:templateId      - Evaluasi KPI dinamis berdasarkan template + periode
 *   POST /kpi-dynamic/:templateId      - Simpan evaluasi KPI dinamis (batch upsert)
 */
import { Router } from "express";
import { pool } from "../../db.js";
import { randomUUID } from "crypto";

const router = Router();

// GET /kpi - Rekap skor KPI seluruh karyawan per bulan
router.get("/kpi", async (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().substring(0, 7);

        const [users] = await pool.query(`
            SELECT u.id, u.name, COALESCE(d.name, u.department, 'Staff') as department 
            FROM users u
            LEFT JOIN master_departments d ON u.id_department = d.id
            ORDER BY u.name
        `);

        const [attendances] = await pool.query(
            `SELECT user_id, status, date FROM attendance_records WHERE DATE_FORMAT(date, '%Y-%m') = ?`,
            [month]
        );

        const [requests] = await pool.query(
            `SELECT user_id, type FROM requests WHERE status IN ('APPROVED', 'DISETUJUI') AND DATE_FORMAT(date, '%Y-%m') = ?`,
            [month]
        );

        const [evals] = await pool.query(
            `SELECT * FROM kpi_evaluations WHERE month_year = ?`,
            [month]
        );

        const kpiData = users.map((user) => {
            const userAtt = attendances.filter((a) => a.user_id === user.id);
            const userReq = requests.filter((r) => r.user_id === user.id);
            const userEval = evals.find((e) => e.user_id === user.id) || {
                terlambat_laporan: 0, laporan_tidak_sesuai: 0, komplain: 0,
                target_persen: 0, pelanggaran_sop: 0,
                skor_disiplin: null, skor_terlambat: null, skor_kinerja: null, skor_sop: null
            };

            const izin = userReq.filter((r) => r.type === "PERMISSION" || r.type === "IZIN").length;
            const sakit = userReq.filter((r) => r.type === "SICK" || r.type === "SAKIT").length;
            const cuti = userReq.filter((r) => r.type === "LEAVE" || r.type === "CUTI").length;
            const terlambat = userAtt.filter((a) => a.status === "LATE").length;
            const alfa = userAtt.filter((a) => a.status === "ABSENT").length;

            const auto_skor_disiplin = (izin + sakit + alfa) >= 5 ? 0 : 1;
            const auto_skor_terlambat = terlambat >= 3 ? 0 : 1;
            let auto_skor_kinerja = 0;
            if (userEval.target_persen >= 80) auto_skor_kinerja = 2;
            else if (userEval.target_persen >= 50) auto_skor_kinerja = 1;

            let auto_skor_sop = 4;
            if (userEval.pelanggaran_sop) auto_skor_sop -= 1;
            if (userEval.komplain > 0) auto_skor_sop -= 1;
            if (userEval.laporan_tidak_sesuai > 0) auto_skor_sop -= 1;
            if (userEval.terlambat_laporan > 0) auto_skor_sop -= 1;
            if (auto_skor_sop < 0) auto_skor_sop = 0;

            const skor_disiplin = userEval.skor_disiplin != null ? userEval.skor_disiplin : auto_skor_disiplin;
            const skor_terlambat = userEval.skor_terlambat != null ? userEval.skor_terlambat : auto_skor_terlambat;
            const skor_kinerja = userEval.skor_kinerja != null ? userEval.skor_kinerja : auto_skor_kinerja;
            const skor_sop = userEval.skor_sop != null ? userEval.skor_sop : auto_skor_sop;

            const total_skor = skor_disiplin + skor_terlambat + skor_kinerja + skor_sop;
            let kategori = "KURANG";
            if (total_skor >= 5) kategori = "BERKUALITAS";
            else if (total_skor === 4) kategori = "CUKUP";

            return {
                user_id: user.id, name: user.name, department: user.department,
                izin, sakit, cuti, alfa, terlambat,
                terlambat_laporan: userEval.terlambat_laporan,
                laporan_tidak_sesuai: userEval.laporan_tidak_sesuai,
                komplain: userEval.komplain,
                target_persen: userEval.target_persen,
                pelanggaran_sop: userEval.pelanggaran_sop ? "Y" : "T",
                skor_disiplin, skor_terlambat, skor_kinerja, skor_sop, total_skor, kategori,
                auto_skor_disiplin, auto_skor_terlambat, auto_skor_kinerja, auto_skor_sop,
                skor_manual: {
                    disiplin: userEval.skor_disiplin != null,
                    terlambat: userEval.skor_terlambat != null,
                    kinerja: userEval.skor_kinerja != null,
                    sop: userEval.skor_sop != null
                }
            };
        });

        res.json({ kpi: kpiData });
    } catch (err) {
        console.error("Error on /hrd/kpi:", err);
        res.status(500).json({ message: "Failed to fetch KPI data." });
    }
});

// POST /kpi - Input/update penilaian KPI manual
router.post("/kpi", async (req, res) => {
    try {
        const { user_id, month_year, terlambat_laporan, laporan_tidak_sesuai, komplain, target_persen, pelanggaran_sop,
            skor_disiplin, skor_terlambat, skor_kinerja, skor_sop } = req.body;

        const id = randomUUID();
        const sopBool = pelanggaran_sop === "Y" ? 1 : 0;

        const parseSkor = (val) => {
            if (val === "" || val === null || val === undefined) return null;
            const n = parseInt(val);
            return isNaN(n) ? null : n;
        };

        await pool.query(
            `INSERT INTO kpi_evaluations 
            (id, user_id, month_year, terlambat_laporan, laporan_tidak_sesuai, komplain, target_persen, pelanggaran_sop,
             skor_disiplin, skor_terlambat, skor_kinerja, skor_sop) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            terlambat_laporan = VALUES(terlambat_laporan),
            laporan_tidak_sesuai = VALUES(laporan_tidak_sesuai),
            komplain = VALUES(komplain),
            target_persen = VALUES(target_persen),
            pelanggaran_sop = VALUES(pelanggaran_sop),
            skor_disiplin = VALUES(skor_disiplin),
            skor_terlambat = VALUES(skor_terlambat),
            skor_kinerja = VALUES(skor_kinerja),
            skor_sop = VALUES(skor_sop)`,
            [id, user_id, month_year, terlambat_laporan || 0, laporan_tidak_sesuai || 0, komplain || 0, target_persen || 0, sopBool,
                parseSkor(skor_disiplin), parseSkor(skor_terlambat), parseSkor(skor_kinerja), parseSkor(skor_sop)]
        );

        res.json({ message: "KPI Evaluation saved successfully." });
    } catch (err) {
        console.error("Error saving KPI:", err);
        res.status(500).json({ message: "Failed to save KPI evaluation." });
    }
});

// GET /kpi-templates - Daftar semua KPI template
router.get("/kpi-templates", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, nama_halaman, target_bagian, skema_kolom, created_at, updated_at FROM kpi_templates ORDER BY created_at ASC"
        );
        const templates = rows.map((r) => ({
            ...r,
            skema_kolom: typeof r.skema_kolom === "string" ? JSON.parse(r.skema_kolom) : r.skema_kolom
        }));
        res.json({ templates });
    } catch (err) {
        console.error("Error GET /kpi-templates:", err);
        res.status(500).json({ message: "Gagal memuat daftar template KPI." });
    }
});

// POST /kpi-templates - Buat KPI template baru
router.post("/kpi-templates", async (req, res) => {
    try {
        const { nama_halaman, target_bagian, skema_kolom } = req.body;

        if (!nama_halaman || !target_bagian || !skema_kolom || !Array.isArray(skema_kolom) || skema_kolom.length === 0) {
            return res.status(400).json({ message: "Data tidak lengkap. Nama halaman, target bagian, dan minimal 1 kolom metrik wajib diisi." });
        }

        const id = randomUUID();
        await pool.query(
            "INSERT INTO kpi_templates (id, nama_halaman, target_bagian, skema_kolom) VALUES (?, ?, ?, ?)",
            [id, nama_halaman, target_bagian, JSON.stringify(skema_kolom)]
        );

        res.status(201).json({
            message: "Template KPI berhasil dibuat.",
            template: { id, nama_halaman, target_bagian, skema_kolom }
        });
    } catch (err) {
        console.error("Error POST /kpi-templates:", err);
        res.status(500).json({ message: "Gagal membuat template KPI." });
    }
});

// PUT /kpi-templates/:id - Perbarui KPI template
router.put("/kpi-templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_halaman, target_bagian, skema_kolom } = req.body;

        if (!nama_halaman || !target_bagian || !skema_kolom || !Array.isArray(skema_kolom) || skema_kolom.length === 0) {
            return res.status(400).json({ message: "Data tidak lengkap." });
        }

        const [result] = await pool.query(
            "UPDATE kpi_templates SET nama_halaman = ?, target_bagian = ?, skema_kolom = ? WHERE id = ?",
            [nama_halaman, target_bagian, JSON.stringify(skema_kolom), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Template KPI tidak ditemukan." });
        }

        res.json({ message: "Template KPI berhasil diperbarui." });
    } catch (err) {
        console.error("Error PUT /kpi-templates/:id:", err);
        res.status(500).json({ message: "Gagal memperbarui template KPI." });
    }
});

// DELETE /kpi-templates/:id - Hapus KPI template
router.delete("/kpi-templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM kpi_templates WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Template KPI tidak ditemukan." });
        }

        res.json({ message: "Template KPI berhasil dihapus." });
    } catch (err) {
        console.error("Error DELETE /kpi-templates/:id:", err);
        res.status(500).json({ message: "Gagal menghapus template KPI." });
    }
});

// GET /kpi-dynamic/:templateId - Evaluasi KPI dinamis berdasarkan template + periode
router.get("/kpi-dynamic/:templateId", async (req, res) => {
    try {
        const { templateId } = req.params;
        const { periode } = req.query;

        if (!periode) {
            return res.status(400).json({ message: "Parameter 'periode' wajib diisi." });
        }

        const [templates] = await pool.query("SELECT * FROM kpi_templates WHERE id = ?", [templateId]);
        if (templates.length === 0) {
            return res.status(404).json({ message: "Template KPI tidak ditemukan." });
        }
        const template = templates[0];
        const skemaKolom = typeof template.skema_kolom === "string" ? JSON.parse(template.skema_kolom) : template.skema_kolom;

        const [employees] = await pool.query(
            `SELECT u.id, u.name, COALESCE(d.name, u.department, '-') as department,
                    COALESCE(p.name, u.position, '-') as position
             FROM users u
             LEFT JOIN master_departments d ON u.id_department = d.id
             LEFT JOIN master_positions p ON u.id_position = p.id
             WHERE u.role = 'EMPLOYEE'
               AND (? = 'Seluruh Karyawan' OR COALESCE(d.name, u.department, '') = ?)
             ORDER BY u.name ASC`,
            [template.target_bagian, template.target_bagian]
        );

        const bulanMap = {
            "Januari": "01", "Februari": "02", "Maret": "03", "April": "04",
            "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08",
            "September": "09", "Oktober": "10", "November": "11", "Desember": "12"
        };

        let monthYear = null;
        const periodeMatch = periode.match(/^(\w+)\s+(\d{4})$/);
        if (periodeMatch) {
            const monthNum = bulanMap[periodeMatch[1]];
            if (monthNum) monthYear = `${periodeMatch[2]}-${monthNum}`;
        }

        const employeeIds = employees.map((e) => e.id);
        let absensiMap = {};

        if (employeeIds.length > 0 && monthYear) {
            const [attendances] = await pool.query(
                `SELECT user_id, status FROM attendance_records
                 WHERE user_id IN (?) AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [employeeIds, monthYear]
            );

            const [reqs] = await pool.query(
                `SELECT user_id, type FROM requests
                 WHERE user_id IN (?) AND status IN ('APPROVED', 'DISETUJUI') AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [employeeIds, monthYear]
            );

            for (const empId of employeeIds) {
                const userAtt = attendances.filter((a) => a.user_id === empId);
                const userReq = reqs.filter((r) => r.user_id === empId);
                absensiMap[empId] = {
                    izin: userReq.filter((r) => ["PERMISSION", "LEAVE", "SICK"].includes(r.type)).length,
                    alfa: userAtt.filter((a) => a.status === "ABSENT").length,
                    terlambat: userAtt.filter((a) => a.status === "LATE").length
                };
            }
        }

        let existingEvals = {};
        if (employeeIds.length > 0) {
            const [evals] = await pool.query(
                `SELECT id_karyawan, nilai_custom FROM kpi_dynamic_evaluations
                 WHERE id_template = ? AND periode = ? AND id_karyawan IN (?)`,
                [templateId, periode, employeeIds]
            );
            for (const ev of evals) {
                existingEvals[ev.id_karyawan] = typeof ev.nilai_custom === "string" ? JSON.parse(ev.nilai_custom) : ev.nilai_custom;
            }
        }

        const evaluations = employees.map((emp) => {
            const absensi = absensiMap[emp.id] || { izin: 0, alfa: 0, terlambat: 0 };
            const nilaiCustom = existingEvals[emp.id] || {};
            const nilaiLengkap = {};
            for (const kolomDef of skemaKolom) {
                const isObj = typeof kolomDef === "object" && kolomDef !== null;
                const colKey = isObj ? kolomDef.id_kolom : kolomDef;
                nilaiLengkap[colKey] = nilaiCustom[colKey] !== undefined ? nilaiCustom[colKey] : "";
            }
            return {
                id_karyawan: emp.id, nama: emp.name, department: emp.department, position: emp.position,
                absensi, nilai_custom: nilaiLengkap
            };
        });

        res.json({
            template: { id: template.id, nama_halaman: template.nama_halaman, target_bagian: template.target_bagian, skema_kolom: skemaKolom },
            periode,
            evaluations
        });
    } catch (err) {
        console.error("Error GET /kpi-dynamic/:templateId:", err);
        res.status(500).json({ message: "Gagal memuat data evaluasi KPI." });
    }
});

// POST /kpi-dynamic/:templateId - Simpan batch evaluasi KPI dinamis
router.post("/kpi-dynamic/:templateId", async (req, res) => {
    try {
        const { templateId } = req.params;
        const { periode, evaluations } = req.body;

        if (!periode || !evaluations || !Array.isArray(evaluations)) {
            return res.status(400).json({ message: "Parameter 'periode' dan 'evaluations' (array) wajib diisi." });
        }

        const [templates] = await pool.query("SELECT id FROM kpi_templates WHERE id = ?", [templateId]);
        if (templates.length === 0) {
            return res.status(404).json({ message: "Template KPI tidak ditemukan." });
        }

        let savedCount = 0;
        for (const evalItem of evaluations) {
            if (!evalItem.id_karyawan || !evalItem.nilai_custom) continue;
            const id = randomUUID();
            await pool.query(
                `INSERT INTO kpi_dynamic_evaluations (id, id_template, periode, id_karyawan, nilai_custom)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nilai_custom = VALUES(nilai_custom), updated_at = CURRENT_TIMESTAMP`,
                [id, templateId, periode, evalItem.id_karyawan, JSON.stringify(evalItem.nilai_custom)]
            );
            savedCount++;
        }

        res.json({ message: `Berhasil menyimpan ${savedCount} evaluasi KPI.`, saved: savedCount });
    } catch (err) {
        console.error("Error POST /kpi-dynamic/:templateId:", err);
        res.status(500).json({ message: "Gagal menyimpan data evaluasi KPI." });
    }
});

export default router;
