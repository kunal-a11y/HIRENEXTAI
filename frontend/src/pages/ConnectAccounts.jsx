import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plug, Github, Linkedin, Briefcase } from 'lucide-react';
import ChatLayout from '../components/layout/ChatLayout';
import ConnectAccountModal from '../components/modals/ConnectAccountModal';
import useAuthStore from '../store/useAuthStore';
import useUIStore from '../store/useUIStore';
export default function ConnectAccounts() {
  const { user, fetchMe } = useAuthStore();
  const { setConnectModalOpen, showToast } = useUIStore();
  const location = useLocation();
  useEffect(() => { if (new URLSearchParams(location.search).get('linkedin') === 'connected') { fetchMe(); showToast('LinkedIn profile connected.'); } }, []);
  return <ChatLayout><main className="p-6 sm:p-10 max-w-4xl mx-auto w-full overflow-y-auto"><span className="eyebrow"><Plug size={16} /> Your connected workspace</span><h1 className="text-3xl font-bold mt-4 mb-3">Apps & profiles</h1><p className="text-slate-500 max-w-xl">Keep your professional links together in your own account. Profile links do not automatically import data from other apps.</p><div className="grid sm:grid-cols-2 gap-4 my-8">{[{ name: 'LinkedIn', field: 'linkedinUrl', Icon: Linkedin }, { name: 'GitHub', field: 'githubUrl', Icon: Github }, { name: 'Indeed', field: 'indeedUrl', Icon: Briefcase }, { name: 'Naukri', field: 'naukriUrl', Icon: Briefcase }].map(({ name, field, Icon }) => <div key={field} className="rounded-2xl border border-slate-200 bg-blue-50/30 p-6"><Icon className="text-blue-600 mb-4" /><h2 className="font-semibold text-lg">{name}</h2><p className="text-sm text-slate-500 mt-2">{user?.[field] ? 'Profile saved to your account' : 'Ready to add your profile'}</p></div>)}</div><button onClick={() => setConnectModalOpen(true)} className="refined-button"><Plug size={18} /> Manage connections</button><ConnectAccountModal /></main></ChatLayout>;
}
