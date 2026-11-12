/**
 * @fileoverview Middleware validasi berbasis schema untuk route handler Express.
 * Menggantikan blok `if (!field)` inline di setiap handler dengan deklarasi schema yang terpusat.
 */

/**
 * @typedef {'string'|'number'|'boolean'} FieldType
 */

/**
 * @typedef {Object} FieldRule
 * @property {FieldType} type - Tipe yang diharapkan untuk field ini
 * @property {boolean} [required] - Apakah field wajib ada (default: false)
 */

/**
 * @typedef {Object} ValidationSchema
 * @property {Record<string, FieldRule>} [body] - Aturan validasi untuk req.body
 * @property {Record<string, FieldRule>} [query] - Aturan validasi untuk req.query
 * @property {Record<string, FieldRule>} [params] - Aturan validasi untuk req.params
 */

/**
 * Membuat middleware Express yang memvalidasi field request terhadap schema.
 * Jika validasi gagal, mengembalikan response 400 dengan `{ message: "..." }`.
 * Jika validasi berhasil, memanggil `next()` untuk melanjutkan ke handler berikutnya.
 *
 * @param {ValidationSchema} schema - Definisi schema validasi
 * @returns {import('express').RequestHandler} Middleware Express
 *
 * @example
 * router.post("/hospitals", validate({
 *   body: {
 *     name: { type: 'string', required: true },
 *     address: { type: 'string', required: true },
 *     latitude: { type: 'number', required: true },
 *     longitude: { type: 'number', required: true },
 *   }
 * }), async (req, res) => { ... });
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    const sections = [
      { rules: schema.body, source: req.body, label: "body" },
      { rules: schema.query, source: req.query, label: "query" },
      { rules: schema.params, source: req.params, label: "params" },
    ];

    for (const { rules, source, label } of sections) {
      if (!rules) continue;

      for (const [field, rule] of Object.entries(rules)) {
        const value = source?.[field];
        const isEmpty = value === undefined || value === null || value === "";

        // Periksa field wajib
        if (rule.required && isEmpty) {
          errors.push(`Field '${field}' wajib diisi`);
          continue;
        }

        // Lewati validasi tipe jika field kosong dan tidak wajib
        if (isEmpty) continue;

        // Periksa tipe data
        if (rule.type === "number") {
          const num = Number(value);
          if (Number.isNaN(num)) {
            errors.push(`Field '${field}' harus berupa angka`);
          }
        } else if (rule.type === "boolean") {
          if (value !== true && value !== false && value !== "true" && value !== "false") {
            errors.push(`Field '${field}' harus berupa boolean`);
          }
        } else if (rule.type === "string") {
          if (typeof value !== "string") {
            errors.push(`Field '${field}' harus berupa string`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(", ") });
    }

    next();
  };
}
