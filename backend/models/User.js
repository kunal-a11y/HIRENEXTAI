const pool = require('../config/db');

function buildWhereClause(query) {
  let whereParts = [];
  let params = [];

  if (!query) return { sql: '', params };

  // Handle plan filter
  if (query.plan) {
    whereParts.push('LOWER(plan) = ?');
    params.push(query.plan.toLowerCase());
  }

  // Handle updatedAt/createdAt filter
  if (query.updatedAt) {
    if (query.updatedAt.$gte) {
      whereParts.push('createdAt >= ?');
      params.push(query.updatedAt.$gte);
    }
  }

  // Handle $or filter (search and target filtering)
  if (query.$or && Array.isArray(query.$or)) {
    let orParts = [];
    query.$or.forEach(condition => {
      const keys = Object.keys(condition);
      if (keys.length === 0) return;
      const key = keys[0];
      const val = condition[key];

      if (key === 'plan') {
        if (val === null || val === '') {
          orParts.push('(plan IS NULL OR plan = "" OR plan = "free" OR plan = "Free")');
        } else {
          orParts.push('LOWER(plan) = ?');
          params.push(String(val).toLowerCase());
        }
      } else if (key === 'firstName' || key === 'lastName' || key === 'name' || key === 'email') {
        let searchVal = '';
        if (val && typeof val === 'object' && val.$regex) {
          searchVal = val.$regex;
        } else {
          searchVal = String(val);
        }
        
        // Search inside email, firstName, lastName, or concatenated name
        orParts.push('firstName LIKE ?');
        params.push(`%${searchVal}%`);
        orParts.push('lastName LIKE ?');
        params.push(`%${searchVal}%`);
        orParts.push("CONCAT(firstName, ' ', COALESCE(lastName, '')) LIKE ?");
        params.push(`%${searchVal}%`);
        
        if (key === 'email' || keys.includes('email')) {
          orParts.push('email LIKE ?');
          params.push(`%${searchVal}%`);
        }
      }
    });
    if (orParts.length > 0) {
      whereParts.push('(' + orParts.join(' OR ') + ')');
    }
  }

  const sql = whereParts.length > 0 ? 'WHERE ' + whereParts.join(' AND ') : '';
  return { sql, params };
}

const User = {
  countDocuments: async (query) => {
    try {
      const { sql, params } = buildWhereClause(query);
      const [rows] = await pool.query(`SELECT COUNT(*) as count FROM users ${sql}`, params);
      return rows[0].count;
    } catch (err) {
      console.error('Error in User.countDocuments:', err);
      throw err;
    }
  },

  find: (query) => {
    let selectFields = 'id, firstName, lastName, email, plan, role, createdAt, isVerified, adminNotes';
    let sortStr = 'ORDER BY createdAt DESC';
    let limitVal = null;
    let offsetVal = null;
    
    const { sql, params } = buildWhereClause(query);

    const builder = {
      select: (fieldsStr) => {
        // Keeps selectFields as configured above or customize if needed
        return builder;
      },
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
            `SELECT ${selectFields} FROM users ${sql} ${sortStr} ${limitOffsetSQL}`,
            queryParams
          );

          const formatted = rows.map(r => {
            return {
              id: r.id,
              firstName: r.firstName || '',
              lastName: r.lastName || '',
              name: r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : (r.firstName || r.lastName || ''),
              email: r.email,
              plan: r.plan || 'free',
              role: r.role || 'user',
              createdAt: r.createdAt,
              updatedAt: r.createdAt, // fallback to createdAt
              isVerified: Boolean(r.isVerified),
              adminNotes: r.adminNotes || ''
            };
          });

          resolve(formatted);
        } catch (err) {
          console.error('Error in User.find execution:', err);
          reject(err);
        }
      }
    };

    return builder;
  }
};

module.exports = User;
