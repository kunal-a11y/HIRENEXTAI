// Match the account-scoped filters and ordering used by the application.
const indexes = [
  ['chats', 'idx_chats_user_created', ['userId', 'createdAt']],
  ['messages', 'idx_messages_chat_created', ['chatId', 'createdAt']],
  ['applications', 'idx_applications_user_applied', ['userId', 'appliedAt']],
  ['interviews', 'idx_interviews_user_created', ['user_id', 'createdAt']],
  ['verification_logs', 'idx_verification_email_status_created', ['email', 'status', 'createdAt']],
  ['verification_logs', 'idx_verification_ip_status_created', ['ipAddress', 'status', 'createdAt']],
];
async function ensurePerformanceIndexes(pool) {
  for (const [table, name, columns] of indexes) {
    const [rows] = await pool.query('SHOW INDEX FROM `' + table + '`');
    const groups = new Map();
    for (const row of rows) {
      if (!groups.has(row.Key_name)) groups.set(row.Key_name, []);
      groups.get(row.Key_name)[row.Seq_in_index - 1] = row.Column_name;
    }
    if ([...groups.values()].some(existing => columns.every((column, i) => existing[i] === column))) continue;
    try {
      await pool.query('CREATE INDEX `' + name + '` ON `' + table + '` (' + columns.map(c => '`' + c + '`').join(', ') + ')');
    } catch (error) {
      // Multiple instances may attempt the same additive migration together.
      if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
  }
}
module.exports = { ensurePerformanceIndexes, indexes };
