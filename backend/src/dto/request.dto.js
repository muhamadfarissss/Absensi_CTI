/**
 * @fileoverview DTO (Data Transfer Object) untuk transformasi data Request (Pengajuan).
 * Mengkonversi baris database (snake_case) ke objek API response (camelCase).
 */

/**
 * @typedef {Object} RequestRow
 * @property {string} id
 * @property {string} type
 * @property {string} reason
 * @property {Date|string} date
 * @property {Date|string|null} end_date
 * @property {string} status
 * @property {string|null} attachment_url
 * @property {string|null} rejection_reason
 * @property {Date|string} created_at
 */

/**
 * Mengkonversi baris database Request ke format DTO untuk API response.
 *
 * @param {RequestRow} row - Baris data pengajuan dari database
 * @returns {Object} Objek DTO yang siap dikirim sebagai API response
 */
export function toRequestDTO(row) {
  return {
    id: row.id,
    type: row.type,
    reason: row.reason,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
    endDate: row.end_date
      ? row.end_date instanceof Date
        ? row.end_date.toISOString().slice(0, 10)
        : row.end_date
      : undefined,
    status: row.status,
    attachmentUrl: row.attachment_url || undefined,
    rejectionReason: row.rejection_reason || undefined,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
