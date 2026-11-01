import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Mail, 
  Calendar, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  Check, 
  Copy, 
  Plus, 
  RefreshCw, 
  Activity, 
  Clock, 
  Lock, 
  Eye, 
  Pencil, 
  ChevronRight, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { usersApi } from '@/api/users.api';
import { AppUser } from '@/api/auth.api';
import { useTheme } from '../components/ThemeProvider';
import { toast } from 'sonner';

import { getAvailableModulesForAdmin, UserManagementModuleConfig as ModuleConfig } from '../config/modules.config';

const AVAILABLE_MODULES: ModuleConfig[] = getAvailableModulesForAdmin();

// Avatar Gradient Monogram Palette
const AVATAR_PALETTES = [
  { bg: 'from-blue-600 to-indigo-600', ring: 'ring-blue-500/30', text: 'text-white' },
  { bg: 'from-purple-600 to-pink-600', ring: 'ring-purple-500/30', text: 'text-white' },
  { bg: 'from-emerald-600 to-teal-600', ring: 'ring-emerald-500/30', text: 'text-white' },
  { bg: 'from-amber-600 to-orange-600', ring: 'ring-amber-500/30', text: 'text-white' },
  { bg: 'from-rose-600 to-red-600', ring: 'ring-rose-500/30', text: 'text-white' },
  { bg: 'from-cyan-600 to-blue-600', ring: 'ring-cyan-500/30', text: 'text-white' },
];

export default function UserManagementPage() {
  const { isDark } = useTheme();

  // Data state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'CLIENT' | 'SUPER_ADMIN'>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Modal Dialogs state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<AppUser | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CLIENT' | 'SUPER_ADMIN'>('CLIENT');
  const [hiddenModules, setHiddenModules] = useState<string[]>(AVAILABLE_MODULES.map(m => m.id));
  const [readOnlyModules, setReadOnlyModules] = useState<string[]>([]);
  const [moduleSearch, setModuleSearch] = useState('');

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAllUsers();
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Failed to load user directory', { description: error.message });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const data = await usersApi.getAuditLogs();
      setAuditLogs(data || []);
    } catch (error: any) {
      toast.error('Failed to load audit logs', { description: error.message });
    } finally {
      setLoadingAudit(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (activeTab === 'users') fetchUsers();
    else fetchAuditLogs();
  };

  // Open Create Modal
  const openAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setRole('CLIENT');
    setHiddenModules(AVAILABLE_MODULES.map(m => m.id)); // Default: all hidden
    setReadOnlyModules([]);
    setModuleSearch('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
    setHiddenModules(user.hiddenModules || []);
    setReadOnlyModules(user.readOnlyModules || []);
    setModuleSearch('');
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Valid email is required');
      return;
    }

    try {
      setIsSaving(true);
      if (editingUser) {
        const payload: any = { username, email, role, hiddenModules, readOnlyModules };
        await usersApi.updateUser(editingUser.id, payload);
        toast.success(`User @${username} updated successfully`);
      } else {
        await usersApi.createUser({ username, email, role, hiddenModules, readOnlyModules } as any);
        toast.success(`User @${username} created successfully`);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to save user', { 
        description: error.response?.data?.message || error.message 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteTargetUser) return;
    try {
      await usersApi.deleteUser(deleteTargetUser.id);
      toast.success(`User @${deleteTargetUser.username} deleted`);
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to delete user', { description: error.message });
    }
  };

  // Copy Email to Clipboard
  const handleCopyEmail = (userEmail: string) => {
    navigator.clipboard.writeText(userEmail);
    setCopiedEmail(userEmail);
    toast.success('Email copied to clipboard');
    setTimeout(() => setCopiedEmail(null), 1500);
  };

  // Preset module access setters
  const handleSetAllModules = (level: 'FULL' | 'VIEW' | 'NONE') => {
    if (level === 'FULL') {
      setHiddenModules([]);
      setReadOnlyModules([]);
    } else if (level === 'VIEW') {
      setHiddenModules([]);
      setReadOnlyModules(AVAILABLE_MODULES.map(m => m.id));
    } else {
      setHiddenModules(AVAILABLE_MODULES.map(m => m.id));
      setReadOnlyModules([]);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Exclude SUPER_ADMIN from regular table if preferred or keep according to existing policy
      const isSuper = user.role === 'SUPER_ADMIN';
      if (isSuper && editingUser?.role !== 'SUPER_ADMIN' && user.username === 'superadmin') {
        // keep or show with high privilege badge
      }

      // Role filter
      if (roleFilter !== 'ALL' && user.role !== roleFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = user.username.toLowerCase().includes(q);
        const matchesEmail = user.email.toLowerCase().includes(q);
        return matchesName || matchesEmail;
      }

      return true;
    });
  }, [users, roleFilter, searchQuery, editingUser]);

  // Executive KPI summary calculations
  const totalUsersCount = users.length;
  const adminUsersCount = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const clientUsersCount = users.filter(u => u.role === 'CLIENT').length;
  const totalAuditCount = auditLogs.length;

  return (
    <div className="w-full flex flex-col gap-6 py-2 select-none animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. HEADER & ACTIONS                                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-md shadow-blue-600/20 flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed font-normal">
              Manage user accounts, roles, and module access permissions.
            </p>
          </div>
        </div>

        {/* Top Right Action Tools */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh"
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#0E1422] border-white/10 text-slate-300 hover:text-blue-400 hover:border-blue-500/40 hover:bg-white/[0.04]'
                : 'bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {activeTab === 'users' && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-600/25 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS CARDS                                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div 
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-xl ${
            isDark 
              ? 'bg-[#0E1422]/80 border-white/[0.08] hover:border-blue-500/40' 
              : 'bg-white/90 border-slate-200 hover:border-blue-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Users
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {totalUsersCount}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
            All registered accounts
          </span>
        </div>

        {/* Admins */}
        <div 
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-xl ${
            isDark 
              ? 'bg-[#0E1422]/80 border-white/[0.08] hover:border-purple-500/40' 
              : 'bg-white/90 border-slate-200 hover:border-purple-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Admins
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {adminUsersCount}
            </span>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              Full Access
            </span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
            Full system & user access
          </span>
        </div>

        {/* Clients */}
        <div 
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-xl ${
            isDark 
              ? 'bg-[#0E1422]/80 border-white/[0.08] hover:border-emerald-500/40' 
              : 'bg-white/90 border-slate-200 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Clients
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {clientUsersCount}
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Standard
            </span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
            Assigned module access
          </span>
        </div>

        {/* Audit Logs */}
        <div 
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-xl ${
            isDark 
              ? 'bg-[#0E1422]/80 border-white/[0.08] hover:border-amber-500/40' 
              : 'bg-white/90 border-slate-200 hover:border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Audit Logs
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {totalAuditCount}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Recorded
            </span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
            User activity history
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TABLE CONTAINER                                                   */}
      {/* ========================================================================= */}
      <div 
        className={`rounded-3xl border relative overflow-hidden backdrop-blur-2xl transition-all duration-300 shadow-2xl ${
          isDark
            ? 'bg-[#0B0F19]/80 border-white/[0.08] shadow-black/80'
            : 'bg-white/95 border-slate-200/90 shadow-slate-200/50'
        }`}
      >
        {/* Top Accent Gradient Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-rose-500" />

        {/* Toolbar & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Segmented Tabs (Linear Style) */}
          <div className="inline-flex p-1 rounded-2xl border bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.08] self-start">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}>
                {filteredUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Audit Logs</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                activeTab === 'audit' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}>
                {auditLogs.length}
              </span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Search Bar */}
            <div className={`relative flex items-center rounded-xl border transition-all ${
              isDark 
                ? 'bg-[#070A12] border-white/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40' 
                : 'bg-slate-50 border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40'
            }`}>
              <Search className="w-4 h-4 ml-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className={`w-48 sm:w-64 pl-2.5 pr-8 py-2 text-xs sm:text-sm font-normal bg-transparent focus:outline-none ${
                  isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            {activeTab === 'users' && (
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e: any) => setRoleFilter(e.target.value)}
                  className={`text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2 border appearance-none pr-8 cursor-pointer transition-all ${
                    isDark
                      ? 'bg-[#070A12] border-white/10 text-slate-300 hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  style={{
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right .7rem top 50%',
                    backgroundSize: '.6rem auto',
                  }}
                >
                  <option value="ALL">All Roles ({users.length})</option>
                  <option value="ADMIN">Admins ({adminUsersCount})</option>
                  <option value="CLIENT">Clients ({clientUsersCount})</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TAB 1: USERS DATA TABLE                                                */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold ${
                  isDark ? 'bg-[#0E1422] border-white/[0.08] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <th className="py-3.5 pl-6 pr-3 font-semibold">User</th>
                  <th className="py-3.5 px-4 font-semibold">Email</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">Modules</th>
                  <th className="py-3.5 px-4 font-semibold">Date Added</th>
                  <th className="py-3.5 pl-4 pr-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="h-2.5 w-16 bg-slate-200 dark:bg-white/10 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4"><div className="h-3.5 w-36 bg-slate-200 dark:bg-white/10 rounded" /></td>
                      <td className="py-4 px-4"><div className="h-5 w-20 bg-slate-200 dark:bg-white/10 rounded-full" /></td>
                      <td className="py-4 px-4"><div className="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" /></td>
                      <td className="py-4 px-4"><div className="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
                      <td className="py-4 pl-4 pr-6 text-right"><div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                          <Search className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          No users found
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                          {searchQuery || roleFilter !== 'ALL'
                            ? 'No users match your filters. Try adjusting the search query or role.'
                            : 'No users added yet. Click Add User to get started.'}
                        </p>
                        {(searchQuery || roleFilter !== 'ALL') && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }}
                            className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 transition-colors"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const avatarStyle = AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
                    const activeModulesCount = AVAILABLE_MODULES.length - (user.hiddenModules?.length || 0);
                    const isSuper = user.role === 'SUPER_ADMIN';
                    const isAdmin = user.role === 'ADMIN';

                    return (
                      <tr 
                        key={user.id} 
                        className={`transition-colors group ${
                          isDark 
                            ? 'hover:bg-blue-600/[0.04]' 
                            : 'hover:bg-blue-50/60'
                        }`}
                      >
                        {/* User Profile */}
                        <td className="py-3.5 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase bg-gradient-to-br ${avatarStyle.bg} ${avatarStyle.text} ring-2 ${avatarStyle.ring} shadow-sm flex-shrink-0`}>
                              {user.username.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                                  {user.username}
                                </span>
                                {isSuper && (
                                  <span className="p-0.5 rounded text-amber-500" title="Super Administrator">
                                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 dark:text-slate-500 block font-normal">
                                ID: {user.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-normal">
                          <div className="flex items-center gap-2 group/copy">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[210px]">{user.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(user.email)}
                              className="opacity-0 group-hover/copy:opacity-100 transition-opacity text-slate-400 hover:text-blue-500 cursor-pointer p-0.5"
                              title="Copy email"
                            >
                              {copiedEmail === user.email ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Super Admin
                            </span>
                          ) : isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                              <UserCheck className="w-3.5 h-3.5" />
                              Client
                            </span>
                          )}
                        </td>

                        {/* Modules Count */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                style={{ width: `${(activeModulesCount / AVAILABLE_MODULES.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {activeModulesCount} / {AVAILABLE_MODULES.length}
                            </span>
                          </div>
                        </td>

                        {/* Date Added */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs font-normal">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {user.createdAt 
                                ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Recent'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pl-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark 
                                  ? 'border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/10' 
                                  : 'border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                              title="Edit user"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTargetUser(user)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark 
                                  ? 'border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10' 
                                  : 'border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50'
                              }`}
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* ========================================================================= */}
        {/* 5. TAB 2: AUDIT LOGS                                                       */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold ${
                  isDark ? 'bg-[#0E1422] border-white/[0.08] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <th className="py-3.5 pl-6 pr-3 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">User</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Target</th>
                  <th className="py-3.5 pl-4 pr-6 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs">
                {loadingAudit ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 pl-6 pr-4"><div className="h-3.5 w-32 bg-slate-200 dark:bg-white/10 rounded" /></td>
                      <td className="py-4 px-4"><div className="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" /></td>
                      <td className="py-4 px-4"><div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-full" /></td>
                      <td className="py-4 px-4"><div className="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" /></td>
                      <td className="py-4 pl-4 pr-6"><div className="h-3.5 w-48 bg-slate-200 dark:bg-white/10 rounded" /></td>
                    </tr>
                  ))
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400 text-xs font-normal">
                      No audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: any, idx: number) => {
                    const isDelete = log.action === 'DELETE';
                    const isCreate = log.action === 'CREATE';
                    
                    return (
                      <tr key={log.id || idx} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                        <td className="py-3 pl-6 pr-3 text-slate-500 dark:text-slate-400 text-xs tabular-nums whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                          {log.performedBy || 'System'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isDelete 
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50' 
                              : isCreate 
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' 
                                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                          }`}>
                            {isDelete ? 'Delete' : isCreate ? 'Create' : log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-xs">
                          @{log.targetUser || 'system'}
                        </td>
                        <td className="py-3 pl-4 pr-6">
                          <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md truncate font-normal">
                            {typeof log.changes === 'object' 
                              ? JSON.stringify(log.changes) 
                              : String(log.changes || 'Access privileges modified')}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        <div className={`p-4 px-6 border-t flex items-center justify-between text-xs font-medium ${
          isDark ? 'border-white/[0.08] text-slate-400 bg-[#0E1422]/50' : 'border-slate-200 text-slate-500 bg-slate-50/50'
        }`}>
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredUsers.length}</strong> of <strong className="text-slate-800 dark:text-slate-200 font-semibold">{users.length}</strong> users
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. ADD / EDIT USER MODAL                                                  */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div 
            className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 z-10 my-8 transition-all backdrop-blur-2xl ${
              isDark 
                ? 'bg-[#0B0F19]/95 border-white/[0.12] text-white shadow-black/90' 
                : 'bg-white/98 border-slate-200 text-slate-900 shadow-2xl'
            }`}
          >
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-rose-500 rounded-full" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  {editingUser ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingUser ? `Edit User: ${editingUser.username}` : 'Add User'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter user details and assign accessible modules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ankit_vaish"
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-normal rounded-xl border focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-[#070A12] border-white/10 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-normal rounded-xl border focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-[#070A12] border-white/10 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setRole('CLIENT')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'CLIENT'
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
                        : isDark ? 'border-white/10 bg-[#070A12] hover:border-white/20' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" /> Client
                      </span>
                      {role === 'CLIENT' && <Check className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Can view and use assigned modules only.
                    </p>
                  </div>

                  <div 
                    onClick={() => setRole('ADMIN')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'ADMIN'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                        : isDark ? 'border-white/10 bg-[#070A12] hover:border-white/20' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Admin
                      </span>
                      {role === 'ADMIN' && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Full access to manage users and all modules.
                    </p>
                  </div>
                </div>
              </div>

              {/* Module Permissions Matrix */}
              {role !== 'SUPER_ADMIN' && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Module Permissions ({AVAILABLE_MODULES.length - hiddenModules.length} of {AVAILABLE_MODULES.length} enabled)
                      </label>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Select which modules this user can access.
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetAllModules('FULL')}
                        className="px-2.5 py-1 rounded text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-400 text-xs">·</span>
                      <button
                        type="button"
                        onClick={() => handleSetAllModules('VIEW')}
                        className="px-2.5 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-500/10 transition-colors cursor-pointer"
                      >
                        View Only
                      </button>
                      <span className="text-slate-400 text-xs">·</span>
                      <button
                        type="button"
                        onClick={() => handleSetAllModules('NONE')}
                        className="px-2.5 py-1 rounded text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Modules Grid */}
                  <div className={`border rounded-2xl p-3 max-h-[260px] overflow-y-auto space-y-2 ${
                    isDark ? 'bg-[#070A12]/80 border-white/10' : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    {AVAILABLE_MODULES.map((mod) => {
                      let currentAccess: 'none' | 'view' | 'edit' | 'edit_no_delete' = 'none';
                      if (!hiddenModules.includes(mod.id)) {
                        if (readOnlyModules.includes(mod.id)) {
                          currentAccess = 'view';
                        } else if (readOnlyModules.includes(`${mod.id}-nodelete`)) {
                          currentAccess = 'edit_no_delete';
                        } else {
                          currentAccess = 'edit';
                        }
                      }

                      return (
                        <div 
                          key={mod.id} 
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            currentAccess === 'none'
                              ? isDark ? 'bg-white/[0.02] border-white/5 opacity-60' : 'bg-white border-slate-200/60 opacity-60'
                              : isDark ? 'bg-[#0E1422] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {mod.label}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                {mod.category}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500 block truncate">
                              {mod.description}
                            </span>
                          </div>

                          {/* Access Level Selector */}
                          <div className="flex-shrink-0">
                            <select
                              value={currentAccess}
                              onChange={(e) => {
                                const val = e.target.value as 'none' | 'view' | 'edit' | 'edit_no_delete';
                                let newHidden = [...hiddenModules];
                                let newReadOnly = [...readOnlyModules];
                                
                                newHidden = newHidden.filter(id => id !== mod.id);
                                newReadOnly = newReadOnly.filter(id => id !== mod.id && id !== `${mod.id}-nodelete`);
                                
                                if (val === 'none') {
                                  newHidden.push(mod.id);
                                } else if (val === 'view') {
                                  newReadOnly.push(mod.id);
                                } else if (val === 'edit_no_delete') {
                                  newReadOnly.push(`${mod.id}-nodelete`);
                                }
                                
                                setHiddenModules(newHidden);
                                setReadOnlyModules(newReadOnly);
                              }}
                              className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border appearance-none pr-6 cursor-pointer ${
                                currentAccess === 'none'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : currentAccess === 'view'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}
                              style={{
                                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right .5rem top 50%',
                                backgroundSize: '.5rem auto',
                              }}
                            >
                              <option value="none">No Access</option>
                              <option value="view">View Only</option>
                              {mod.id === 'savings-calculator' && (
                                <option value="edit_no_delete">Edit & No Delete</option>
                              )}
                              <option value="edit">Full Access</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingUser ? 'Save Changes' : 'Add User'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CONFIRM DELETE DIALOG                                                  */}
      {/* ========================================================================= */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setDeleteTargetUser(null)}
          />

          <div 
            className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 z-10 backdrop-blur-2xl transition-all ${
              isDark 
                ? 'bg-[#0B0F19]/95 border-rose-500/30 text-white shadow-black/90' 
                : 'bg-white border-rose-200 text-slate-900 shadow-2xl'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Delete User
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">@{deleteTargetUser.username}</strong> ({deleteTargetUser.email})? This user will no longer be able to access the dashboard.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className={`px-4 py-2 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer ${
                  isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
