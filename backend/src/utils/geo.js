/**
 * @fileoverview Utilitas geolokasi dan perhitungan jarak menggunakan formula Haversine.
 * Digunakan untuk validasi radius geofencing dan klasifikasi akurasi GPS.
 */

/**
 * Menghitung jarak antara dua koordinat GPS menggunakan formula Haversine.
 * Menggantikan kedua fungsi `haversineDistanceMeters` dan `calculateDistance`
 * yang sebelumnya duplikat dengan implementasi yang identik.
 *
 * @param {number} lat1 - Lintang titik pertama (derajat)
 * @param {number} lng1 - Bujur titik pertama (derajat)
 * @param {number} lat2 - Lintang titik kedua (derajat)
 * @param {number} lng2 - Bujur titik kedua (derajat)
 * @returns {number} Jarak dalam meter antara dua titik koordinat
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Radius bumi dalam meter
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Menilai kualitas akurasi GPS (dalam meter) menjadi label yang mudah dibaca.
 * Dipakai oleh backend untuk validasi dan oleh frontend sebagai referensi.
 *
 * @param {number|null} accuracyMeters - Akurasi GPS dalam meter
 * @returns {'GOOD'|'MEDIUM'|'POOR'|'UNKNOWN'} Label kualitas akurasi
 */
export function classifyAccuracy(accuracyMeters) {
  if (accuracyMeters == null || Number.isNaN(accuracyMeters)) return "UNKNOWN";
  if (accuracyMeters <= 20) return "GOOD";
  if (accuracyMeters <= 50) return "MEDIUM";
  return "POOR";
}
