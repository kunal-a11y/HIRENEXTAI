// Narrow, token-aware bridge for this application's existing parameterized SQL.
// Values NEVER become SQL text. Keeping the query/result contract avoids changing
// authentication, billing and permissions while migrating the database engine.
function tokenize(sql) {
  const out = [];
  for (let i = 0; i < sql.length;) {
    const c = sql[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c; let value = ''; let closed = false; i++;
      while (i < sql.length) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) { value += quote; i += 2; continue; }
          i++; closed = true; break;
        }
        if (sql[i] === '\\' && i + 1 < sql.length) {
          const next = sql[++i]; value += ({ n: '\n', r: '\r', t: '\t', '0': '\0' })[next] ?? next; i++;
        } else value += sql[i++];
      }
      if (!closed) throw new Error('Unterminated SQL literal');
      out.push({ kind: quote === '`' ? 'identifier' : 'string', value }); continue;
    }
    if (sql.slice(i, i + 2) === '--' || sql.slice(i, i + 2) === '/*' || c === ';') {
      throw new Error('SQL comments and multiple statements are not accepted by the application query API');
    }
    const number = sql.slice(i).match(/^\d+(?:\.\d+)?/);
    if (number) { out.push({ kind: 'number', value: number[0] }); i += number[0].length; continue; }
    const word = sql.slice(i).match(/^[a-zA-Z_][a-zA-Z_0-9]*/);
    if (word) { out.push({ kind: 'word', value: word[0] }); i += word[0].length; continue; }
    out.push({ kind: 'symbol', value: c }); i++;
  }
  return out;
}

function compile(sql, params = []) {
  const tokens = tokenize(sql); let position = 0; const values = [];
  function render(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const token = list[i]; const name = token.value.toUpperCase();
      if (token.kind === 'string') { out.push("'" + token.value.replaceAll("'", "''") + "'"); continue; }
      if (token.kind === 'identifier') { out.push('"' + token.value.replaceAll('"', '""') + '"'); continue; }
      if (token.value === '?') {
        if (position >= params.length) throw new Error('Missing SQL parameter');
        const value = params[position++];
        if (value === undefined || Array.isArray(value)) throw new Error('SQL parameters must be defined scalar values');
        values.push(typeof value === 'boolean' ? Number(value) : value);
        out.push('$' + values.length); continue;
      }
      if (token.kind === 'word' && list[i + 1]?.value === '(' &&
          ['DATE_ADD', 'DATE_SUB', 'IF', 'TIMESTAMPDIFF', 'DATEDIFF', 'DATE_FORMAT', 'CURDATE', 'MONTH', 'YEAR', 'DATE'].includes(name)) {
        let depth = 1; let end = i + 2; const args = [[]];
        for (; end < list.length; end++) {
          const part = list[end];
          if (part.kind === 'symbol' && part.value === '(') depth++;
          if (part.kind === 'symbol' && part.value === ')') depth--;
          if (depth === 0) break;
          if (part.kind === 'symbol' && part.value === ',' && depth === 1) args.push([]);
          else args[args.length - 1].push(part);
        }
        if (depth !== 0) throw new Error('Unbalanced SQL expression');
        if (name === 'DATE_ADD' || name === 'DATE_SUB') {
          const interval = args[1]; const unit = interval?.at(-1)?.value.toLowerCase();
          if (interval?.[0]?.value.toUpperCase() !== 'INTERVAL' || !['minute', 'hour', 'day', 'week', 'month', 'year'].includes(unit)) throw new Error('Unsupported interval');
          out.push(`(${render(args[0])} ${name === 'DATE_ADD' ? '+' : '-'} (${render(interval.slice(1, -1))}) * INTERVAL '1 ${unit}')`);
        } else if (name === 'IF') out.push(`(CASE WHEN ${render(args[0])} THEN ${render(args[1])} ELSE ${render(args[2])} END)`);
        else if (name === 'TIMESTAMPDIFF') {
          if (args[0][0]?.value.toUpperCase() !== 'MINUTE') throw new Error('Unsupported timestamp unit');
          out.push(`TRUNC(EXTRACT(EPOCH FROM (${render(args[2])} - ${render(args[1])})) / 60)`);
        } else if (name === 'DATEDIFF') out.push(`((${render(args[0])})::date - (${render(args[1])})::date)`);
        else if (name === 'DATE_FORMAT') {
          const format = { '%b': 'Mon', '%m': 'MM' }[args[1]?.[0]?.value];
          if (!format) throw new Error('Unsupported date format');
          out.push(`TO_CHAR(${render(args[0])}, '${format}')`);
        } else if (name === 'CURDATE') out.push('CURRENT_DATE');
        else if (name === 'DATE') out.push(`(${render(args[0])})::date`);
        else out.push(`EXTRACT(${name} FROM ${render(args[0])})`);
        i = end; continue;
      }
      if (token.kind === 'word') {
        if (name === 'TRUE' || name === 'FALSE') out.push(name === 'TRUE' ? '1' : '0');
        else if (name === 'LIKE') out.push('ILIKE');
        else if (/[a-z]/.test(token.value) && /[A-Z]/.test(token.value)) out.push('"' + token.value + '"');
        else out.push(token.value);
      } else out.push(token.value);
    }
    // Operators must stay contiguous, while all other tokens are whitespace-safe.
    return out.join(' ').replace(/([<>!])\s+=/g, '$1=').replace(/<\s+>/g, '<>');
  }
  let text = render(tokens);
  if (position !== params.length) throw new Error('Unexpected SQL parameters');
  if (/^INSERT\s+INTO\b/i.test(text)) {
    // Explicit targets preserve the three existing upsert behaviors.
    if (/ON DUPLICATE KEY UPDATE/i.test(text)) {
      const table = tokens[2].value;
      const key = { update_subscribers: 'email', job_search_cache: 'cacheKey', jobs: 'id' }[table];
      if (!key) throw new Error('Unsupported upsert table');
      text = text.replace(/ON DUPLICATE KEY UPDATE/i, `ON CONFLICT ("${key}") DO UPDATE SET`)
        .replace(/VALUES\s*\(\s*("?[a-zA-Z_][a-zA-Z_0-9]*"?)\s*\)/g, 'EXCLUDED.$1');
    }
    text += ' RETURNING *';
  }
  return { text, values };
}
module.exports = { compile, tokenize };
