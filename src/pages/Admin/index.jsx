import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';
import { resolveEventImage } from '../../utils/eventImage';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { 
  createClub, updateClub, deleteClub, getAllClubs, 
  getAllUsers, updateUserRole, getAuditLogs, updateUserSuspension,
  subscribeToAdminStats, activateFaculty, updateFacultyScope, revokeFaculty,
  getPendingSubmissionsCountForClub
} from '../../services/adminService';
import { updateEvent, deleteEvent, getAllEvents } from '../../services/eventService';
import { createInvite, revokeInvite, getInvites } from '../../services/inviteService';
import { 
  Shield, Ticket, Plus, Edit2, 
  Trash2, Copy, X, Search,
  Ban, ShieldCheck, UserMinus, UserCheck, Lock
} from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', index: '01' },
  { id: 'events', label: 'Events', index: '02' },
  { id: 'users', label: 'Users', index: '03' },
  { id: 'invitations', label: 'Registrations', index: '04' },
  { id: 'logs', label: 'Reports', index: '05' },
  { id: 'clubs', label: 'Settings', index: '06' }
];

const EASE = [0.16, 1, 0.3, 1];

// Stats number counter
const AdminCounter = ({ value }) => {
  const [num, setNum] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) {
      setNum(end);
      return;
    }
    const duration = 800;
    const startTime = performance.now();
    let frameId;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setNum(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [value]);
  return <span>{num}</span>;
};

export const AdminConsole = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  useEffect(() => {
    trackEvent("admin_console_view");
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Stats State
  const [stats, setStats] = useState({
    totalUsers: 0, students: 0, organizers: 0, admins: 0,
    totalClubs: 0, totalEvents: 0, upcomingEvents: 0, registrations: 0
  });

  // Data lists
  const [clubs, setClubs] = useState([]);
  const [invites, setInvites] = useState([]);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Search & filters
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [eventQuery, setEventQuery] = useState('');
  const [organizerQuery, setOrganizerQuery] = useState('');
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  
  // Faculty Management State
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [facultyScopeModalOpen, setFacultyScopeModalOpen] = useState(false);
  const [selectedFacultyForEdit, setSelectedFacultyForEdit] = useState(null);
  const [facultyScopeClubs, setFacultyScopeClubs] = useState([]);
  const [activateSearchQuery, setActivateSearchQuery] = useState('');
  
  // Modals & Forms State
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [clubForm, setClubForm] = useState({
    name: '', shortName: '', description: '', logo: '', college: '', department: '', facultyCoordinator: '', status: 'active'
  });

  const [inviteForm, setInviteForm] = useState({
    clubId: '', role: 'organizer', expiresInDays: 7, maxUses: 1
  });
  const [generatedInvite, setGeneratedInvite] = useState(null);

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadClubs = async () => {
    const data = await getAllClubs();
    setClubs(data);
  };

  const loadInvites = async () => {
    const data = await getInvites();
    setInvites(data);
  };

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const loadEvents = async () => {
    const data = await getAllEvents();
    setEvents(data);
  };

  const loadLogs = async () => {
    const data = await getAuditLogs(50);
    setAuditLogs(data);
  };

  // Central refresh mechanism
  const refreshData = async () => {
    if (activeTab === 'dashboard') return;
    setLoading(true);
    try {
      if (activeTab === 'clubs') await loadClubs();
      else if (activeTab === 'invitations') {
        await Promise.all([loadInvites(), loadClubs()]);
      }
      else if (activeTab === 'users') await loadUsers();
      else if (activeTab === 'faculty') {
        await Promise.all([loadUsers(), loadClubs()]);
      }
      else if (activeTab === 'organizers') {
        await Promise.all([loadUsers(), loadEvents(), loadClubs()]);
      }
      else if (activeTab === 'events') await loadEvents();
      else if (activeTab === 'logs') await loadLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time statistics subscription
  useEffect(() => {
    if (activeTab !== 'dashboard') return;

    setLoading(true);
    const unsubscribe = subscribeToAdminStats((newStats) => {
      setStats(newStats);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [activeTab]);

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setClubModalOpen(false);
        setViewingUserProfile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Invite creation
  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.clubId) {
      triggerToast('error', 'Select a designated club for this invitation.');
      return;
    }
    const matchedClub = clubs.find(c => c.clubId === inviteForm.clubId);
    try {
      const invite = await createInvite(
        inviteForm.clubId,
        matchedClub?.name || '',
        inviteForm.role,
        Number(inviteForm.expiresInDays)
      );
      setGeneratedInvite(invite);
      triggerToast('success', 'Invitation token generated.');
      loadInvites();
    } catch (err) {
      triggerToast('error', err.message || 'Failed to create invite token.');
    }
  };

  // Invite revocation
  const handleRevokeInvite = async (inviteId) => {
    await confirm({
      title: 'Revoke Invitation',
      message: 'Are you sure you want to immediately revoke this invitation token?',
      variant: 'danger',
      confirmText: 'Revoke Token',
      cancelText: 'Keep Token',
      onConfirm: async () => {
        try {
          await revokeInvite(inviteId);
          triggerToast('success', 'Invitation successfully revoked.');
          loadInvites();
        } catch (err) {
          console.error("[Admin] Failed to revoke invitation token:", err);
          triggerToast('error', 'Failed to revoke token.');
          throw err;
        }
      }
    });
  };

  // Club Create / Edit save
  const handleSaveClub = async (e) => {
    e.preventDefault();
    if (!clubForm.name.trim() || !clubForm.shortName.trim()) {
      triggerToast('error', 'Club Name and Short Name are required.');
      return;
    }

    try {
      if (editingClub) {
        await updateClub(editingClub.clubId, clubForm);
        triggerToast('success', 'Club updated successfully.');
      } else {
        await createClub(clubForm);
        triggerToast('success', 'New club registered.');
      }
      setClubModalOpen(false);
      setEditingClub(null);
      loadClubs();
    } catch (err) {
      console.error("[Admin] Failed to save club data:", err);
      triggerToast('error', 'Failed to save club data.');
    }
  };

  // Club Delete
  const handleDeleteClub = async (clubId) => {
    await confirm({
      title: 'Delete Club Registry',
      message: 'Are you sure you want to delete this club? All verification linked to this club id will be lost.',
      variant: 'danger',
      confirmText: 'Delete Club',
      cancelText: 'Keep Club',
      onConfirm: async () => {
        try {
          await deleteClub(clubId);
          triggerToast('success', 'Club permanently removed.');
          loadClubs();
        } catch (err) {
          console.error("[Admin] Failed to delete club:", err);
          triggerToast('error', 'Failed to delete club.');
          throw err;
        }
      }
    });
  };

  const handleEditClubOpen = (club) => {
    setEditingClub(club);
    setClubForm({
      name: club.name || '',
      shortName: club.shortName || '',
      description: club.description || '',
      logo: club.logo || '',
      college: club.college || '',
      department: club.department || '',
      facultyCoordinator: club.facultyCoordinator || '',
      status: club.status || 'active'
    });
    setClubModalOpen(true);
  };

  const handleCreateClubOpen = () => {
    setEditingClub(null);
    setClubForm({
      name: '', shortName: '', description: '', logo: '', college: '', department: '', facultyCoordinator: '', status: 'active'
    });
    setClubModalOpen(true);
  };

  // User promotion / demotion actions
  const handleUserRoleChange = async (targetUid, newRole) => {
    const actionText = newRole === 'organizer' ? 'promote user to organizer' : newRole === 'admin' ? 'promote user to admin' : 'demote user to student';
    const isDangerAction = newRole === 'student';
    
    await confirm({
      title: newRole === 'student' ? 'Demote User Role' : 'Promote User Role',
      message: `Are you sure you want to ${actionText}?`,
      variant: isDangerAction ? 'danger' : 'warning',
      confirmText: newRole === 'student' ? 'Demote' : 'Promote',
      cancelText: 'Cancel',
      onConfirm: async () => {
        let updates = {};
        if (newRole === 'student') {
          updates = { clubId: null, clubName: null, verified: false };
        } else if (newRole === 'organizer') {
          const defaultClub = clubs[0];
          updates = { 
            clubId: defaultClub?.clubId || null, 
            clubName: defaultClub?.name || null,
            verified: true 
          };
        }

        try {
          await updateUserRole(targetUid, newRole, updates);
          triggerToast('success', 'User role upgraded/modified successfully.');
          loadUsers();
        } catch (err) {
          triggerToast('error', err.message || 'Failed to update user role.');
          throw err;
        }
      }
    });
  };

  const handleToggleUserSuspension = async (targetUser) => {
    const isSuspended = !!targetUser.suspended;
    const actionText = isSuspended ? "unsuspend" : "suspend";
    await confirm({
      title: isSuspended ? 'Unsuspend User Account' : 'Suspend User Account',
      message: `Are you sure you want to ${actionText} ${targetUser.displayName || 'this user'}?`,
      variant: isSuspended ? 'success' : 'danger',
      confirmText: isSuspended ? 'Unsuspend' : 'Suspend',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await updateUserSuspension(targetUser.uid, !isSuspended);
          triggerToast('success', `User account ${actionText}ed successfully.`);
          loadUsers();
        } catch (e) {
          console.error("[Admin] Failed to toggle user suspension:", e);
          triggerToast('error', `Failed to ${actionText} user.`);
          throw e;
        }
      }
    });
  };

  const handleToggleClubStatus = async (club, newStatus) => {
    try {
      await updateClub(club.clubId, { ...club, status: newStatus });
      triggerToast('success', `Club is now ${newStatus}.`);
      loadClubs();
    } catch (err) {
      console.error("[Admin] Failed to update club status:", err);
      triggerToast('error', 'Failed to update club status.');
    }
  };

  const checkCoverageWarning = async (targetUid, newClubIds) => {
    const targetUser = users.find(u => u.uid === targetUid);
    if (!targetUser) return [];
    
    const currentClubs = targetUser.assignedClubIds || [];
    const removedClubs = currentClubs.filter(cid => !newClubIds.includes(cid));
    
    if (removedClubs.length === 0) return [];
    
    const otherFaculty = users.filter(u => u.uid !== targetUid && (u.role || '').toLowerCase().trim() === 'faculty');
    const warningClubs = [];
    
    for (const clubId of removedClubs) {
      const hasOtherVerifier = otherFaculty.some(f => Array.isArray(f.assignedClubIds) && f.assignedClubIds.includes(clubId));
      if (!hasOtherVerifier) {
        const pendingCount = await getPendingSubmissionsCountForClub(clubId);
        if (pendingCount > 0) {
          const clubObj = clubs.find(c => c.clubId === clubId);
          warningClubs.push({
            clubId,
            clubName: clubObj?.name || clubId,
            pendingCount
          });
        }
      }
    }
    
    return warningClubs;
  };

  const handleSaveFacultyScope = async (targetUid, clubIds) => {
    try {
      const warningClubs = await checkCoverageWarning(targetUid, clubIds);
      
      const proceedSave = async () => {
        setLoading(true);
        try {
          const targetUser = users.find(u => u.uid === targetUid);
          const expectedVersion = targetUser ? (targetUser.authorityVersion || 0) : 0;
          const isNew = !targetUser || (targetUser.role || '').toLowerCase().trim() !== 'faculty';
          if (isNew) {
            await activateFaculty(targetUid, clubIds, expectedVersion);
            triggerToast('success', 'Faculty verification authority activated.');
          } else {
            await updateFacultyScope(targetUid, clubIds, expectedVersion);
            triggerToast('success', 'Verification scope updated.');
          }
          setFacultyScopeModalOpen(false);
          await loadUsers();
        } catch (err) {
          console.error(err);
          triggerToast('error', err.message || 'Failed to update faculty authority.');
        } finally {
          setLoading(false);
        }
      };

      if (warningClubs.length > 0) {
        const warningsListStr = warningClubs.map(wc => `${wc.clubName} currently has ${wc.pendingCount} pending club-hour submissions and no other assigned faculty verifier.`).join('\n\n');
        await confirm({
          title: 'VERIFICATION COVERAGE WARNING',
          message: `${warningsListStr}\n\nDo you want to proceed and leave these clubs with no active faculty coverage?`,
          variant: 'danger',
          confirmText: 'Proceed Anyway',
          cancelText: 'Cancel',
          onConfirm: proceedSave
        });
      } else {
        await proceedSave();
      }
    } catch (err) {
      console.error(err);
      triggerToast('error', err.message || 'Verification check failed.');
    }
  };

  const handleRevokeFacultyRole = async (targetUid) => {
    const targetUser = users.find(u => u.uid === targetUid);
    if (!targetUser) return;
    
    await confirm({
      title: 'REVOKE FACULTY AUTHORITY?',
      message: `Are you sure you want to revoke faculty authority for ${targetUser.displayName || 'this user'}? They will immediately lose access to the Faculty Verification Desk and all club verification scopes.`,
      variant: 'danger',
      confirmText: 'Revoke Authority',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const warningClubs = await checkCoverageWarning(targetUid, []);
          
          const proceedRevoke = async () => {
            setLoading(true);
            try {
              const expectedVersion = targetUser ? (targetUser.authorityVersion || 0) : 0;
              await revokeFaculty(targetUid, expectedVersion);
              triggerToast('success', 'Faculty authority revoked.');
              await loadUsers();
            } catch (err) {
              console.error(err);
              triggerToast('error', err.message || 'Failed to revoke faculty role.');
            } finally {
              setLoading(false);
            }
          };

          if (warningClubs.length > 0) {
            const warningsListStr = warningClubs.map(wc => `${wc.clubName} currently has ${wc.pendingCount} pending club-hour submissions and no other assigned faculty verifier.`).join('\n\n');
            await confirm({
              title: 'VERIFICATION COVERAGE WARNING',
              message: `${warningsListStr}\n\nDo you want to proceed with revocation and leave these clubs with no active faculty coverage?`,
              variant: 'danger',
              confirmText: 'Proceed Revocation',
              cancelText: 'Cancel',
              onConfirm: proceedRevoke
            });
          } else {
            await proceedRevoke();
          }
        } catch (err) {
          console.error(err);
          triggerToast('error', err.message || 'Verification check failed.');
        }
      }
    });
  };

  // Event administrative operations
  const handleAdminDeleteEvent = async (eventId) => {
    await confirm({
      title: 'Delete Event Permanently',
      message: 'ADMIN WARNING: Are you sure you want to permanently delete this event? This action will bypass creator checking.',
      variant: 'danger',
      confirmText: 'Delete Event',
      cancelText: 'Keep Event',
      onConfirm: async () => {
        try {
          await deleteEvent(eventId);
          triggerToast('success', 'Event document deleted.');
          loadEvents();
        } catch (err) {
          console.error("[Admin] Failed to delete event:", err);
          triggerToast('error', 'Failed to delete event.');
          throw err;
        }
      }
    });
  };

  const handleAdminToggleEventClose = async (event) => {
    const nextStatus = event.status?.toLowerCase() === 'closed' ? 'open' : 'closed';
    try {
      await updateEvent(event.id, { status: nextStatus });
      triggerToast('success', `Event registration closed/updated.`);
      loadEvents();
    } catch (e) {
      console.error("[Admin] Failed to toggle event registration status:", e);
      triggerToast('error', 'Failed to update status.');
    }
  };

  const handleAdminArchiveEvent = async (event) => {
    try {
      await updateEvent(event.id, { status: 'archived' });
      triggerToast('success', `Event archived.`);
      loadEvents();
    } catch (e) {
      console.error("[Admin] Failed to archive event:", e);
      triggerToast('error', 'Failed to archive event.');
    }
  };

  // Memoized user search/filters
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesQuery = !userQuery.trim() || 
        (u.displayName || '').toLowerCase().includes(userQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userQuery.toLowerCase());
      
      const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter.toLowerCase();
      return matchesQuery && matchesRole;
    });
  }, [users, userQuery, userRoleFilter]);

  // Memoized event search
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      return !eventQuery.trim() || 
        (e.title || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
        (e.organizer || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
        (e.venue || '').toLowerCase().includes(eventQuery.toLowerCase());
    });
  }, [events, eventQuery]);

  // Memoized organizers search
  const filteredOrganizers = useMemo(() => {
    const list = users.filter(u => u.role === 'organizer');
    return list.filter(u => {
      return !organizerQuery.trim() ||
        (u.displayName || '').toLowerCase().includes(organizerQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(organizerQuery.toLowerCase()) ||
        (u.clubName || '').toLowerCase().includes(organizerQuery.toLowerCase());
    });
  }, [users, organizerQuery]);

  // Memoized faculty search/filters
  const facultyList = useMemo(() => {
    return users.filter(u => (u.role || '').toLowerCase().trim() === 'faculty');
  }, [users]);

  const filteredFaculty = useMemo(() => {
    return facultyList.filter(f => {
      const q = facultySearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (f.displayName || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
      );
    });
  }, [facultyList, facultySearchQuery]);

  // List of student users available to be activated as faculty
  const availableStudentsForFaculty = useMemo(() => {
    const list = users.filter(u => (u.role || 'student').toLowerCase().trim() === 'student');
    return list.filter(u => {
      const q = activateSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    });
  }, [users, activateSearchQuery]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
  };

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="max-w-7xl py-12 md:py-20 flex flex-col gap-12 relative">
          
          {/* HEADER */}
          <div className="relative">
            <AxisMarker index="00" label="Administrative Terminal" />
            <h1 className="text-display-lg font-light tracking-tight mt-6 text-primary">Admin Console</h1>
            <p className="text-body-lg text-secondary max-w-xl mt-4 font-light leading-relaxed">
              Global system configurations, club registry management, security credentials, and system audit logs.
            </p>
          </div>

          {/* TAB BAR NAVIGATOR (Minimal architectural vertical/horizontal dividers) */}
          <div className="w-full overflow-x-auto scrollbar-none snap-x snap-mandatory flex gap-x-8 border-b border-white/5 pb-2 mt-4 select-none font-ui px-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  setActiveTab(tab.id);
                  setGeneratedInvite(null);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={cn(
                  "text-micro font-technical uppercase tracking-widest pb-3 border-b-2 transition-all focus:outline-none flex items-center gap-1.5 snap-center whitespace-nowrap",
                  activeTab === tab.id 
                    ? "border-accent text-accent" 
                    : "border-transparent text-white/30 hover:text-white"
                )}
              >
                <span className="text-[7px] text-white/20 font-mono">[{tab.index}]</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* MAIN TABS AREA CONTAINER */}
          <div className="min-h-[50vh] relative">
            {loading ? (
              <div className="flex flex-col gap-4 font-ui">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 w-full bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div>
                
                {/* 1. DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <div className="flex flex-col gap-8">
                    {/* System Health Banner */}
                    <div className="flex items-center justify-between p-6 border border-white/5 bg-[#141414]/25 font-ui text-left select-none animate-fadeIn">
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.55rem] font-technical uppercase tracking-[0.2em] text-white/30">System Status // Diagnostic</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          <span className="text-body-s font-light text-primary uppercase font-mono tracking-wider">Operational</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col text-right text-micro text-white/35 gap-0.5 font-technical uppercase">
                        <span>Database: Firestore (ADC Connected)</span>
                        <span>Client Engine: Vite + React 18</span>
                        <span>Gateway: Operational (0ms latency)</span>
                      </div>
                    </div>

                    {/* Visual metrics matrix */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-8 border-b border-white/5 text-left font-ui">
                      <div className="flex flex-col gap-1">
                        <span className="text-micro text-white/30 uppercase tracking-widest">Total Users</span>
                        <span className="text-display-md font-light text-primary">
                          <AdminCounter value={stats.totalUsers} />
                        </span>
                        <span className="text-[9px] text-white/20 font-technical uppercase mt-1">
                          {stats.students} Attendees // {stats.organizers} Organizers
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-micro text-white/30 uppercase tracking-widest">Registered Organizers</span>
                        <span className="text-display-md font-light text-primary">
                          <AdminCounter value={stats.totalClubs} />
                        </span>
                        <span className="text-[9px] text-white/20 font-technical uppercase mt-1">
                          Active host partners
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-micro text-white/30 uppercase tracking-widest">Total Events</span>
                        <span className="text-display-md font-light text-primary">
                          <AdminCounter value={stats.totalEvents} />
                        </span>
                        <span className="text-[9px] text-white/20 font-technical uppercase mt-1">
                          {stats.upcomingEvents} Upcoming scheduled
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-micro text-white/30 uppercase tracking-widest">Registrations</span>
                        <span className="text-display-md font-light text-primary">
                          <AdminCounter value={stats.registrations} />
                        </span>
                        <span className="text-[9px] text-white/20 font-technical uppercase mt-1">
                          Total ticket bookings
                        </span>
                      </div>
                    </div>

                    {/* Infrastructure warning / description */}
                    <div className="border border-white/5 bg-[#141414]/30 p-6 flex flex-col gap-4 text-left max-w-3xl">
                      <span className="text-micro text-accent font-technical uppercase tracking-widest flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        Admin Mode Enabled
                      </span>
                      <p className="text-body-s text-secondary leading-relaxed font-light">
                        This console permits raw bypass overrides across the application. Modifications directly affect Firestore documents and transaction states. Exercise caution when altering user roles, revoking active registration tokens, or removing host partners.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. CLUBS */}
                {activeTab === 'clubs' && (
                  <div className="flex flex-col gap-8 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-micro text-white/30 uppercase tracking-widest font-technical">Organizers Directory</span>
                      <Button size="sm" onClick={handleCreateClubOpen} className="flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Organizer</span>
                      </Button>
                    </div>

                    {clubs.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-white/5 text-secondary text-body-s font-ui">
                        No organizers registered yet. Use the Add Organizer button to register the first organization.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-ui">
                        {clubs.map((c) => (
                          <div key={c.clubId} className="border border-white/5 p-6 bg-[#121212]/40 flex flex-col justify-between gap-6 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                            <div className="flex flex-col gap-4">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 border border-white/10 bg-black flex items-center justify-center text-xs font-technical uppercase rounded-[8px] overflow-hidden">
                                    {(() => {
                                      const isAcm = c.clubId === 'bUV2wixWWSV61cUexUY7' || (c.shortName && c.shortName.toLowerCase().trim() === 'acm');
                                      const logoUrl = isAcm ? '/club-logos/acm-logo.png' : c.logo;
                                      return logoUrl ? (
                                        <img src={logoUrl} alt={`${c.name} logo`} className="w-full h-full object-cover" />
                                      ) : c.shortName;
                                    })()}
                                  </div>
                                  <div className="flex flex-col">
                                    <h4 className="text-body-m font-light text-primary">{c.name}</h4>
                                    <span className="text-micro text-white/30 font-technical uppercase tracking-widest mt-0.5">{c.shortName}</span>
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[0.55rem] font-technical uppercase px-2 py-0.5 border tracking-wider rounded-[4px]",
                                  c.status === 'active' ? 'border-green-500/20 bg-green-950/20 text-green-400' :
                                  c.status === 'archived' ? 'border-white/15 bg-white/5 text-white/45' :
                                  'border-red-500/20 bg-red-950/20 text-red-400'
                                )}>
                                  {c.status}
                                </span>
                              </div>
                              <p className="text-xs text-secondary leading-relaxed font-light">{c.description || 'No description provided.'}</p>
                              
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-micro text-white/40 pt-4 border-t border-white/5">
                                <span>Organization: {c.college || 'TBA'}</span>
                                <span>Department: {c.department || 'TBA'}</span>
                                <span className="col-span-2">Contact Person: {c.facultyCoordinator || 'None'}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-4 items-center">
                              {c.status === 'archived' ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleClubStatus(c, 'active')}
                                  className="px-2.5 py-1.5 text-[9px] font-technical uppercase border border-green-500/20 bg-green-950/20 text-green-400 hover:bg-green-950/40 transition-colors rounded-[6px]"
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleClubStatus(c, 'archived')}
                                  className="px-2.5 py-1.5 text-[9px] font-technical uppercase border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-colors rounded-[6px]"
                                >
                                  Archive
                                </button>
                              )}
                              <button 
                                onClick={() => handleEditClubOpen(c)}
                                className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors rounded-[6px]"
                                title="Edit Organizer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteClub(c.clubId)}
                                className="p-2 bg-red-950/20 border border-red-500/10 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors rounded-[6px]"
                                title="Delete Organizer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. INVITATIONS */}
                {activeTab === 'invitations' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left font-ui">
                    
                    {/* Left/Middle Column: Generate & View invite details */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                      <div className="flex flex-col gap-2">
                        <span className="text-micro text-white/30 uppercase tracking-widest font-technical">Create Security Token</span>
                        <p className="text-xs text-white/45 font-light">Generate cryptographically secure one-time credentials mapping users to verified clubs.</p>
                      </div>

                      {clubs.length === 0 ? (
                        <div className="p-6 border border-white/5 bg-[#141414]/30 text-xs text-amber-300 font-technical uppercase">
                          No clubs registered in registry database. Create a club first before issuing organizer invitations.
                        </div>
                      ) : (
                        <form onSubmit={handleGenerateInvite} className="flex flex-col gap-5 max-w-md">
                          {/* Selector: Club */}
                          <div className="flex flex-col gap-2">
                            <label className="text-micro text-primary">Designated Club</label>
                            <select
                              value={inviteForm.clubId}
                              onChange={(e) => setInviteForm({ ...inviteForm, clubId: e.target.value })}
                              className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent"
                              required
                            >
                              <option value="">Select Club Assignment</option>
                              {clubs.map(c => (
                                <option key={c.clubId} value={c.clubId}>{c.name} ({c.shortName})</option>
                              ))}
                            </select>
                          </div>

                          {/* Selector: Role */}
                          <div className="flex flex-col gap-2">
                            <label className="text-micro text-primary">Target Privilege Role</label>
                            <select
                              value={inviteForm.role}
                              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                              className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent"
                            >
                              <option value="organizer">Organizer</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </div>

                          {/* Expiry & Uses */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                              <label className="text-micro text-primary">Expires In (Days)</label>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={inviteForm.expiresInDays}
                                onChange={(e) => setInviteForm({ ...inviteForm, expiresInDays: e.target.value })}
                                className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-micro text-primary">Max Uses</label>
                              <input
                                type="number"
                                disabled
                                value={inviteForm.maxUses}
                                className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/40 focus:outline-none opacity-50 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          <Button type="submit" size="sm" className="mt-3 w-full">
                            Generate Credentials
                          </Button>
                        </form>
                      )}

                      {/* Display generated invite details */}
                      {generatedInvite && (
                        <div className="border border-accent/25 bg-[#141414] p-6 max-w-xl flex flex-col gap-4 animate-fadeIn">
                          <span className="text-micro text-accent font-technical uppercase tracking-widest flex items-center gap-1.5">
                            <Ticket className="w-4 h-4" />
                            Invitation Credentials Active
                          </span>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-technical uppercase text-white/30">Verification Token Key</span>
                            <div className="flex items-center gap-3 bg-black border border-white/10 p-3">
                              <code className="text-xs text-primary font-mono select-all flex-grow break-all">{generatedInvite.token}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedInvite.token);
                                  triggerToast('success', 'Token copied.');
                                }}
                                className="p-1 text-white/40 hover:text-white transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-technical uppercase text-white/30">Quick-Activation URL Link</span>
                            <div className="flex items-center gap-3 bg-black border border-white/10 p-3">
                              <code className="text-[10px] text-white/40 select-all flex-grow truncate">{`${window.location.origin}/activate-organizer?token=${generatedInvite.token}`}</code>
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/activate-organizer?token=${generatedInvite.token}`;
                                  navigator.clipboard.writeText(url);
                                  triggerToast('success', 'Activation URL copied.');
                                }}
                                className="p-1 text-white/40 hover:text-white transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right column: List of pending/expired invites */}
                    <div className="flex flex-col gap-6">
                      <span className="text-micro text-white/30 uppercase tracking-widest font-technical">Token Registry Log</span>
                      <div className="flex flex-col gap-3 max-h-[50vh] md:max-h-[70vh] scroll-container pr-2 divide-y divide-white/5">
                        {invites.length === 0 ? (
                          <span className="text-xs text-white/30 font-technical uppercase">No tokens logged.</span>
                        ) : (
                          invites.map((inv) => {
                            const isExpired = new Date(inv.expiresAt) < new Date();
                            const isRevoked = new Date(inv.expiresAt).getTime() === 0;
                            const statusText = inv.used ? 'Used' : isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Pending';

                            return (
                              <div key={inv.inviteId} className="pt-3 flex flex-col gap-2 text-xs">
                                <div className="flex justify-between items-center gap-4">
                                  <code className="font-mono text-white/80">{inv.token.substring(0, 16)}...</code>
                                  <span className={cn(
                                    "text-[9px] font-technical uppercase px-1.5 border leading-tight",
                                    statusText === 'Pending' ? 'border-accent/30 text-accent bg-accent/5' :
                                    statusText === 'Used' ? 'border-green-500/20 text-green-400 bg-green-950/10' :
                                    'border-white/10 text-white/30'
                                  )}>
                                    {statusText}
                                  </span>
                                </div>
                                <div className="text-[10px] text-white/30 font-technical uppercase flex flex-col gap-0.5">
                                  <span>Club: {inv.clubName || 'None'}</span>
                                  <span>Role: {inv.role || 'organizer'}</span>
                                  <span>Expires: {isRevoked ? 'N/A' : formatDate(inv.expiresAt)}</span>
                                  {inv.usedBy && <span className="text-green-400/80">Used By: {inv.usedBy.substring(0, 8)}...</span>}
                                </div>
                                {statusText === 'Pending' && (
                                  <button
                                    onClick={() => handleRevokeInvite(inv.inviteId)}
                                    className="text-[9px] font-technical uppercase tracking-wider text-red-400/70 hover:text-red-400 transition-colors text-left focus:outline-none"
                                  >
                                    Revoke Token
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* 4. USERS & ROLES */}
                {activeTab === 'users' && (
                  <div className="flex flex-col gap-8 text-left font-ui">
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pb-4 border-b border-white/5">
                      
                      {/* Search */}
                      <div className="relative flex-grow max-w-md">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={userQuery}
                          onChange={(e) => setUserQuery(e.target.value)}
                          placeholder="Search users by name or email..."
                          className="w-full bg-[#111]/80 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-accent"
                        />
                      </div>

                      {/* Filter */}
                      <div className="flex items-center gap-2 select-none">
                        <span className="text-micro font-technical uppercase tracking-wider text-white/30">Privilege</span>
                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value)}
                          className="bg-[#111] border border-white/10 text-white/80 px-3 py-1.5 focus:outline-none cursor-pointer"
                        >
                          <option value="All">All Roles</option>
                          <option value="Student">Students</option>
                          <option value="Organizer">Organizers</option>
                          <option value="Admin">Administrators</option>
                        </select>
                      </div>

                    </div>

                    {/* Directory List Table */}
                    <div className="flex flex-col border border-white/5 divide-y divide-white/5">
                      
                      {/* Header Row */}
                      <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white/[0.01] text-micro font-technical uppercase tracking-wider text-white/30 select-none">
                        <span className="w-1/3">User Identity</span>
                        <span className="w-1/4">Assigned Club / metadata</span>
                        <span className="w-1/6">System Role</span>
                        <span className="w-1/4 text-right">Administrative Actions</span>
                      </div>

                      {filteredUsers.length === 0 ? (
                        <div className="py-16 text-center text-secondary text-body-s font-light">
                          No users matching search filters found.
                        </div>
                      ) : (
                        filteredUsers.map((u) => {
                          const isCurrentUser = u.uid === user?.uid;
                          return (
                            <div key={u.uid} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/[0.01] gap-4 md:gap-0">
                              
                              {/* Left identity */}
                              <div className="flex items-center gap-3.5 w-full md:w-1/3 min-w-0 cursor-pointer hover:opacity-80" onClick={() => setViewingUserProfile(u)}>
                                <div className="w-9 h-9 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center font-display text-xs uppercase text-primary overflow-hidden shrink-0">
                                  {u.avatar ? <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" /> : (u.displayName?.[0] || u.email?.[0] || 'U')}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <h4 className="text-body-m font-light text-primary truncate flex items-center">
                                    {u.displayName || 'Campus User'} 
                                    {isCurrentUser && <span className="text-[8px] text-accent font-technical uppercase ml-1.5">[You]</span>}
                                    {u.suspended && (
                                      <span className="text-[8px] font-technical uppercase text-red-400 bg-red-950/20 border border-red-500/20 px-1.5 ml-2 leading-none select-none">Suspended</span>
                                    )}
                                  </h4>
                                  <span className="text-[10px] text-white/30 truncate">{u.email}</span>
                                </div>
                              </div>

                              {/* Center: club info */}
                              <div className="w-full md:w-1/4 text-xs font-light text-white/45 flex flex-col gap-0.5">
                                <span className="font-technical uppercase text-white/30">Club: {u.clubName || 'Unassigned'}</span>
                                <span>Verified: {u.verified ? 'YES' : 'NO'}</span>
                              </div>

                              {/* Privilege badge */}
                              <div className="w-full md:w-1/6">
                                {u.email && u.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com" ? (
                                  <span className="text-[0.52rem] font-technical uppercase px-2 py-0.5 border border-red-500/25 bg-red-950/20 text-red-400 leading-tight tracking-wider flex items-center gap-1 w-fit">
                                    <Shield className="w-3 h-3 shrink-0" />
                                    <span>SYSTEM OWNER</span>
                                  </span>
                                ) : (
                                  <span className={cn(
                                    "text-[0.52rem] font-technical uppercase px-2 py-0.5 border leading-tight tracking-wider",
                                    u.role === 'admin' ? 'border-accent/40 bg-accent/15 text-accent' :
                                    u.role === 'organizer' ? 'border-green-500/20 bg-green-950/20 text-green-400' :
                                    'border-white/10 bg-white/5 text-white/40'
                                  )}>
                                    {u.role || 'student'}
                                  </span>
                                )}
                              </div>

                              {/* Administrative actions */}
                              <div className="w-full md:w-1/4 flex gap-3 justify-start md:justify-end items-center">
                                {u.email && u.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com" ? (
                                  <span className="text-[0.52rem] font-technical uppercase px-2 py-1 border border-red-500/25 bg-red-950/20 text-red-400 leading-none tracking-wider flex items-center gap-1.5 select-none font-bold">
                                    <Lock className="w-3 h-3 text-red-400 shrink-0 animate-pulse" />
                                    <span>Protected Account</span>
                                  </span>
                                ) : !isCurrentUser ? (
                                  <>
                                    {u.role === 'student' && (
                                      <button 
                                        onClick={() => handleUserRoleChange(u.uid, 'organizer')}
                                        className="text-[10px] font-technical uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors flex items-center gap-1 focus:outline-none"
                                        title="Promote to Organizer"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Promote</span>
                                      </button>
                                    )}
                                    {u.role === 'organizer' && (
                                      <button 
                                        onClick={() => handleUserRoleChange(u.uid, 'student')}
                                        className="text-[10px] font-technical uppercase tracking-wider text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1 focus:outline-none"
                                        title="Demote to Student"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                        <span>Demote</span>
                                      </button>
                                    )}
                                    {u.role !== 'admin' ? (
                                      <button
                                        onClick={() => handleUserRoleChange(u.uid, 'admin')}
                                        className="text-[10px] font-technical uppercase tracking-wider text-accent/80 hover:text-accent transition-colors flex items-center gap-1 focus:outline-none"
                                        title="Upgrade to Administrator"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Make Admin</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUserRoleChange(u.uid, 'student')}
                                        className="text-[10px] font-technical uppercase tracking-wider text-white/30 hover:text-white transition-colors flex items-center gap-1 focus:outline-none"
                                        title="Demote Administrator"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Revoke Admin</span>
                                      </button>
                                    )}
                                    
                                    {/* Suspend / Unsuspend */}
                                    <button
                                      onClick={() => handleToggleUserSuspension(u)}
                                      className={cn(
                                        "text-[10px] font-technical uppercase tracking-wider transition-colors flex items-center gap-1 focus:outline-none",
                                        u.suspended ? "text-green-400 hover:text-green-300" : "text-red-400/80 hover:text-red-400"
                                      )}
                                      title={u.suspended ? "Unsuspend User Account" : "Suspend User Account"}
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      <span>{u.suspended ? "Unsuspend" : "Suspend"}</span>
                                    </button>
                                  </>
                                ) : null}
                              </div>

                            </div>
                          );
                        })
                      )}

                    </div>
                  </div>
                )}

                {/* 5. ORGANIZERS REGISTRY */}
                {activeTab === 'organizers' && (
                  <div className="flex flex-col gap-8 text-left font-ui animate-fadeIn">
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pb-4 border-b border-white/5">
                      {/* Search */}
                      <div className="relative flex-grow max-w-md">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={organizerQuery}
                          onChange={(e) => setOrganizerQuery(e.target.value)}
                          placeholder="Search organizers by name, email, or club..."
                          className="w-full bg-[#111]/80 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Table */}
                    <div className="flex flex-col border border-white/5 divide-y divide-white/5">
                      
                      {/* Header Row */}
                      <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white/[0.01] text-micro font-technical uppercase tracking-wider text-white/30 select-none">
                        <span className="w-1/3">Organizer Identity</span>
                        <span className="w-1/4">Assigned Club</span>
                        <span className="w-1/6">Events Created</span>
                        <span className="w-1/4 text-right">Actions</span>
                      </div>

                      {filteredOrganizers.length === 0 ? (
                        <div className="py-16 text-center text-secondary text-body-s font-light">
                          No verified organizers found.
                        </div>
                      ) : (
                        filteredOrganizers.map((org) => {
                          const orgEventsCount = events.filter(e => e.creatorId === org.uid).length;
                          return (
                            <div key={org.uid} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/[0.01] gap-4 md:gap-0">
                              
                              {/* Identity */}
                              <div className="flex items-center gap-3.5 w-full md:w-1/3 min-w-0 cursor-pointer" onClick={() => setViewingUserProfile(org)}>
                                <div className="w-9 h-9 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center font-display text-xs uppercase text-primary overflow-hidden shrink-0">
                                  {org.avatar ? <img src={org.avatar} alt={org.displayName} className="w-full h-full object-cover" /> : (org.displayName?.[0] || org.email?.[0] || 'O')}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <h4 className="text-body-m font-light text-primary truncate flex items-center">
                                    {org.displayName || 'Organizer'}
                                    {org.suspended && (
                                      <span className="text-[8px] font-technical uppercase text-red-400 bg-red-950/20 border border-red-500/20 px-1.5 ml-2 leading-none">Suspended</span>
                                    )}
                                  </h4>
                                  <span className="text-[10px] text-white/30 truncate">{org.email}</span>
                                </div>
                              </div>

                              {/* Club */}
                              <span className="w-full md:w-1/4 text-xs font-light text-white/45 truncate font-technical uppercase">
                                {org.clubName || 'Unassigned'}
                              </span>

                              {/* Events count */}
                              <span className="w-full md:w-1/6 text-xs text-white/50 font-technical">
                                {orgEventsCount} Events
                              </span>

                              {/* Actions */}
                              <div className="w-full md:w-1/4 flex gap-3 justify-start md:justify-end items-center">
                                <button
                                  onClick={() => handleUserRoleChange(org.uid, 'student')}
                                  className="text-[10px] font-technical uppercase tracking-wider text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1 focus:outline-none"
                                  title="Revoke organizer permissions (deactivate)"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Deactivate</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}

                    </div>
                  </div>
                )}

                {/* 5.b FACULTY MANAGEMENT */}
                {activeTab === 'faculty' && (
                  <div className="flex flex-col gap-8 text-left font-ui animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                      <div className="flex flex-col">
                        <span className="text-micro text-white/30 uppercase tracking-widest font-technical">Control club-scoped verification authority.</span>
                        <h3 className="text-body-m font-light text-primary mt-1">Faculty Registry</h3>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedFacultyForEdit(null);
                          setFacultyScopeClubs([]);
                          setActivateSearchQuery('');
                          setFacultyScopeModalOpen(true);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Activate Faculty</span>
                      </Button>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Search Bar */}
                      <div className="relative max-w-md w-full">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={facultySearchQuery}
                          onChange={(e) => setFacultySearchQuery(e.target.value)}
                          placeholder="Search faculty by name or email..."
                          className="w-full bg-[#111]/80 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-accent"
                        />
                      </div>

                      {/* Faculty List Table */}
                      <div className="flex flex-col border border-white/5 divide-y divide-white/5 mt-2">
                        
                        {/* Header Row */}
                        <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white/[0.01] text-micro font-technical uppercase tracking-wider text-white/30 select-none">
                          <span className="w-1/3">Faculty Verifier Identity</span>
                          <span className="w-5/12">Assigned Verification Scope</span>
                          <span className="w-1/4 text-right">Actions</span>
                        </div>

                        {filteredFaculty.length === 0 ? (
                          <div className="py-16 text-center text-secondary text-body-s font-light">
                            {facultySearchQuery ? "No faculty verifiers match your search." : "No faculty verifiers have been activated."}
                          </div>
                        ) : (
                          filteredFaculty.map((fac) => {
                            const scopeIds = fac.assignedClubIds || [];
                            const scopeNames = scopeIds.map(cid => {
                              const matchClub = clubs.find(c => c.clubId === cid);
                              return matchClub ? matchClub.shortName || matchClub.name : 'UNKNOWN CLUB';
                            });

                            return (
                              <div key={fac.uid} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/[0.01] gap-4 md:gap-0">
                                
                                {/* Identity */}
                                <div className="flex items-center gap-3.5 w-full md:w-1/3 min-w-0 cursor-pointer" onClick={() => setViewingUserProfile(fac)}>
                                  <div className="w-9 h-9 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center font-display text-xs uppercase text-primary overflow-hidden shrink-0">
                                    {fac.avatar ? <img src={fac.avatar} alt={fac.displayName} className="w-full h-full object-cover" /> : (fac.displayName?.[0] || fac.email?.[0] || 'F')}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <h4 className="text-body-m font-light text-primary truncate flex items-center">
                                      {fac.displayName || 'Faculty Verifier'}
                                      {fac.suspended && (
                                        <span className="text-[8px] font-technical uppercase text-red-400 bg-red-950/20 border border-red-500/20 px-1.5 ml-2 leading-none">Suspended</span>
                                      )}
                                    </h4>
                                    <span className="text-[10px] text-white/30 truncate font-mono">{fac.email}</span>
                                  </div>
                                </div>

                                {/* Verification Scope */}
                                <div className="w-full md:w-5/12 text-xs font-light text-white/45 flex flex-col gap-0.5">
                                  {scopeIds.length === 0 ? (
                                    <span className="text-red-400/80 font-technical uppercase">NO ACTIVE FACULTY COVERAGE</span>
                                  ) : (
                                    <span className="font-technical uppercase text-accent truncate" title={scopeNames.join(', ')}>
                                      {scopeNames.join(' · ')}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-white/20 uppercase tracking-wider">
                                    {scopeIds.length} Club{scopeIds.length !== 1 ? 's' : ''} Selected
                                  </span>
                                </div>

                                {/* Actions */}
                                <div className="w-full md:w-1/4 flex gap-4 justify-start md:justify-end items-center">
                                  <button
                                    onClick={() => {
                                      setSelectedFacultyForEdit(fac);
                                      setFacultyScopeClubs(fac.assignedClubIds || []);
                                      setFacultyScopeModalOpen(true);
                                    }}
                                    className="text-[10px] font-technical uppercase tracking-wider text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5 focus:outline-none"
                                    title="Edit club verification scope"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit Scope</span>
                                  </button>
                                  <button
                                    onClick={() => handleRevokeFacultyRole(fac.uid)}
                                    className="text-[10px] font-technical uppercase tracking-wider text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1.5 focus:outline-none"
                                    title="Revoke faculty privileges and demote back to student"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    <span>Revoke</span>
                                  </button>
                                </div>

                              </div>
                            );
                          })
                        )}

                      </div>
                    </div>
                  </div>
                )}

                {/* 6. EVENTS ARCHIVE */}
                {activeTab === 'events' && (
                  <div className="flex flex-col gap-8 text-left font-ui">
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      {/* Search */}
                      <div className="relative flex-grow max-w-md">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={eventQuery}
                          onChange={(e) => setEventQuery(e.target.value)}
                          placeholder="Search global events archive..."
                          className="w-full bg-[#111]/80 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col border border-white/5 divide-y divide-white/5">
                      {filteredEvents.length === 0 ? (
                        <div className="py-16 text-center text-secondary text-body-s font-light">
                          No events registered globally.
                        </div>
                      ) : (
                        filteredEvents.map((event) => {
                          const isClosed = event.status?.toLowerCase() === 'closed';
                          const isArchived = event.status?.toLowerCase() === 'archived';

                          return (
                            <div key={event.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-6 hover:bg-white/[0.01] gap-6 lg:gap-0">
                              {/* Thumbnail + Title */}
                              <div className="flex items-start gap-4 lg:w-1/2 min-w-0">
                                <div className="w-12 h-12 border border-white/10 shrink-0 bg-black">
                                  <img
                                     src={resolveEventImage(event)}
                                     alt={event.title}
                                     className="w-full h-full object-cover"
                                     onError={(e) => {
                                       e.currentTarget.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=200&auto=format&fit=crop&fm=webp';
                                       e.currentTarget.onerror = null;
                                     }}
                                   />
                                </div>
                                <div className="flex flex-col min-w-0 gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-accent font-technical uppercase tracking-wider">{event.category}</span>
                                    <span className="text-[8px] text-white/30 font-technical uppercase">ID: {event.id.substring(0, 8)}...</span>
                                  </div>
                                  <h4 className="text-body-m font-light text-primary truncate hover:text-white cursor-pointer" onClick={() => navigate(`/events/${event.id}`)}>
                                    {event.title}
                                  </h4>
                                  <span 
                                    onClick={() => {
                                      const creatorObj = users.find(u => u.uid === event.creatorId);
                                      if (creatorObj) {
                                        setViewingUserProfile(creatorObj);
                                      } else {
                                        setViewingUserProfile({
                                          displayName: event.creatorName || "Organizer",
                                          uid: event.creatorId,
                                          role: "organizer",
                                          clubName: event.organizer
                                        });
                                      }
                                    }}
                                    className="text-[10px] text-white/30 hover:text-accent font-technical uppercase cursor-pointer transition-colors"
                                  >
                                    Creator: {event.creatorName} ({event.creatorId.substring(0, 6)}...)
                                  </span>
                                </div>
                              </div>

                              {/* Logistics info */}
                              <div className="flex flex-col gap-0.5 lg:w-1/4 text-xs text-white/45 font-light">
                                <span className="font-technical uppercase text-white/25">Venue: {event.venue || 'TBA'}</span>
                                <span>Date: {formatDate(event.date)} // Time: {event.time || 'TBA'}</span>
                                <span>Registered: {event.registeredCount || 0} / {event.capacity || 0}</span>
                              </div>

                              {/* Operations */}
                              <div className="flex items-center gap-2 justify-start lg:justify-end lg:w-1/4">
                                <button
                                  onClick={() => navigate(`/organizer/events/${event.id}/attendees`)}
                                  className="px-2.5 py-1.5 text-[9px] font-technical uppercase border border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent transition-colors"
                                  title="View registration attendee directory"
                                >
                                  Attendees
                                </button>
                                <button
                                  onClick={() => handleAdminToggleEventClose(event)}
                                  className={cn(
                                    "px-2.5 py-1.5 text-[9px] font-technical uppercase border tracking-wider transition-colors",
                                    isClosed ? 'border-green-500/20 bg-green-950/20 text-green-400' : 'border-red-500/20 bg-red-950/20 text-red-400'
                                  )}
                                  title="Toggle open/close entries"
                                >
                                  {isClosed ? 'Open Reg' : 'Close Reg'}
                                </button>
                                <button
                                  onClick={() => handleAdminArchiveEvent(event)}
                                  className="px-2.5 py-1.5 text-[9px] font-technical uppercase border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                  disabled={isArchived}
                                >
                                  Archive
                                </button>
                                <button
                                  onClick={() => handleAdminDeleteEvent(event.id)}
                                  className="p-2 bg-red-950/20 border border-red-500/10 hover:bg-red-950/45 text-red-400 hover:text-red-300 transition-colors"
                                  title="Override Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                )}

                {/* 6. AUDIT REGISTRY */}
                {activeTab === 'logs' && (
                  <div className="flex flex-col gap-6 text-left font-ui">
                    <div className="flex justify-between items-center">
                      <span className="text-micro text-white/30 uppercase tracking-widest font-technical">Security Audit Registry</span>
                      <button onClick={refreshData} className="text-[10px] font-technical uppercase tracking-wider text-accent">Refresh</button>
                    </div>

                    <div className="flex flex-col border border-white/5 divide-y divide-white/5 max-h-[55vh] md:max-h-[75vh] scroll-container pr-2">
                      {auditLogs.length === 0 ? (
                        <div className="py-16 text-center text-white/20 text-xs font-technical uppercase">No logs recorded.</div>
                      ) : (
                        auditLogs.map((log) => (
                          <div key={log.logId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-white/[0.005]">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "text-[8px] font-technical uppercase px-1.5 border leading-tight tracking-wider",
                                  log.action.includes('Created') || log.action.includes('Activated') ? 'border-green-500/20 bg-green-950/20 text-green-400' :
                                  log.action.includes('Deleted') || log.action.includes('Removed') ? 'border-red-500/20 bg-red-950/20 text-red-400' :
                                  'border-accent/20 bg-accent/10 text-accent'
                                )}>
                                  {log.action}
                                </span>
                                <span className="text-[10px] text-white/40 font-technical tracking-wide">Actor: {log.actorId.substring(0, 8)}...</span>
                              </div>
                              <span className="text-xs text-white/50 font-light mt-1.5 break-all">
                                {log.details ? JSON.stringify(log.details) : 'N/A'}
                              </span>
                            </div>
                            <span className="text-[10px] text-white/20 font-technical uppercase shrink-0">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* EDIT/CREATE CLUB MODAL */}
          <AnimatePresence>
            {clubModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setClubModalOpen(false)}
                  className="absolute inset-0 bg-[#090909]/80 backdrop-blur-md"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="bg-[#141414]/90 border border-white/10 backdrop-blur-2xl w-full max-w-xl h-auto max-h-[85vh] overflow-y-auto z-10 flex flex-col rounded-none shadow-[0_32px_60px_-16px_rgba(0,0,0,0.8)] relative font-ui"
                >
                  {/* Grain */}
                  <div
                    className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                  />

                  {/* Header */}
                  <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex flex-col text-left">
                      <span className="text-[0.6rem] font-technical uppercase tracking-[0.25em] text-white/30">Action // Club Registry</span>
                      <h2 className="text-body-l font-light text-primary mt-1">{editingClub ? 'Configure Club Details' : 'Register New Campus Organization'}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClubModalOpen(false)}
                      className="p-1 text-white/40 hover:text-white transition-colors focus:outline-none"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSaveClub} className="p-6 flex flex-col gap-5 text-left relative z-10">
                    
                    {/* Club Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-micro text-primary">Club Name</label>
                      <input
                        type="text"
                        value={clubForm.name}
                        onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                        placeholder="e.g. Google Developer Student Club"
                        className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent rounded-none"
                        required
                      />
                    </div>

                    {/* Short Name & Logo URL */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-micro text-primary">Short Name</label>
                        <input
                          type="text"
                          value={clubForm.shortName}
                          onChange={(e) => setClubForm({ ...clubForm, shortName: e.target.value })}
                          placeholder="e.g. GDSC"
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent rounded-none"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-micro text-primary">Logo URL</label>
                        <input
                          type="text"
                          value={clubForm.logo}
                          onChange={(e) => setClubForm({ ...clubForm, logo: e.target.value })}
                          placeholder="Image link URL"
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent rounded-none"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                      <label className="text-micro text-primary">Description</label>
                      <textarea
                        value={clubForm.description}
                        onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                        placeholder="Explain target objectives for this student chapter..."
                        rows={3}
                        className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent rounded-none resize-none"
                      />
                    </div>

                    {/* College & Department */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-micro text-primary">College Campus</label>
                        <input
                          type="text"
                          value={clubForm.college}
                          onChange={(e) => setClubForm({ ...clubForm, college: e.target.value })}
                          placeholder="e.g. Stanford University"
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-micro text-primary">Department</label>
                        <input
                          type="text"
                          value={clubForm.department}
                          onChange={(e) => setClubForm({ ...clubForm, department: e.target.value })}
                          placeholder="e.g. Computer Science"
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Faculty Coordinator & Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-micro text-primary">Faculty Coordinator</label>
                        <input
                          type="text"
                          value={clubForm.facultyCoordinator}
                          onChange={(e) => setClubForm({ ...clubForm, facultyCoordinator: e.target.value })}
                          placeholder="e.g. Dr. Arthur Miller"
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-micro text-primary">Status</label>
                        <select
                          value={clubForm.status}
                          onChange={(e) => setClubForm({ ...clubForm, status: e.target.value })}
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none cursor-pointer"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="pt-6 border-t border-white/5 flex justify-end gap-3 mt-4">
                      <Button variant="secondary" size="sm" type="button" onClick={() => setClubModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" type="submit">
                        {editingClub ? 'Save Config' : 'Register Club'}
                      </Button>
                    </div>

                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* FACULTY ACTIVATION / SCOPE EDIT MODAL */}
          <AnimatePresence>
            {facultyScopeModalOpen && (() => {
              const activeClubsList = clubs.filter(c => c.status === 'active');
              
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setFacultyScopeModalOpen(false)}
                    className="absolute inset-0 bg-[#090909]/80 backdrop-blur-md"
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="bg-[#141414]/90 border border-white/10 backdrop-blur-2xl w-full max-w-xl p-6 z-10 flex flex-col gap-6 rounded-none shadow-[0_32px_60px_-16px_rgba(0,0,0,0.8)] relative font-ui text-left max-h-[85vh] overflow-y-auto"
                  >
                    {/* Grain */}
                    <div
                      className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                    />

                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <div className="flex flex-col">
                        <span className="text-[0.55rem] font-technical uppercase tracking-[0.2em] text-accent">Gate Registry // Faculty Scope</span>
                        <h3 className="text-body-l font-light text-primary mt-0.5">
                          {selectedFacultyForEdit && (users.find(u => u.uid === selectedFacultyForEdit.uid)?.role === 'faculty') ? 'Configure Faculty Scope' : 'Activate Faculty Verifier'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFacultyScopeModalOpen(false)}
                        className="p-1 text-white/40 hover:text-white transition-colors focus:outline-none"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Step 1: Select Student User (if new activation) */}
                    {!selectedFacultyForEdit ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-micro text-primary">Search Student to Activate</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                              <Search className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              value={activateSearchQuery}
                              onChange={(e) => setActivateSearchQuery(e.target.value)}
                              placeholder="Type name or email of the student..."
                              className="w-full bg-[#111] border border-white/10 pl-9 pr-4 py-2 text-xs text-white/80 focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>

                        {/* Search Results */}
                        <div className="flex flex-col border border-white/5 divide-y divide-white/5 max-h-[160px] overflow-y-auto bg-black/20">
                          {availableStudentsForFaculty.length === 0 ? (
                            <div className="py-6 text-center text-white/30 text-xs font-technical uppercase">
                              {activateSearchQuery ? "No matching students found." : "Type search terms to find student accounts."}
                            </div>
                          ) : (
                            availableStudentsForFaculty.map((stu) => {
                              return (
                                <div
                                  key={stu.uid}
                                  onClick={() => setSelectedFacultyForEdit(stu)}
                                  className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-light text-primary truncate">{stu.displayName || 'Unnamed Student'}</span>
                                    <span className="text-[10px] text-white/30 truncate">{stu.email}</span>
                                  </div>
                                  <span className="text-[9px] font-technical uppercase tracking-wider text-accent border border-accent/20 px-1.5 py-0.5 bg-accent/5">
                                    Select User
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      // Show selected user detail
                      <div className="p-4 border border-white/5 bg-white/[0.01] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center font-display text-xs uppercase text-primary shrink-0">
                          {selectedFacultyForEdit.avatar ? (
                            <img src={selectedFacultyForEdit.avatar} alt={selectedFacultyForEdit.displayName} className="w-full h-full object-cover" />
                          ) : (
                            selectedFacultyForEdit.displayName?.[0] || 'U'
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-technical uppercase text-accent font-semibold">Selected Verifier</span>
                          <h4 className="text-sm font-light text-primary truncate">{selectedFacultyForEdit.displayName}</h4>
                          <span className="text-[10px] text-white/30 truncate font-mono">{selectedFacultyForEdit.email}</span>
                        </div>
                        {/* Clear selection option only if activating (i.e. not editing pre-existing faculty) */}
                        {!(users.find(u => u.uid === selectedFacultyForEdit.uid)?.role === 'faculty') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFacultyForEdit(null);
                              setFacultyScopeClubs([]);
                            }}
                            className="ml-auto text-[9px] font-technical uppercase tracking-wider text-white/30 hover:text-white transition-colors border border-white/10 px-2 py-1"
                          >
                            Change
                          </button>
                        )}
                      </div>
                    )}

                    {/* Step 2: Choose Scope (only visible if user is selected/loaded) */}
                    {selectedFacultyForEdit && (
                      <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                        <div className="flex justify-between items-center select-none">
                          <label className="text-micro text-primary uppercase tracking-wider">Assigned Club Verification Scope</label>
                          <div className="flex gap-3 text-[10px] font-technical uppercase">
                            <button
                              type="button"
                              onClick={() => setFacultyScopeClubs(activeClubsList.map(c => c.clubId))}
                              className="text-accent hover:text-accent/80 transition-colors"
                            >
                              Select All
                            </button>
                            <span className="text-white/10">|</span>
                            <button
                              type="button"
                              onClick={() => setFacultyScopeClubs([])}
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        {/* Clubs Checklist Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {activeClubsList.length === 0 ? (
                            <span className="text-xs text-white/30 font-technical uppercase py-4 text-center col-span-2">
                              No active clubs are available for assignment.
                            </span>
                          ) : (
                            activeClubsList.map((c) => {
                              const isChecked = facultyScopeClubs.includes(c.clubId);
                              
                              return (
                                <label
                                  key={c.clubId}
                                  className={cn(
                                    "flex items-center gap-3 p-3 border cursor-pointer select-none transition-colors",
                                    isChecked 
                                      ? "border-accent/30 bg-accent/5 text-primary" 
                                      : "border-white/5 hover:border-white/10 text-secondary"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFacultyScopeClubs(prev => [...prev, c.clubId]);
                                      } else {
                                        setFacultyScopeClubs(prev => prev.filter(id => id !== c.clubId));
                                      }
                                    }}
                                    className="accent-accent w-3.5 h-3.5"
                                  />
                                  <div className="flex flex-col min-w-0 text-left">
                                    <span className="text-xs font-technical font-semibold uppercase truncate">{c.shortName || c.name}</span>
                                    <span className="text-[10px] text-white/30 truncate">{c.name}</span>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>

                        <span className="text-[10px] text-white/30 font-technical uppercase block mt-1 select-none">
                          {facultyScopeClubs.length} Club{facultyScopeClubs.length !== 1 ? 's' : ''} Selected for Assignment
                        </span>
                      </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="border-t border-white/5 pt-4 flex justify-end gap-3 select-none">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setFacultyScopeModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!selectedFacultyForEdit || facultyScopeClubs.length === 0}
                        onClick={() => handleSaveFacultyScope(selectedFacultyForEdit.uid, facultyScopeClubs)}
                      >
                        {users.find(u => u.uid === selectedFacultyForEdit?.uid)?.role === 'faculty' ? 'Update Scope' : 'Activate Faculty'}
                      </Button>
                    </div>

                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>

          {/* USER PROFILE DETAIL MODAL */}
          <AnimatePresence>
            {viewingUserProfile && (() => {
              const u = viewingUserProfile;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setViewingUserProfile(null)}
                    className="absolute inset-0 bg-[#090909]/80 backdrop-blur-md"
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="bg-[#141414]/90 border border-white/10 backdrop-blur-2xl w-full max-w-md p-6 z-10 flex flex-col gap-6 rounded-none shadow-[0_32px_60px_-16px_rgba(0,0,0,0.8)] relative font-ui text-left"
                  >
                    {/* Grain */}
                    <div
                      className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                    />

                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <div className="flex flex-col">
                        <span className="text-[0.55rem] font-technical uppercase tracking-[0.2em] text-accent">Gate Registry // User Profile</span>
                        <h3 className="text-body-l font-light text-primary mt-0.5">Campus Identity Record</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingUserProfile(null)}
                        className="p-1 text-white/40 hover:text-white transition-colors focus:outline-none"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Profile Body */}
                    <div className="flex flex-col items-center gap-5 py-4 border-b border-white/5 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center font-display text-xl uppercase text-primary overflow-hidden">
                        {u.avatar ? <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" /> : (u.displayName?.[0] || u.email?.[0] || 'U')}
                      </div>
                      <div className="flex flex-col gap-1 items-center">
                        <h4 className="text-body-l font-light text-primary">{u.displayName || 'Campus User'}</h4>
                        <span className="text-xs text-white/40 font-mono">{u.email}</span>
                      </div>
                    </div>

                    {/* Details list */}
                    <div className="flex flex-col gap-4 text-xs font-light text-secondary">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-micro text-white/20 uppercase tracking-widest">User ID</span>
                        <span className="font-mono text-[10px] select-all">{u.uid}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-micro text-white/20 uppercase tracking-widest">Privilege Role</span>
                        <span className="font-technical uppercase text-accent font-semibold">
                          {u.email && u.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com" ? 'SYSTEM OWNER' : (u.role || 'student')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-micro text-white/20 uppercase tracking-widest">Club Association</span>
                        <span className="font-technical uppercase">{u.clubName || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-micro text-white/20 uppercase tracking-widest">Verified Status</span>
                        <span>{u.verified ? 'VERIFIED' : 'PENDING'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-micro text-white/20 uppercase tracking-widest">Account Status</span>
                        <span className={cn(
                          "font-technical uppercase text-[10px] px-1.5 border leading-none py-0.5",
                          u.suspended ? "border-red-500/20 bg-red-950/20 text-red-400" : "border-green-500/20 bg-green-950/20 text-green-400"
                        )}>
                          {u.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                      <Button variant="secondary" size="sm" onClick={() => setViewingUserProfile(null)}>
                        Close Details
                      </Button>
                    </div>

                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>

          {/* GLOBAL TOAST */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-4 py-3 bg-[#111] border border-white/10"
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  toast.type === 'success' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                )} />
                <span className="text-[0.65rem] font-technical uppercase tracking-wider text-white/40">
                  {toast.type}
                </span>
                <span className="text-xs font-ui tracking-wide">{toast.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
