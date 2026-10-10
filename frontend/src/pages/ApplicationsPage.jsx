import { useState, useEffect, useMemo } from 'react';
import ChatLayout from '../components/layout/ChatLayout';
import { Briefcase, Search, MessageSquare, X, MapPin, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getAIApplications,
  APPLICATION_STATUSES,
} from '../lib/applicationsStorage';
import api from '../lib/api';

const STATUS_STYLES = {
  Applied: 'text-white bg-[#111111]0/15 border-[#E0E0E0]',
  Interview: 'text-white bg-[#111111] border-[#E0E0E0]',
  Offer: 'text-white bg-[#111111] border-[#E0E0E0]',
  Rejected: 'text-white bg-[#111111] border-[#E0E0E0]',
};

const normalizeStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('interview')) return 'Interview';
  if (s.includes('offer') || s.includes('selected')) return 'Offer';
  if (s.includes('reject')) return 'Rejected';
  return 'Applied';
};

const ApplicationsPage = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [detailsApp, setDetailsApp] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/api/applications')
      .then((res) => {
        if (!active) return;
        const serverApps = (res.data || []).map((app) => ({
          id: app.id,
          job_title: app.jobTitle,
          company: app.company,
          location: app.location,
          salary: app.salary,
          status: app.status,
          match: app.matchScore,
          applied_via: 'ai_agent',
          applied_at: app.appliedAt,
        }));
        setApplications(serverApps);
      })
      .catch(() => {
        if (active) setApplications(getAIApplications());
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = applications.map((a) => ({ ...a, status: normalizeStatus(a.status) }));
    if (statusFilter !== 'All') {
      list = list.filter((a) => a.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.job_title?.toLowerCase().includes(q) ||
          a.company?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, statusFilter, search]);

  return (
    <ChatLayout>
      <div className="flex-1 flex flex-col h-full bg-background animate-fade-in overflow-y-auto custom-scrollbar px-6 py-10 md:px-16 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black mb-1">Applications</h1>
          <p className="text-[13px] text-[#777777]">Jobs applied via Apply with AI only</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, company, location…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] text-black text-sm placeholder:text-[#888888] focus:outline-none focus:border-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {['All', ...APPLICATION_STATUSES].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={` px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${statusFilter === tab ? 'bg-[#F7F7F7] text-black border border-[#E0E0E0]' : 'bg-[#F7F7F7] text-black/45 border border-[#E0E0E0] hover:text-[#444444]'} `}
            >
              {tab}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#E0E0E0] rounded-2xl bg-[#F7F7F7]">
            <Briefcase size={40} className="text-black/20 mb-4" />
            <p className="text-[#555555] font-medium mb-1">No AI applications yet</p>
            <p className="text-[13px] text-black/35 mb-6 max-w-sm">
              Use &quot;Apply with AI&quot; on a job in chat to track applications here.
            </p>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-white to-white text-black text-sm font-semibold"
            >
              <MessageSquare size={16} /> Go to Chat
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-16">
            {filtered.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-2xl border border-[#E0E0E0] bg-[#F7F7F7] hover:border-[#E0E0E0] transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-black line-clamp-2">{app.job_title}</h3>
                  <span
                    className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${ STATUS_STYLES[app.status] || STATUS_STYLES.Applied }`}
                  >
                    {app.status}
                  </span>
                </div>
                <p className="text-[14px] text-black/55 font-medium mb-2">{app.company}</p>
                {app.location && (
                  <p className="flex items-center gap-1.5 text-[12px] text-[#777777] mb-1">
                    <MapPin size={12} /> {app.location}
                  </p>
                )}
                {app.salary && (
                  <p className="flex items-center gap-1.5 text-[12px] text-[#777777] mb-1">
                    <DollarSign size={12} /> {app.salary}
                  </p>
                )}
                <p className="text-[11px] text-[#888888] mt-1 mb-3">
                  Applied {new Date(app.applied_at).toLocaleDateString()}
                </p>
                {app.match != null && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-black/45 mb-1">
                      <span>Match</span>
                      <span>{app.match}%</span>
                    </div>
                    <div className="h-1.5 bg-[#F7F7F7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-white to-white rounded-full"
                        style={{ width: `${Math.min(100, app.match)}%` }}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setDetailsApp(app)}
                  className="mt-auto w-full py-2.5 rounded-xl border border-[#E0E0E0] text-[13px] text-[#222222] hover:bg-[#F2F2F2] hover:text-black transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailsApp && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setDetailsApp(null)} />
          <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-[#E0E0E0] bg-[#F7F7F7]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0]">
              <h3 className="text-black font-semibold">Application details</h3>
              <button type="button" onClick={() => setDetailsApp(null)} className="text-[#666666] hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div>
                <p className="text-[11px] uppercase text-black/35 mb-1">Position</p>
                <p className="text-black font-medium">{detailsApp.job_title}</p>
                <p className="text-[#555555] text-sm">{detailsApp.company}</p>
              </div>
              {detailsApp.form_data && Object.keys(detailsApp.form_data).length > 0 ? (
                <div>
                  <p className="text-[11px] uppercase text-black/35 mb-2">Auto-filled data</p>
                  <div className="space-y-2">
                    {Object.entries(detailsApp.form_data).map(([key, val]) => (
                      <div key={key} className="p-3 rounded-lg bg-[#F7F7F7] border border-[#E0E0E0]">
                        <p className="text-[11px] text-black capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[13px] text-black/75 mt-0.5">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-[#777777] italic">
                  Form data will appear here after the AI agent fills an application.
                </p>
              )}
              {detailsApp.screenshot && (
                <img
                  src={detailsApp.screenshot}
                  alt="Application screenshot"
                  className="w-full rounded-lg border border-[#E0E0E0]"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </ChatLayout>
  );
};

export default ApplicationsPage;
