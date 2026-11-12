import "dotenv/config"; // Memuat variabel lingkungan dari file .env
import express from "express";
import cors from "cors";
import { testConnection } from "./db.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import requestsRoutes from "./routes/requests.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import officeRoutes from "./routes/office.routes.js";
import hrdRoutes from "./routes/hrd.routes.js";
import path from "path";
import fs from "fs";
import { BODY_LIMIT_MB } from "./constants.js";

// Jaring pengaman terakhir: mencatat error async yang tidak tertangkap (unhandled rejection)
// tanpa mematikan seluruh proses server. Idealnya setiap route sudah punya try-catch sendiri,
// tapi ini mencegah satu error tak terduga membuat SELURUH server down untuk semua pengguna.
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled Rejection (server tetap berjalan):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught Exception (server tetap berjalan):", err);
});

const app = express();

// CORS configuration from env var
const corsOrigin = process.env.CORS_ORIGIN || "*";
const corsOptions = {
  origin: corsOrigin === "*" ? true : corsOrigin.split(",").map(s => s.trim()),
  allowedHeaders: ["Authorization", "Content-Type"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
app.use(cors(corsOptions));
// Limit dinaikkan karena foto absen/profil dikirim sebagai base64 (~33% lebih besar dari file asli)
app.use(express.json({ limit: `${BODY_LIMIT_MB}mb` }));
// Static file serving for uploads only (not public/)
const uploadsDir = process.env.UPLOADS_DIR || "uploads";
const uploadsPath = path.resolve(uploadsDir);
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
// Ensure uploads/requests/ subdirectory exists
const requestsDir = path.join(uploadsPath, "requests");
if (!fs.existsSync(requestsDir)) {
  fs.mkdirSync(requestsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsPath));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/attendance", requireAuth, attendanceRoutes);
app.use("/api/requests", requireAuth, requestsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/profile", requireAuth, profileRoutes);
app.use("/api/office", officeRoutes);
app.use("/api/hrd", requireAuth, hrdRoutes);
// Penanganan error global sebagai jaring pengaman terakhir
app.use((err, req, res, next) => {
  // Pesan khusus jika body request (mis. foto base64) melebihi batas ukuran yang diizinkan
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      message: "Ukuran data yang dikirim terlalu besar (mis. foto). Coba gunakan foto dengan resolusi/ukuran lebih kecil.",
    });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Terjadi kesalahan tak terduga pada server." });
});

const PORT = process.env.PORT || 4000;

import { initCron } from "./cron.js";

async function start() {
  try {
    await testConnection();
  } catch (err) {
    console.error("❌ Gagal terhubung ke database MySQL:", err.message);
    console.error("   Pastikan MySQL berjalan dan konfigurasi di file .env sudah benar.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
    initCron();
  });
}

start();
