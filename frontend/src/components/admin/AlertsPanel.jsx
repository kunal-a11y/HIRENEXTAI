import React, { useEffect, useState } from 'react';
import { Bell, Search, RefreshCw, Mail } from 'lucide-react';
import api from '../../lib/api';

export default function AlertsPanel() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ subscribers: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    api.get('/admin/alerts/subscribers', { params: { page, search }, signal: controller.signal }).then(res => setData(res.data)).catch(err => { if (err.code !== 'ERR_CANCELED') setError(err.response?.data?.error || 'Could not load subscribers.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, search, refresh]);
  return <section className="alerts-panel"><div className="alerts-heading"><div className="alert-icon"><Bell size={24} /></div><div><span className="eyebrow">Audience</span><h2>Update subscribers</h2><p>Email addresses saved from the Updates page. No emails are sent from this view.</p></div><strong>{data.total}<small>subscribers</small></strong></div>
    <form className="alerts-toolbar" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(query); }}><label className="alerts-search"><Search size={18} /><input type="search" aria-label="Search subscriber email" placeholder="Search by email" maxLength={254} value={query} onChange={e => setQuery(e.target.value)} /></label><button className="refined-button" type="submit">Search</button><button type="button" className="icon-button" aria-label="Refresh subscribers" onClick={() => setRefresh(n => n + 1)}><RefreshCw size={18} /></button></form>
    {error ? <p role="alert" className="form-error">{error}</p> : loading ? <p role="status" className="alerts-empty">Loading subscribers…</p> : data.subscribers.length === 0 ? <div className="alerts-empty"><Mail size={28} /><h3>{search ? 'No matching subscribers' : 'Your update audience starts here'}</h3><p>{search ? 'Try a different email address.' : 'New subscriptions will appear here after someone subscribes on the Updates page.'}</p></div> : <div className="alerts-table"><table><thead><tr><th>Email address</th><th>Subscribed</th><th>Source</th></tr></thead><tbody>{data.subscribers.map(item => <tr key={item.id}><td>{item.email}</td><td>{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td><td><span className="status-pill">Updates page</span></td></tr>)}</tbody></table></div>}
    <div className="alerts-pagination"><button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(data.total / 25))}</span><button disabled={page * 25 >= data.total || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>
  </section>;
}
