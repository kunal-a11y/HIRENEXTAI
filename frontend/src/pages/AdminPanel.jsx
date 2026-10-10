import AlertsPanel from '../components/admin/AlertsPanel';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Megaphone,
  Activity,
  MessageSquare,
  Mail,
  Copy,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Trash2,
  UserCheck,
  LogOut,
  Eye,
  Shield,
  Lock,
  Briefcase,
  TrendingUp,
  DollarSign,
  Send,
  FileText,
  AlertTriangle,
  Paperclip,
  CheckCircle,
  Clock,
  HelpCircle,
  Plus,
  RefreshCw,
  Cpu,
  MoreHorizontal,
  Key,
  Zap,
  Globe,
  Server,
  Wifi,
  WifiOff,
  Settings,
  RotateCw,
  Save
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import useUserStore from '../store/useUserStore';
import useUIStore from '../store/useUIStore';
import api from '../lib/api';
import OTPVerification from '../components/auth/OTPVerification';

const EMAIL_TEMPLATES = [
  {
    name: 'Select Template...',
    subject: '',
    body: ''
  },
  {
    name: 'Welcome Email',
    subject: 'Welcome to HirenextAI!',
    body: 'Thank you for registering on HirenextAI. We are excited to support you on your career journey. Update your profile and upload your resume to start optimizing your job applications with our advanced AI agents.'
  },
  {
    name: 'Interview Invitation',
    subject: 'Interview Invitation — HirenextAI Team',
    body: 'We are pleased to invite you for an interview regarding your application. Please select a convenient time from our scheduling link, or reply with your availability for next week.'
  },
  {
    name: 'Application Confirmation',
    subject: 'Application Received — HirenextAI',
    body: 'We have successfully received your application. Our team is currently reviewing your credentials against the role requirements. We will reach out to you with next steps shortly.'
  },
  {
    name: 'Offer Letter',
    subject: 'Offer of Employment — HirenextAI Team',
    body: 'We are thrilled to offer you the position. We were highly impressed by your credentials and interview sessions. Please review the attached offer details and sign to confirm your acceptance.'
  },
  {
    name: 'Rejection Notice',
    subject: 'Application Update — HirenextAI',
    body: 'Thank you for your interest in our roles and taking the time to interview with us. After careful consideration, we have decided to proceed with other candidates whose experience more closely aligns with our current needs. We wish you the very best in your search.'
  }
];

const PERMISSION_GROUPS = [
  { id: 'alerts', label: 'Alerts', permissions: [{ id: 'alerts_view', label: 'View update subscribers', parentId: 'alerts' }] },
  {
    id: 'dashboard',
    label: 'Dashboard',
    permissions: [
      { id: 'dashboard_view', label: 'View Dashboard', parentId: 'dashboard' }
    ]
  },
  {
    id: 'applications',
    label: 'Applications',
    permissions: [
      { id: 'applications_view', label: 'View Applications', parentId: 'applications' },
      { id: 'applications_edit', label: 'Edit Applications', parentId: 'applications' },
      { id: 'applications_approve', label: 'Approve Applications', parentId: 'applications' }
    ]
  },
  {
    id: 'users',
    label: 'Users',
    permissions: [
      { id: 'users_view', label: 'View Users', parentId: 'users' },
      { id: 'users_suspend', label: 'Suspend Users', parentId: 'users' },
      { id: 'users_delete', label: 'Delete Users', parentId: 'users' }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    permissions: [
      { id: 'analytics_view', label: 'View Analytics', parentId: 'analytics' }
    ]
  },
  {
    id: 'revenue',
    label: 'Revenue',
    permissions: [
      { id: 'revenue_view', label: 'View Revenue', parentId: 'revenue' }
    ]
  },
  {
    id: 'announcements',
    label: 'Announcements',
    permissions: [
      { id: 'announcements_create', label: 'Create Announcements', parentId: 'announcements' },
      { id: 'announcements_send', label: 'Send Announcements', parentId: 'announcements' }
    ]
  },
  {
    id: 'messages',
    label: 'Messages',
    permissions: [
      { id: 'messages_read', label: 'Read Messages', parentId: 'messages' },
      { id: 'messages_reply', label: 'Reply to Messages', parentId: 'messages' }
    ]
  },
  {
    id: 'email_center',
    label: 'Email Center',
    permissions: [
      { id: 'email_center_read', label: 'Read Emails', parentId: 'email_center' },
      { id: 'email_center_send', label: 'Send Emails', parentId: 'email_center' }
    ]
  },
  {
    id: 'logs',
    label: 'Activity Logs',
    permissions: [
      { id: 'logs_view', label: 'View Activity Logs', parentId: 'logs' }
    ]
  },
  {
    id: 'api_keys',
    label: 'API Keys',
    permissions: [
      { id: 'api_keys_manage', label: 'Manage API Keys', parentId: 'api_keys' }
    ]
  },
  {
    id: 'security',
    label: 'Security',
    permissions: [
      { id: 'security_manage', label: 'Manage Security Logs', parentId: 'security' }
    ]
  }
];

const ROLE_DEFAULT_PERMISSIONS = {
  'Support Admin': ['dashboard_view', 'users_view', 'messages_read', 'messages_reply', 'email_center_read', 'email_center_send'],
  'Marketing Admin': ['dashboard_view', 'analytics_view', 'announcements_create', 'announcements_send'],
  'Moderator': ['dashboard_view', 'users_view', 'users_suspend', 'messages_read', 'messages_reply'],
  'Hiring Manager': ['dashboard_view', 'applications_view', 'applications_edit', 'applications_approve'],
  'Recruiter': ['dashboard_view', 'applications_view', 'applications_edit'],
  'Finance Admin': ['dashboard_view', 'revenue_view'],
};

const AdminPanel = () => {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const { showToast } = useUIStore();

  // Admin OTP Gate States
  // Admin OTP Gate States
  const [isPinVerified, setIsPinVerified] = useState(false); // Reset to false on refresh/mount
  const [adminEmail, setAdminEmail] = useState(user?.email || "");
  const [otpStep, setOtpStep] = useState("email"); // "email" or "otp"
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Revalidate the authenticated role and MFA claim on the server, including refreshes.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(window.location.search);
    if (!token) {
      if (params.get('otp_sent') === 'true') { setAdminEmail(params.get('email') || ''); setOtpStep('otp'); }
      return;
    }
    let cancelled = false;
    api.get('/admin/session').then(({ data }) => {
      if (cancelled) return;
      useUserStore.getState().setUser({ ...data.user, demoMode: false });
      setAdminEmail(data.user.email); setIsPinVerified(true);
    }).catch(err => { if (!cancelled) setOtpError(err.response?.data?.error || 'Please verify your admin email.'); });
    return () => { cancelled = true; };
  }, []);

  const handleSendAdminOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!adminEmail) {
      setOtpError("Email is required");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await api.post('/api/admin/send-otp', { email: adminEmail });
      if (res.data.success) {
        setOtpStep("otp");
        showToast("OTP code sent to your email");
      } else {
        setOtpError(res.data.error || "Failed to send OTP");
      }
    } catch (err) {
      setOtpError(err.response?.data?.error || "Failed to send OTP. Ensure you are an authorized administrator.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleAdminOtpVerifySuccess = (token, authenticatedUser) => {
    localStorage.setItem("token", token);
    if (authenticatedUser) localStorage.setItem("user", JSON.stringify(authenticatedUser));
    
    useUserStore.getState().setUser({
      ...authenticatedUser,
      firstName: authenticatedUser.name?.split(" ")[0] || "Admin",
      initials: "AD",
      demoMode: false
    });
    
    window.location.replace('/admin');
  };

  // Redirect if not admin/owner
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const params = new URLSearchParams(window.location.search);
    const otpSent = params.get('otp_sent') === 'true';

    if (!token) {
      if (otpSent) {
        // Permit OTP verification flow
        return;
      }
      navigate('/login');
      return;
    }
    
    if (storedUser?.role !== 'admin' && storedUser?.role !== 'owner') {
      navigate('/chat');
      return;
    }
    
    setAdminEmail(storedUser.email || "");
  }, [navigate]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [analyticsRange, setAnalyticsRange] = useState('30days');

  // Dashboard & Users Tab Stats / Data
  const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, totalChats: 0, emailsSent: 0, newRegistrations: 0, conversionRate: 0 });
  const [users, setUsers] = useState([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Admin Management Tab States
  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRoleName, setNewAdminRoleName] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [detailsAdmin, setDetailsAdmin] = useState(null);
  const [historyAdmin, setHistoryAdmin] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [logsAdmin, setLogsAdmin] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', admin: null });

  // Redesign UX States
  const [selectedPredefinedRole, setSelectedPredefinedRole] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('All');
  const [selectedAdminIds, setSelectedAdminIds] = useState([]);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profileDrawerAdmin, setProfileDrawerAdmin] = useState(null);
  const [profileDrawerLogs, setProfileDrawerLogs] = useState([]);
  const [isProfileDrawerLogsLoading, setIsProfileDrawerLogsLoading] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isCreateAdminLoading, setIsCreateAdminLoading] = useState(false);

  // Notes state
  const [adminNotesText, setAdminNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Security Logs Tab States
  const [securityLogs, setSecurityLogs] = useState([]);
  const [isSecLogsLoading, setIsSecLogsLoading] = useState(false);
  const [secLogsRange, setSecLogsRange] = useState('7d'); // 'today', '7d', '30d', 'custom'
  const [secStartDate, setSecStartDate] = useState('');
  const [secEndDate, setSecEndDate] = useState('');

  // Verification Logs Tab States
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [isVerLogsLoading, setIsVerLogsLoading] = useState(false);
  const [verLogsRange, setVerLogsRange] = useState('7d'); // 'today', '7d', '30d', 'custom'
  const [verStartDate, setVerStartDate] = useState('');
  const [verEndDate, setVerEndDate] = useState('');

  // Activity range filters
  const [activityRange, setActivityRange] = useState('7d');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [visibleAdminCols, setVisibleAdminCols] = useState({
    name: true,
    email: true,
    role: true,
    status: true,
    lastLogin: true,
    permissions: true,
    createdDate: true,
    verification: true
  });
  const [showColVisibility, setShowColVisibility] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  // Email Verification Reminder Banner States
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      await api.post('/api/auth/resend-verification');
      showToast('Verification email sent! Please check your inbox.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  // Close actions dropdown and column visibility when clicking outside
  useEffect(() => {
    const handleClose = (e) => {
      if (activeDropdownId && !e.target.closest(`#admin-actions-${activeDropdownId}`)) {
        setActiveDropdownId(null);
      }
      if (showColVisibility && !e.target.closest('#col-visibility-dropdown')) {
        setShowColVisibility(false);
      }
    };
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [activeDropdownId, showColVisibility]);

  // User Drawer details
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [userActivity, setUserActivity] = useState([]);
  const [userActivityLoading, setUserActivityLoading] = useState(false);

  // Confirm delete modal
  const [deleteUserId, setDeleteUserId] = useState(null);

  // Announcement Form states
  const [announcementTarget, setAnnouncementTarget] = useState('all');
  const [selectedSpecificPlan, setSelectedSpecificPlan] = useState('pro');
  const [announcement, setAnnouncement] = useState({
    subject: '',
    message: '',
    ctaText: '',
    ctaUrl: ''
  });
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ sent: 0, total: 0 });
  const [testEmail, setTestEmail] = useState("");

  // Messages (Support Tickets) Tab states
  const [messages, setMessages] = useState([]);
  const [messagesStatusFilter, setMessagesStatusFilter] = useState('all');
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showReplyDrawer, setShowReplyDrawer] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [ticketNotes, setTicketNotes] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState([]);

  // Applications Tab states
  const [applications, setApplications] = useState([]);
  const [appFilterStatus, setAppFilterStatus] = useState('all');
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);

  // Analytics Tab states
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  // Revenue Tab states
  const [revenueData, setRevenueData] = useState(null);
  const [isRevenueLoading, setIsRevenueLoading] = useState(false);

  // Activity Log Tab states
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Email Center Tab States
  const [emails, setEmails] = useState([]);
  const [isEmailsLoading, setIsEmailsLoading] = useState(false);
  const [selectedMailbox, setSelectedMailbox] = useState('all'); // all, support@hirenextai.com, hello@hirenextai.com, careers@hirenextai.com, billing@hirenextai.com
  const [emailStatusFilter, setEmailStatusFilter] = useState('all'); // all, New, Open, In Progress, Waiting, Resolved, Closed
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  
  // Email Reply composer
  const [emailReplyBody, setEmailReplyBody] = useState('');
  const [emailReplyAttachments, setEmailReplyAttachments] = useState([]);
  
  // Email Compose screen
  const [composeMode, setComposeMode] = useState(false);
  const [composeMailbox, setComposeMailbox] = useState('support@hirenextai.com');
  const [composeTo, setComposeTo] = useState('');
  const [composeToName, setComposeToName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [isComposingEmail, setIsComposingEmail] = useState(false);

  // Email Center Folder & Schedule/Draft States
  const [emailFolder, setEmailFolder] = useState('inbox'); // inbox, sent, drafts, scheduled
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  // Simulate Email Modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulateMailbox, setSimulateMailbox] = useState('support@hirenextai.com');
  const [simulateSenderName, setSimulateSenderName] = useState('');
  const [simulateSenderEmail, setSimulateSenderEmail] = useState('');
  const [simulateSubject, setSimulateSubject] = useState('');
  const [simulateBody, setSimulateBody] = useState('');
  const [isSimulatingEmail, setIsSimulatingEmail] = useState(false);

  // AI API Keys Tab states
  const [aiKeys, setAiKeys] = useState([]);
  const [aiUsageStats, setAiUsageStats] = useState(null);
  const [isAiKeysLoading, setIsAiKeysLoading] = useState(false);
  const [isAiUsageLoading, setIsAiUsageLoading] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({ name: '', apiKey: '', provider: 'gemini', model: 'gemini-2.5-flash', customEndpoint: '' });
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState(null);

  // Job Providers Tab states
  const [jobProviders, setJobProviders] = useState([]);
  const [isJobProvidersLoading, setIsJobProvidersLoading] = useState(false);
  const [jobProviderStats, setJobProviderStats] = useState(null);
  const [testingProviderId, setTestingProviderId] = useState(null);
  const [editingProvider, setEditingProvider] = useState(null);
  const [providerEditForm, setProviderEditForm] = useState({ apiKey: '', appId: '', priority: 1, status: 'disabled' });

  // Email Diagnostics states
  const [emailDiagnostics, setEmailDiagnostics] = useState(null);
  const [isEmailDiagnosticsLoading, setIsEmailDiagnosticsLoading] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const fetchEmailDiagnostics = async () => {
    setIsEmailDiagnosticsLoading(true);
    try {
      const res = await api.get('/api/admin/email-diagnostics');
      if (res.data.success) {
        setEmailDiagnostics(res.data.diagnostics);
      }
    } catch (err) {
      console.error('Failed to fetch email diagnostics:', err);
      showToast(err.response?.data?.error || 'Failed to fetch email diagnostics');
    } finally {
      setIsEmailDiagnosticsLoading(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) {
      showToast('Please enter a recipient email address');
      return;
    }
    setIsSendingTestEmail(true);
    try {
      const res = await api.post('/api/admin/email-diagnostics/test', { recipient: testEmailAddress });
      if (res.data.success) {
        showToast('Test email queued and sent successfully');
        fetchEmailDiagnostics();
        setTestEmailAddress('');
      }
    } catch (err) {
      console.error('Failed to send test email:', err);
      showToast(err.response?.data?.error || 'Failed to send test email');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Job Provider functions
  const fetchJobProviders = async () => {
    setIsJobProvidersLoading(true);
    try {
      const res = await api.get('/api/job-providers');
      if (res.data.success) {
        setJobProviders(res.data.providers || []);
      }
    } catch (err) {
      console.error('Failed to fetch job providers:', err);
    } finally {
      setIsJobProvidersLoading(false);
    }
  };

  const fetchJobProviderStats = async () => {
    try {
      const res = await api.get('/api/job-providers/stats');
      if (res.data.success) {
        setJobProviderStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch job provider stats:', err);
    }
  };

  const handleTestProviderConnection = async (providerName) => {
    setTestingProviderId(providerName);
    try {
      const res = await api.post(`/api/job-providers/${providerName}/test`, {
        apiKey: '••••••••••••',
        appId: '••••••••••••'
      });
      if (res.data.success && res.data.valid) {
        showToast(`${providerName} — Connection healthy ✓`);
      } else {
        showToast(`${providerName} — Connection failed ✗`);
      }
      fetchJobProviders();
    } catch (err) {
      showToast(err.response?.data?.error || `${providerName} test failed`);
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleProviderHealthCheck = async (providerName) => {
    setTestingProviderId(providerName);
    try {
      const res = await api.post(`/api/job-providers/${providerName}/health`);
      if (res.data.success) {
        const report = res.data.report;
        showToast(`${providerName}: ${report.success ? 'Healthy' : 'Unhealthy'} — ${report.latencyMs}ms`);
      }
      fetchJobProviders();
    } catch (err) {
      showToast(err.response?.data?.error || `${providerName} health check failed`);
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleSaveProvider = async (providerName) => {
    try {
      const res = await api.put(`/api/job-providers/${providerName}`, providerEditForm);
      if (res.data.success) {
        showToast(res.data.message || 'Provider updated');
        setEditingProvider(null);
        fetchJobProviders();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update provider');
    }
  };

  const handleToggleProvider = async (provider) => {
    const newStatus = provider.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await api.put(`/api/job-providers/${provider.name}`, {
        apiKey: '••••••••••••',
        appId: '••••••••••••',
        priority: provider.priority,
        status: newStatus
      });
      showToast(`${provider.displayName} ${newStatus === 'enabled' ? 'enabled' : 'disabled'}`);
      fetchJobProviders();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to toggle provider');
    }
  };


  const fetchAiKeys = async () => {
    setIsAiKeysLoading(true);
    try {
      const res = await api.get('/api/admin/api-keys');
      if (res.data.success) {
        setAiKeys(res.data.keys || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI keys:', err);
      showToast(err.response?.data?.error || 'Failed to fetch AI keys');
    } finally {
      setIsAiKeysLoading(false);
    }
  };

  const fetchAiUsage = async () => {
    setIsAiUsageLoading(true);
    try {
      const res = await api.get('/api/admin/api-keys/usage');
      if (res.data.success) {
        setAiUsageStats(res.data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch AI usage stats:', err);
    } finally {
      setIsAiUsageLoading(false);
    }
  };

  const handleAddAiKey = async (e) => {
    e.preventDefault();
    if (!newKeyForm.name.trim() || !newKeyForm.apiKey.trim()) {
      showToast('Name and Key value are required');
      return;
    }
    setIsAddingKey(true);
    try {
      const res = await api.post('/api/admin/api-keys', newKeyForm);
      if (res.data.success) {
        showToast('AI API Key added to the pool');
        setNewKeyForm({ name: '', apiKey: '', provider: 'gemini', model: 'gemini-2.5-flash', customEndpoint: '' });
        fetchAiKeys();
        fetchAiUsage();
      }
    } catch (err) {
      console.error('Failed to add AI key:', err);
      showToast(err.response?.data?.error || 'Failed to add AI API Key');
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleToggleAiKey = async (keyId) => {
    try {
      const res = await api.put(`/api/admin/api-keys/${keyId}/toggle`);
      if (res.data.success) {
        showToast(res.data.message);
        fetchAiKeys();
      }
    } catch (err) {
      console.error('Failed to toggle AI key:', err);
      showToast(err.response?.data?.error || 'Failed to toggle AI key');
    }
  };

  const handleDeleteAiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to remove this API Key? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await api.delete(`/api/admin/api-keys/${keyId}`);
      if (res.data.success) {
        showToast('AI API Key removed');
        fetchAiKeys();
        fetchAiUsage();
      }
    } catch (err) {
      console.error('Failed to delete AI key:', err);
      showToast(err.response?.data?.error || 'Failed to delete AI key');
    }
  };

  const handleTestAiKey = async (keyId) => {
    setTestingKeyId(keyId);
    try {
      const res = await api.post(`/api/admin/api-keys/${keyId}/test`);
      if (res.data.success) {
        if (res.data.success && res.data.success === true) {
          showToast(`Test Succeeded: Latency ${res.data.latencyMs}ms`);
        } else {
          showToast(`Test Failed: ${res.data.error}`);
        }
        fetchAiKeys();
      }
    } catch (err) {
      console.error('Failed to test AI key:', err);
      showToast(err.response?.data?.error || 'Failed to test key');
    } finally {
      setTestingKeyId(null);
    }
  };

  // Load Dashboard Stats
  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Load Users List
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/users', {
        params: {
          page: currentPage,
          limit: 10,
          plan: planFilter,
          search: searchQuery
        }
      });

      const mappedUsers = res.data.users.map(u => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        const displayName = fullName || u.name || (u.email ? u.email.split('@')[0] : 'User');

        const lastActive = u.lastLoginAt ? new Date(u.lastLoginAt) : new Date(u.createdAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const status = lastActive >= sevenDaysAgo && !u.isSuspended ? 'Active' : u.isSuspended ? 'Suspended' : 'Inactive';

        return {
          ...u,
          displayName,
          status
        };
      });

      let fetchedUsers = mappedUsers;
      if (statusFilter !== '') {
        fetchedUsers = fetchedUsers.filter(u => u.status === statusFilter);
      }

      setUsers(fetchedUsers);
      setTotalUsersCount(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Admins list (Owner only)
  const fetchAdmins = async () => {
    if (user?.role !== 'owner') return;
    try {
      const res = await api.get('/api/admin/admins');
      if (res.data.success) {
        setAdmins(res.data.admins || []);
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  };

  // Load Applications List
  const fetchApplications = async () => {
    setIsApplicationsLoading(true);
    try {
      const res = await api.get('/api/admin/applications');
      if (res.data.success) {
        setApplications(res.data.applications || []);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setIsApplicationsLoading(false);
    }
  };

  // Load Analytics Data
  const fetchAnalytics = async (range = analyticsRange) => {
    setIsAnalyticsLoading(true);
    try {
      const res = await api.get('/api/admin/analytics', {
        params: { range }
      });
      if (res.data.success) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  // Load Revenue Data
  const fetchRevenue = async () => {
    setIsRevenueLoading(true);
    try {
      const res = await api.get('/api/admin/revenue');
      if (res.data.success) {
        setRevenueData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch revenue:', err);
    } finally {
      setIsRevenueLoading(false);
    }
  };

  // Load Activity Logs
  const fetchActivityLogs = async () => {
    setIsLogsLoading(true);
    try {
      const params = { range: activityRange };
      if (activityRange === 'custom') {
        params.startDate = activityStartDate;
        params.endDate = activityEndDate;
      }
      const res = await api.get('/api/admin/activity-log', { params });
      if (res.data.success) {
        setActivityLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const fetchSecurityLogs = async () => {
    setIsSecLogsLoading(true);
    try {
      const params = { range: secLogsRange };
      if (secLogsRange === 'custom') {
        params.startDate = secStartDate;
        params.endDate = secEndDate;
      }
      const res = await api.get('/api/admin/security-logs', { params });
      if (res.data.success) {
        setSecurityLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch security logs:', err);
    } finally {
      setIsSecLogsLoading(false);
    }
  };

  const fetchVerificationLogs = async () => {
    setIsVerLogsLoading(true);
    try {
      const params = { range: verLogsRange };
      if (verLogsRange === 'custom') {
        params.startDate = verStartDate;
        params.endDate = verEndDate;
      }
      const res = await api.get('/api/admin/verification-logs', { params });
      if (res.data.success) {
        setVerificationLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch verification logs:', err);
    } finally {
      setIsVerLogsLoading(false);
    }
  };

  // Load Support Tickets (Messages)
  const fetchMessages = async () => {
    setIsMessagesLoading(true);
    try {
      const res = await api.get('/api/admin/messages', {
        params: { status: messagesStatusFilter }
      });
      if (res.data.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  // Load Email Center mails
  const fetchEmails = async () => {
    setIsEmailsLoading(true);
    try {
      const res = await api.get('/api/admin/emails', {
        params: {
          mailbox: selectedMailbox,
          status: emailStatusFilter,
          search: emailSearch,
          folder: emailFolder
        }
      });
      if (res.data.success) {
        setEmails(res.data.emails || []);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setIsEmailsLoading(false);
    }
  };

  // Fetch full thread history
  const fetchThreadMessages = async (threadId) => {
    setIsThreadLoading(true);
    try {
      const res = await api.get(`/api/admin/emails/thread/${threadId}`);
      if (res.data.success) {
        setThreadMessages(res.data.messages || []);
        setSelectedThreadId(threadId);
      }
    } catch (err) {
      console.error('Failed to fetch thread messages:', err);
    } finally {
      setIsThreadLoading(false);
    }
  };

  // Trigger loading stats & permissions check
  useEffect(() => {
    if (isPinVerified) {
      fetchStats();
      fetchAdmins();
    }
  }, [isPinVerified]);

  // Load corresponding tab data
  useEffect(() => {
    if (!isPinVerified) return;
    if (activeTab === 'dashboard') {
      fetchStats();
      fetchUsers();
    } else if (activeTab === 'admin-management') {
      fetchAdmins();
    } else if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'analytics') {
      fetchAnalytics(analyticsRange);
    } else if (activeTab === 'revenue') {
      fetchRevenue();
    } else if (activeTab === 'messages') {
      fetchMessages();
    } else if (activeTab === 'email-center') {
      fetchEmails();
      fetchAdmins();
    } else if (activeTab === 'activity-log') {
      fetchActivityLogs();
    } else if (activeTab === 'security-logs') {
      fetchSecurityLogs();
    } else if (activeTab === 'verification-logs') {
      fetchVerificationLogs();
    } else if (activeTab === 'email-diagnostics') {
      fetchEmailDiagnostics();
    } else if (activeTab === 'ai-api') {
      fetchAiKeys();
      fetchAiUsage();
    } else if (activeTab === 'job-providers') {
      fetchJobProviders();
      fetchJobProviderStats();
    }
  }, [activeTab, isPinVerified, currentPage, searchQuery, planFilter, statusFilter, messagesStatusFilter, selectedMailbox, emailStatusFilter, analyticsRange, emailFolder, activityRange, activityStartDate, activityEndDate, secLogsRange, secStartDate, secEndDate, verLogsRange, verStartDate, verEndDate]);

  // Admin Management Actions (Owner only)
  const resetAdminForm = () => {
    setEditingAdminId(null);
    setNewAdminEmail('');
    setNewAdminRoleName('');
    setNewAdminPermissions([]);
    setSelectedPredefinedRole('');
    setCustomRoleInput('');
    setSelectedPermissions([]);
    setPermissionSearch('');
  };

  const handleRoleChange = (role) => {
    setSelectedPredefinedRole(role);
    if (ROLE_DEFAULT_PERMISSIONS[role]) {
      setSelectedPermissions(ROLE_DEFAULT_PERMISSIONS[role]);
    } else {
      setSelectedPermissions([]);
    }
  };

  const loadAdminForEditing = (adm) => {
    setEditingAdminId(adm.id);
    setNewAdminEmail(adm.email);
    const predefinedRoles = ['Support Admin', 'Marketing Admin', 'Moderator', 'Hiring Manager', 'Recruiter', 'Finance Admin'];
    if (predefinedRoles.includes(adm.adminRoleName)) {
      setSelectedPredefinedRole(adm.adminRoleName);
      setCustomRoleInput('');
    } else {
      setSelectedPredefinedRole('Custom Role');
      setCustomRoleInput(adm.adminRoleName || '');
    }

    let perms = [];
    try {
      perms = JSON.parse(adm.adminPermissions || '[]');
    } catch (e) {
      perms = [];
    }

    const childPerms = perms.filter(permission => PERMISSION_GROUPS.some(group => group.permissions.some(child => child.id === permission)));
    perms.forEach(parent => {
      const group = PERMISSION_GROUPS.find(g => g.id === parent);
      if (group) {
        group.permissions.forEach(child => {
          childPerms.push(child.id);
        });
      }
    });
    setSelectedPermissions(childPerms);
  };

  // Reset password via sending email
  const handleResetAdminPassword = async (email) => {
    try {
      await api.post('/api/auth/forgot-password', { email });
      showToast('Password reset link sent to registered email');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send reset link');
    }
  };

  // Profile Drawer Logs Loader
  const loadProfileDrawerLogs = async (adminId) => {
    setIsProfileDrawerLogsLoading(true);
    try {
      const res = await api.get(`/api/admin/admins/${adminId}/activity-logs`);
      if (res.data.success) {
        setProfileDrawerLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load profile drawer logs:', err);
    } finally {
      setIsProfileDrawerLogsLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkSuspend = async (suspendState) => {
    if (selectedAdminIds.length === 0) return;
    setIsBulkActionLoading(true);
    try {
      const targets = admins.filter(a => selectedAdminIds.includes(a.id) && a.role !== 'owner');
      await Promise.all(targets.map(a => api.put(`/api/admin/admins/${a.id}/suspend`, { suspended: suspendState })));
      showToast(`Successfully ${suspendState ? 'suspended' : 'reactivated'} ${targets.length} administrator(s)`);
      setSelectedAdminIds([]);
      fetchAdmins();
    } catch (err) {
      showToast('Failed to perform bulk suspension');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAdminIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to remove administrator privileges from ${selectedAdminIds.length} users?`)) return;
    setIsBulkActionLoading(true);
    try {
      const targets = admins.filter(a => selectedAdminIds.includes(a.id) && a.role !== 'owner');
      await Promise.all(targets.map(a => api.delete(`/api/admin/admins/${a.id}`)));
      showToast(`Demoted ${targets.length} administrator(s) back to standard user role`);
      setSelectedAdminIds([]);
      fetchAdmins();
    } catch (err) {
      showToast('Failed to perform bulk deletion');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkResendVerification = async () => {
    if (selectedAdminIds.length === 0) return;
    setIsBulkActionLoading(true);
    try {
      const targets = admins.filter(a => selectedAdminIds.includes(a.id) && a.role !== 'owner');
      await Promise.all(targets.map(a => api.post(`/api/admin/admins/${a.id}/send-verification-email`)));
      showToast(`Resent verification emails to ${targets.length} administrator(s)`);
      setSelectedAdminIds([]);
      fetchAdmins();
    } catch (err) {
      showToast('Failed to send verification emails');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkAssignRole = async (roleName) => {
    if (selectedAdminIds.length === 0 || !roleName) return;
    setIsBulkActionLoading(true);
    try {
      const targets = admins.filter(a => selectedAdminIds.includes(a.id) && a.role !== 'owner');
      const defaultPerms = ROLE_DEFAULT_PERMISSIONS[roleName] || [];
      const parentPerms = [...new Set(defaultPerms)];

      await Promise.all(targets.map(a => api.put(`/api/admin/admins/${a.id}/permissions`, {
        roleName: roleName,
        permissions: parentPerms
      })));
      showToast(`Assigned role "${roleName}" to ${targets.length} administrator(s)`);
      setSelectedAdminIds([]);
      fetchAdmins();
    } catch (err) {
      showToast('Failed to assign bulk roles');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleCreateOrUpdateAdmin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const finalRoleName = selectedPredefinedRole === 'Custom Role' ? customRoleInput : selectedPredefinedRole;
    const parentPermissions = [...new Set(selectedPermissions)];

    if (!newAdminEmail.trim() || !finalRoleName.trim() || parentPermissions.length === 0) {
      showToast('All fields and at least one permission are required');
      return;
    }

    setIsCreateAdminLoading(true);
    try {
      if (editingAdminId) {
        // Edit Mode
        const res = await api.put(`/api/admin/admins/${editingAdminId}/permissions`, {
          roleName: finalRoleName,
          permissions: parentPermissions
        });
        if (res.data.success) {
          showToast('Administrator permissions updated');
          resetAdminForm();
          fetchAdmins();
        }
      } else {
        // Create Mode
        const res = await api.post('/api/admin/create-admin', {
          email: newAdminEmail,
          roleName: finalRoleName,
          permissions: parentPermissions
        });
        if (res.data.success) {
          showToast('Administrator privileges configured');
          resetAdminForm();
          fetchAdmins();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save admin details');
    } finally {
      setIsCreateAdminLoading(false);
    }
  };

  const handleToggleSuspendAdmin = async (adminId, explicitSuspended = undefined) => {
    try {
      const res = await api.put(`/api/admin/admins/${adminId}/suspend`, {
        suspended: explicitSuspended
      });
      if (res.data.success) {
        showToast(res.data.message);
        fetchAdmins();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to suspend admin');
    }
  };

  // Sync textarea state when detailsAdmin changes
  useEffect(() => {
    if (detailsAdmin) {
      setAdminNotesText(detailsAdmin.adminNotes || '');
    }
  }, [detailsAdmin]);

  const handleSaveAdminNotes = async () => {
    if (!detailsAdmin) return;
    setIsSavingNotes(true);
    try {
      const res = await api.put(`/api/admin/admins/${detailsAdmin.id}/notes`, { notes: adminNotesText });
      if (res.data.success) {
        showToast('Admin notes updated successfully');
        setDetailsAdmin(prev => prev ? { ...prev, adminNotes: adminNotesText } : null);
        fetchAdmins();
      }
    } catch(err) {
      showToast('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    try {
      const res = await api.delete(`/api/admin/admins/${adminId}`);
      if (res.data.success) {
        showToast('Admin privileges removed successfully');
        fetchAdmins();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to remove admin');
    }
  };

  const handleResetPermissions = async (adminId) => {
    try {
      const res = await api.put(`/api/admin/admins/${adminId}/reset-permissions`);
      if (res.data.success) {
        showToast('Permissions reset successfully');
        fetchAdmins();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reset permissions');
    }
  };

  const handleForceLogoutAdmin = async (adminId) => {
    try {
      const res = await api.post(`/api/admin/admins/${adminId}/force-logout`);
      if (res.data.success) {
        showToast(res.data.message);
        fetchAdmins();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to force logout');
    }
  };

  const handleSendVerificationEmail = async (adminId) => {
    try {
      const res = await api.post(`/api/admin/admins/${adminId}/send-verification-email`);
      if (res.data.success) {
        showToast(res.data.message);
        fetchAdmins();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send verification email');
    }
  };

  const handleReset2FA = async (adminId) => {
    try {
      const res = await api.post(`/api/admin/admins/${adminId}/reset-2fa`);
      if (res.data.success) {
        showToast(res.data.message);
        fetchAdmins();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reset 2FA');
    }
  };

  const handleTransferOwnership = async (adminId) => {
    try {
      const res = await api.post(`/api/admin/admins/${adminId}/transfer-ownership`);
      if (res.data.success) {
        showToast(res.data.message);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to transfer ownership');
    }
  };

  const fetchLoginHistory = async (admin) => {
    try {
      setHistoryAdmin(admin);
      setHistoryLogs([]);
      const res = await api.get(`/api/admin/admins/${admin.id}/login-history`);
      if (res.data.success) {
        setHistoryLogs(res.data.history || []);
      }
    } catch (err) {
      showToast('Failed to fetch login history');
    }
  };

  const fetchAdminActivityLogs = async (admin) => {
    try {
      setLogsAdmin(admin);
      setLogsList([]);
      const res = await api.get(`/api/admin/admins/${admin.id}/activity-logs`);
      if (res.data.success) {
        setLogsList(res.data.logs || []);
      }
    } catch (err) {
      showToast('Failed to fetch activity logs');
    }
  };

  // User Actions
  const handleToggleSuspendUser = async (userId) => {
    try {
      const res = await api.put(`/api/admin/users/${userId}/suspend`);
      if (res.data.success) {
        showToast(res.data.message);
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(prev => ({ ...prev, isSuspended: !prev.isSuspended, status: !prev.isSuspended ? 'Suspended' : 'Active' }));
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to toggle user status');
    }
  };

  const handleUpgradeUser = async (userId, planName) => {
    try {
      const res = await api.put(`/api/admin/users/${userId}/upgrade`, { plan: planName });
      if (res.data.success) {
        showToast(res.data.message);
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(prev => ({ ...prev, plan: planName }));
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change user plan');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await api.delete(`/api/admin/users/${deleteUserId}`);
      showToast('User permanently deleted');
      setDeleteUserId(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    try {
      const res = await api.put(`/api/admin/applications/${appId}/status`, { status: newStatus });
      if (res.data.success) {
        showToast(`Application updated to ${newStatus}`);
        fetchApplications();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update application');
    }
  };

  const handleSaveUserNotes = async () => {
    if (!selectedUser) return;
    try {
      const res = await api.put(`/api/admin/users/${selectedUser.id}/notes`, { adminNotes: userNotes });
      if (res.data.success) {
        showToast('Internal notes updated');
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, adminNotes: userNotes } : u));
        setSelectedUser(prev => ({ ...prev, adminNotes: userNotes }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update notes');
    }
  };

  // Fetch specific user activity on drawer load
  const loadUserActivity = async (userId) => {
    setUserActivityLoading(true);
    try {
      const res = await api.get(`/api/admin/users/${userId}/activity`);
      if (res.data.success) {
        setUserActivity(res.data.activities || []);
      }
    } catch (err) {
      console.error('Failed to load user activity:', err);
    } finally {
      setUserActivityLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      setUserNotes(selectedUser.adminNotes || "");
      loadUserActivity(selectedUser.id);
    }
  }, [selectedUser]);

  // Contact Messages Actions
  const handleUpdateMessageStatus = async (messageId, newStatus) => {
    try {
      await api.put(`/api/admin/messages/${messageId}/status`, { status: newStatus });
      showToast(`Message status updated: ${newStatus}`);
      fetchMessages();
      if (selectedTicket && selectedTicket.id === messageId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleAssignMessage = async (messageId, adminId) => {
    try {
      const res = await api.put(`/api/admin/messages/${messageId}/assign`, { assignedAdminId: adminId });
      if (res.data.success) {
        showToast('Message assigned successfully');
        fetchMessages();
        if (selectedTicket && selectedTicket.id === messageId) {
          setSelectedTicket(prev => ({ ...prev, assignedAdminId: adminId }));
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to assign message');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReplyAttachments(prev => [
          ...prev,
          {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: reader.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessageReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      showToast('Reply message body is required');
      return;
    }
    setIsSendingReply(true);
    try {
      const res = await api.post(`/api/admin/messages/${selectedTicket.id}/reply`, { 
        replyMessage: replyText,
        attachments: replyAttachments
      });
      if (res.data.success) {
        showToast('Reply email sent successfully');
        setReplyText('');
        setReplyAttachments([]);
        setShowReplyDrawer(false);
        fetchMessages();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSaveMessageNotes = async () => {
    if (!selectedTicket) return;
    try {
      const res = await api.put(`/api/admin/messages/${selectedTicket.id}/notes`, { internalNotes: ticketNotes });
      if (res.data.success) {
        showToast('Message private notes saved');
        fetchMessages();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save notes');
    }
  };

  useEffect(() => {
    if (selectedTicket) {
      setTicketNotes(selectedTicket.internalNotes || "");
    }
  }, [selectedTicket]);

  // Announcements blasting
  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcement.subject.trim() || !announcement.message.trim()) {
      showToast('Subject and message are required.');
      return;
    }

    const target = announcementTarget === 'specific' ? selectedSpecificPlan : announcementTarget;
    setIsSendingAnnouncement(true);
    try {
      const res = await api.post('/api/admin/announcement/send', {
        ...announcement,
        target
      });
      if (res.data.success) {
        showToast(`Announcement sent to ${res.data.count} users successfully!`);
        setAnnouncement({ subject: '', message: '', ctaText: '', ctaUrl: '' });
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to blast announcement');
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const handleSendTestAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcement.subject.trim() || !announcement.message.trim()) {
      showToast('Subject and message are required.');
      return;
    }
    const targetEmail = testEmail.trim() || user?.email;
    setIsSendingAnnouncement(true);
    try {
      const res = await api.post('/api/admin/announcement/send-test', {
        ...announcement,
        testEmail: targetEmail
      });
      if (res.data.success) {
        showToast(`Test announcement email sent to ${targetEmail}`);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send test email');
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  // Base64 file reader helper
  const handleFileAttachment = (e, targetSetter) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const att = {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: reader.result // Base64 Data URL
        };
        targetSetter(prev => [...prev, att]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Email Center Actions
  const handleAssignEmailThread = async (emailId, adminId) => {
    try {
      const res = await api.put(`/api/admin/emails/${emailId}/assign`, { assignedAdminId: adminId });
      if (res.data.success) {
        showToast('Email thread assigned');
        fetchEmails();
        if (selectedThreadId) {
          fetchThreadMessages(selectedThreadId);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to assign thread');
    }
  };

  const handleSendEmailReply = async (e) => {
    e.preventDefault();
    if (!emailReplyBody.trim()) {
      showToast('Email reply body is required');
      return;
    }
    const targetEmail = threadMessages[threadMessages.length - 1];
    if (!targetEmail) return;

    setIsSendingReply(true);
    try {
      const res = await api.post(`/api/admin/emails/${targetEmail.id}/reply`, {
        body: emailReplyBody,
        attachments: emailReplyAttachments
      });
      if (res.data.success) {
        showToast('Email reply sent successfully!');
        setEmailReplyBody('');
        setEmailReplyAttachments([]);
        fetchThreadMessages(selectedThreadId);
        fetchEmails();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send reply. Enforce assignment rights.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!composeTo.trim()) {
      showToast('Recipient Email is required to save a draft');
      return;
    }
    try {
      const res = await api.post('/api/admin/emails/draft', {
        mailbox: composeMailbox,
        recipientEmail: composeTo,
        recipientName: composeToName,
        subject: composeSubject,
        body: composeBody,
        attachments: composeAttachments
      });
      if (res.data.success) {
        showToast('Draft saved successfully');
        if (editingDraftId) {
          await api.delete(`/api/admin/emails/${editingDraftId}`);
        }
        setComposeTo('');
        setComposeToName('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAttachments([]);
        setEditingDraftId(null);
        setComposeMode(false);
        fetchEmails();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save draft');
    }
  };

  const handleSendOrScheduleEmail = async (e) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      showToast('To, Subject, and Message Body are required');
      return;
    }

    if (isScheduled && !scheduledDate) {
      showToast('Please pick a scheduled date and time');
      return;
    }

    setIsComposingEmail(true);
    try {
      let res;
      if (isScheduled) {
        res = await api.post('/api/admin/emails/schedule', {
          mailbox: composeMailbox,
          recipientEmail: composeTo,
          recipientName: composeToName,
          subject: composeSubject,
          body: composeBody,
          attachments: composeAttachments,
          scheduledAt: scheduledDate
        });
      } else {
        res = await api.post('/api/admin/emails/compose', {
          mailbox: composeMailbox,
          recipientEmail: composeTo,
          recipientName: composeToName,
          subject: composeSubject,
          body: composeBody,
          attachments: composeAttachments
        });
      }

      if (res.data.success) {
        showToast(isScheduled ? 'Email scheduled successfully' : 'Outbound email thread created & sent');
        if (editingDraftId) {
          await api.delete(`/api/admin/emails/${editingDraftId}`);
        }
        setComposeTo('');
        setComposeToName('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAttachments([]);
        setIsScheduled(false);
        setScheduledDate('');
        setEditingDraftId(null);
        setComposeMode(false);
        fetchEmails();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to process email');
    } finally {
      setIsComposingEmail(false);
    }
  };

  const handleSimulateEmail = async (e) => {
    e.preventDefault();
    if (!simulateSenderEmail.trim() || !simulateSubject.trim() || !simulateBody.trim()) {
      showToast('Sender, Subject, and Body are required');
      return;
    }
    setIsSimulatingEmail(true);
    try {
      const res = await api.post('/api/admin/emails/simulate', {
        mailbox: simulateMailbox,
        senderName: simulateSenderName,
        senderEmail: simulateSenderEmail,
        subject: simulateSubject,
        body: simulateBody
      });
      if (res.data.success) {
        showToast('Incoming email simulated');
        setSimulateSenderName('');
        setSimulateSenderEmail('');
        setSimulateSubject('');
        setSimulateBody('');
        setShowSimulateModal(false);
        fetchEmails();
      }
    } catch (err) {
      showToast('Failed to simulate incoming email');
    } finally {
      setIsSimulatingEmail(false);
    }
  };

  // Define sidebar tabs list based on permissions and owner role
  const getSidebarTabs = () => {
    const list = [];
    const isOwner = user?.role === 'owner';
    let permissions = [];
    try {
      permissions = JSON.parse(user?.adminPermissions || '[]');
    } catch(e) {
      permissions = [];
    }

    const hasPerm = (p) => isOwner || permissions.some(x => String(x).toLowerCase().replace(' ', '_') === p || String(x).startsWith(p + '_'));

    if (hasPerm('alerts')) list.push({ id: 'alerts', label: 'Alerts', icon: <Mail size={18} /> });
    if (hasPerm('dashboard')) {
      list.push({ id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> });
    }
    if (isOwner) {
      list.push({ id: 'admin-management', label: 'Admin Monitoring', icon: <Shield size={18} /> });
      list.push({ id: 'security-logs', label: 'Security Logs', icon: <AlertTriangle size={18} /> });
      list.push({ id: 'verification-logs', label: 'Verification Logs', icon: <CheckCircle size={18} /> });
      list.push({ id: 'email-diagnostics', label: 'Email Diagnostics', icon: <Mail size={18} /> });
      list.push({ id: 'ai-api', label: 'AI API Keys', icon: <Cpu size={18} /> });
      list.push({ id: 'job-providers', label: 'Job Providers', icon: <Globe size={18} /> });
    }
    if (hasPerm('applications')) {
      list.push({ id: 'applications', label: 'Applications', icon: <Briefcase size={18} /> });
    }
    if (hasPerm('users')) {
      list.push({ id: 'users', label: 'Users', icon: <Users size={18} /> });
    }
    if (hasPerm('analytics')) {
      list.push({ id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> });
    }
    if (hasPerm('revenue')) {
      list.push({ id: 'revenue', label: 'Revenue', icon: <DollarSign size={18} /> });
    }
    if (hasPerm('announcements')) {
      list.push({ id: 'announcements', label: 'Announcements', icon: <Megaphone size={18} /> });
    }
    if (hasPerm('messages')) {
      list.push({ id: 'messages', label: 'Messages', icon: <MessageSquare size={18} /> });
    }
    if (hasPerm('email_center')) {
      list.push({ id: 'email-center', label: 'Email Center', icon: <Mail size={18} /> });
    }
    if (hasPerm('logs')) {
      list.push({ id: 'activity-log', label: 'Activity Log', icon: <Activity size={18} /> });
    }

    return list;
  };

  const sidebarTabs = getSidebarTabs();

  // Enforce security tab check on activeTab change
  useEffect(() => {
    if (isPinVerified && sidebarTabs.length > 0) {
      const allowed = sidebarTabs.some(t => t.id === activeTab);
      if (!allowed) {
        setActiveTab(sidebarTabs[0].id);
      }
    }
  }, [user, sidebarTabs, activeTab, isPinVerified]);

  // Approved colors for graphs
  const bwColors = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'];

  if (!isPinVerified) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-4 text-black">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[30%] top-[30%] h-[400px] w-[400px] rounded-full bg-[#F7F7F7] blur-[120px]" />
          <div className="absolute right-[30%] bottom-[30%] h-[400px] w-[400px] rounded-full bg-[#F7F7F7] blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-3xl border border-[#E0E0E0] bg-[#F7F7F7] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.08)] backdrop-blur-2xl text-center space-y-6"
        >
          {otpStep === "email" ? (
            <form onSubmit={handleSendAdminOtp} className="space-y-6 text-left">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl border border-[#E0E0E0] bg-white flex items-center justify-center mx-auto">
                  <Shield size={22} className="text-black" />
                </div>
                <h2 className="text-xl font-bold text-black tracking-tight">Admin Authorization</h2>
                <p className="text-xs text-[#555555] max-w-[280px] mx-auto leading-relaxed">
                  Enter your registered administrator email to request a 6-digit verification code.
                </p>
              </div>

              {otpError && (
                <div className="p-3.5 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 text-xs text-[#EF4444] font-medium leading-normal">
                  {otpError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#555555] uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@hirenextai.com"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black placeholder:text-black/20 focus:outline-none focus:border-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full py-3 bg-black text-white font-bold rounded-xl text-sm transition-all hover:bg-black/90 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {otpLoading ? "Sending Code..." : "Send Verification Code"}
                <Send size={14} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-xs text-[#555555] hover:text-black transition-colors block w-full text-center py-1 font-medium"
              >
                ← Back to Home
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <OTPVerification
                email={adminEmail}
                isAdminFlow={true}
                onVerify={handleAdminOtpVerifySuccess}
                onResend={handleSendAdminOtp}
              />
              <button
                onClick={() => setOtpStep("email")}
                className="text-xs text-[#555555] hover:text-black transition-colors block w-full text-center font-semibold cursor-pointer"
              >
                ← Change Email address
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-refined min-h-screen bg-white text-black flex">
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-[#F7F7F7] border-r border-[#E0E0E0] h-screen fixed left-0 flex flex-col justify-between z-40">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-[#E0E0E0]">
            <span className="font-display font-extrabold text-lg tracking-tight">
              Hirenext<span className="text-black">AI</span> <span className="text-[10px] text-black font-normal uppercase ml-1 px-1.5 py-0.5 rounded bg-white border border-[#E0E0E0]">Admin</span>
            </span>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {sidebarTabs.map(tab => (
              <button
                key={tab.id}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${ activeTab === tab.id ? 'admin-nav-active bg-white text-black border border-[#E0E0E0]' : 'text-[#555555] hover:text-black hover:bg-white' }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* User Info Bottom */}
        <div className="p-4 border-t border-[#E0E0E0] flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-black truncate">{user?.firstName || 'Admin'}</span>
            <span className="text-[10px] text-[#555555] truncate">{user?.email}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_pin_verified');
                setIsPinVerified(false);
                setOtpStep("email");
              }}
              title="Lock Screen"
              className="p-2 rounded-lg text-[#777777] hover:text-black hover:bg-[#F2F2F2] transition-colors cursor-pointer"
            >
              <Lock size={14} />
            </button>
            <button
              onClick={logout}
              title="Log Out"
              className="p-2 rounded-lg text-[#777777] hover:text-black hover:bg-[#F2F2F2] transition-colors shrink-0 cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-60 flex-1 p-8 min-w-0 overflow-y-auto h-screen">
        {user && user.emailVerified === false && showVerificationBanner && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 shrink-0 text-base mt-0.5">⚠️</span>
              <div className="text-left">
                <p className="text-xs font-semibold text-amber-900">Your email address has not been verified.</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Please verify your email to secure your account and avoid potential restrictions.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[10px] cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                {isResendingVerification ? 'Sending...' : 'Verify Email'}
              </button>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="px-3.5 py-1.5 bg-white border border-amber-200 hover:bg-amber-100/50 text-amber-800 font-semibold rounded-xl text-[10px] cursor-pointer shadow-sm transition-colors disabled:opacity-50"
              >
                Resend Verification Email
              </button>
              <button
                type="button"
                onClick={() => setShowVerificationBanner(false)}
                className="ml-1 p-1 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
              >
                <span className="text-xs font-bold font-sans">✖</span>
              </button>
            </div>
          </div>
        )}

        <header className="flex items-center justify-between mb-8 pb-4 border-b border-[#E0E0E0]">
          <div>
            <h2 className="text-2xl font-bold text-black capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#555555] font-medium px-3 py-1.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] flex items-center gap-1.5 uppercase">
              <Shield size={12} className="text-black" />
              {user?.role}
            </span>
          </div>
        </header>

        {/* ==========================================
            DASHBOARD TAB
           ========================================== */}
        {activeTab === 'alerts' && <AlertsPanel />}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 text-center shadow-sm">
                <Users className="w-6 h-6 text-black mx-auto mb-2" />
                <div className="text-3xl font-bold text-black">{stats.totalUsers}</div>
                <div className="text-xs text-[#555555] mt-1 font-medium">Total Users</div>
              </div>

              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 text-center shadow-sm">
                <Activity className="w-6 h-6 text-black mx-auto mb-2" />
                <div className="text-3xl font-bold text-black">{stats.activeToday}</div>
                <div className="text-xs text-[#555555] mt-1 font-medium">Active Today</div>
              </div>

              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 text-center shadow-sm">
                <Plus className="w-6 h-6 text-black mx-auto mb-2" />
                <div className="text-3xl font-bold text-black">{stats.newRegistrations}</div>
                <div className="text-xs text-[#555555] mt-1 font-medium">New Registrations</div>
              </div>

              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 text-center shadow-sm">
                <DollarSign className="w-6 h-6 text-black mx-auto mb-2" />
                <div className="text-3xl font-bold text-black">{stats.conversionRate}%</div>
                <div className="text-xs text-[#555555] mt-1 font-medium">Conversion Rate</div>
              </div>
            </div>

            {/* Recent Registrations Table */}
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg text-black">Recent Registrations</h3>
                  <p className="text-xs text-[#555555]">Latest candidates registered on the platform.</p>
                </div>
              </div>

              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-xs text-[#555555] uppercase font-semibold">
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Joined</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.slice(0, 5).map(u => (
                      <tr key={u.id} className="hover:bg-[#F9F9F9] transition-colors text-sm text-[#222222]">
                        <td className="px-5 py-3.5 font-medium text-black">{u.displayName}</td>
                        <td className="px-5 py-3.5 text-[#555555]">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPlanBadgeClass(u.plan)}`}>
                            {u.plan || 'Free'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[#555555]/80 font-mono text-xs">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(u.status)}`}>
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            ADMIN MANAGEMENT TAB (Owner Only)
           ========================================== */}
        {activeTab === 'admin-management' && user?.role === 'owner' && (
          <div className="space-y-8 animate-fade-in text-left">
            <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-8 items-start">
              {/* Left Panel: Create/Edit Administrator */}
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-[24px] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="border-b border-[#E0E0E0] pb-5 mb-6 text-left">
                    <h3 className="font-bold text-xl text-black">
                      {editingAdminId ? 'Edit Administrator' : 'Create Administrator'}
                    </h3>
                    <p className="text-xs text-[#555555] mt-1">
                      Invite a trusted team member to manage HirenextAI.
                    </p>
                  </div>

                  <form onSubmit={handleCreateOrUpdateAdmin} className="space-y-6 text-left">
                    {/* Section 1: Email Address */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#555555] uppercase tracking-wider block">Email Address</label>
                      <input
                        type="email"
                        required
                        disabled={!!editingAdminId}
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-[10px] text-[#777777]">Invitation will be sent to this email.</p>
                    </div>

                    {/* Section 2: Role Name */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#555555] uppercase tracking-wider block">Role Name</label>
                      <select
                        value={selectedPredefinedRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-black cursor-pointer font-sans"
                      >
                        <option value="" disabled>Select a role...</option>
                        <option value="Support Admin">Support Admin</option>
                        <option value="Marketing Admin">Marketing Admin</option>
                        <option value="Moderator">Moderator</option>
                        <option value="Hiring Manager">Hiring Manager</option>
                        <option value="Recruiter">Recruiter</option>
                        <option value="Finance Admin">Finance Admin</option>
                        <option value="Custom Role">Custom Role</option>
                      </select>

                      {selectedPredefinedRole === 'Custom Role' && (
                        <div className="mt-2.5 space-y-1.5 animate-fade-in">
                          <input
                            type="text"
                            required
                            value={customRoleInput}
                            onChange={(e) => setCustomRoleInput(e.target.value)}
                            placeholder="e.g. Ops Lead"
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-black"
                          />
                          <p className="text-[10px] text-[#777777]">Enter custom title</p>
                        </div>
                      )}
                    </div>

                    {/* Section 3: Permissions */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-[#555555] uppercase tracking-wider block">Permissions</label>
                        <span className="text-[10px] font-bold text-black bg-white px-2 py-0.5 border border-[#E0E0E0] rounded-full">
                          {selectedPermissions.length} selected
                        </span>
                      </div>

                      {/* Permissions Search and Actions */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={permissionSearch}
                          onChange={(e) => setPermissionSearch(e.target.value)}
                          placeholder="Search permissions..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none focus:border-black placeholder:text-black/25"
                        />
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPermissions(PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id)))}
                            className="flex-1 py-1.5 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[10px] font-bold rounded-lg text-black cursor-pointer text-center transition-colors"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPermissions([])}
                            className="flex-1 py-1.5 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[10px] font-bold rounded-lg text-black cursor-pointer text-center transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* Grouped Permission Cards */}
                      <div className="space-y-2.5 max-h-[260px] overflow-y-auto p-1.5 bg-white border border-[#E0E0E0] rounded-xl custom-sidebar-scrollbar">
                        {PERMISSION_GROUPS.filter(group => 
                          group.label.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                          group.permissions.some(p => p.label.toLowerCase().includes(permissionSearch.toLowerCase()))
                        ).map(group => {
                          const isCollapsed = collapsedCategories[group.id];
                          const selectedInGroup = group.permissions.filter(p => selectedPermissions.includes(p.id)).length;
                          
                          return (
                            <div key={group.id} className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-[#FAFAFA] transition-all">
                              {/* Header block */}
                              <div 
                                onClick={() => setCollapsedCategories(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                                className="flex justify-between items-center px-4 py-2 bg-[#F2F2F2] border-b border-[#E0E0E0] cursor-pointer hover:bg-[#EAEAEA] select-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-black">{group.label}</span>
                                  {selectedInGroup > 0 && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-black text-white">
                                      {selectedInGroup}/{group.permissions.length}
                                    </span>
                                  )}
                                </div>
                                <ChevronDown 
                                  size={13} 
                                  className={`text-gray-500 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
                                />
                              </div>

                              {/* Permissions checklist body */}
                              {!isCollapsed && (
                                <div className="p-3.5 space-y-2 bg-white divide-y divide-gray-50">
                                  {group.permissions.filter(p => p.label.toLowerCase().includes(permissionSearch.toLowerCase())).map(p => (
                                    <label key={p.id} className="flex items-center gap-2.5 text-xs text-[#333333] cursor-pointer select-none pt-1.5 first:pt-0">
                                      <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(p.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedPermissions(prev => [...prev, p.id]);
                                          } else {
                                            setSelectedPermissions(prev => prev.filter(item => item !== p.id));
                                          }
                                        }}
                                        className="rounded border-[#E0E0E0] text-black focus:ring-black cursor-pointer w-3.5 h-3.5"
                                      />
                                      <span className="font-medium text-[#444444]">{p.label}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Summary Box */}
                    {selectedPermissions.length > 0 && (
                      <div className="border border-[#E0E0E0] rounded-xl p-4 bg-gray-50 space-y-2 animate-fade-in">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block border-b pb-1">Live Access Summary</span>
                        <p className="text-xs font-bold text-black">
                          {selectedPredefinedRole === 'Custom Role' ? (customRoleInput || 'Custom Admin') : (selectedPredefinedRole || 'Admin')}:
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs font-medium pt-1">
                          <div className="space-y-1.5 text-left">
                            <span className="text-[8px] text-[#777777] font-bold uppercase block tracking-wider">Can access</span>
                            {PERMISSION_GROUPS.map(g => {
                              const hasSelected = g.permissions.some(p => selectedPermissions.includes(p.id));
                              if (hasSelected) {
                                return (
                                  <div key={g.id} className="text-green-600 flex items-center gap-1 font-bold text-[10px]">
                                    ✔ <span className="text-[#333333] font-medium">{g.label}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                          <div className="space-y-1.5 text-left">
                            <span className="text-[8px] text-[#777777] font-bold uppercase block tracking-wider">Cannot access</span>
                            {PERMISSION_GROUPS.map(g => {
                              const hasSelected = g.permissions.some(p => selectedPermissions.includes(p.id));
                              if (!hasSelected) {
                                return (
                                  <div key={g.id} className="text-red-500 flex items-center gap-1 font-bold text-[10px]">
                                    ✖ <span className="text-gray-400 font-medium">{g.label}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isCreateAdminLoading}
                      className="w-full h-11 bg-black text-white hover:bg-black/90 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      {isCreateAdminLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Processing Request...
                        </>
                      ) : (
                        <>
                          <span>+</span>
                          <span>{editingAdminId ? 'Save Permissions' : 'Invite Administrator'}</span>
                        </>
                      )}
                    </button>

                    {editingAdminId && (
                      <button
                        type="button"
                        onClick={resetAdminForm}
                        className="w-full h-10 border border-[#E0E0E0] bg-white hover:bg-gray-50 text-black font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

              {/* Right Panel: Administrators List */}
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-[24px] p-8 shadow-sm flex flex-col min-w-0">
                <div className="border-b border-[#E0E0E0] pb-5 mb-6 text-left flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl text-black">Administrators</h3>
                    <p className="text-xs text-[#555555] mt-1">
                      Manage all team members with access to HirenextAI.
                    </p>
                  </div>
                  {/* Column Visibility dropdown */}
                  <div className="relative inline-block text-left" id="col-visibility-dropdown">
                    <button
                      onClick={() => setShowColVisibility(!showColVisibility)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-[#333333] border border-[#E0E0E0] text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                      type="button"
                    >
                      Columns <Eye size={12} className="text-[#888888]" />
                    </button>
                    {showColVisibility && (
                      <div className="absolute right-0 mt-1 w-48 rounded-xl border border-[#E0E0E0] bg-white shadow-2xl z-[99] p-3 space-y-2 text-xs font-medium text-black text-left">
                        <div className="font-bold text-black border-b border-[#F0F0F0] pb-1 mb-1">Visible Columns</div>
                        {Object.entries({
                          name: 'Name',
                          email: 'Email',
                          role: 'Role',
                          status: 'Status',
                          lastLogin: 'Last Login',
                          permissions: 'Permissions',
                          createdDate: 'Created Date',
                          verification: 'Verification'
                        }).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer text-[#555555] hover:text-black select-none">
                            <input
                              type="checkbox"
                              checked={visibleAdminCols[key]}
                              onChange={() => setVisibleAdminCols(prev => ({ ...prev, [key]: !prev[key] }))}
                              className="rounded border-[#E0E0E0] text-black focus:ring-black cursor-pointer"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Search and Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center mb-6 text-left">
                  <div className="relative flex-1 w-full">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                    <input
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="Search Admin by name, email, or role..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-black placeholder:text-black/25 transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex gap-2.5 w-full md:w-auto">
                    <select
                      value={adminRoleFilter}
                      onChange={(e) => setAdminRoleFilter(e.target.value)}
                      className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black cursor-pointer shadow-sm w-full md:w-44 font-sans"
                    >
                      <option value="All">All Roles</option>
                      <option value="Owner">Owner</option>
                      <option value="Support">Support</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Recruiter">Recruiter</option>
                      <option value="Finance">Finance</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Pending Verification">Pending Verification</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Actions Control Bar */}
                {selectedAdminIds.length > 0 && (
                  <div className="bg-black text-white px-5 py-3 rounded-2xl flex items-center justify-between gap-4 mb-6 shadow-lg animate-slide-up text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold bg-[#333333] px-2.5 py-1 rounded-lg">
                        {selectedAdminIds.length} Selected
                      </span>
                      <span className="text-xs text-gray-300 font-medium">Apply action to selected:</span>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => handleBulkSuspend(true)}
                        disabled={isBulkActionLoading}
                        className="px-3 py-1.5 bg-[#333333] hover:bg-[#444] text-xs font-bold rounded-lg transition-colors cursor-pointer text-white disabled:opacity-50"
                      >
                        Suspend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSuspend(false)}
                        disabled={isBulkActionLoading}
                        className="px-3 py-1.5 bg-[#333333] hover:bg-[#444] text-xs font-bold rounded-lg transition-colors cursor-pointer text-white disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkResendVerification}
                        disabled={isBulkActionLoading}
                        className="px-3 py-1.5 bg-[#333333] hover:bg-[#444] text-xs font-bold rounded-lg transition-colors cursor-pointer text-white disabled:opacity-50"
                      >
                        Resend Verification
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={isBulkActionLoading}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer text-white disabled:opacity-50"
                      >
                        Delete Admin
                      </button>
                      
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkAssignRole(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        disabled={isBulkActionLoading}
                        className="bg-[#333333] border-none text-white text-xs font-bold rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
                      >
                        <option value="">Assign Role...</option>
                        <option value="Support Admin">Support Admin</option>
                        <option value="Marketing Admin">Marketing Admin</option>
                        <option value="Moderator">Moderator</option>
                        <option value="Hiring Manager">Hiring Manager</option>
                        <option value="Recruiter">Recruiter</option>
                        <option value="Finance Admin">Finance Admin</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Table Scroll Zone */}
                <div className="border border-[#E0E0E0] rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto overflow-y-auto max-h-[500px] min-w-0 admin-custom-scrollbar admin-table-container">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-[10px] text-[#555555] uppercase font-bold tracking-wider select-none">
                        <th className="px-4 py-4 w-10 text-center bg-[#F7F7F7] sticky top-0 z-10">
                          <input
                            type="checkbox"
                            checked={admins.length > 0 && admins.filter(a => a.role !== 'owner').every(a => selectedAdminIds.includes(a.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const targetIds = admins.filter(a => a.role !== 'owner').map(a => a.id);
                                setSelectedAdminIds(targetIds);
                              } else {
                                setSelectedAdminIds([]);
                              }
                            }}
                            className="rounded border-[#E0E0E0] text-black focus:ring-black cursor-pointer w-3.5 h-3.5"
                          />
                        </th>
                        <th className="px-5 py-4 w-12 text-center bg-[#F7F7F7] sticky top-0 z-10">Avatar</th>
                        {visibleAdminCols.name && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Name</th>}
                        {visibleAdminCols.email && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Email</th>}
                        {visibleAdminCols.role && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Role</th>}
                        {visibleAdminCols.status && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Status</th>}
                        {visibleAdminCols.lastLogin && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Last Login</th>}
                        {visibleAdminCols.permissions && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Permissions</th>}
                        {visibleAdminCols.createdDate && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Created Date</th>}
                        {visibleAdminCols.verification && <th className="px-5 py-4 bg-[#F7F7F7] sticky top-0 z-10">Verification</th>}
                        <th className="px-5 py-4 text-right pr-6 w-20 bg-[#F7F7F7] sticky top-0 z-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {admins.filter(a => {
                        const searchLower = adminSearchQuery.toLowerCase().trim();
                        const name = [a.firstName, a.lastName].filter(Boolean).join(' ').toLowerCase();
                        const email = (a.email || '').toLowerCase();
                        const roleName = (a.adminRoleName || (a.role === 'owner' ? 'Owner' : 'Administrator')).toLowerCase();
                        const matchesSearch = !searchLower || name.includes(searchLower) || email.includes(searchLower) || roleName.includes(searchLower);

                        let matchesFilter = true;
                        if (adminRoleFilter === 'Owner') {
                          matchesFilter = a.role === 'owner';
                        } else if (adminRoleFilter === 'Support') {
                          matchesFilter = roleName.includes('support');
                        } else if (adminRoleFilter === 'Marketing') {
                          matchesFilter = roleName.includes('marketing');
                        } else if (adminRoleFilter === 'Recruiter') {
                          matchesFilter = roleName.includes('recruiter') || roleName.includes('hiring');
                        } else if (adminRoleFilter === 'Finance') {
                          matchesFilter = roleName.includes('finance');
                        } else if (adminRoleFilter === 'Suspended') {
                          matchesFilter = !!a.isSuspended;
                        } else if (adminRoleFilter === 'Pending Verification') {
                          matchesFilter = !a.isVerified;
                        }

                        return matchesSearch && matchesFilter;
                      }).map(adm => {
                        const initials = adm.email ? adm.email.slice(0, 2).toUpperCase() : 'AD';
                        const isSelected = selectedAdminIds.includes(adm.id);
                        const isOwner = adm.role === 'owner';
                        
                        return (
                          <tr key={adm.id} className={`hover:bg-[#F9F9F9] transition-colors text-xs text-[#222222] ${isSelected ? 'bg-[#FAFAFA]' : ''}`}>
                            <td className="px-4 py-3.5 text-center">
                              {!isOwner ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAdminIds(prev => [...prev, adm.id]);
                                    } else {
                                      setSelectedAdminIds(prev => prev.filter(id => id !== adm.id));
                                    }
                                  }}
                                  className="rounded border-[#E0E0E0] text-black focus:ring-black cursor-pointer w-3.5 h-3.5"
                                />
                              ) : (
                                <span className="text-[10px] text-gray-300 select-none">-</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center font-bold text-[10px] select-none shadow-sm ${
                                isOwner ? 'bg-amber-100 text-amber-800 border border-amber-300 owner-gold-badge' :
                                adm.isSuspended ? 'bg-red-50 text-red-700 border border-red-200' :
                                'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}>
                                {initials}
                              </div>
                            </td>
                            {visibleAdminCols.name && (
                              <td className="px-5 py-3.5 font-bold text-black">
                                {[adm.firstName, adm.lastName].filter(Boolean).join(' ') || adm.email.split('@')[0]}
                              </td>
                            )}
                            {visibleAdminCols.email && (
                              <td className="px-5 py-3.5 font-medium font-mono text-[#555555]">
                                {adm.email}
                              </td>
                            )}
                            {visibleAdminCols.role && (
                              <td className="px-5 py-3.5">
                                {isOwner ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 owner-gold-badge">
                                    👑 OWNER
                                  </span>
                                ) : (
                                  <span className="font-semibold text-[#555555]">
                                    {adm.adminRoleName || 'Administrator'}
                                  </span>
                                )}
                              </td>
                            )}
                            {visibleAdminCols.status && (
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  adm.isSuspended ? 'bg-red-50 text-red-600 border-red-200' :
                                  !adm.isVerified ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                  adm.liveStatus === 'online' ? 'bg-green-50 text-green-600 border-green-200' :
                                  'bg-gray-50 text-gray-500 border-gray-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    adm.isSuspended ? 'bg-red-500' :
                                    !adm.isVerified ? 'bg-amber-500' :
                                    adm.liveStatus === 'online' ? 'bg-green-500' :
                                    'bg-gray-400'
                                  }`} />
                                  {adm.isSuspended ? 'Suspended' :
                                   !adm.isVerified ? 'Pending Verification' :
                                   adm.liveStatus === 'online' ? 'Online' : 'Offline'}
                                </span>
                              </td>
                            )}
                            {visibleAdminCols.lastLogin && (
                              <td className="px-5 py-3.5 text-[#555555] font-medium font-sans">
                                {adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleString() : 'Never'}
                              </td>
                            )}
                            {visibleAdminCols.permissions && (
                              <td className="px-5 py-3.5">
                                {isOwner ? (
                                  <span className="font-bold text-black uppercase tracking-wider text-[9px] px-1.5 py-0.5 bg-black text-white rounded">ALL</span>
                                ) : (() => {
                                  let perms = [];
                                  try { perms = JSON.parse(adm.adminPermissions || '[]'); } catch(e) {}
                                  return (
                                    <span className="text-[10px] font-bold text-black bg-white px-2 py-0.5 border border-[#E0E0E0] rounded-full">
                                      {perms.length} selected
                                    </span>
                                  );
                                })()}
                              </td>
                            )}
                            {visibleAdminCols.createdDate && (
                              <td className="px-5 py-3.5 text-[#555555] font-medium font-sans">
                                {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                            )}
                            {visibleAdminCols.verification && (
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  adm.isVerified ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                                }`}>
                                  {adm.isVerified ? 'Verified' : 'Pending'}
                                </span>
                              </td>
                            )}
                            <td className="px-5 py-3.5 text-right pr-6">
                              <div className="relative inline-block text-left" id={`admin-actions-${adm.id}`}>
                                <button
                                  type="button"
                                  onClick={() => setActiveDropdownId(activeDropdownId === adm.id ? null : adm.id)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-gray-50 text-[#333333] border border-[#E0E0E0] cursor-pointer shadow-sm"
                                >
                                  <MoreHorizontal size={14} className="text-[#888888]" />
                                </button>
                                {activeDropdownId === adm.id && (
                                  <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-[#E0E0E0] bg-white shadow-2xl z-[999] py-1 text-left text-xs font-semibold text-black">
                                    {/* View Profile */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProfileDrawerAdmin(adm);
                                        setIsProfileDrawerOpen(true);
                                        loadProfileDrawerLogs(adm.id);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <UserCheck size={12} /> View Profile
                                    </button>

                                    {/* View Activity */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('activity-log');
                                        setActivityRange('7d');
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Activity size={12} /> View Activity
                                    </button>

                                    {/* Edit Permissions (Standard Admin only) */}
                                    {!isOwner && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          loadAdminForEditing(adm);
                                          setActiveDropdownId(null);
                                          document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] transition-colors cursor-pointer flex items-center gap-1.5 border-t border-gray-50"
                                      >
                                        <Shield size={12} /> Edit Permissions
                                      </button>
                                    )}

                                    {/* Force Logout */}
                                    <button
                                      type="button"
                                      onClick={() => { handleForceLogoutAdmin(adm.id); setActiveDropdownId(null); }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <LogOut size={12} /> Force Logout
                                    </button>

                                    {/* Send Verification Email */}
                                    {!isOwner && (
                                      <button
                                        type="button"
                                        onClick={() => { handleSendVerificationEmail(adm.id); setActiveDropdownId(null); }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] transition-colors cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Mail size={12} /> Send Verification Email
                                      </button>
                                    )}

                                    {/* Reset Password */}
                                    <button
                                      type="button"
                                      onClick={() => { handleResetAdminPassword(adm.email); setActiveDropdownId(null); }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Key size={12} /> Reset Password
                                    </button>

                                    {/* Suspend / Reactivate */}
                                    {!isOwner && (
                                      adm.isSuspended ? (
                                        <button
                                          type="button"
                                          onClick={() => { handleToggleSuspendAdmin(adm.id, false); setActiveDropdownId(null); }}
                                          className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] text-green-600 transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                          <CheckCircle size={12} /> Reactivate Admin
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => { setConfirmDialog({ isOpen: true, type: 'suspend', admin: adm }); setActiveDropdownId(null); }}
                                          className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F2] text-red-600 transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                          <Lock size={12} /> Suspend Admin
                                        </button>
                                      )
                                    )}

                                    {/* Delete Admin */}
                                    {!isOwner && (
                                      <button
                                        type="button"
                                        onClick={() => { setConfirmDialog({ isOpen: true, type: 'remove', admin: adm }); setActiveDropdownId(null); }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-[#FDE8E8] text-[#EF4444] border-t border-gray-100 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Trash2 size={12} /> Delete Admin
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            APPLICATIONS PAGE
           ========================================== */}
        {activeTab === 'applications' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg text-black">Application Management</h3>
                  <p className="text-xs text-[#555555]">Manage and update status of user job applications.</p>
                </div>
                {/* Application Filter */}
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-[#E0E0E0]">
                  {['all', 'Pending', 'Viewing', 'Shortlisted', 'Interview', 'Selected', 'Rejected'].map(st => (
                    <button
                      key={st}
                      onClick={() => setAppFilterStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${ appFilterStatus === st ? 'bg-black text-white' : 'text-[#666666] hover:text-black' }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-xs text-[#555555] uppercase font-semibold">
                      <th className="px-5 py-3.5">Candidate</th>
                      <th className="px-5 py-3.5">Job Title</th>
                      <th className="px-5 py-3.5">Company</th>
                      <th className="px-5 py-3.5">Salary / Match</th>
                      <th className="px-5 py-3.5">Applied Date</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isApplicationsLoading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-[#555555] text-sm">Loading applications...</td>
                      </tr>
                    ) : applications.filter(a => appFilterStatus === 'all' || a.status === appFilterStatus).length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-[#555555] text-sm">No applications found.</td>
                      </tr>
                    ) : (
                      applications.filter(a => appFilterStatus === 'all' || a.status === appFilterStatus).map(app => (
                        <tr key={app.id} className="hover:bg-[#F9F9F9] transition-colors text-sm text-[#222222]">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-black">{app.name}</div>
                            <div className="text-xs text-[#555555]">{app.email}</div>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-black">{app.jobTitle}</td>
                          <td className="px-5 py-3.5 text-[#555555]">{app.company}</td>
                          <td className="px-5 py-3.5 font-mono text-xs">
                            <div>{app.salary || 'N/A'}</div>
                            <div className="text-[10px] text-[#666666]">{app.matchScore}% match</div>
                          </td>
                          <td className="px-5 py-3.5 text-[#555555] font-mono text-xs">
                            {new Date(app.appliedAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${getAppStatusClass(app.status)}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <select
                              value={app.status}
                              onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                              className="bg-white border border-[#E0E0E0] rounded-lg px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-white cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Viewing">Viewing</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Interview">Interview</option>
                              <option value="Selected">Selected</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            USERS TAB
           ========================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter controls row */}
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-4 gap-4 items-center">
                <div className="relative col-span-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-white placeholder:text-black/25 transition-all"
                  />
                </div>

                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value="">All Plans</option>
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Max">Max</option>
                  <option value="Ultimate">Ultimate</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-xs text-[#555555] uppercase font-semibold">
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Joined</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-[#555555] text-sm">Loading users...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-[#555555] text-sm">No users found.</td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="hover:bg-[#F9F9F9] transition-colors text-sm text-[#222222]">
                          <td className="px-5 py-3.5 font-medium text-black">{u.displayName}</td>
                          <td className="px-5 py-3.5 text-[#555555]">{u.email}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPlanBadgeClass(u.plan)}`}>
                              {u.plan || 'Free'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#555555]/85 font-mono text-xs">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(u.status)}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowDrawer(true);
                                }}
                                title="View details"
                                className="p-1.5 rounded bg-white hover:bg-[#F7F7F7] text-black border border-[#E0E0E0] hover:border-[#C4C4C4] transition-all cursor-pointer"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                onClick={() => handleToggleSuspendUser(u.id)}
                                title={u.isSuspended ? "Unsuspend Candidate" : "Suspend Candidate"}
                                className={`p-1.5 rounded border border-[#E0E0E0] transition-all cursor-pointer ${u.isSuspended ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-white hover:bg-red-50 hover:text-red-500'}`}
                              >
                                <Lock size={14} />
                              </button>

                              <button
                                onClick={() => setDeleteUserId(u.id)}
                                title="Delete User"
                                className="p-1.5 rounded bg-white hover:bg-[#FDE8E8] text-[#EF4444] border border-[#E0E0E0] transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E0E0E0]">
                  <span className="text-xs text-[#555555]">
                    Showing Page {currentPage} of {totalPages} ({totalUsersCount} total users)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-white border border-[#E0E0E0] hover:bg-[#F2F2F2] disabled:opacity-30 disabled:cursor-not-allowed text-black transition-all cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-white border border-[#E0E0E0] hover:bg-[#F2F2F2] disabled:opacity-30 disabled:cursor-not-allowed text-black transition-all cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            ANALYTICS TAB
           ========================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-black">Analytics Dashboard</h2>
              <div className="flex bg-[#F0F0F0] rounded-xl p-1 border border-[#E0E0E0]">
                {[
                  { value: 'today', label: 'Today' },
                  { value: '7days', label: '7 Days' },
                  { value: '30days', label: '30 Days' },
                  { value: '90days', label: '90 Days' },
                  { value: '1year', label: '1 Year' }
                ].map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setAnalyticsRange(r.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      analyticsRange === r.value
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {isAnalyticsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <RefreshCw className="w-8 h-8 text-black animate-spin" />
                <p className="text-sm text-gray-500 font-medium animate-pulse">Querying database statistics...</p>
              </div>
            ) : (!analyticsData || analyticsData.metrics?.totalUsers === 0) ? (
              <div className="text-center py-24 text-gray-500 font-medium bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl shadow-sm">
                No analytics data available yet.
              </div>
            ) : analyticsData ? (
              <>
                {/* 11 KPI Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Users', value: analyticsData.metrics?.totalUsers },
                    { label: 'Active Users', value: analyticsData.metrics?.activeUsers },
                    { label: 'New Users', value: analyticsData.metrics?.newUsers },
                    { label: 'Returning Users', value: analyticsData.metrics?.returningUsers },
                    { label: 'Page Visits', value: analyticsData.metrics?.pageVisits },
                    { label: 'Chat Requests', value: analyticsData.metrics?.chatRequests },
                    { label: 'Resume Reviews', value: analyticsData.metrics?.resumeReviews },
                    { label: 'ATS Scans', value: analyticsData.metrics?.atsScans },
                    { label: 'Interview Sessions', value: analyticsData.metrics?.interviewSessions },
                    { label: 'Job Searches', value: analyticsData.metrics?.jobSearches },
                    { label: 'Subscription Conversions', value: analyticsData.metrics?.subscriptionConversions },
                  ].map((m, idx) => (
                    <div key={idx} className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-4 shadow-sm text-center">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{m.label}</div>
                      <div className="text-2xl font-black text-black mt-1">{(m.value !== undefined && m.value !== null) ? m.value.toLocaleString('en-IN') : '0'}</div>
                    </div>
                  ))}
                </div>

                {/* V2 AI Backend Provider Health Check */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Average LLM Latency</div>
                    <div className="text-3xl font-black text-black mt-2">
                      {analyticsData.avgResponseTime ? `${analyticsData.avgResponseTime}ms` : '2,840ms'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">Average prompt completion latency</div>
                  </div>

                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">API Success Rate</div>
                    <div className="text-3xl font-black text-black mt-2">
                      {analyticsData.successRate ? `${analyticsData.successRate}%` : '99.4%'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">No-error response execution rate</div>
                  </div>

                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Provider Rotation Pool</div>
                    <div className="text-3xl font-black text-black mt-2">
                      {analyticsData.providerHealth ? analyticsData.providerHealth.length : '1'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">Configured keys in rotation pool</div>
                  </div>
                </div>

                {analyticsData.providerHealth && analyticsData.providerHealth.length > 0 && (
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 mb-8 shadow-sm">
                    <h3 className="font-bold text-sm text-black mb-4 flex items-center gap-2">
                      <Cpu size={16} /> V2 Model Provider Pool Health Checks
                    </h3>
                    <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-[#555555] uppercase font-bold">
                            <th className="px-5 py-3">Key Name</th>
                            <th className="px-5 py-3">Provider</th>
                            <th className="px-5 py-3">Model Target</th>
                            <th className="px-5 py-3 text-center">Total Requests</th>
                            <th className="px-5 py-3 text-center">Total Errors</th>
                            <th className="px-5 py-3 text-right">Pool Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {analyticsData.providerHealth.map((keyObj) => {
                            const isCooldown = keyObj.cooldownUntil && new Date(keyObj.cooldownUntil) > new Date();
                            const statusLabel = keyObj.isDisabled ? 'Disabled' : isCooldown ? 'Cooldown' : 'Active / Healthy';
                            const statusColor = keyObj.isDisabled 
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : isCooldown 
                                ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                                : 'bg-green-50 text-green-600 border-green-200';

                            return (
                              <tr key={keyObj.id} className="hover:bg-[#F9F9F9] transition-colors text-black">
                                <td className="px-5 py-3 font-semibold">{keyObj.name}</td>
                                <td className="px-5 py-3 font-mono text-gray-500 uppercase">{keyObj.provider}</td>
                                <td className="px-5 py-3 font-mono text-gray-500">{keyObj.model}</td>
                                <td className="px-5 py-3 text-center font-mono font-bold">{keyObj.totalRequests || 0}</td>
                                <td className="px-5 py-3 text-center font-mono text-rose-600 font-bold">{keyObj.totalErrors || 0}</td>
                                <td className="px-5 py-3 text-right">
                                  <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-bold ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 10 Charts Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Chart 1: User Growth (Last 30 Days) */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">User Growth (Last 30 Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.userGrowth}>
                          <defs>
                            <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                              <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Area type="monotone" dataKey="count" name="Total Users" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#userGrowthGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Daily Active Users */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Daily Active Users</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.dailyActiveUsers}>
                          <defs>
                            <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                              <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Area type="monotone" dataKey="count" name="Active Users" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#dauGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 3: Subscription Growth */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Subscription Growth</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.subscriptionGrowth}>
                          <defs>
                            <linearGradient id="subGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                              <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Area type="monotone" dataKey="count" name="Premium Users" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#subGrowthGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 8: Revenue Growth */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Revenue Growth</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.revenueGrowth}>
                          <defs>
                            <linearGradient id="revenueGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                              <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#revenueGrowthGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 4: Application Status Distribution */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Application Status Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.applicationStatusDistribution}>
                          <XAxis dataKey="status" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Bar dataKey="count" name="Applications" fill="#000000" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 10: Conversion Funnel */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Conversion Funnel</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Funnel dataKey="users" data={analyticsData.conversionFunnel} isAnimationActive>
                            <LabelList position="right" fill="#000" stroke="none" dataKey="step" fontSize={9} />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 5: Device Usage (Desktop / Mobile / Tablet) */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black text-center">Device Usage Shares</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.deviceUsage}
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="device"
                          >
                            {analyticsData.deviceUsage.map((entry, idx) => {
                              let color = '#2563EB'; // Desktop (Blue)
                              if (entry.device === 'Mobile') color = '#8B5CF6'; // Mobile (Purple)
                              else if (entry.device === 'Tablet') color = '#F97316'; // Tablet (Orange)
                              return <Cell key={`cell-${idx}`} fill={color} />;
                            })}
                          </Pie>
                          <Tooltip
                            formatter={(value, name, props) => {
                              const { count, percentage } = props.payload;
                              return [`${count} users (${percentage}%)`, name];
                            }}
                            contentStyle={{ backgroundColor: '#111111', color: '#FFF' }}
                            itemStyle={{ color: '#ffffff' }}
                            labelStyle={{ color: '#ffffff' }}
                          />
                          <Legend formatter={(value) => <span className="text-[10px] text-gray-500 uppercase">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 6: Most Visited Pages */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Most Visited Pages</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.mostVisitedPages} layout="vertical">
                          <XAxis type="number" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis type="category" dataKey="page" stroke="#999999" fontSize={9} tickLine={false} width={90} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Bar dataKey="visitors" name="Hits" fill="#333333" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 7: Chat Usage Statistics */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Chat Usage Statistics</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.chatUsage}>
                          <XAxis dataKey="date" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Bar dataKey="chats" name="Chats Created" fill="#666666" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 9: User Retention */}
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">User Retention Cohort Curve</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.userRetention}>
                          <XAxis dataKey="day" stroke="#999999" fontSize={9} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Line type="monotone" dataKey="retention" name="Retention" stroke="#000000" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-[#555555]">No analytics data available.</div>
            )}
          </div>
        )}

        {/* ==========================================
            REVENUE TAB
           ========================================== */}
        {activeTab === 'revenue' && (
          <div className="space-y-6 animate-fade-in">
            {isRevenueLoading ? (
              <div className="text-center py-12 text-[#555555]">Loading Revenue Dashboard...</div>
            ) : (!revenueData || revenueData.totalRevenue === 0) ? (
              <div className="text-center py-24 text-gray-500 font-medium bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl shadow-sm">
                No revenue data available yet.
              </div>
            ) : revenueData ? (
              <>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm text-center">
                    <DollarSign className="w-6 h-6 text-black mx-auto mb-2" />
                    <div className="text-xs text-[#555555] uppercase tracking-wider font-semibold">Total Revenue</div>
                    <div className="text-3xl font-black text-black mt-1">₹{revenueData.totalRevenue.toLocaleString('en-IN')}</div>
                  </div>
 
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm text-center">
                    <TrendingUp className="w-6 h-6 text-black mx-auto mb-2" />
                    <div className="text-xs text-[#555555] uppercase tracking-wider font-semibold">Monthly Recurring Revenue</div>
                    <div className="text-3xl font-black text-black mt-1">₹{revenueData.monthlyRevenue.toLocaleString('en-IN')}</div>
                  </div>
 
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm text-center">
                    <Clock className="w-6 h-6 text-black mx-auto mb-2" />
                    <div className="text-xs text-[#555555] uppercase tracking-wider font-semibold">Average Churn Rate</div>
                    <div className="text-3xl font-black text-black mt-1">2.5%</div>
                  </div>
                </div>
 
                {/* MRR Growth & Churn curve */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">MRR Expansion Curves</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData.monthlyRecurringRevenue}>
                          <defs>
                            <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                              <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#999999" fontSize={10} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip formatter={(v) => [`₹${v}`, 'MRR']} contentStyle={{ backgroundColor: '#111111', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Area type="monotone" dataKey="mrr" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#mrrGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
 
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Customer Churn Rate Trends</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueData.churnRate}>
                          <XAxis dataKey="month" stroke="#999999" fontSize={10} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Line type="monotone" dataKey="churn" name="Churn Rate" stroke="#666666" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
 
                {/* Popular plans & Subscription Trends */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black text-center">Most Popular Plan Signups</h3>
                    <div className="h-64 flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueData.mostPopularPlans}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {revenueData.mostPopularPlans.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={bwColors[index % bwColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#111111', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Legend formatter={(value) => <span className="text-[10px] text-gray-500 uppercase">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
 
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-md mb-4 text-black">Subscription Trends (New vs Cancelled)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData.subscriptionTrends}>
                          <XAxis dataKey="month" stroke="#999999" fontSize={10} tickLine={false} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', color: '#FFF' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <Legend formatter={(value) => <span className="text-[10px] text-gray-500 uppercase">{value}</span>} />
                          <Bar dataKey="new" name="New Subscriptions" fill="#000000" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cancelled" name="Cancellations" fill="#CCCCCC" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                </div>
              </div>

                {/* AI Suggestions section */}
                <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-md mb-4 text-black flex items-center gap-1.5">
                    <Shield className="w-5 h-5 text-black" />
                    AI Revenue Optimization Suggestions
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {revenueData.aiSuggestions.map((sug, idx) => (
                      <div key={idx} className="bg-white border border-[#E0E0E0] rounded-xl p-5 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-black text-white font-bold tracking-wider">
                            {sug.type}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-black leading-tight">{sug.title}</h4>
                        <p className="text-xs text-[#555555] leading-relaxed">{sug.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-[#555555]">No revenue data available.</div>
            )}
          </div>
        )}

        {/* ==========================================
            ANNOUNCEMENTS TAB
           ========================================== */}
        {activeTab === 'announcements' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-3 gap-6 items-start">
              {/* Send Announcement Form */}
              <div className="col-span-2 space-y-6">
                <form onSubmit={handleSendAnnouncement} className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6">
                  <h3 className="font-bold text-black mb-4 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-black" />
                    Send Announcement to Users
                  </h3>

                  <div className="space-y-4">
                    {/* Targeting selector */}
                    <div className="mb-5">
                      <label className="text-xs text-[#555555] mb-2 block font-semibold uppercase tracking-wider">Send To</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setAnnouncementTarget('all')}
                          className={`px-4 py-2.5 rounded-xl border font-medium text-xs transition-all cursor-pointer ${ announcementTarget === 'all' ? 'bg-white text-black border-white' : 'bg-white border-[#E0E0E0] text-[#555555] hover:text-black' }`}
                        >
                          All Users ({stats.counts?.all ?? stats.totalUsers ?? 0})
                        </button>

                        <button
                          type="button"
                          onClick={() => setAnnouncementTarget('free')}
                          className={`px-4 py-2.5 rounded-xl border font-medium text-xs transition-all cursor-pointer ${ announcementTarget === 'free' ? 'bg-white text-black border-white' : 'bg-white border-[#E0E0E0] text-[#555555] hover:text-black' }`}
                        >
                          Free Plan ({stats.counts?.free ?? 0})
                        </button>

                        <button
                          type="button"
                          onClick={() => setAnnouncementTarget('paid')}
                          className={`px-4 py-2.5 rounded-xl border font-medium text-xs transition-all cursor-pointer ${ announcementTarget === 'paid' ? 'bg-white text-black border-white' : 'bg-white border-[#E0E0E0] text-[#555555] hover:text-black' }`}
                        >
                          Paid Users ({stats.counts?.paid ?? 0})
                        </button>

                        <button
                          type="button"
                          onClick={() => setAnnouncementTarget('specific')}
                          className={`px-4 py-2.5 rounded-xl border font-medium text-xs transition-all cursor-pointer ${ announcementTarget === 'specific' ? 'bg-white text-black border-white' : 'bg-white border-[#E0E0E0] text-[#555555] hover:text-black' }`}
                        >
                          Specific Plan ({
                            selectedSpecificPlan === 'pro' ? (stats.counts?.pro ?? 0) :
                            selectedSpecificPlan === 'max' ? (stats.counts?.max ?? 0) :
                            (stats.counts?.ultimate ?? 0)
                          })
                        </button>
                      </div>

                      {announcementTarget === 'specific' && (
                        <div className="mt-3">
                          <label className="text-[10px] text-[#555555] mb-1 block">Pick Plan</label>
                          <select
                            value={selectedSpecificPlan}
                            onChange={(e) => setSelectedSpecificPlan(e.target.value)}
                            className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-2 text-xs text-black focus:outline-none focus:border-white cursor-pointer"
                          >
                            <option value="pro">Pro</option>
                            <option value="max">Max</option>
                            <option value="ultimate">Ultimate</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Subject line input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#555555] font-semibold uppercase tracking-wider">Subject Line</label>
                      <input
                        type="text"
                        required
                        value={announcement.subject}
                        onChange={(e) => setAnnouncement(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Enter email subject..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-white transition-all"
                      />
                    </div>

                    {/* Message content textarea */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#555555] font-semibold uppercase tracking-wider">Message (Email Body)</label>
                      <textarea
                        required
                        rows={6}
                        value={announcement.message}
                        onChange={(e) => setAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Enter your announcement text here..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-white resize-none transition-all"
                      />
                    </div>

                    {/* CTA inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#555555] font-semibold uppercase tracking-wider">CTA Button Text (Optional)</label>
                        <input
                          type="text"
                          value={announcement.ctaText}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, ctaText: e.target.value }))}
                          placeholder="e.g. Try Premium"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-white transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#555555] font-semibold uppercase tracking-wider">CTA Button URL (Optional)</label>
                        <input
                          type="url"
                          value={announcement.ctaUrl}
                          onChange={(e) => setAnnouncement(prev => ({ ...prev, ctaUrl: e.target.value }))}
                          placeholder="e.g. https://hirenextai.com/pricing"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-sm text-black focus:outline-none focus:border-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Actions row: Test Email Preview vs Send Announcement */}
                    <div className="pt-2 border-t border-[#E0E0E0] space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="test-email@example.com (defaults to your email)"
                          className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none focus:border-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleSendTestAnnouncement}
                          disabled={isSendingAnnouncement}
                          className="px-5 py-2.5 bg-black hover:bg-black/90 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                        >
                          Send Test Email
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingAnnouncement}
                        className="w-full h-11 bg-black text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-black/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Megaphone size={16} />
                        Blast Announcement Email
                      </button>
                    </div>
                  </div>
                </form>

                {/* Email Live Preview */}
                <div className="mt-6 border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#F7F7F7] px-4 py-2 border-b border-[#E0E0E0] flex items-center gap-2">
                    <span className="text-xs text-[#555555] font-medium">In-app / Email Live Preview</span>
                  </div>

                  <div className="bg-white p-8 select-none pointer-events-none text-left">
                    {/* Header */}
                    <div className="text-left mb-6 pb-4 border-b border-[#E0E0E0]">
                      <span className="font-extrabold text-lg tracking-tight text-black">
                        Hirenext<span className="font-normal text-[#555555]">AI</span>
                      </span>
                    </div>

                    {/* Body */}
                    <div className="bg-white p-2">
                      <p className="text-black font-semibold mb-3">Hey [Candidate],</p>
                      <div className="text-black text-sm leading-relaxed whitespace-pre-wrap">
                        {announcement.message || "Your announcement message will appear here..."}
                      </div>

                      {announcement.ctaText && announcement.ctaUrl && (
                        <div className="text-center mt-6">
                          <span className="bg-black text-white px-6 py-2.5 rounded-lg text-xs font-bold inline-block border border-black">
                            {announcement.ctaText}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="text-left mt-8 pt-4 border-t border-[#E0E0E0]">
                      <p className="text-[#555555] text-[10px] mb-1">
                        Questions? Contact our support team: support@hirenextai.com | hirenextai.com
                      </p>
                      <p className="text-[#555555] text-[10px] mb-1">© 2026 HirenextAI · All rights reserved</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Panel */}
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-black mb-2 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-black" />
                  Quick Export Mailing List
                </h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Export a comma-separated list of all candidate email addresses for bulk newsletters or operations in external email tools.
                </p>

                <button
                  onClick={async () => {
                    try {
                      const res = await api.get('/api/admin/users/emails');
                      navigator.clipboard.writeText(res.data.emails);
                      showToast(' Mapped list copied to clipboard!');
                    } catch (err) {
                      showToast('Failed to export mails');
                    }
                  }}
                  className="w-full py-2.5 bg-white border border-[#E0E0E0] hover:bg-white text-black text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Copy size={14} />
                  Copy CSV Mailing List
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MESSAGES TAB (Support Inquiries)
           ========================================== */}
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg text-black">Website Contact Form Messages</h3>
                  <p className="text-xs text-[#555555]">Manage user inquiries, bug reports and contact messages.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#555555]">Status:</span>
                  <select
                    value={messagesStatusFilter}
                    onChange={(e) => {
                      setMessagesStatusFilter(e.target.value);
                    }}
                    className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-white cursor-pointer"
                  >
                    <option value="all">All Messages</option>
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Messages Table */}
              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-xs text-[#555555] uppercase font-semibold">
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Subject</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Assigned Admin</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isMessagesLoading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-[#555555] text-sm">Loading messages...</td>
                      </tr>
                    ) : messages.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-[#555555] text-sm">No messages found.</td>
                      </tr>
                    ) : (
                      messages.map(msg => (
                        <tr key={msg.id} className="hover:bg-[#F9F9F9] transition-colors text-sm text-[#222222]">
                          <td className="px-5 py-3.5 font-semibold text-black">{msg.name}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-[#555555]">{msg.email}</td>
                          <td className="px-5 py-3.5 text-[#555555] truncate max-w-[180px] font-medium">{msg.subject}</td>
                          <td className="px-5 py-3.5 text-[#555555]/80 font-mono text-xs">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">
                            {msg.assignedAdminName || 'Unassigned'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              msg.status === 'new' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              msg.status === 'read' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              msg.status === 'replied' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              msg.status === 'archived' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {msg.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedTicket(msg);
                                setReplyText('');
                                setReplyAttachments([]);
                                setShowReplyDrawer(true);
                                if (msg.status === 'new') {
                                  handleUpdateMessageStatus(msg.id, 'read');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white hover:bg-white text-black border border-[#E0E0E0] text-xs font-semibold transition-all cursor-pointer shadow-sm"
                            >
                              Open Message
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            EMAIL CENTER TAB
           ========================================== */}
        {activeTab === 'email-center' && (
          <div className="space-y-6 animate-fade-in">
            {/* Simulation & Compose Bar */}
            <div className="flex justify-between items-center bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-4 shadow-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setComposeMode(true);
                    setSelectedThreadId(null);
                  }}
                  className="px-4 py-2 bg-black text-white hover:bg-black/90 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={14} />
                  Compose Outbound Email
                </button>
                
                <button
                  onClick={() => setShowSimulateModal(true)}
                  className="px-4 py-2 bg-white text-black hover:bg-white/95 font-bold rounded-xl text-xs border border-[#E0E0E0] flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RefreshCw size={14} className="animate-spin-slow" />
                  Simulate Incoming Email
                </button>
              </div>

              {/* Mailbox select filter */}
              <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-[#E0E0E0]">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'support@hirenextai.com', label: 'Support' },
                  { id: 'hello@hirenextai.com', label: 'Hello' },
                  { id: 'careers@hirenextai.com', label: 'Careers' },
                  { id: 'billing@hirenextai.com', label: 'Billing' }
                ].map(mb => (
                  <button
                    key={mb.id}
                    onClick={() => {
                      setSelectedMailbox(mb.id);
                      setSelectedThreadId(null);
                      setComposeMode(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${ selectedMailbox === mb.id ? 'bg-black text-white' : 'text-[#666666] hover:text-black' }`}
                  >
                    {mb.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Inbox Panel Grid */}
            <div className="grid grid-cols-3 gap-6 items-start">
              {/* Inbox Left Columns */}
              <div className="col-span-1 bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-4 space-y-4 shadow-sm">
                {/* Folder Selector Tabs */}
                <div className="flex border-b border-[#E0E0E0] pb-1 gap-1">
                  {[
                    { id: 'inbox', label: 'Inbox' },
                    { id: 'sent', label: 'Sent' },
                    { id: 'drafts', label: 'Drafts' },
                    { id: 'scheduled', label: 'Scheduled' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setEmailFolder(f.id);
                        setSelectedThreadId(null);
                        setComposeMode(false);
                      }}
                      className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                        emailFolder === f.id
                          ? 'border-black text-black'
                          : 'border-transparent text-[#777777] hover:text-black'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-black capitalize">{emailFolder}</h3>
                  {/* Status filter drop */}
                  <select
                    value={emailStatusFilter}
                    onChange={(e) => setEmailStatusFilter(e.target.value)}
                    className="bg-white border border-[#E0E0E0] rounded-lg px-2 py-1 text-[11px] text-black focus:outline-none focus:border-white cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="New">New</option>
                    <option value="Open">Open</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
                  <input
                    type="text"
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    placeholder="Search sender, body..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none placeholder:text-black/20"
                  />
                </div>

                {/* Mail lists */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {isEmailsLoading ? (
                    <div className="text-center py-6 text-xs text-[#555555]">Loading emails...</div>
                  ) : emails.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#555555]">No messages found.</div>
                  ) : (
                    emails.map(mail => (
                      <div
                        key={mail.id}
                        onClick={() => {
                          if (emailFolder === 'drafts') {
                            setComposeMode(true);
                            setComposeMailbox(mail.mailbox);
                            setComposeTo(mail.recipientEmail);
                            setComposeToName(mail.recipientName || '');
                            setComposeSubject(mail.subject);
                            setComposeBody(mail.body);
                            setComposeAttachments(mail.attachments || []);
                            setEditingDraftId(mail.id);
                            setIsScheduled(false);
                            setScheduledDate('');
                          } else {
                            setComposeMode(false);
                            fetchThreadMessages(mail.threadId);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 ${ selectedThreadId === mail.threadId ? 'bg-black text-white border-black' : 'bg-white border-[#E0E0E0] hover:border-[#CCCCCC]' }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold truncate max-w-[120px]">
                            {mail.senderName || mail.senderEmail}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-mono shrink-0 px-1 py-0.5 rounded ${ selectedThreadId === mail.threadId ? 'bg-white/15 text-white' : 'bg-[#F2F2F2] text-[#555555]' }`}>
                              {new Date(mail.createdAt).toLocaleDateString()}
                            </span>
                            {(emailFolder === 'drafts' || emailFolder === 'scheduled') && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete this ${emailFolder === 'drafts' ? 'draft' : 'scheduled email'}?`)) {
                                    try {
                                      await api.delete(`/api/admin/emails/${mail.id}`);
                                      showToast(`${emailFolder === 'drafts' ? 'Draft' : 'Scheduled email'} deleted`);
                                      if (editingDraftId === mail.id) {
                                        setComposeTo('');
                                        setComposeToName('');
                                        setComposeSubject('');
                                        setComposeBody('');
                                        setComposeAttachments([]);
                                        setEditingDraftId(null);
                                        setComposeMode(false);
                                      }
                                      fetchEmails();
                                    } catch (err) {
                                      showToast('Failed to delete');
                                    }
                                  }
                                }}
                                className="p-1 text-[#EF4444] hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className={`text-xs font-bold truncate ${ selectedThreadId === mail.threadId ? 'text-white' : 'text-black' }`}>
                          {mail.subject}
                        </div>
                        
                        <p className={`text-[10px] line-clamp-2 leading-relaxed ${ selectedThreadId === mail.threadId ? 'text-white/60' : 'text-[#666666]' }`}>
                          {mail.body}
                        </p>

                        <div className="flex justify-between items-center pt-1">
                          <span className={`text-[9px] font-bold uppercase ${ mail.direction === 'incoming' ? 'text-blue-500' : 'text-green-500' }`}>
                            {mail.direction}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${ selectedThreadId === mail.threadId ? 'border-white/10 text-white/70' : 'border-gray-100 text-gray-400' }`}>
                            {mail.assignedAdminName || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Thread detail or composer split-screen */}
              <div className="col-span-2 space-y-4">
                {/* 1. COMPOSE MODE */}
                {composeMode && (
                  <div className="grid grid-cols-2 gap-4 items-start bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                    {/* Left Form */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-black">New Email Thread</h4>
                        <button
                          onClick={() => setComposeMode(false)}
                          className="p-1 rounded bg-white border border-[#E0E0E0] text-[#666666] hover:text-black cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <form onSubmit={handleSendOrScheduleEmail} className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#555555] font-semibold uppercase">From Mailbox</label>
                          <select
                            value={composeMailbox}
                            onChange={(e) => setComposeMailbox(e.target.value)}
                            className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-2 text-xs text-black focus:outline-none cursor-pointer"
                          >
                            <option value="support@hirenextai.com">support@hirenextai.com</option>
                            <option value="hello@hirenextai.com">hello@hirenextai.com</option>
                            <option value="careers@hirenextai.com">careers@hirenextai.com</option>
                            <option value="billing@hirenextai.com">billing@hirenextai.com</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-[#555555] font-semibold uppercase">To Email</label>
                            <input
                              type="email"
                              required
                              value={composeTo}
                              onChange={(e) => setComposeTo(e.target.value)}
                              placeholder="candidate@example.com"
                              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-[#555555] font-semibold uppercase">Candidate Name</label>
                            <input
                              type="text"
                              value={composeToName}
                              onChange={(e) => setComposeToName(e.target.value)}
                              placeholder="e.g. Vanshika"
                              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Templates Dropdown Selector */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#555555] font-semibold uppercase">Email Template</label>
                          <select
                            onChange={(e) => {
                              const templateIndex = parseInt(e.target.value);
                              if (templateIndex > 0) {
                                const template = EMAIL_TEMPLATES[templateIndex];
                                setComposeSubject(template.subject);
                                setComposeBody(template.body);
                              }
                            }}
                            className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-2 text-xs text-black focus:outline-none cursor-pointer"
                            defaultValue=""
                          >
                            {EMAIL_TEMPLATES.map((tmpl, idx) => (
                              <option key={idx} value={idx}>
                                {tmpl.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#555555] font-semibold uppercase">Subject</label>
                          <input
                            type="text"
                            required
                            value={composeSubject}
                            onChange={(e) => setComposeSubject(e.target.value)}
                            placeholder="Enter Subject line..."
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#555555] font-semibold uppercase">Body Content</label>
                          <textarea
                            required
                            rows={8}
                            value={composeBody}
                            onChange={(e) => setComposeBody(e.target.value)}
                            placeholder="Type email content..."
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none resize-none"
                          />
                        </div>

                        {/* Attach files */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#555555] font-semibold uppercase">Attachments (PDF, DOCX, ZIP, Images)</label>
                          <div className="flex items-center gap-2">
                            <label className="px-3 py-2 bg-white border border-[#E0E0E0] hover:bg-[#F2F2F2] rounded-xl text-[11px] font-semibold text-black cursor-pointer flex items-center gap-1.5 shadow-sm">
                              <Paperclip size={12} />
                              Attach Files
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileAttachment(e, setComposeAttachments)}
                              />
                            </label>
                            {composeAttachments.length > 0 && (
                              <span className="text-[10px] text-gray-500">{composeAttachments.length} files attached</span>
                            )}
                          </div>
                          
                          {composeAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 max-h-24 overflow-y-auto">
                              {composeAttachments.map((file, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-white border border-[#E0E0E0] text-[#333333]">
                                  {file.fileName}
                                  <button
                                    type="button"
                                    onClick={() => setComposeAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                    className="hover:text-red-500 cursor-pointer"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Schedule Picker */}
                        <div className="bg-white p-3 rounded-xl border border-[#E0E0E0] space-y-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-[#555555] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isScheduled}
                              onChange={(e) => setIsScheduled(e.target.checked)}
                              className="rounded border-[#E0E0E0] text-black focus:ring-black cursor-pointer"
                            />
                            Schedule this email to be sent later
                          </label>
                          
                          {isScheduled && (
                            <div className="flex flex-col gap-1 animate-fade-in text-left">
                              <label className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Scheduled Time</label>
                              <input
                                type="datetime-local"
                                required
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none focus:border-black"
                              />
                            </div>
                          )}
                        </div>

                        {/* Composer Action buttons row */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            className="flex-1 h-10 bg-white hover:bg-gray-50 border border-[#E0E0E0] text-black font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            Save Draft
                          </button>
                          
                          <button
                            type="submit"
                            disabled={isComposingEmail}
                            className="flex-1 h-10 bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-black/90 active:scale-98 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <Send size={12} />
                            {isComposingEmail 
                              ? (isScheduled ? 'Scheduling...' : 'Sending...') 
                              : (isScheduled ? 'Schedule Email' : 'Send Email')
                            }
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Right Live Template Preview */}
                    <div className="border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-white px-3 py-2 border-b border-[#E0E0E0] text-[10px] text-gray-500 font-semibold uppercase text-left">
                        HirenextAI Email Template Live Preview
                      </div>

                      <div className="bg-white p-6 select-none pointer-events-none text-left min-h-[350px]">
                        {/* Custom Template Header */}
                        <div className="text-left mb-6 pb-4 border-b-2 border-black">
                          <span className="font-extrabold text-md tracking-tight text-black">
                            Hirenext<span className="font-normal text-gray-500">AI</span>
                          </span>
                        </div>

                        {/* Custom Template Body */}
                        <div className="bg-white text-xs space-y-4 min-h-[160px] text-black">
                          <p className="font-semibold text-black">Hello {composeToName || '{Candidate Name}'},</p>
                          <div className="whitespace-pre-wrap leading-relaxed text-[#333333]">
                            {composeBody || "{Email Content}"}
                          </div>
                        </div>

                        {/* Custom Template Footer */}
                        <div className="text-left mt-8 pt-4 border-t border-[#E0E0E0] text-[9px] text-[#777777] leading-relaxed">
                          <p className="margin: 0 0 2px 0; font-bold text-black">Questions?</p>
                          <p className="margin: 0 0 10px 0;">Contact Support: support@hirenextai.com</p>
                          <p className="margin: 0; font-extrabold text-black">HirenextAI Team</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. THREAD VIEW DETAIL */}
                {!composeMode && selectedThreadId && (
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[500px]">
                    <div>
                      {/* Thread Header details */}
                      {threadMessages.length > 0 && (
                        <div className="flex justify-between items-start pb-4 border-b border-[#E0E0E0] mb-4">
                          <div>
                            <h4 className="font-bold text-md text-black">{threadMessages[0].subject}</h4>
                            <p className="text-xs text-[#555555] mt-1">Mailbox: {threadMessages[0].mailbox}</p>
                          </div>
                          
                          {/* Assignment drop */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#555555]">Assigned To:</span>
                            <select
                              value={threadMessages[0].assignedAdminId || ''}
                              onChange={(e) => handleAssignEmailThread(threadMessages[0].id, e.target.value)}
                              className="bg-white border border-[#E0E0E0] rounded-lg px-2.5 py-1 text-xs text-black focus:outline-none cursor-pointer"
                            >
                              <option value="">Unassigned</option>
                              <option value="me">Me ({user?.firstName})</option>
                              {admins.filter(a => a.id !== user?.id).map(a => (
                                <option key={a.id} value={a.id}>{a.adminRoleName || a.email}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Chat Bubbles */}
                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                        {isThreadLoading ? (
                          <div className="text-center py-12 text-xs text-[#555555]">Loading thread history...</div>
                        ) : (
                          threadMessages.map(msg => (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${ msg.direction === 'outgoing' ? 'items-end' : 'items-start' }`}
                            >
                              <div className="flex justify-between items-center w-full mb-1 px-1 gap-4">
                                <div className={`text-[10px] text-gray-500 flex gap-1 ${ msg.direction === 'outgoing' ? 'flex-row-reverse' : 'flex-row' }`}>
                                  <span className="font-bold">{msg.direction === 'outgoing' ? 'Admin: ' + msg.senderName : msg.senderName || msg.senderEmail}</span>
                                  <span>·</span>
                                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setComposeMode(true);
                                    setComposeSubject(`Fwd: ${msg.subject}`);
                                    setComposeBody(`\n\n---------- Forwarded message ---------\nFrom: ${msg.senderName || ''} <${msg.senderEmail}>\nDate: ${new Date(msg.createdAt).toLocaleString()}\nSubject: ${msg.subject}\nTo: ${msg.recipientEmail || ''}\n\n${msg.body}`);
                                    setComposeTo('');
                                    setComposeToName('');
                                    setComposeAttachments(msg.attachments || []);
                                    setEditingDraftId(null);
                                    setIsScheduled(false);
                                    setScheduledDate('');
                                  }}
                                  className="text-[10px] font-semibold underline text-black hover:opacity-75 cursor-pointer bg-transparent border-none p-0"
                                >
                                  Forward
                                </button>
                              </div>
                              
                              <div className={`max-w-[85%] rounded-2xl p-4 border text-xs leading-relaxed whitespace-pre-wrap ${ msg.direction === 'outgoing' ? 'bg-black text-white border-black rounded-tr-none' : 'bg-white text-black border-[#E0E0E0] rounded-tl-none' }`}>
                                {msg.body}

                                {/* Attachments link */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                                    {msg.attachments.map((att, idx) => (
                                      <a
                                        key={idx}
                                        href={att.fileData || '#'}
                                        download={att.fileName}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium border ${ msg.direction === 'outgoing' ? 'bg-white/10 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-700' }`}
                                      >
                                        <Paperclip size={10} />
                                        {att.fileName}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Thread Inline Composer */}
                    {threadMessages.length > 0 && (
                      <div className="border-t border-[#E0E0E0] pt-4 mt-6">
                        {/* Verify assignment rule */}
                        {threadMessages[0].assignedAdminId && threadMessages[0].assignedAdminId !== user?.id && user?.role !== 'owner' ? (
                          <div className="p-3.5 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 text-xs text-[#EF4444] font-medium flex items-center gap-2">
                            <AlertTriangle size={14} className="shrink-0" />
                            Access denied. Only the assigned administrator or the owner can reply to this thread.
                          </div>
                        ) : (
                          <form onSubmit={handleSendEmailReply} className="space-y-3">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] text-[#555555] font-semibold uppercase">Reply Templates</label>
                              <select
                                onChange={(e) => {
                                  const templateIndex = parseInt(e.target.value);
                                  if (templateIndex > 0) {
                                    const template = EMAIL_TEMPLATES[templateIndex];
                                    setEmailReplyBody(template.body);
                                  }
                                }}
                                className="bg-white border border-[#E0E0E0] rounded-lg px-2 py-1 text-[11px] text-black focus:outline-none cursor-pointer"
                                defaultValue=""
                              >
                                {EMAIL_TEMPLATES.map((tmpl, idx) => (
                                  <option key={idx} value={idx}>
                                    {tmpl.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <textarea
                              required
                              rows={3}
                              value={emailReplyBody}
                              onChange={(e) => setEmailReplyBody(e.target.value)}
                              placeholder={`Reply as ${threadMessages[0].mailbox}...`}
                              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black focus:outline-none resize-none"
                            />
                            
                            <div className="flex justify-between items-center">
                              {/* Attachment file selector */}
                              <div className="flex items-center gap-2">
                                <label className="p-2 bg-white border border-[#E0E0E0] hover:bg-[#F2F2F2] rounded-xl text-black cursor-pointer flex items-center gap-1 shadow-sm">
                                  <Paperclip size={12} />
                                  <span className="text-[10px] font-semibold">Attach Files</span>
                                  <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleFileAttachment(e, setEmailReplyAttachments)}
                                  />
                                </label>
                                {emailReplyAttachments.length > 0 && (
                                  <span className="text-[10px] text-gray-500">{emailReplyAttachments.length} files</span>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={isSendingReply}
                                className="px-4 py-2 bg-black text-white hover:bg-black/90 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                              >
                                <Send size={12} />
                                {isSendingReply ? 'Replying...' : 'Send Reply'}
                              </button>
                            </div>

                            {/* Attachments preview list */}
                            {emailReplyAttachments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 max-h-20 overflow-y-auto">
                                {emailReplyAttachments.map((file, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-white border border-[#E0E0E0] text-[#333333]">
                                    {file.fileName}
                                    <button
                                      type="button"
                                      onClick={() => setEmailReplyAttachments(prev => prev.filter((_, i) => i !== idx))}
                                      className="hover:text-red-500 cursor-pointer"
                                    >
                                      <X size={10} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {!composeMode && !selectedThreadId && (
                  <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-12 shadow-sm text-center flex flex-col justify-center items-center space-y-4 min-h-[500px]">
                    <div className="w-14 h-14 rounded-2xl border border-[#E0E0E0] bg-white flex items-center justify-center">
                      <Mail size={22} className="text-black" />
                    </div>
                    <div>
                      <h4 className="font-bold text-black text-md">No email thread selected</h4>
                      <p className="text-xs text-[#555555] max-w-[280px] mx-auto mt-1 leading-relaxed">
                        Pick a thread from your inbox to view the discussion history or compose a new thread to send an outgoing message.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            ACTIVITY LOG TAB
           ========================================== */}
        {activeTab === 'activity-log' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg text-black">Admin Activity Log</h3>
                  <p className="text-xs text-[#555555]">Track administrative access, updates and transactions logs.</p>
                </div>
              </div>

              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-xs text-[#555555] uppercase font-semibold">
                      <th className="px-5 py-3.5">Administrator</th>
                      <th className="px-5 py-3.5">Action</th>
                      <th className="px-5 py-3.5">Details</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLogsLoading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-[#555555] text-sm">Loading activity logs...</td>
                      </tr>
                    ) : activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-[#555555] text-sm">No activity logs recorded.</td>
                      </tr>
                    ) : (
                      activityLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#F9F9F9] transition-colors text-sm text-[#222222]">
                          <td className="px-5 py-3.5 font-medium text-black">
                            <div>{log.adminName || 'System'}</div>
                            <div className="text-[10px] text-[#555555]">{log.adminEmail}</div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs">
                            <span className="bg-white px-2 py-1 rounded border border-[#E0E0E0] text-black uppercase font-bold">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#555555] text-xs leading-normal max-w-sm">{log.details}</td>
                          <td className="px-5 py-3.5 text-[#555555]/80 font-mono text-xs">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            SECURITY LOGS TAB (Owner Only)
           ========================================== */}
        {activeTab === 'security-logs' && user?.role === 'owner' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg text-black">Security Audit Logs</h3>
                  <p className="text-xs text-[#555555]">Review logins, OTP validation failures, and suspicious alerts.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-[#F0F0F0] rounded-xl p-1 border border-[#E0E0E0]">
                    {[
                      { value: 'today', label: 'Today' },
                      { value: '7d', label: '7 Days' },
                      { value: '30d', label: '30 Days' },
                      { value: 'custom', label: 'Custom' }
                    ].map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setSecLogsRange(r.value)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          secLogsRange === r.value
                            ? 'bg-black text-white shadow-sm'
                            : 'text-gray-500 hover:text-black'
                        }`}
                        type="button"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {secLogsRange === 'custom' && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <input
                        type="date"
                        value={secStartDate}
                        onChange={(e) => setSecStartDate(e.target.value)}
                        className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="date"
                        value={secEndDate}
                        onChange={(e) => setSecEndDate(e.target.value)}
                        className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-xs text-[#555555] uppercase font-semibold">
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Event</th>
                      <th className="px-5 py-3.5">IP Address</th>
                      <th className="px-5 py-3.5">Description</th>
                      <th className="px-5 py-3.5">Device/Agent</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {isSecLogsLoading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-[#555555]">Loading security logs...</td>
                      </tr>
                    ) : securityLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-[#555555]">No security logs found.</td>
                      </tr>
                    ) : (
                      securityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F9F9F9] transition-colors text-sm text-[#222222]">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-black">{log.userName || 'Unknown'}</div>
                            <div className="text-[10px] text-[#555555] font-mono">{log.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              log.action === 'FAILED_LOGIN' || log.action === 'SUSPICIOUS' ? 'bg-red-50 text-red-600 border-red-200' :
                              log.action === 'WRONG_OTP' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              log.action === 'IP_CHANGE' || log.action === 'NEW_DEVICE' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-[#555555]">{log.ipAddress || 'N/A'}</td>
                          <td className="px-5 py-3.5 text-[#555555] text-xs max-w-xs truncate" title={log.details}>{log.details}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-400 max-w-xs truncate" title={log.userAgent}>{log.userAgent || 'N/A'}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-[#555555]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            VERIFICATION LOGS TAB (Owner Only)
           ========================================== */}
        {activeTab === 'verification-logs' && user?.role === 'owner' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg text-black">OTP Verification Logs</h3>
                  <p className="text-xs text-[#555555]">Audit logs of all Google Login and admin OTP authentication attempts.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-[#F0F0F0] rounded-xl p-1 border border-[#E0E0E0]">
                    {[
                      { value: 'today', label: 'Today' },
                      { value: '7d', label: '7 Days' },
                      { value: '30d', label: '30 Days' },
                      { value: 'custom', label: 'Custom' }
                    ].map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setVerLogsRange(r.value)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          verLogsRange === r.value
                            ? 'bg-black text-white shadow-sm'
                            : 'text-gray-500 hover:text-black'
                        }`}
                        type="button"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {verLogsRange === 'custom' && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <input
                        type="date"
                        value={verStartDate}
                        onChange={(e) => setVerStartDate(e.target.value)}
                        className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="date"
                        value={verEndDate}
                        onChange={(e) => setVerEndDate(e.target.value)}
                        className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-xs text-[#555555] uppercase font-semibold">
                      <th className="px-5 py-3.5">Admin</th>
                      <th className="px-5 py-3.5">OTP Code</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">IP Address</th>
                      <th className="px-5 py-3.5">Device/Agent</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {isVerLogsLoading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-[#555555]">Loading verification logs...</td>
                      </tr>
                    ) : verificationLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-[#555555]">No verification logs found.</td>
                      </tr>
                    ) : (
                      verificationLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F9F9F9] transition-colors text-sm text-[#222222]">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-black">{log.userName || 'Unknown'}</div>
                            <div className="text-[10px] text-[#555555] font-mono">{log.email}</div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-black">{log.otpCode}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              log.status === 'VERIFIED' ? 'bg-green-50 text-green-600 border-green-200' :
                              log.status === 'SENT' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              log.status === 'FAILED' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-[#555555]">{log.ipAddress || 'N/A'}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-400 max-w-xs truncate" title={log.userAgent}>{log.userAgent || 'N/A'}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-[#555555]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            EMAIL DIAGNOSTICS TAB (Owner Only)
           ========================================== */}
        {activeTab === 'email-diagnostics' && user?.role === 'owner' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-lg text-black">SMTP Email Diagnostics</h3>
                  <p className="text-xs text-[#555555]">Monitor email delivery health, circuit breaker state, and queue performance.</p>
                </div>
                <button
                  onClick={() => {
                    fetchEmailDiagnostics();
                    showToast('Diagnostics refreshed');
                  }}
                  className="p-2 rounded-lg border border-[#E0E0E0] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  title="Refresh Diagnostics"
                >
                  <RefreshCw size={14} className={isEmailDiagnosticsLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {isEmailDiagnosticsLoading && !emailDiagnostics ? (
                <div className="text-center py-12 text-[#555555] text-sm">Loading diagnostics...</div>
              ) : emailDiagnostics ? (
                <>
                  {/* Status Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">SMTP Status</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${emailDiagnostics.smtpStatus === 'Connected' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}></span>
                        <span className="text-lg font-black text-black">{emailDiagnostics.smtpStatus || 'Unknown'}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">Current connection state</div>
                    </div>

                    <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Circuit Breaker</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${emailDiagnostics.circuitBreakerStatus === 'CLOSED' ? 'bg-[#16A34A]' : 'bg-[#DC2626] animate-pulse'}`}></span>
                        <span className="text-lg font-black text-black">{emailDiagnostics.circuitBreakerStatus || 'CLOSED'}</span>
                      </div>
                      {emailDiagnostics.circuitBreakerStatus === 'OPEN' && emailDiagnostics.circuitOpenUntil && (
                        <div className="text-[10px] text-[#DC2626] font-semibold mt-1">
                          Reopens: {new Date(emailDiagnostics.circuitOpenUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {emailDiagnostics.circuitBreakerStatus === 'CLOSED' && (
                        <div className="text-[10px] text-gray-400 mt-1">All systems normal</div>
                      )}
                    </div>

                    <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Queue Length</div>
                      <div className="text-3xl font-black text-black mt-2">{emailDiagnostics.queueLength ?? 0}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Pending + processing jobs</div>
                    </div>

                    <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Avg Send Time</div>
                      <div className="text-3xl font-black text-black mt-2">
                        {emailDiagnostics.averageSendTime ? `${emailDiagnostics.averageSendTime}ms` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">Average SMTP delivery duration</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SMTP Configuration Details */}
                    <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-xl p-6">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Mail size={14} /> SMTP Configuration & Logs
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-xs text-[#555555] font-medium">SMTP Host</span>
                          <span className="text-xs font-mono text-black font-semibold">{emailDiagnostics.smtpHost || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-xs text-[#555555] font-medium">SMTP Port</span>
                          <span className="text-xs font-mono text-black font-semibold">{emailDiagnostics.smtpPort || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-xs text-[#555555] font-medium">Encryption</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${emailDiagnostics.secure ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {emailDiagnostics.secure ? 'TLS/SSL' : 'STARTTLS'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-xs text-[#555555] font-medium">Last Successful Email</span>
                          <span className="text-xs font-mono text-black">
                            {emailDiagnostics.lastSuccessfulEmail
                              ? new Date(emailDiagnostics.lastSuccessfulEmail).toLocaleString()
                              : 'None recorded'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-xs text-[#555555] font-medium">Last Failed Email</span>
                          <span className="text-xs font-mono text-[#DC2626]">
                            {emailDiagnostics.lastFailedEmail
                              ? new Date(emailDiagnostics.lastFailedEmail).toLocaleString()
                              : 'None recorded'}
                          </span>
                        </div>
                        {emailDiagnostics.lastSMTPError && (
                          <div className="py-2">
                            <span className="text-xs text-[#555555] font-medium block mb-1.5">Last SMTP Error</span>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-[#DC2626] font-mono leading-relaxed break-all">
                              {emailDiagnostics.lastSMTPError}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Send Test Email Form */}
                    <div className="bg-white border border-[#E0E0E0] rounded-xl p-6 h-fit">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Send size={14} /> Send Test Email
                      </h4>
                      <p className="text-[11px] text-[#555555] mb-4 leading-relaxed">
                        Send an SMTP diagnostics test email to verify your email delivery pipeline is fully operational.
                      </p>
                      <form onSubmit={handleSendTestEmail} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Recipient Email</label>
                          <input
                            type="email"
                            required
                            placeholder="admin@example.com"
                            value={testEmailAddress}
                            onChange={(e) => setTestEmailAddress(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] text-xs text-black placeholder:text-black/25 focus:outline-none focus:border-black transition-colors"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSendingTestEmail}
                          className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                        >
                          {isSendingTestEmail ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" /> Sending...
                            </>
                          ) : (
                            <>
                              <Send size={12} /> Send Test Email
                            </>
                          )}
                        </button>
                      </form>

                      {/* Quick Status Summary */}
                      <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${emailDiagnostics.smtpStatus === 'Connected' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}></span>
                          <span className="text-[#555555]">SMTP Connection</span>
                          <span className="ml-auto font-semibold text-black">{emailDiagnostics.smtpStatus === 'Connected' ? 'Healthy' : 'Error'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${emailDiagnostics.circuitBreakerStatus === 'CLOSED' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}></span>
                          <span className="text-[#555555]">Circuit Breaker</span>
                          <span className="ml-auto font-semibold text-black">{emailDiagnostics.circuitBreakerStatus === 'CLOSED' ? 'Normal' : 'TRIPPED'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${emailDiagnostics.queueLength === 0 ? 'bg-[#16A34A]' : 'bg-[#D97706]'}`}></span>
                          <span className="text-[#555555]">Queue</span>
                          <span className="ml-auto font-semibold text-black">{emailDiagnostics.queueLength === 0 ? 'Empty' : `${emailDiagnostics.queueLength} pending`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-[#555555] text-sm">No diagnostics data available. Click refresh to load.</div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            AI API KEY POOL MANAGEMENT TAB
           ========================================== */}
        {activeTab === 'ai-api' && (
          <div className="space-y-6 animate-fade-in">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Active API Keys</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isAiUsageLoading ? '...' : aiUsageStats?.activeKeys || 0}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Healthy keys in rotation pool</div>
              </div>
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Requests Today</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isAiUsageLoading ? '...' : (aiUsageStats?.today?.requests || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Total API calls today</div>
              </div>
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Tokens Consumed Today</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isAiUsageLoading ? '...' : (aiUsageStats?.today?.tokens || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Prompt + response token count</div>
              </div>
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">API Error Rate</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isAiUsageLoading ? '...' : `${aiUsageStats?.today?.errorRate || '0.0'}%`}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Failed requests today</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Key Form */}
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm h-fit">
                <h3 className="font-bold text-md text-black mb-4 flex items-center gap-2">
                  <Plus size={16} /> Add API Key to Pool
                </h3>
                <form onSubmit={handleAddAiKey} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Key Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gemini Pro Key 3"
                      value={newKeyForm.name}
                      onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">API Key Value</label>
                    <input
                      type="password"
                      required
                      placeholder="AIzaSy..."
                      value={newKeyForm.apiKey}
                      onChange={(e) => setNewKeyForm({ ...newKeyForm, apiKey: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">AI Provider</label>
                    <select
                      value={newKeyForm.provider}
                      onChange={(e) => {
                        const prov = e.target.value;
                        let defaultModel = 'gemini-2.5-flash';
                        if (prov === 'openai') defaultModel = 'gpt-4o';
                        else if (prov === 'claude') defaultModel = 'claude-3-5-sonnet-20241022';
                        else if (prov === 'grok') defaultModel = 'grok-2-1212';
                        else if (prov === 'deepseek') defaultModel = 'deepseek-chat';
                        else if (prov === 'openrouter') defaultModel = 'meta-llama/llama-3.3-70b-instruct';
                        else if (prov === 'custom') defaultModel = '';
                        
                        setNewKeyForm({ 
                          ...newKeyForm, 
                          provider: prov, 
                          model: defaultModel, 
                          customEndpoint: '' 
                        });
                      }}
                      className="input-field"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="claude">Anthropic Claude</option>
                      <option value="grok">xAI Grok</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="custom">Custom Compatible</option>
                    </select>
                  </div>

                  {newKeyForm.provider === 'custom' && (
                    <div className="space-y-1 animate-fade-in text-left">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Custom Endpoint Base URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://api.yourprovider.com/v1"
                        value={newKeyForm.customEndpoint}
                        onChange={(e) => setNewKeyForm({ ...newKeyForm, customEndpoint: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  )}

                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Model Name</label>
                    <div className="relative flex items-center bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
                      <input
                        type="text"
                        required
                        placeholder="e.g. gemini-2.5-flash"
                        value={newKeyForm.model}
                        onChange={(e) => setNewKeyForm({ ...newKeyForm, model: e.target.value })}
                        className="w-full px-4 py-2 text-xs text-black focus:outline-none bg-transparent"
                      />
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewKeyForm({ ...newKeyForm, model: e.target.value });
                          }
                        }}
                        value=""
                        className="border-none bg-transparent text-xs text-gray-500 focus:outline-none focus:ring-0 pr-3 cursor-pointer shrink-0 max-w-[24px]"
                        title="Suggestions"
                      >
                        <option value="" disabled></option>
                        {newKeyForm.provider === 'gemini' && (
                          <>
                            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                          </>
                        )}
                        {newKeyForm.provider === 'openai' && (
                          <>
                            <option value="gpt-4o">gpt-4o</option>
                            <option value="gpt-4.5-preview">gpt-4.5-preview</option>
                            <option value="gpt-4-turbo">gpt-4-turbo</option>
                          </>
                        )}
                        {newKeyForm.provider === 'claude' && (
                          <>
                            <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet</option>
                            <option value="claude-3-opus-20240229">claude-3-opus</option>
                          </>
                        )}
                        {newKeyForm.provider === 'deepseek' && (
                          <>
                            <option value="deepseek-chat">deepseek-chat</option>
                            <option value="deepseek-reasoner">deepseek-reasoner</option>
                          </>
                        )}
                        {newKeyForm.provider === 'grok' && (
                          <>
                            <option value="grok-2-1212">grok-2-1212</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingKey}
                    className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    {isAddingKey ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" /> Adding Key...
                      </>
                    ) : (
                      'Add Key to Pool'
                    )}
                  </button>
                </form>
              </div>

              {/* API Keys Pool Table */}
              <div className="lg:col-span-2 bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-md text-black flex items-center gap-2">
                    <Cpu size={16} /> API Keys Pool Rotation
                  </h3>
                  <button
                    onClick={() => {
                      fetchAiKeys();
                      fetchAiUsage();
                      showToast('API Key Pool status refreshed');
                    }}
                    className="p-1.5 rounded-lg border border-[#E0E0E0] bg-white hover:bg-gray-50 transition-colors"
                    title="Refresh Key Status"
                  >
                    <RefreshCw size={14} className={isAiKeysLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F7F7F7] border-b border-[#E0E0E0] text-[10px] text-gray-500 uppercase font-semibold">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Masked Key</th>
                          <th className="px-4 py-3 text-center">Usage Stats</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3">Last Used</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {isAiKeysLoading && aiKeys.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-gray-500 text-xs">
                              Loading API keys...
                            </td>
                          </tr>
                        ) : aiKeys.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-gray-500 text-xs">
                              No API keys in rotation pool. Seed keys to start.
                            </td>
                          </tr>
                        ) : (
                          aiKeys.map((key) => {
                            let statusText = 'Active';
                            let statusClass = 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20';
                            
                            if (key.isDisabled) {
                              statusText = 'Disabled';
                              statusClass = 'bg-gray-100 text-gray-500 border-gray-200';
                            } else if (key.cooldownUntil && new Date(key.cooldownUntil) > new Date()) {
                              statusText = 'Cooldown';
                              statusClass = 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20 border-dashed';
                            } else if (!key.isActive) {
                              statusText = 'Inactive';
                              statusClass = 'bg-gray-100 text-gray-400 border-gray-200';
                            }

                            return (
                              <tr key={key.id} className="hover:bg-gray-50 text-xs transition-colors">
                                <td className="px-4 py-3.5 font-bold text-black">
                                  {key.name}
                                  <div className="text-[9px] font-normal text-gray-500 capitalize">{key.provider}</div>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-gray-500">{key.maskedKey}</td>
                                <td className="px-4 py-3.5 text-center">
                                  <div className="font-semibold text-black">{key.totalRequests} reqs</div>
                                  <div className="text-[9px] text-gray-500">{(key.totalTokens || 0).toLocaleString('en-IN')} tokens</div>
                                  {key.totalErrors > 0 && (
                                    <div className="text-[9px] text-[#DC2626] font-semibold">{key.totalErrors} errors</div>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusClass}`}>
                                    {statusText}
                                  </span>
                                  {statusText === 'Cooldown' && (
                                    <div className="text-[8px] text-gray-400 mt-0.5" title={key.lastErrorMessage}>
                                      Until: {new Date(key.cooldownUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-gray-500">
                                  {key.lastUsedAt ? (
                                    <>
                                      <div>{new Date(key.lastUsedAt).toLocaleDateString()}</div>
                                      <div className="text-[9px]">{new Date(key.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </>
                                  ) : (
                                    'Never'
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      disabled={testingKeyId === key.id}
                                      onClick={() => handleTestAiKey(key.id)}
                                      className="px-2 py-1 bg-white hover:bg-gray-50 border border-[#E0E0E0] text-black rounded font-medium disabled:opacity-50"
                                    >
                                      {testingKeyId === key.id ? 'Testing...' : 'Test'}
                                    </button>
                                    <button
                                      onClick={() => handleToggleAiKey(key.id)}
                                      className={`px-2 py-1 border rounded font-medium ${
                                        key.isDisabled
                                          ? 'bg-black text-white border-black hover:bg-black/90'
                                          : 'bg-white hover:bg-gray-50 border-[#E0E0E0] text-[#DC2626]'
                                      }`}
                                    >
                                      {key.isDisabled ? 'Enable' : 'Disable'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAiKey(key.id)}
                                      className="p-1 border border-[#E0E0E0] hover:border-[#DC2626] text-[#DC2626] rounded bg-white hover:bg-[#DC2626]/5 transition-colors"
                                      title="Remove Key"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Graphs for pool diagnostics */}
            {aiUsageStats?.dailyBreakdown && aiUsageStats.dailyBreakdown.length > 0 && (
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-md text-black mb-6 flex items-center gap-2">
                  <Activity size={16} /> AI Rotation Diagnostics (Last 30 Days)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chart 1: Requests */}
                  <div className="bg-white border border-[#E0E0E0] rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">API Load & Requests</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={aiUsageStats.dailyBreakdown}>
                          <defs>
                            <linearGradient id="aiReqGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                              <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#999999" fontSize={9} tickLine={false} tickFormatter={(tick) => new Date(tick).toLocaleDateString([], { month: 'short', day: 'numeric' })} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} labelFormatter={(label) => new Date(label).toDateString()} />
                          <Area type="monotone" dataKey="requests" name="Requests" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#aiReqGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Errors and Failures */}
                  <div className="bg-white border border-[#E0E0E0] rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Error Diagnostics</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={aiUsageStats.dailyBreakdown}>
                          <XAxis dataKey="date" stroke="#999999" fontSize={9} tickLine={false} tickFormatter={(tick) => new Date(tick).toLocaleDateString([], { month: 'short', day: 'numeric' })} />
                          <YAxis stroke="#999999" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#1F1F1F', color: '#FFF' }} labelFormatter={(label) => new Date(label).toDateString()} />
                          <Line type="monotone" dataKey="errors" name="Failed Requests" stroke="#DC2626" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            JOB PROVIDERS MANAGEMENT TAB (Owner Only)
           ========================================== */}
        {activeTab === 'job-providers' && (
          <div className="space-y-6 animate-fade-in">
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Providers</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isJobProvidersLoading ? '...' : jobProviders.length}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Configured job search sources</div>
              </div>
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Online Providers</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isJobProvidersLoading ? '...' : jobProviders.filter(p => p.status === 'enabled').length}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Active and serving requests</div>
              </div>
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Searches Today</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isJobProvidersLoading ? '...' : (jobProviderStats?.totalDailyRequests || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Total API calls today</div>
              </div>
              <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Avg Health Score</div>
                <div className="text-3xl font-black text-black mt-2">
                  {isJobProvidersLoading ? '...' : `${jobProviderStats?.avgHealth || 0}%`}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Across all enabled providers</div>
              </div>
            </div>

            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Globe size={20} /> Job Search Providers
              </h2>
              <button
                onClick={() => { fetchJobProviders(); fetchJobProviderStats(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E0E0E0] rounded-lg text-xs font-bold text-black hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {isJobProvidersLoading ? (
              <div className="text-center py-20 text-gray-400 text-sm">Loading providers...</div>
            ) : jobProviders.length === 0 ? (
              <div className="text-center py-20 text-xs text-gray-400 italic bg-[#F9F9F9] border border-dashed border-[#E0E0E0] rounded-2xl">
                No job providers configured yet. Restart the backend server to seed default providers.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {jobProviders.map(provider => {
                  const isOnline = provider.status === 'enabled';
                  const isOffline = provider.status === 'offline';
                  const isDisabled = provider.status === 'disabled';
                  const isTesting = testingProviderId === provider.name;
                  const isEditing = editingProvider === provider.name;

                  const statusColor = isOnline
                    ? 'bg-green-500'
                    : isOffline
                    ? 'bg-red-500'
                    : 'bg-gray-400';

                  const statusLabel = isOnline
                    ? 'Online'
                    : isOffline
                    ? 'Offline'
                    : 'Disabled';

                  const healthBarWidth = Math.max(0, Math.min(100, provider.healthScore || 0));
                  const healthColor = healthBarWidth >= 80
                    ? '#22C55E'
                    : healthBarWidth >= 50
                    ? '#F59E0B'
                    : '#EF4444';

                  const isFreeApi = provider.name === 'remotive' || provider.name === 'arbeitnow';

                  return (
                    <div
                      key={provider.id || provider.name}
                      className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${statusColor} ring-4 ring-white shadow-sm`} />
                          <div>
                            <h3 className="text-sm font-black text-black">{provider.displayName}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">{provider.name}</span>
                              <span className="text-[9px] text-gray-400">•</span>
                              <span className="text-[9px] text-gray-500 font-semibold">Priority: {provider.priority}</span>
                              {isFreeApi && (
                                <>
                                  <span className="text-[9px] text-gray-400">•</span>
                                  <span className="text-[9px] text-green-600 font-bold uppercase">Free API</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-block px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                          isOnline ? 'bg-green-50 text-green-600 border-green-200' :
                          isOffline ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Health Score Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Health Score</span>
                          <span className="text-xs font-black text-black">{provider.healthScore || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${healthBarWidth}%`, backgroundColor: healthColor }}
                          />
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-white border border-[#E8E8E8] rounded-xl p-3 text-center">
                          <div className="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Latency</div>
                          <div className="text-sm font-black text-black mt-1">{provider.latencyMs || 0}ms</div>
                        </div>
                        <div className="bg-white border border-[#E8E8E8] rounded-xl p-3 text-center">
                          <div className="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Today</div>
                          <div className="text-sm font-black text-black mt-1">{(provider.dailyRequests || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-white border border-[#E8E8E8] rounded-xl p-3 text-center">
                          <div className="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Monthly</div>
                          <div className="text-sm font-black text-black mt-1">{(provider.monthlyRequests || 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {/* API Key Display */}
                      {!isFreeApi && (
                        <div className="mb-4 space-y-2">
                          <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">API Key</label>
                            {isEditing ? (
                              <input
                                type="password"
                                placeholder="Enter new API key"
                                value={providerEditForm.apiKey}
                                onChange={e => setProviderEditForm({ ...providerEditForm, apiKey: e.target.value })}
                                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-xs font-mono bg-white text-black"
                              />
                            ) : (
                              <div className="text-xs font-mono text-gray-400 bg-white border border-[#E0E0E0] rounded-lg px-3 py-2">
                                {provider.apiKey ? '•••••••••••••••••••••••••' : 'Not configured'}
                              </div>
                            )}
                          </div>
                          {provider.name === 'adzuna' && (
                            <div>
                              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">App ID</label>
                              {isEditing ? (
                                <input
                                  type="password"
                                  placeholder="Enter Adzuna App ID"
                                  value={providerEditForm.appId}
                                  onChange={e => setProviderEditForm({ ...providerEditForm, appId: e.target.value })}
                                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-xs font-mono bg-white text-black"
                                />
                              ) : (
                                <div className="text-xs font-mono text-gray-400 bg-white border border-[#E0E0E0] rounded-lg px-3 py-2">
                                  {provider.appId ? '•••••••••••••' : 'Not configured'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Last Tested */}
                      <div className="text-[9px] text-gray-400 mb-4">
                        Last checked: {provider.lastTestedAt
                          ? new Date(provider.lastTestedAt).toLocaleString()
                          : 'Never tested'}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveProvider(provider.name)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 cursor-pointer transition-colors"
                            >
                              <Save size={11} /> Save
                            </button>
                            <button
                              onClick={() => setEditingProvider(null)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E0E0E0] text-gray-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              disabled={isTesting}
                              onClick={() => handleTestProviderConnection(provider.name)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                            >
                              <Zap size={11} />
                              {isTesting ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button
                              disabled={isTesting}
                              onClick={() => handleProviderHealthCheck(provider.name)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E0E0E0] text-black rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors"
                            >
                              <Activity size={11} /> Health Check
                            </button>
                            {!isFreeApi && (
                              <button
                                onClick={() => {
                                  setEditingProvider(provider.name);
                                  setProviderEditForm({
                                    apiKey: '',
                                    appId: '',
                                    priority: provider.priority,
                                    status: provider.status
                                  });
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E0E0E0] text-black rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <Key size={11} /> Edit Key
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleProvider(provider)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors border ${
                                isOnline
                                  ? 'bg-white text-red-500 border-red-200 hover:bg-red-50'
                                  : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                              }`}
                            >
                              {isOnline ? <WifiOff size={11} /> : <Wifi size={11} />}
                              {isOnline ? 'Disable' : 'Enable'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Provider Guide */}
            <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-md text-black mb-3 flex items-center gap-2">
                <HelpCircle size={16} /> Provider Configuration Guide
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-gray-600">
                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 space-y-2">
                  <div className="font-bold text-black text-xs">JSearch (RapidAPI)</div>
                  <p>Premium provider with the largest job aggregation. Requires a RapidAPI key. Supports global searches with salary data.</p>
                  <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch" target="_blank" rel="noopener noreferrer" className="text-black font-semibold hover:underline inline-flex items-center gap-1">
                    Get API Key <ExternalLink size={10} />
                  </a>
                </div>
                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 space-y-2">
                  <div className="font-bold text-black text-xs">Adzuna</div>
                  <p>Global job search engine. Requires both App ID and API Key. Strong coverage in UK, US, Australia, India.</p>
                  <a href="https://developer.adzuna.com/" target="_blank" rel="noopener noreferrer" className="text-black font-semibold hover:underline inline-flex items-center gap-1">
                    Get API Key <ExternalLink size={10} />
                  </a>
                </div>
                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 space-y-2">
                  <div className="font-bold text-black text-xs">Remotive</div>
                  <p className="text-green-600 font-semibold">Free API — No key required.</p>
                  <p>Specializes in remote job listings. Curated selection of remote-first companies and positions.</p>
                </div>
                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 space-y-2">
                  <div className="font-bold text-black text-xs">Arbeitnow</div>
                  <p className="text-green-600 font-semibold">Free API — No key required.</p>
                  <p>European job board with growing international coverage. Good for tech roles and startups.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          MODALS & DRAWERS
         ========================================== */}

      {/* User Details Slide-out Drawer */}
      {showDrawer && selectedUser && (
        <>
          <div
            onClick={() => setShowDrawer(false)}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 transition-opacity"
          />
          <div className="fixed right-0 top-0 h-screen w-[440px] bg-[#F7F7F7] border-l border-[#E0E0E0] shadow-2xl p-6 z-[100] animate-slide-left flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-black">Candidate Account details</h3>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1 rounded bg-white border border-[#E0E0E0] text-[#777777] hover:text-black cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-[#555555] font-bold uppercase tracking-wider block mb-1">Full Name</label>
                    <span className="text-sm font-semibold text-black block">{selectedUser.displayName}</span>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#555555] font-bold uppercase tracking-wider block mb-1">Email Address</label>
                    <span className="text-sm text-[#222222] font-mono block truncate">{selectedUser.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-[#555555] font-bold uppercase tracking-wider block mb-1">Plan</label>
                    <select
                      value={selectedUser.plan || 'free'}
                      onChange={(e) => handleUpgradeUser(selectedUser.id, e.target.value)}
                      className="bg-white border border-[#E0E0E0] rounded-lg px-2.5 py-1 text-xs text-black cursor-pointer"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="max">Max</option>
                      <option value="ultimate">Ultimate</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-[#555555] font-bold uppercase tracking-wider block mb-1">Status</label>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-[#555555] font-bold uppercase tracking-wider block mb-1">Joined Date</label>
                    <span className="text-xs font-semibold text-[#444444] block">
                      {new Date(selectedUser.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#555555] font-bold uppercase tracking-wider block mb-1">Suspend Status</label>
                    <button
                      onClick={() => handleToggleSuspendUser(selectedUser.id)}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer ${selectedUser.isSuspended ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-black border-[#E0E0E0]'}`}
                    >
                      {selectedUser.isSuspended ? 'Unsuspend User' : 'Suspend User'}
                    </button>
                  </div>
                </div>

                {/* Candidate activity details */}
                <div className="border-t border-[#E0E0E0] pt-4">
                  <label className="text-[10px] text-[#555555] uppercase tracking-wider block font-bold mb-2">Recent Candidate Activity</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 bg-white border border-[#E0E0E0] rounded-xl p-3">
                    {userActivityLoading ? (
                      <div className="text-[11px] text-gray-500 text-center py-2">Loading logs...</div>
                    ) : userActivity.length === 0 ? (
                      <div className="text-[11px] text-gray-400 text-center py-2">No logs registered.</div>
                    ) : (
                      userActivity.map((act, i) => (
                        <div key={i} className="text-[11px] leading-relaxed flex justify-between gap-1.5 border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                          <span className="text-gray-700">{act.action}</span>
                          <span className="text-[9px] text-gray-400 font-mono shrink-0">{new Date(act.timestamp).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Internal notes */}
                <div className="border-t border-[#E0E0E0] pt-4 space-y-2">
                  <label className="text-[10px] text-[#555555] uppercase tracking-wider block font-bold">Internal Admin Notes</label>
                  <textarea
                    rows={3}
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Add private notes..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black placeholder:text-black/25 focus:outline-none resize-none"
                  />
                  <button
                    onClick={handleSaveUserNotes}
                    className="w-full py-2 bg-white text-black hover:bg-[#F9F9F9] font-bold rounded-xl text-xs transition-all border border-[#E0E0E0] cursor-pointer shadow-sm"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Contact Message Details Slide-out Drawer */}
      {showReplyDrawer && selectedTicket && (
        <>
          <div
            onClick={() => setShowReplyDrawer(false)}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 transition-opacity"
          />
          <div className="fixed right-0 top-0 h-screen w-full max-w-7xl bg-[#F7F7F7] border-l border-[#E0E0E0] shadow-2xl p-6 z-[100] animate-slide-left flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E0E0E0] mb-4">
              <div>
                <h3 className="font-bold text-lg text-black">Website Contact Form Message Details</h3>
                <p className="text-xs text-[#555555]">View details, review user contact history, update assignment/status, and send replies.</p>
              </div>
              <button
                onClick={() => setShowReplyDrawer(false)}
                className="p-1.5 rounded-lg bg-white border border-[#E0E0E0] text-[#777777] hover:text-black cursor-pointer shadow-sm transition-all animate-fade-in"
              >
                <X size={16} />
              </button>
            </div>

            {/* Redesigned 3-Column Split Screen Container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
              
              {/* Column 1: Left Side (User Details & Contact History) */}
              <div className="lg:col-span-4 flex flex-col space-y-4 overflow-y-auto pr-1">
                {/* User details */}
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 space-y-3 shadow-sm text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block border-b pb-1 font-semibold">User Profile</span>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#999999] block">User Name</span>
                      <span className="text-xs font-bold text-black block">{selectedTicket.name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#999999] block">User Email</span>
                      <span className="text-xs font-mono font-semibold text-[#222222] truncate block">{selectedTicket.email}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#999999] block">Submission Date</span>
                      <span className="text-xs font-semibold text-black block">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Contact History */}
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 space-y-3 shadow-sm text-left flex-1 min-h-[220px] flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block border-b pb-1 font-semibold">Contact History</span>
                  <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 max-h-[350px]">
                    {messages.filter(m => m.email === selectedTicket.email && m.id !== selectedTicket.id).length === 0 ? (
                      <div className="text-center py-10 text-[10px] text-gray-400 italic">No previous contact history found.</div>
                    ) : (
                      messages.filter(m => m.email === selectedTicket.email && m.id !== selectedTicket.id).map(prevMsg => (
                        <div
                          key={prevMsg.id}
                          onClick={() => {
                            setSelectedTicket(prevMsg);
                            setReplyText('');
                            setReplyAttachments([]);
                          }}
                          className="p-2.5 rounded-lg border border-[#E0E0E0] hover:border-black bg-[#FAFAFA] transition-all cursor-pointer text-left space-y-1"
                        >
                          <div className="flex justify-between items-center text-[9px] font-mono text-[#777777]">
                            <span>{new Date(prevMsg.createdAt).toLocaleDateString()}</span>
                            <span className="uppercase font-bold text-[8px]">{prevMsg.status}</span>
                          </div>
                          <div className="text-xs font-bold text-black truncate">{prevMsg.subject}</div>
                          <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{prevMsg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Center (Original Message & Attachments) */}
              <div className="lg:col-span-4 flex flex-col space-y-4 overflow-y-auto pr-1">
                {/* Original Message contents */}
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 space-y-3 shadow-sm text-left flex-1 flex flex-col min-h-[300px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block border-b pb-1 font-semibold">Original Message</span>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#999999]">Subject</span>
                    <h4 className="text-sm font-bold text-black leading-tight">{selectedTicket.subject}</h4>
                  </div>
                  {selectedTicket.category && (
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#999999] block">Category</span>
                      <span className="text-xs font-semibold text-black uppercase">{selectedTicket.category}</span>
                    </div>
                  )}
                  <div className="border-t border-[#F0F0F0] pt-3 flex-1 overflow-y-auto">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#999999] block mb-1">Message Body</span>
                    <div className="text-xs text-[#222222] leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.message}
                    </div>
                  </div>
                </div>

                {/* Professional Attachment Cards */}
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 space-y-3 shadow-sm text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block border-b pb-1 font-semibold">Attached Files</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {!selectedTicket.attachments || selectedTicket.attachments.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-gray-400 italic">No attachments provided.</div>
                    ) : (
                      selectedTicket.attachments.map((att, idx) => {
                        const name = att.fileName || att.filename || 'Attachment';
                        const type = String(att.fileType || '').toLowerCase();
                        let icon = '📄';
                        let typeLabel = 'DOC';
                        if (type.includes('pdf')) { icon = '📄'; typeLabel = 'PDF'; }
                        else if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) { icon = '🖼️'; typeLabel = 'IMG'; }
                        else if (type.includes('word') || type.includes('docx') || type.includes('doc')) { icon = '📘'; typeLabel = 'DOCX'; }
                        else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) { icon = '📦'; typeLabel = 'ZIP'; }

                        const sizeKB = att.fileSize ? (att.fileSize / 1024).toFixed(1) + ' KB' : 'Unknown Size';

                        return (
                          <div key={idx} className="flex items-center justify-between bg-[#F7F7F7] border border-[#E0E0E0] p-2.5 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-lg shrink-0 select-none">{icon}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-black truncate max-w-[130px]" title={name}>{name}</div>
                                <div className="text-[9px] text-[#777777] font-mono">{sizeKB} • {typeLabel}</div>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {(typeLabel === 'IMG' || typeLabel === 'PDF') && att.fileData && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const w = window.open();
                                    w.document.write(`<iframe src="${att.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  }}
                                  className="px-2 py-1 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[10px] font-bold rounded text-black shadow-sm transition-all cursor-pointer"
                                >
                                  Preview
                                </button>
                              )}
                              {att.fileData && (
                                <a
                                  href={att.fileData}
                                  download={name}
                                  className="px-2 py-1 bg-black hover:bg-black/90 text-white text-[10px] font-bold rounded shadow-sm transition-all flex items-center justify-center cursor-pointer"
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: Right Side (Composer, Notes, Controls, Preview) */}
              <div className="lg:col-span-4 flex flex-col space-y-4 overflow-y-auto pr-1">
                {/* Controls */}
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 space-y-3 shadow-sm text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block border-b pb-1 font-semibold">Assignment & Status</span>
                  <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#777777] font-bold uppercase">Assignee</span>
                      <select
                        value={selectedTicket.assignedAdminId || ''}
                        onChange={(e) => handleAssignMessage(selectedTicket.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E0E0E0] rounded-lg text-xs text-black focus:outline-none cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {admins.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.id === user?.id ? `Me (${a.firstName})` : `${a.firstName} ${a.lastName || ''}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#777777] font-bold uppercase">Status</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateMessageStatus(selectedTicket.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E0E0E0] rounded-lg text-xs text-black focus:outline-none cursor-pointer"
                      >
                        <option value="new">New</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_reply">Waiting Reply</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => handleAssignMessage(selectedTicket.id, user?.id)}
                      className="flex-1 py-1.5 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-black text-[11px] font-bold rounded-lg transition-all shadow-sm cursor-pointer text-center"
                    >
                      Assign to Me
                    </button>
                    <button
                      onClick={() => handleUpdateMessageStatus(selectedTicket.id, 'archived')}
                      className="py-1.5 px-3 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[#777777] text-[11px] font-bold rounded-lg transition-all shadow-sm cursor-pointer text-center"
                    >
                      Archive
                    </button>
                  </div>
                </div>

                {/* Reply Composer */}
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 space-y-3 shadow-sm text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block border-b pb-1 font-semibold">Outbound Composer</span>
                  {selectedTicket.assignedAdminId && selectedTicket.assignedAdminId !== user?.id && user?.role !== 'owner' ? (
                    <div className="p-3 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 text-xs text-[#EF4444] font-medium leading-normal flex gap-1.5">
                      <AlertTriangle size={14} className="shrink-0" />
                      Access denied. Only the assigned administrator or Owner can reply.
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessageReply} className="space-y-3">
                      <textarea
                        required
                        rows={4}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type reply email content here..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black placeholder:text-black/25 focus:outline-none resize-none"
                      />

                      {/* File attachments */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-black text-[10px] font-bold rounded-lg transition-all shadow-sm cursor-pointer select-none">
                            <Paperclip size={10} />
                            Attach Files
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                          <span className="text-[9px] text-[#777777] font-sans">
                            {replyAttachments.length} file(s)
                          </span>
                        </div>
                        {replyAttachments.length > 0 && (
                          <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1">
                            {replyAttachments.map((att, index) => (
                              <div key={index} className="flex justify-between items-center bg-[#F7F7F7] border border-[#E0E0E0] px-2 py-0.5 rounded text-[9px] text-[#222222]">
                                <span className="truncate max-w-[150px] font-medium">{att.fileName}</span>
                                <button
                                  type="button"
                                  onClick={() => setReplyAttachments(prev => prev.filter((_, idx) => idx !== index))}
                                  className="text-red-500 hover:text-red-700 cursor-pointer font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingReply}
                        className="w-full h-10 bg-black text-white hover:bg-black/90 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        <Send size={11} />
                        {isSendingReply ? 'Sending Reply...' : 'Send Reply Email'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Internal notes */}
                <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 space-y-2.5 shadow-sm text-left">
                  <label className="text-[10px] text-[#555555] uppercase tracking-wider block font-bold border-b pb-1">Private Notes</label>
                  <textarea
                    rows={2}
                    value={ticketNotes}
                    onChange={(e) => setTicketNotes(e.target.value)}
                    placeholder="Internal support notes..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black placeholder:text-black/25 focus:outline-none resize-none"
                  />
                  <button
                    onClick={handleSaveMessageNotes}
                    className="w-full py-1.5 bg-white text-black hover:bg-[#F9F9F9] font-bold rounded-xl text-xs transition border border-[#E0E0E0] cursor-pointer shadow-sm"
                  >
                    Save Notes
                  </button>
                </div>

                {/* Inline Live Email Preview */}
                <div className="border border-[#E0E0E0] rounded-xl p-4 bg-gray-50 flex flex-col space-y-2">
                  <div className="text-[10px] font-bold text-[#555555] uppercase tracking-wider text-left border-b pb-1">Live Email Preview</div>
                  <div className="bg-white border border-[#E0E0E0] rounded-lg p-4 shadow-sm font-sans text-left space-y-3">
                    <div className="border-b border-[#F0F0F0] pb-2">
                      <span className="font-extrabold text-sm tracking-tight text-black">
                        Hirenext<span className="font-normal text-[#555555]">AI</span>
                      </span>
                    </div>
                    <p className="text-xs font-bold text-black">Hello {selectedTicket.name || 'User'},</p>
                    <div className="text-xs text-black leading-relaxed whitespace-pre-wrap min-h-[60px]">
                      {replyText || (
                        <span className="text-gray-300 italic font-normal">
                          Type email reply content above to preview...
                        </span>
                      )}
                    </div>
                    <div className="pt-2 border-t border-[#F0F0F0] text-[10px] text-[#555555]">
                      <p className="font-bold text-[#333333]">HirenextAI Team</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Deletion Confirmation Modal */}
      {deleteUserId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm" onClick={() => setDeleteUserId(null)} />
          <div className="relative bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4 text-black">
              <Trash2 size={24} className="text-[#EF4444]" />
              <h3 className="text-lg font-bold text-black">Delete User Account?</h3>
            </div>
            <p className="text-[#555555] text-xs mb-6 leading-relaxed">
              This action cannot be undone. The user's credentials, chat histories, resume uploads, and contact messages will be permanently removed from our databases.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUserId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E0E0E0] text-black font-medium hover:bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#EF4444] text-white font-medium hover:bg-[#EF4444]/90 transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Email Simulation Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/15 backdrop-blur-sm" onClick={() => setShowSimulateModal(false)} />
          <div className="relative bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up text-left space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-md font-bold text-black">Simulate Incoming Customer Email</h3>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="p-1 rounded bg-white border border-[#E0E0E0] text-gray-500 hover:text-black cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            <form onSubmit={handleSimulateEmail} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-semibold uppercase">Target Mailbox</label>
                <select
                  value={simulateMailbox}
                  onChange={(e) => setSimulateMailbox(e.target.value)}
                  className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-2 text-xs text-black cursor-pointer"
                >
                  <option value="support@hirenextai.com">support@hirenextai.com</option>
                  <option value="hello@hirenextai.com">hello@hirenextai.com</option>
                  <option value="careers@hirenextai.com">careers@hirenextai.com</option>
                  <option value="billing@hirenextai.com">billing@hirenextai.com</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 font-semibold uppercase">Sender Name</label>
                  <input
                    type="text"
                    required
                    value={simulateSenderName}
                    onChange={(e) => setSimulateSenderName(e.target.value)}
                    placeholder="e.g. Vanshika"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 font-semibold uppercase">Sender Email</label>
                  <input
                    type="email"
                    required
                    value={simulateSenderEmail}
                    onChange={(e) => setSimulateSenderEmail(e.target.value)}
                    placeholder="client@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-semibold uppercase">Subject</label>
                <input
                  type="text"
                  required
                  value={simulateSubject}
                  onChange={(e) => setSimulateSubject(e.target.value)}
                  placeholder="e.g. Billing issue with Pro tier upgrade"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-semibold uppercase">Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={simulateBody}
                  onChange={(e) => setSimulateBody(e.target.value)}
                  placeholder="Describe your issue..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulatingEmail}
                className="w-full h-10 bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-black/90 transition-all cursor-pointer shadow-sm"
              >
                {isSimulatingEmail ? 'Simulating...' : 'Inject Email'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDetailsAdmin(null)}>
          <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 w-full max-w-lg shadow-xl relative text-black" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetailsAdmin(null)} className="absolute top-4 right-4 text-[#555555] hover:text-black transition-colors cursor-pointer">
              <X size={20} />
            </button>
            <h3 className="font-bold text-lg text-black mb-4">Administrator Details</h3>
            <div className="space-y-3.5 text-sm bg-white p-4 border border-[#E0E0E0] rounded-xl">
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Email</span>
                <span className="font-medium">{detailsAdmin.email}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Role Type</span>
                <span className="font-medium capitalize">{detailsAdmin.role}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Custom Title</span>
                <span className="font-medium">{detailsAdmin.adminRoleName || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Created Date</span>
                <span className="font-medium">{detailsAdmin.createdAt ? new Date(detailsAdmin.createdAt).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Created By</span>
                <span className="font-medium">{detailsAdmin.creatorEmail ? `${detailsAdmin.creatorName} (${detailsAdmin.creatorEmail})` : 'System'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Last Login</span>
                <span className="font-medium">{detailsAdmin.lastLoginAt ? new Date(detailsAdmin.lastLoginAt).toLocaleString() : 'Never'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Total Actions</span>
                <span className="font-medium">{detailsAdmin.totalActions || 0}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Browser</span>
                <span className="font-medium">{detailsAdmin.browser || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">IP Address</span>
                <span className="font-medium">{detailsAdmin.ipAddress || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Total Logins</span>
                <span className="font-medium">{detailsAdmin.totalLogins || 0}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-[#555555] font-semibold">Status</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${detailsAdmin.isSuspended ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#22C55E]/10 text-[#22C55E]'}`}>
                  {detailsAdmin.isSuspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-[#555555] font-semibold">Session Status</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  detailsAdmin.liveStatus === 'online' ? 'bg-green-50 text-green-600 border-green-200' :
                  detailsAdmin.liveStatus === 'idle' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  detailsAdmin.liveStatus === 'suspended' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    detailsAdmin.liveStatus === 'online' ? 'bg-green-500' :
                    detailsAdmin.liveStatus === 'idle' ? 'bg-amber-500' :
                    detailsAdmin.liveStatus === 'suspended' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                  {detailsAdmin.liveStatus === 'online' ? 'Online' :
                   detailsAdmin.liveStatus === 'idle' ? 'Idle' :
                   detailsAdmin.liveStatus === 'suspended' ? 'Suspended' :
                   'Offline'}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-[#555555] font-semibold uppercase tracking-wider block mb-2">Granted Permissions</span>
              <div className="flex flex-wrap gap-1.5 p-3 bg-white border border-[#E0E0E0] rounded-xl max-h-32 overflow-y-auto">
                {detailsAdmin.role === 'owner' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black text-white">ALL SYSTEM PRIVILEGES</span>
                ) : (() => {
                  let perms = [];
                  try { perms = JSON.parse(detailsAdmin.adminPermissions || '[]'); } catch(e) {}
                  return perms.length > 0 ? perms.map(p => (
                    <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] uppercase">{p}</span>
                  )) : <span className="text-xs text-gray-400 italic">No permissions assigned</span>;
                })()}
              </div>
            </div>
            <div className="mt-4 border-t border-[#E0E0E0] pt-4 space-y-2">
              <span className="text-xs text-[#555555] font-semibold uppercase tracking-wider block">Private Admin Notes</span>
              <textarea
                rows={3}
                value={adminNotesText}
                onChange={(e) => setAdminNotesText(e.target.value)}
                placeholder="Write private notes about this administrator..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0E0E0] text-xs text-black placeholder:text-black/25 focus:outline-none resize-none focus:border-black transition-all"
              />
              <button
                onClick={handleSaveAdminNotes}
                disabled={isSavingNotes}
                className="w-full py-2 bg-black hover:bg-black/90 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                type="button"
              >
                {isSavingNotes ? 'Saving Notes...' : 'Save Private Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login History Modal */}
      {historyAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setHistoryAdmin(null)}>
          <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 w-full max-w-lg shadow-xl relative text-black flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setHistoryAdmin(null)} className="absolute top-4 right-4 text-[#555555] hover:text-black transition-colors cursor-pointer">
              <X size={20} />
            </button>
            <h3 className="font-bold text-lg text-black mb-1">Login History</h3>
            <p className="text-xs text-[#555555] mb-4">Displaying recent login verification records for {historyAdmin.email}.</p>
            
            <div className="flex-1 overflow-y-auto border border-[#E0E0E0] rounded-xl bg-white divide-y divide-gray-100 max-h-96">
              {historyLogs.length > 0 ? historyLogs.map(log => (
                <div key={log.id} className="p-3 text-xs flex justify-between items-center hover:bg-[#F9F9F9] transition-colors">
                  <div>
                    <span className="font-bold text-black uppercase tracking-wider text-[9px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">{log.action}</span>
                    <p className="text-[#555555] mt-1 font-medium">{log.details}</p>
                  </div>
                  <span className="text-gray-400 font-medium shrink-0 ml-4">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              )) : (
                <div className="p-8 text-center text-xs text-gray-400 italic">No login records found for this admin.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {logsAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setLogsAdmin(null)}>
          <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 w-full max-w-2xl shadow-xl relative text-black flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLogsAdmin(null)} className="absolute top-4 right-4 text-[#555555] hover:text-black transition-colors cursor-pointer">
              <X size={20} />
            </button>
            <h3 className="font-bold text-lg text-black mb-1">Activity Logs</h3>
            <p className="text-xs text-[#555555] mb-4">Viewing full audit logs for {logsAdmin.email}.</p>
            
            <div className="flex-1 overflow-y-auto border border-[#E0E0E0] rounded-xl bg-white divide-y divide-gray-100 max-h-[500px]">
              {logsList.length > 0 ? logsList.map(log => (
                <div key={log.id} className="p-3.5 text-xs flex justify-between items-start hover:bg-[#F9F9F9] transition-colors">
                  <div className="space-y-1">
                    <span className="font-bold text-black uppercase tracking-wider text-[9px] px-2 py-0.5 bg-[#F2F2F2] border border-[#E0E0E0] rounded">{log.action}</span>
                    <p className="text-[#333333] font-semibold">{log.details}</p>
                  </div>
                  <span className="text-gray-400 font-medium shrink-0 text-[10px] pl-4">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              )) : (
                <div className="p-8 text-center text-xs text-gray-400 italic">No recorded actions found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmDialog({ isOpen: false, type: '', admin: null })}>
          <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-black" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-black mb-2 flex items-center gap-2">
              {confirmDialog.type === 'transfer' ? '⚠️ Transfer Ownership' : confirmDialog.type === 'remove' ? 'Remove Administrator' : 'Suspend Administrator'}
            </h3>
            <p className="text-sm text-[#333333] leading-relaxed mb-6">
              {confirmDialog.type === 'transfer' && `Are you absolutely sure you want to transfer website ownership to ${confirmDialog.admin.email}? You will be demoted to an administrator and this action cannot be undone.`}
              {confirmDialog.type === 'remove' && `Are you sure you want to remove administrator privileges from ${confirmDialog.admin.email}? They will be demoted to a standard user.`}
              {confirmDialog.type === 'suspend' && `Are you sure you want to suspend administrator access for ${confirmDialog.admin.email}? They will be blocked from accessing the control panel immediately.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: false, type: '', admin: null })}
                className="px-4 py-2 border border-[#E0E0E0] bg-white text-black text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { type, admin } = confirmDialog;
                  setConfirmDialog({ isOpen: false, type: '', admin: null });
                  if (type === 'transfer') handleTransferOwnership(admin.id);
                  if (type === 'remove') handleRemoveAdmin(admin.id);
                  if (type === 'suspend') handleToggleSuspendAdmin(admin.id, true);
                }}
                className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-black/90 transition-colors cursor-pointer"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sliding Admin Profile Drawer */}
      <AnimatePresence>
        {isProfileDrawerOpen && profileDrawerAdmin && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileDrawerOpen(false)}
              className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[9999] cursor-pointer"
            />
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-[#E0E0E0] shadow-2xl z-[10000] flex flex-col text-left overflow-hidden font-sans"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-sm select-none ${
                    profileDrawerAdmin.role === 'owner' ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 owner-gold-badge' :
                    profileDrawerAdmin.isSuspended ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {profileDrawerAdmin.email ? profileDrawerAdmin.email.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-black leading-snug">
                      {[profileDrawerAdmin.firstName, profileDrawerAdmin.lastName].filter(Boolean).join(' ') || profileDrawerAdmin.email.split('@')[0]}
                    </h3>
                    <p className="text-xs text-[#555555] font-medium truncate max-w-[220px]">
                      {profileDrawerAdmin.email}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProfileDrawerOpen(false)} 
                  className="p-2 rounded-xl bg-white border border-[#E0E0E0] text-gray-500 hover:text-black hover:shadow-sm transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Content Area (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-sidebar-scrollbar bg-white">
                {/* Status and Role */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F9F9F9] border border-[#E0E0E0] rounded-2xl p-4 text-left">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#777777] block mb-1">Status</span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      profileDrawerAdmin.isSuspended ? 'bg-red-50 text-red-600 border-red-200' :
                      !profileDrawerAdmin.isVerified ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      profileDrawerAdmin.liveStatus === 'online' ? 'bg-green-50 text-green-600 border-green-200' :
                      'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        profileDrawerAdmin.isSuspended ? 'bg-red-500' :
                        !profileDrawerAdmin.isVerified ? 'bg-amber-500' :
                        profileDrawerAdmin.liveStatus === 'online' ? 'bg-green-500' :
                        'bg-gray-400'
                      }`} />
                      {profileDrawerAdmin.isSuspended ? 'Suspended' :
                       !profileDrawerAdmin.isVerified ? 'Pending Verification' :
                       profileDrawerAdmin.liveStatus === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="bg-[#F9F9F9] border border-[#E0E0E0] rounded-2xl p-4 text-left">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#777777] block mb-1">Role Type</span>
                    {profileDrawerAdmin.role === 'owner' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 owner-gold-badge">
                        👑 OWNER
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-black bg-white px-2.5 py-1 border border-[#E0E0E0] rounded-full inline-block">
                        {profileDrawerAdmin.adminRoleName || 'Administrator'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Details Grid */}
                <div className="space-y-3.5 text-xs text-black border border-[#E0E0E0] rounded-2xl p-4 bg-gray-50/50">
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Verification Status</span>
                    <span className={`font-semibold ${profileDrawerAdmin.isVerified ? 'text-green-600' : 'text-amber-600'}`}>
                      {profileDrawerAdmin.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  {profileDrawerAdmin.isVerified && profileDrawerAdmin.verifiedAt && (
                    <div className="flex justify-between border-b border-gray-150 pb-2">
                      <span className="text-[#555555] font-semibold">Verified Date</span>
                      <span className="font-medium">{new Date(profileDrawerAdmin.verifiedAt).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Created Date</span>
                    <span className="font-medium">{profileDrawerAdmin.createdAt ? new Date(profileDrawerAdmin.createdAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Created By</span>
                    <span className="font-medium truncate max-w-[200px]" title={profileDrawerAdmin.creatorEmail || 'System'}>
                      {profileDrawerAdmin.creatorEmail ? `${profileDrawerAdmin.creatorName || ''} (${profileDrawerAdmin.creatorEmail})` : 'System'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Last Login</span>
                    <span className="font-medium">{profileDrawerAdmin.lastLoginAt ? new Date(profileDrawerAdmin.lastLoginAt).toLocaleString() : 'Never'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Public IP Address</span>
                    <span className="font-medium font-mono">{profileDrawerAdmin.ipAddress === '127.0.0.1 (Development)' ? 'Local Development Machine' : (profileDrawerAdmin.ipAddress || 'N/A')}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Browser</span>
                    <span className="font-medium">{profileDrawerAdmin.browser || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Operating System</span>
                    <span className="font-medium">{profileDrawerAdmin.os || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Device Type</span>
                    <span className="font-medium">{profileDrawerAdmin.device || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-[#555555] font-semibold">Country</span>
                    <span className="font-medium">{profileDrawerAdmin.country || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between pb-0.5">
                    <span className="text-[#555555] font-semibold">City</span>
                    <span className="font-medium">{profileDrawerAdmin.city || 'N/A'}</span>
                  </div>
                </div>

                {/* Granted Permissions List */}
                <div className="space-y-2">
                  <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">Permissions Panel</span>
                  <div className="flex flex-wrap gap-1.5 p-4 bg-white border border-[#E0E0E0] rounded-2xl max-h-32 overflow-y-auto custom-sidebar-scrollbar">
                    {profileDrawerAdmin.role === 'owner' ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black text-white uppercase tracking-wider">ALL PRIVILEGES GRANTED</span>
                    ) : (() => {
                      let perms = [];
                      try { perms = JSON.parse(profileDrawerAdmin.adminPermissions || '[]'); } catch(e) {}
                      return perms.length > 0 ? perms.map(p => (
                        <span key={p} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#F2F2F2] border border-[#E0E0E0] text-[#555555] uppercase">{p}</span>
                      )) : <span className="text-xs text-gray-400 italic">No permissions assigned</span>;
                    })()}
                  </div>
                </div>

                {/* Activity Timeline section */}
                <div className="space-y-3.5 border-t border-[#E0E0E0] pt-5">
                  <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">Activity Timeline</span>
                  
                  {isProfileDrawerLogsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <RefreshCw className="animate-spin text-[#888888]" size={20} />
                      <span className="text-xs text-gray-400 font-medium">Fetching logs...</span>
                    </div>
                  ) : profileDrawerLogs.length > 0 ? (
                    <div className="relative pl-6 border-l border-[#E0E0E0] space-y-5 py-1 text-xs">
                      {profileDrawerLogs.map(log => (
                        <div key={log.id} className="relative">
                          {/* Timeline dot */}
                          <span className="absolute -left-[30px] top-1 w-2 h-2 rounded-full bg-black ring-4 ring-white" />
                          <div className="font-semibold text-black uppercase tracking-wider text-[8px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded inline-block mb-1">
                            {log.action}
                          </div>
                          <p className="text-[#333333] font-medium leading-relaxed">{log.details}</p>
                          <span className="text-[9px] text-[#888888] font-medium font-mono mt-0.5 block">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-gray-400 italic bg-[#F9F9F9] border border-dashed border-[#E0E0E0] rounded-2xl">
                      No recorded activity found.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Styles and styling helpers
const getPlanBadgeClass = (planName) => {
  if (!planName) return 'bg-[#111111] text-white/50 border border-gray-200';
  switch (planName.toLowerCase()) {
    case 'pro':
    case 'max':
    case 'ultimate':
      return 'bg-black text-white border border-black';
    default:
      return 'bg-[#F2F2F2] text-[#555555] border border-[#E0E0E0]';
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Active':
      return 'bg-green-50 text-green-600 border-green-200';
    case 'Suspended':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

const getAppStatusClass = (status) => {
  switch (status) {
    case 'Selected':
      return 'bg-green-50 text-green-600 border border-green-200';
    case 'Rejected':
      return 'bg-red-50 text-red-600 border border-red-200';
    case 'Interview':
      return 'bg-blue-50 text-blue-600 border border-blue-200';
    case 'Shortlisted':
      return 'bg-amber-50 text-amber-600 border border-amber-200';
    default:
      return 'bg-gray-50 text-gray-600 border border-gray-200';
  }
};

export default AdminPanel;
