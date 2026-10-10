const pool = require('../config/db');

function buildWhereClause(query) {
  let whereParts = [];
  let params = [];

  if (query && query.status && query.status !== 'all') {
    whereParts.push('status = ?');
    params.push(query.status);
  }

  const sql = whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';
  return { sql, params };
}

const SupportTicket = {
  countDocuments: async (query) => {
    try {
      const { sql, params } = buildWhereClause(query);
      const [rows] = await pool.query(`SELECT COUNT(*) as count FROM support_tickets ${sql}`, params);
      return rows[0].count;
    } catch (err) {
      console.error('Error in SupportTicket.countDocuments:', err);
      throw err;
    }
  },

  find: (query) => {
    let selectFields = 'id, name, email, subject, message, category, status, repliedAt, createdAt';
    let sortStr = 'ORDER BY createdAt DESC';
    let limitVal = null;
    let offsetVal = null;
    
    const { sql, params } = buildWhereClause(query);

    const builder = {
      sort: (sortObj) => {
        if (sortObj.createdAt) {
          sortStr = `ORDER BY createdAt ${sortObj.createdAt === -1 ? 'DESC' : 'ASC'}`;
        }
        return builder;
      },
      skip: (num) => {
        offsetVal = parseInt(num);
        return builder;
      },
      limit: (num) => {
        limitVal = parseInt(num);
        return builder;
      },
      then: async (resolve, reject) => {
        try {
          let limitOffsetSQL = '';
          let queryParams = [...params];
          
          if (limitVal !== null) {
            limitOffsetSQL += ' LIMIT ?';
            queryParams.push(limitVal);
          }
          if (offsetVal !== null) {
            limitOffsetSQL += ' OFFSET ?';
            queryParams.push(offsetVal);
          }

          const [rows] = await pool.query(
            `SELECT ${selectFields} FROM support_tickets ${sql} ${sortStr} ${limitOffsetSQL}`,
            queryParams
          );

          const formatted = rows.map(r => ({
            id: r.id,
            name: r.name,
            email: r.email,
            subject: r.subject,
            message: r.message,
            category: r.category || 'general',
            status: r.status || 'open',
            repliedAt: r.repliedAt,
            createdAt: r.createdAt,
            updatedAt: r.createdAt
          }));

          resolve(formatted);
        } catch (err) {
          console.error('Error in SupportTicket.find execution:', err);
          reject(err);
        }
      }
    };

    return builder;
  },

  findById: async (id) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, email, subject, message, category, status, repliedAt, createdAt FROM support_tickets WHERE id = ?',
        [id]
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        subject: r.subject,
        message: r.message,
        category: r.category || 'general',
        status: r.status || 'open',
        repliedAt: r.repliedAt,
        createdAt: r.createdAt,
        updatedAt: r.createdAt
      };
    } catch (err) {
      console.error('Error in SupportTicket.findById:', err);
      throw err;
    }
  },

  findByIdAndUpdate: async (id, updateFields) => {
    try {
      let setParts = [];
      let params = [];

      if (updateFields.status) {
        setParts.push('status = ?');
        params.push(updateFields.status);
      }
      if (updateFields.hasOwnProperty('repliedAt')) {
        setParts.push('repliedAt = ?');
        params.push(updateFields.repliedAt);
      } else if (updateFields.repliedAt === undefined && updateFields.hasOwnProperty('replied_at')) {
        // Fallback or handle both casings
        setParts.push('repliedAt = ?');
        params.push(updateFields.replied_at);
      }

      if (setParts.length === 0) return true;

      params.push(id);
      await pool.query(`UPDATE support_tickets SET ${setParts.join(', ')} WHERE id = ?`, params);
      return true;
    } catch (err) {
      console.error('Error in SupportTicket.findByIdAndUpdate:', err);
      throw err;
    }
  }
};

module.exports = SupportTicket;
