'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/config';
import { 
  Building2, 
  Users, 
  Plus, 
  ShieldCheck, 
  FolderPlus, 
  UserPlus, 
  Trash2, 
  Check, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  joined_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  user_role: string;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const fetchTenancyData = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('whitegator_token');
    if (!token) {
      setError('Please sign in to access organization management');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch User Orgs
      const orgsRes = await fetch(getApiUrl('/v1/organizations'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!orgsRes.ok) throw new Error('Failed to load organizations');
      const orgsData = await orgsRes.json();
      setOrgs(orgsData);

      if (orgsData.length > 0) {
        const targetOrg = activeOrg || orgsData[0];
        setActiveOrg(targetOrg);

        // 2. Fetch Members
        const memRes = await fetch(getApiUrl(`/v1/organizations/${targetOrg.id}/members`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (memRes.ok) setMembers(await memRes.json());

        // 3. Fetch Projects
        const projRes = await fetch(getApiUrl(`/v1/organizations/${targetOrg.id}/projects`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (projRes.ok) setProjects(await projRes.json());
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenancyData();
  }, []);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    const token = localStorage.getItem('whitegator_token');
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(getApiUrl(`/v1/organizations/${activeOrg.id}/members`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to add member');
      }

      setSuccessMsg(`Successfully added ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
      setShowInviteModal(false);
      fetchTenancyData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    const token = localStorage.getItem('whitegator_token');
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(getApiUrl(`/v1/organizations/${activeOrg.id}/projects`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create project');
      }

      setSuccessMsg(`Project '${newProjectName}' created successfully`);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowProjectModal(false);
      fetchTenancyData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeOrg || !confirm('Are you sure you want to remove this member?')) return;
    const token = localStorage.getItem('whitegator_token');

    try {
      const res = await fetch(getApiUrl(`/v1/organizations/${activeOrg.id}/members/${userId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to remove member');
      }

      setSuccessMsg('Member removed from organization');
      fetchTenancyData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-[#eeeeee] gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34c759]" />
            <span className="text-xs font-mono text-[#808080]">Multi-Tenant Isolation & RBAC Governance</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#000000] tracking-tight">
            Organization & Workspace Settings
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-outline-pill text-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Member
          </button>
          <button
            onClick={() => setShowProjectModal(true)}
            className="btn-signal-green text-xs flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-[#fdf8f7] border border-[#ffbd2e] flex items-center gap-3 text-xs text-[#1c1d1f]">
          <AlertCircle className="w-4 h-4 text-[#ffbd2e] flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 mb-6 rounded-2xl bg-[#ffffff] border border-[#34c759] flex items-center gap-3 text-xs text-[#34c759]">
          <Check className="w-4 h-4 text-[#34c759] flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Members & Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Members & RBAC Table */}
        <div className="merlin-card p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#eeeeee]">
            <div>
              <h3 className="text-lg font-semibold text-[#000000]">Team Members & Roles</h3>
              <p className="text-xs text-[#6a6b6c] mt-0.5">Role-Based Access Control (RBAC)</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#f5f5f4] text-[#1c1d1f]">
              {members.length} Members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#eeeeee] text-[#808080] font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-2">Member</th>
                  <th className="pb-3 px-2">Role</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeee]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#f5f5f4] transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-medium text-[#000000]">{m.full_name}</div>
                      <div className="text-[11px] text-[#808080] font-mono">{m.email}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        m.role === 'owner' ? 'bg-[#000000] text-white' :
                        m.role === 'admin' ? 'bg-[#34c759] text-white' :
                        m.role === 'developer' ? 'bg-[#eeeeee] text-[#1c1d1f]' :
                        'bg-[#f5f5f4] text-[#808080]'
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="text-[#808080] hover:text-[#ff5f56] p-1 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Projects List */}
        <div className="merlin-card p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#eeeeee]">
            <div>
              <h3 className="text-lg font-semibold text-[#000000]">Projects & Workspaces</h3>
              <p className="text-xs text-[#6a6b6c] mt-0.5">Isolated API Gateway Projects</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#f5f5f4] text-[#1c1d1f]">
              {projects.length} Active Projects
            </span>
          </div>

          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-[#f5f5f4] border border-[#eeeeee] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#000000]">{p.name}</div>
                  <div className="text-xs text-[#6a6b6c] mt-0.5">{p.description || 'No description provided'}</div>
                  <div className="text-[10px] font-mono text-[#808080] mt-1">ID: {p.id}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white text-[#34c759] font-mono text-[10px] border border-[#eeeeee]">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="merlin-card p-6 w-full max-w-md bg-white shadow-xl">
            <h3 className="text-lg font-semibold text-[#000000] mb-2">Invite Member to Organization</h3>
            <p className="text-xs text-[#6a6b6c] mb-6">User must have an active WhiteGator account.</p>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-[#808080] mb-1">User Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="merlin-input w-full"
                  placeholder="developer@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#808080] mb-1">RBAC Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="merlin-input w-full"
                >
                  <option value="admin">Admin (Manage users, keys, projects)</option>
                  <option value="developer">Developer (Issue keys, call proxy)</option>
                  <option value="viewer">Viewer (Read-only metrics)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#eeeeee]">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-ghost-pill w-1/2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-signal-green w-1/2 text-xs">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="merlin-card p-6 w-full max-w-md bg-white shadow-xl">
            <h3 className="text-lg font-semibold text-[#000000] mb-2">Create New Gateway Project</h3>
            <p className="text-xs text-[#6a6b6c] mb-6">Scoped project workspace for keys & limits.</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-[#808080] mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="merlin-input w-full"
                  placeholder="Customer Service Assistant"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#808080] mb-1">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="merlin-input w-full h-20"
                  placeholder="Primary AI Gateway workspace for support bot microservice."
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#eeeeee]">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="btn-ghost-pill w-1/2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-signal-green w-1/2 text-xs">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
