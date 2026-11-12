/**
 * @fileoverview DTO (Data Transfer Object) untuk transformasi data Notification.
 * Mengkonversi baris database (snake_case) ke objek API response (camelCase).
 */

/**
 * @typedef {Object} NotificationRow
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number} is_read - 0 atau 1 dari MySQL
 * @property {Date|string} created_at
 * @property {string} type
 * @property {number} is_global - 0 atau 1 dari MySQL
 */

/**
 * Mengkonversi baris database Notification ke format DTO untuk API response.
 *
 * @param {NotificationRow} row - Baris data notifikasi dari database
 * @returns {Object} Objek DTO yang siap dikirim sebagai API response
 */
export function toNotificationDTO(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isRead: !!row.is_read,
    createdAt: new Date(row.created_at).toISOString(),
    type: row.type,
    is_global: !!row.is_global,
  };
}
