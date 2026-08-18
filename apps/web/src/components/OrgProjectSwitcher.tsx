'use client';

import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Folder, Shield, User, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/config';

interface Org {
  id: string;
  name: string;
  slug: string;
  user_role: string;
}

interface Project {
  id: string;
  name: string;
}

export default function OrgProjectSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [openOrgDropdown, setOpenOrgDropdown] = useState(false);

  const fetchUserData = async () => {
    const token = localStorage.getItem('whitegator_token');
    if (!token) return;

    try {
      // 1. Fetch Profile
      const meRes = await fetch(getApiUrl('/api/v1/auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (meRes.ok) {
        const user = await meRes.json();
        setCurrentUser(user);

        // 2. Fetch Organizations
        const orgsRes = await fetch(getApiUrl('/api/v1/organizations'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          setOrgs(orgsData);
          if (orgsData.length > 0) {
            const firstOrg = orgsData[0];
            setSelectedOrg(firstOrg);

            // 3. Fetch Projects for Selected Org
            const projRes = await fetch(getApiUrl(`/api/v1/organizations/${firstOrg.id}/projects`), {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (projRes.ok) {
              const projData = await projRes.json();
              setProjects(projData);
              if (projData.length > 0) {
                setSelectedProject(projData[0]);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching org data:', err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('whitegator_token');
    if (token) {
      await fetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('whitegator_token');
    router.push('/login');
  };

  if (!currentUser) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#eeeeee] mb-6">
      {/* Brand Logo */}
      <Link href="/" className="inline-block transition-opacity hover:opacity-85 mr-1 border-r border-[#eeeeee] pr-3">
        <img src="/logo.png" alt="WhiteGator.AI Logo" className="h-6 w-auto object-contain" />
      </Link>

      {/* Org Selector */}
      <div className="relative">
        <button
          onClick={() => setOpenOrgDropdown(!openOrgDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f5f5f4] text-xs font-medium text-[#000000] border border-[#dddddd] hover:border-[#34c759] transition-all"
        >
          <Building2 className="w-3.5 h-3.5 text-[#34c759]" />
          <span>{selectedOrg?.name || 'Select Org'}</span>
          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white text-[#808080] font-semibold border border-[#eeeeee]">
            {selectedOrg?.user_role || 'member'}
          </span>
          <ChevronDown className="w-3 h-3 text-[#808080]" />
        </button>

        {openOrgDropdown && (
          <div className="absolute top-full left-0 mt-1 w-56 rounded-2xl bg-white border border-[#eeeeee] shadow-lg p-2 z-50">
            <div className="text-[10px] uppercase font-semibold text-[#808080] px-3 py-1 mb-1">
              Your Workspaces
            </div>
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setSelectedOrg(org);
                  setOpenOrgDropdown(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-[#f5f5f4]"
              >
                <span className="font-medium text-[#000000]">{org.name}</span>
                <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-[#f5f5f4] text-[#808080]">
                  {org.user_role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Project Indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f5f5f4] text-xs font-mono text-[#6a6b6c] border border-[#eeeeee]">
        <Folder className="w-3.5 h-3.5 text-[#1c1d1f]" />
        <span>Project: <strong className="text-[#000000] font-semibold">{selectedProject?.name || 'Default Project'}</strong></span>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-1 border-l border-[#eeeeee] pl-3 ml-1">
        <Link
          href="/"
          className={`btn-ghost-pill py-1.5 px-3 text-xs ${pathname === '/' ? 'font-semibold text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
        >
          Overview
        </Link>
        <Link
          href="/dashboard"
          className={`btn-ghost-pill py-1.5 px-3 text-xs ${pathname === '/dashboard' ? 'font-semibold text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
        >
          Dashboard
        </Link>
        <Link
          href="/organizations"
          className={`btn-ghost-pill py-1.5 px-3 text-xs ${pathname === '/organizations' ? 'font-semibold text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
        >
          Organizations
        </Link>
        <a
          href={getApiUrl('/docs')}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost-pill py-1.5 px-3 text-xs text-[#6a6b6c]"
        >
          API Docs
        </a>
      </div>

      {/* Profile & Logout */}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-6 h-6 rounded-full bg-[#000000] text-white text-[10px] font-bold flex items-center justify-center">
            {currentUser.full_name?.charAt(0) || 'U'}
          </div>
          <span className="font-medium text-[#1c1d1f] hidden md:inline">{currentUser.full_name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="btn-ghost-pill text-xs flex items-center gap-1.5 text-[#808080] hover:text-[#000000]"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
