/**
 * @fileoverview DTO (Data Transfer Object) untuk transformasi data Attendance.
 * Mengkonversi baris database (snake_case) ke objek API response (camelCase).
 */

/**
 * @typedef {Object} AttendanceRow
 * @property {string} id
 * @property {string} date
 * @property {Date|null} check_in_time
 * @property {Date|null} check_out_time
 * @property {string} status
 * @property {number|null} working_hours
 * @property {string|null} hospital_id
 * @property {string|null} custom_location_name
 * @property {number|null} check_in_lat
 * @property {number|null} check_in_lng
 * @property {number|null} check_in_accuracy_m
 * @property {number|null} check_in_distance_m
 * @property {string|null} check_in_photo_url
 * @property {number|null} check_out_lat
 * @property {number|null} check_out_lng
 * @property {number|null} check_out_accuracy_m
 * @property {number|null} check_out_distance_m
 * @property {string|null} check_out_photo_url
 */

/**
 * Mengkonversi baris database AttendanceRecord ke format DTO untuk API response.
 *
 * @param {AttendanceRow} row - Baris data absensi dari database
 * @returns {Object} Objek DTO yang siap dikirim sebagai API response
 */
export function toRecordDTO(row) {
  return {
    id: row.id,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
    checkInTime: row.check_in_time ? new Date(row.check_in_time).toISOString() : null,
    checkOutTime: row.check_out_time ? new Date(row.check_out_time).toISOString() : null,
    status: row.status,
    workingHours: row.working_hours != null ? Number(row.working_hours) : null,
    hospitalId: row.hospital_id || null,
    customLocationName: row.custom_location_name || null,
    checkInLocation:
      row.check_in_lat != null
        ? {
            lat: Number(row.check_in_lat),
            lng: Number(row.check_in_lng),
            accuracy: row.check_in_accuracy_m != null ? Number(row.check_in_accuracy_m) : null,
          }
        : null,
    checkOutLocation:
      row.check_out_lat != null
        ? {
            lat: Number(row.check_out_lat),
            lng: Number(row.check_out_lng),
            accuracy: row.check_out_accuracy_m != null ? Number(row.check_out_accuracy_m) : null,
          }
        : null,
    checkInPhotoUrl: row.check_in_photo_url || null,
    checkOutPhotoUrl: row.check_out_photo_url || null,
    checkInDistanceMeters: row.check_in_distance_m != null ? Number(row.check_in_distance_m) : null,
    checkOutDistanceMeters: row.check_out_distance_m != null ? Number(row.check_out_distance_m) : null,
  };
}
