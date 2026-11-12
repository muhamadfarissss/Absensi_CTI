/**
 * @fileoverview Index komposer untuk semua route HRD/Admin.
 * Mengimpor dan menggabungkan semua sub-router domain HRD menjadi satu router,
 * dengan autentikasi dan otorisasi admin diterapkan secara terpusat.
 *
 * Semua endpoint HRD dimount di /api/hrd (didefinisikan di index.js).
 */

import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import adminRoutes from "./hrd/admin.routes.js";
import hospitalsRoutes from "./hrd/hospitals.routes.js";
import departmentsRoutes from "./hrd/departments.routes.js";
import positionsRoutes from "./hrd/positions.routes.js";
import dashboardRoutes from "./hrd/dashboard.routes.js";
import attendanceRoutes from "./hrd/attendance.routes.js";
import employeesRoutes from "./hrd/employees.routes.js";
import leavesRoutes from "./hrd/leaves.routes.js";
import reportsRoutes from "./hrd/reports.routes.js";
import officesRoutes from "./hrd/offices.routes.js";
import kpiRoutes from "./hrd/kpi.routes.js";
import recruitmentRoutes from "./hrd/recruitment.routes.js";
import notificationsRoutes from "./hrd/notifications.routes.js";

const router = Router();

// Autentikasi dan otorisasi admin diterapkan secara terpusat untuk semua endpoint HRD
router.use(requireAuth, requireAdmin);

// Mount semua sub-router domain HRD
router.use(adminRoutes);
router.use(hospitalsRoutes);
router.use(departmentsRoutes);
router.use(positionsRoutes);
router.use(dashboardRoutes);
router.use(attendanceRoutes);
router.use(employeesRoutes);
router.use(leavesRoutes);
router.use(reportsRoutes);
router.use(officesRoutes);
router.use(kpiRoutes);
router.use(recruitmentRoutes);
router.use(notificationsRoutes);

export default router;
