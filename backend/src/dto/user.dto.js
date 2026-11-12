/**
 * @fileoverview DTO (Data Transfer Object) untuk transformasi data User.
 * Mengkonversi baris database (snake_case) ke objek API response (camelCase).
 */

/**
 * @typedef {Object} UserRow
 * @property {string} id
 * @property {string} employee_id
 * @property {string} nik
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {string} department
 * @property {string} position
 * @property {string} jam_masuk
 * @property {string} jam_keluar
 * @property {string} photo_url
 * @property {string} emergency_contact
 * @property {string} address
 * @property {'EMPLOYEE'|'ADMIN'} role
 */

/**
 * @typedef {Object} UserDTO
 * @property {string} id
 * @property {string} employeeId
 * @property {string} nik
 * @property {string} name
 * @property {string} department
 * @property {string} position
 * @property {string} phone
 * @property {string} email
 * @property {string} schedule
 * @property {string|null} jamMasuk
 * @property {string|null} jamKeluar
 * @property {string} photoUrl
 * @property {string} emergencyContact
 * @property {string} address
 * @property {'EMPLOYEE'|'ADMIN'} role
 */

/**
 * Mengkonversi baris database User ke format DTO untuk API response.
 *
 * @param {UserRow} row - Baris data user dari database
 * @returns {UserDTO} Objek DTO yang siap dikirim sebagai API response
 */
export function toUserDTO(row) {
  return {
    id: row.id,
    employeeId: row.employee_id || null,
    nik: row.nik,
    name: row.name,
    department: row.department || (row.department_name ? row.department_name : null),
    position: row.position || (row.position_name ? row.position_name : null),
    phone: row.phone,
    email: row.email,
    schedule: (row.jam_masuk && row.jam_keluar)
      ? `${row.jam_masuk.slice(0, 5)} - ${row.jam_keluar.slice(0, 5)}`
      : (row.schedule || "08:00 - 17:00"),
    jamMasuk: row.jam_masuk ? row.jam_masuk.slice(0, 5) : null,
    jamKeluar: row.jam_keluar ? row.jam_keluar.slice(0, 5) : null,
    photoUrl: row.photo_url,
    emergencyContact: row.emergency_contact,
    address: row.address,
    role: row.role,
  };
}
