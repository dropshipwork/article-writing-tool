
import React, { useState, useEffect } from 'react';
import { Member, SystemConfig } from '../types';
import { authApi } from '../services/auth';
import { 
  Shield, 
  UserPlus, 
  Key, 
  Trash2, 
  Settings, 
  Lock, 
  Unlock, 
  Users, 
  Database, 
  Zap, 
  Mail, 
  User, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  Share2
} from 'lucide-react';

interface AdminSectionProps {
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
  config: SystemConfig;
  onUpdateConfig: (config: SystemConfig) => void;
  addLog: (msg: string, type: 'info'|'success'|'error') => void;
}

const AdminSection: React.FC<AdminSectionProps> = ({ members, onUpdateMembers, config, onUpdateConfig, addLog }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passAttempt, setPassAttempt] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Member' as 'Admin' | 'Member' });
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);

  useEffect(() => {
    const syncMembers = async () => {
      const data = await authApi.getMembers();
      onUpdateMembers(data);
    };
    syncMembers();
  }, []);

  const handleAdminLogin = () => {
    if (passAttempt === config.adminPasswordHash) {
      setIsAdminAuthenticated(true);
      addLog("Admin console unlocked.", "success");
    } else {
      alert("Invalid Admin Password.");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLastAddedKey(null);
    setIsAdding(true);

    try {
      const response = await authApi.addMember(formData.name, formData.email, formData.role);
      
      if (response.success && response.member) {
        onUpdateMembers([...members, response.member]);
        setLastAddedKey(response.member.accessKey);
        setFormData({ name: '', email: '', role: 'Member' });
        addLog(`Member "${response.member.name}" added successfully.`, 'success');
      } else {
        setFormError(response.error || "Failed to add member.");
      }
    } catch (error) {
      setFormError("A network error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    const success = await authApi.deleteMember(id);
    if (success) {
      onUpdateMembers(members.filter(m => m.id !== id));
      addLog("Member removed from system.", "info");
    }
  };

  const handleToggleStatus = async (id: string) => {
    const updated = await authApi.toggleStatus(id);
    if (updated) {
      onUpdateMembers(members.map(m => m.id === id ? updated : m));
      addLog(`Member status changed to ${updated.status}.`, 'info');
    }
  };

  const togglePrivateMode = () => {
    onUpdateConfig({ ...config, isPrivateMode: !config.isPrivateMode });
    addLog(`System mode changed to: ${!config.isPrivateMode ? 'Private' : 'Public'}`, 'info');
  };

  const copyToClipboard = (text: string, label: string = "Access key") => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const generateMagicLink = (key: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?key=${key}`;
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="bg-white p-16 rounded-[4rem] shadow-sm border border-slate-200 animate-in fade-in duration-300">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-blue-500 mb-8 w-fit mx-auto border border-slate-800 shadow-xl">
            <Shield size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Admin Console</h2>
          <p className="text-slate-500 mb-10 font-medium">Verify your identity to manage members and system permissions.</p>
          <input 
            type="password" 
            className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold mb-6 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
            placeholder="Admin Master Password"
            value={passAttempt}
            onChange={(e) => setPassAttempt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
          <button onClick={handleAdminLogin} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs">Unlock Admin Panel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-top-4 duration-500 pb-20">
      {/* System Settings */}
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <Settings size={32} className="text-blue-600" /> SYSTEM CONTROL
            </h2>
            <p className="text-slate-500 font-medium mt-2">Manage global access and platform behavior.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={togglePrivateMode}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all border ${
                config.isPrivateMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-green-50 text-green-700 border-green-200'
              }`}
            >
              {config.isPrivateMode ? <Lock size={18} /> : <Unlock size={18} />}
              {config.isPrivateMode ? 'PRIVATE MODE ACTIVE' : 'PUBLIC ACCESS ON'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center gap-5">
            <div className="bg-white p-4 rounded-xl shadow-sm text-blue-600"><Users size={24} /></div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Members</div>
              <div className="text-2xl font-black text-slate-800">{members.length}</div>
            </div>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center gap-5">
            <div className="bg-white p-4 rounded-xl shadow-sm text-indigo-600"><Database size={24} /></div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database</div>
              <div className="text-2xl font-black text-slate-800">SaaS Node A</div>
            </div>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center gap-5">
            <div className="bg-white p-4 rounded-xl shadow-sm text-orange-600"><Zap size={24} /></div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engine Load</div>
              <div className="text-2xl font-black text-slate-800">Balanced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Add Member Form */}
        <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-200 h-fit">
          <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tight">Add New Member</h3>
          
          <form onSubmit={handleAddMember} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  required
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" 
                  required
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Access Role</label>
              <select 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:outline-none"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
              >
                <option value="Member">Standard Member</option>
                <option value="Admin">Full Admin</option>
              </select>
            </div>

            {formError && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-3">
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            {lastAddedKey && (
              <div className="p-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                  <CheckCircle size={16} /> Member Created!
                </div>
                <div className="text-[10px] font-bold text-green-600 leading-relaxed">
                  Share this magic link with the member for one-click login.
                </div>
                <button 
                  type="button"
                  onClick={() => copyToClipboard(generateMagicLink(lastAddedKey), "Magic Login Link")}
                  className="w-full flex items-center justify-between bg-white p-3 rounded-xl border border-green-200 mt-2 hover:bg-green-50 transition-colors"
                >
                  <code className="text-xs font-black tracking-widest truncate mr-4">Click to copy link</code>
                  <Share2 size={16} className="text-green-600 flex-shrink-0" />
                </button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isAdding}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all text-sm uppercase tracking-widest shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {isAdding ? "PROCESSING..." : "ADD MEMBER KEY"}
            </button>
          </form>
        </div>

        {/* Member List Table */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-10 border-b border-slate-50 flex justify-between items-center">
             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Active Members</h3>
             <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
               {members.length} Total Users
             </span>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify</th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Details</th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Security</th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
                          member.role === 'Admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-lg flex items-center gap-2">
                            {member.name}
                            {member.id === '1' && <Shield size={14} className="text-blue-500" />}
                          </div>
                          <div className="text-sm text-slate-400 font-medium flex items-center gap-1">
                            <Mail size={12} /> {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Generated Key</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 tracking-widest">
                          {member.accessKey.substring(0, 4)}••••••••
                        </code>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => copyToClipboard(member.accessKey)} 
                            className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy Key Only"
                          >
                             <Copy size={14} />
                          </button>
                          <button 
                            onClick={() => copyToClipboard(generateMagicLink(member.accessKey), "Magic Login Link")} 
                            className="p-1.5 text-slate-300 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy Magic Login Link"
                          >
                             <Share2 size={14} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <button 
                        onClick={() => handleToggleStatus(member.id)}
                        disabled={member.id === '1'}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          member.status === 'Active' 
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {member.status}
                      </button>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        disabled={member.id === '1'}
                        className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl disabled:opacity-0 transition-all"
                        title="Delete Member"
                      >
                        <Trash2 size={22} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSection;
