import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';
import { resolveEventImage } from '../../utils/eventImage';
import { 
  subscribeToOrganizerEvents, 
  updateEvent, 
  deleteEvent, 
  duplicateEvent 
} from '../../services/eventService';
import { isValidStatusTransition } from '../../utils/eventLifecycle';
import { 
  normalizeClubHours, 
  validateClubHours, 
  isClubHoursLocked 
} from '../../utils/clubHours';
import { 
  subscribeToNotifications, 
  getUserActivities 
} from '../../services/notificationService';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { PremiumEmptyState } from '../../components/ui/PremiumEmptyState';
import { 
  Plus, Edit2, Copy, ToggleRight, Archive, Trash2, 
  Search, X, Users, CheckSquare, Square,
  BarChart2, Globe, Calendar, Clock, MapPin, 
  ChevronRight, ChevronLeft, Bell, Activity, Sparkles
} from 'lucide-react';

const CATEGORIES = [
  "Hackathons",
  "Technical",
  "Workshop",
  "Seminar",
  "Sports",
  "Culture",
  "Networking",
  "Guest Lecture"
];

const renderStatusBadge = (status) => {
  const currentStatus = (status || 'draft').toLowerCase();
  
  let styles = "border-black/10 bg-black/[0.02] text-black/40"; // fallback
  let text = status;
  
  if (currentStatus === 'draft') {
    styles = "border-black/10 bg-black/[0.02] text-black/50";
    text = "Draft";
  } else if (currentStatus === 'published' || currentStatus === 'open') {
    styles = "border-black bg-black text-white";
    text = "Active";
  } else if (currentStatus === 'closed') {
    styles = "border-black/10 bg-black/[0.04] text-black/60";
    text = "Closed";
  } else if (currentStatus === 'live') {
    styles = "border-black bg-black text-white animate-pulse";
    text = "Live Now";
  } else if (currentStatus === 'completed') {
    styles = "border-black/20 bg-black/[0.06] text-black/80";
    text = "Completed";
  } else if (currentStatus === 'archived') {
    styles = "border-black/5 bg-black/[0.01] text-black/35";
    text = "Archived";
  }

  return (
    <span className={cn(
      "text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border leading-tight rounded-full",
      styles
    )}>
      {text}
    </span>
  );
};

const EASE = [0.16, 1, 0.3, 1];

// Count-up helper component for stats
const CountingNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 1000;
    const startTime = performance.now();
    let frameId;

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * (end - start) + start);
      setDisplayValue(current);
      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };
    frameId = requestAnimationFrame(update);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [value]);

  return <span>{displayValue}</span>;
};

export const OrganizerStudio = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("organizer_studio_view");
  }, []);

  // State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All');
  const [filterSpecificDate, setFilterSpecificDate] = useState('');

  // Notifications & Activities State
  const [notifications, setNotifications] = useState([]);
  const [activities, setActivities] = useState([]);

  // Select Event Modal (for scan ticket & manage registrations quick actions)
  const [quickActionModal, setQuickActionModal] = useState({
    isOpen: false,
    action: '' // 'scan' | 'registrations' | 'analytics'
  });

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Edit Event Modal State
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    venue: '',
    date: '',
    endDate: '',
    time: '',
    capacity: 0,
    status: 'open',
    registrationDeadline: '',
    image: '',
    tags: '',
    visibility: 'public',
    clubHours: { enabled: false, participationHours: 0, organizerHours: 0 }
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Toast
  const [toast, setToast] = useState(null);

  // Real-time Firestore Subscription
  useEffect(() => {
    if (!user?.uid || !profile?.role) return;
    setLoading(true);
    const unsubscribe = subscribeToOrganizerEvents(
      user.uid,
      profile.role,
      (list) => {
        setEvents(list);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user, profile]);

  // Subscribe to Notifications & fetch recent Activity
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, (list) => {
      setNotifications(list.slice(0, 5));
    });

    const fetchActivities = async () => {
      const logs = await getUserActivities(user.uid, 5);
      setActivities(logs);
    };
    fetchActivities();

    return () => unsub();
  }, [user]);

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Memoized stats calculation
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const stats = useMemo(() => {
    const total = events.length;
    const drafts = events.filter(e => e.status === 'draft').length;
    const published = events.filter(e => e.status === 'open' || e.status === 'closed' || e.status === 'published' || e.status === 'live').length;
    const live = events.filter(e => e.status === 'live').length;
    const completed = events.filter(e => e.status === 'completed').length;
    const archived = events.filter(e => e.status === 'archived').length;
    const totalRegs = events.reduce((acc, curr) => acc + (parseInt(curr.registeredCount) || 0), 0);

    return { total, drafts, published, live, completed, archived, totalRegs };
  }, [events]);

  const upcomingCount = useMemo(() => {
    return events.filter(e => e.status !== 'draft' && e.status !== 'archived' && e.status !== 'completed' && e.date >= todayStr).length;
  }, [events, todayStr]);

  // Bulk selectors
  const handleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEvents.map(e => e.id)));
    }
  };

  // Actions
  const handleEditOpen = (event, e) => {
    if (e) e.stopPropagation();
    setEditingEvent(event);
    setEditForm({
      title: event.title || '',
      description: event.description || '',
      category: event.category || '',
      venue: event.venue || '',
      date: event.date || '',
      endDate: event.endDate || event.date || '',
      time: event.time || '',
      capacity: event.capacity ? Number(event.capacity) : 0,
      status: event.status || 'draft',
      registrationDeadline: event.registrationDeadline || '',
      image: event.image || '',
      tags: Array.isArray(event.tags) ? event.tags.join(', ') : (event.tags || ''),
      visibility: event.visibility || 'public',
      clubHours: normalizeClubHours(event)
    });
    setFormError('');
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.venue.trim() || !editForm.category) {
      setFormError("All required fields must be populated.");
      return;
    }
    if (editForm.endDate && editForm.date && editForm.endDate < editForm.date) {
      setFormError("End date must be on or after start date.");
      return;
    }
    // Check status transition validity
    if (!isValidStatusTransition(editingEvent.status, editForm.status)) {
      setFormError(`Invalid status transition from ${editingEvent.status} to ${editForm.status}`);
      return;
    }

    const originalLocked = isClubHoursLocked(editingEvent);
    const newClubHours = editForm.clubHours;

    if (newClubHours?.enabled) {
      const hoursValidation = validateClubHours(newClubHours);
      if (!hoursValidation.valid) {
        setFormError(hoursValidation.error);
        return;
      }
    }

    // Enforce lock check on save
    let normalizedClubHours = undefined;
    if (newClubHours) {
      normalizedClubHours = newClubHours.enabled ? {
        enabled: true,
        participationHours: Number(newClubHours.participationHours) || 0,
        organizerHours: Number(newClubHours.organizerHours) || 0
      } : {
        enabled: false,
        participationHours: 0,
        organizerHours: 0
      };

      if (originalLocked) {
        const oldClubHours = normalizeClubHours(editingEvent);
        if (
          normalizedClubHours.enabled !== oldClubHours.enabled ||
          normalizedClubHours.participationHours !== oldClubHours.participationHours ||
          normalizedClubHours.organizerHours !== oldClubHours.organizerHours
        ) {
          setFormError("Club hour values are locked because registrations have started.");
          return;
        }
      }
    }

    setFormSaving(true);
    setFormError('');
    try {
      const updatePayload = {
        ...editForm,
        capacity: Number(editForm.capacity),
        tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      if (normalizedClubHours) {
        updatePayload.clubHours = normalizedClubHours;
      }
      await updateEvent(editingEvent.id, updatePayload);
      triggerToast('success', "Event successfully updated.");
      setEditingEvent(null);
    } catch (err) {
      console.error("[Organizer] Failed to update event:", err);
      setFormError(err.message || "Failed to update event document.");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDuplicate = async (event, e) => {
    if (e) e.stopPropagation();
    try {
      await duplicateEvent(event);
      triggerToast('success', "Event duplicated successfully.");
    } catch (err) {
      console.error("[Organizer] Failed to duplicate event:", err);
      triggerToast('error', "Failed to duplicate event.");
    }
  };

  const handlePublish = async (event, e) => {
    if (e) e.stopPropagation();
    // Validate status transition: draft to published
    if (!isValidStatusTransition(event.status, 'published')) {
      triggerToast('error', `Cannot publish from current state: ${event.status}`);
      return;
    }
    try {
      await updateEvent(event.id, { 
        status: 'published',
        publishedAt: new Date().toISOString(),
        lastStatusChange: new Date().toISOString()
      });
      triggerToast('success', "Event successfully published to public discovery.");
    } catch (err) {
      console.error("[Organizer] Failed to publish event:", err);
      triggerToast('error', "Failed to publish event.");
    }
  };

  const handleViewAnalytics = (event, e) => {
    if (e) e.stopPropagation();
    const shares = event.shares || 0;
    const registrations = event.registeredCount || 0;
    const bookmarks = event.favorites || event.bookmarks || 0;
    triggerToast('success', `Analytics Registry // Shares: ${shares} | Registrations: ${registrations} | Bookmarks: ${bookmarks}`);
  };

  const handleToggleClose = async (event, e) => {
    if (e) e.stopPropagation();
    const nextStatus = event.status?.toLowerCase() === 'closed' ? 'open' : 'closed';
    try {
      await updateEvent(event.id, { 
        status: nextStatus,
        lastStatusChange: new Date().toISOString()
      });
      triggerToast('success', `Event registration status updated to ${nextStatus}.`);
    } catch (err) {
      console.error("[Organizer] Failed to toggle event closure:", err);
      triggerToast('error', "Failed to toggle status.");
    }
  };

  const handleArchive = async (event, e) => {
    if (e) e.stopPropagation();
    try {
      await updateEvent(event.id, { 
        status: 'archived',
        archivedAt: new Date().toISOString(),
        lastStatusChange: new Date().toISOString()
      });
      triggerToast('success', "Event moved to archives.");
    } catch (err) {
      console.error("[Organizer] Failed to archive event:", err);
      triggerToast('error', "Failed to archive event.");
    }
  };

  const handleDelete = (eventId, eventTitle, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      title: "Delete permanently?",
      message: `Are you sure you want to permanently delete "${eventTitle}"? This will soft-delete the event in the system.`,
      onConfirm: async () => {
        try {
          await deleteEvent(eventId);
          triggerToast('success', "Event permanently deleted.");
          setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(eventId);
            return next;
          });
        } catch (err) {
          console.error("[Organizer] Failed to delete event:", err);
          triggerToast('error', "Failed to delete event.");
        } finally {
          setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Bulk action triggers
  const handleBulkDelete = () => {
    setDeleteConfirmation({
      isOpen: true,
      title: "Delete permanently?",
      message: `Are you sure you want to permanently delete the ${selectedIds.size} selected events?`,
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedIds).map(id => deleteEvent(id)));
          triggerToast('success', "Selected events deleted.");
          setSelectedIds(new Set());
        } catch (err) {
          console.error("[Organizer] Failed to bulk delete events:", err);
          triggerToast('error', "Failed to complete bulk delete operations.");
        } finally {
          setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleBulkArchive = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => updateEvent(id, { status: 'archived' })));
      triggerToast('success', "Selected events archived.");
      setSelectedIds(new Set());
    } catch (err) {
      console.error("[Organizer] Failed to bulk archive events:", err);
      triggerToast('error', "Failed to archive selected events.");
    }
  };

  const handleBulkClose = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => updateEvent(id, { status: 'closed' })));
      triggerToast('success', "Selected event registrations closed.");
      setSelectedIds(new Set());
    } catch (err) {
      console.error("[Organizer] Failed to bulk close event registrations:", err);
      triggerToast('error', "Failed to close selected events.");
    }
  };

  // Memoized filters
  const filteredEvents = useMemo(() => {
    let list = [...events];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        (e.title || '').toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory !== 'All') {
      list = list.filter(e => (e.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    // Status
    if (selectedStatus !== 'All') {
      if (selectedStatus.toLowerCase() === 'published') {
        list = list.filter(e => e.status === 'open' || e.status === 'closed' || e.status === 'published' || e.status === 'live');
      } else {
        list = list.filter(e => (e.status || '').toLowerCase() === selectedStatus.toLowerCase());
      }
    }

    // Date/Timeline
    if (selectedDate !== 'All') {
      list = list.filter(e => {
        if (!e.date) return false;
        if (selectedDate === 'Upcoming') {
          return e.date >= todayStr;
        }
        if (selectedDate === 'Past') {
          return e.date < todayStr;
        }
        if (selectedDate === 'Specific' && filterSpecificDate) {
          return e.date === filterSpecificDate;
        }
        return true;
      });
    }

    // Sort default newest
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return list;
  }, [events, searchQuery, selectedCategory, selectedStatus, selectedDate, filterSpecificDate, todayStr]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Dynamic month calendar helper
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: '', isCurrent: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasEvent = events.some(e => e.date === dateStr);
      days.push({
        day: d,
        isCurrent: true,
        dateStr,
        hasEvent,
        isToday: d === now.getDate() && month === now.getMonth() && year === now.getFullYear()
      });
    }
    return days;
  }, [events]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const isFiltering = searchQuery.trim() !== '' || selectedCategory !== 'All' || selectedStatus !== 'All' || selectedDate !== 'All';

  // Left column event slices when NOT filtering
  const upcomingEvents = useMemo(() => {
    return events.filter(e => e.status !== 'draft' && e.status !== 'archived' && e.date >= todayStr);
  }, [events, todayStr]);

  const draftEvents = useMemo(() => {
    return events.filter(e => e.status === 'draft');
  }, [events]);

  return (
    <PageTransition>
      <PageContainer width="full" className="px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto pb-24">
        {/* Subtle Paper Grain Texture Overlay */}
        <div
          className="fixed inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
        />

        <div className="flex flex-col gap-10 relative z-10 w-full mt-6">
          
          {/* 1. HEADER ROW */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/[0.06] w-full">
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Workspace // Studio</span>
              <h1 className="text-3xl font-semibold tracking-tight mt-1 text-[#111111] font-display">
                {greeting}, {profile?.displayName || user?.displayName || 'User'}
              </h1>
              <p className="text-sm text-[#666666] mt-1.5 font-light">
                Welcome back. You have <span className="font-semibold text-black">{upcomingCount}</span> upcoming events scheduled.
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-start md:self-center">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/events')}
                className="rounded-[16px] px-5 py-2.5 text-xs font-medium border-black/[0.08] hover:bg-black/[0.03] transition-all active:scale-[0.98]"
              >
                Browse Events
              </Button>
              <Button 
                onClick={() => navigate('/create-event')}
                className="rounded-[16px] px-5 py-2.5 text-xs font-medium bg-black text-white hover:bg-black/90 transition-all active:scale-[0.98] flex items-center gap-2 border border-black/10"
              >
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </Button>
            </div>
          </div>

          {/* 2. QUICK STATS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {/* Stat 1: Upcoming Events */}
            <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-start text-left relative group">
              <div className="p-2.5 bg-black/[0.03] rounded-[12px] text-black shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[34px] font-semibold text-[#111111] tracking-tight mt-4 leading-none">
                <CountingNumber value={upcomingCount} />
              </span>
              <span className="text-[11px] font-semibold text-black uppercase tracking-wider mt-2">Upcoming Events</span>
              <span className="text-[10px] text-[#666666] mt-0.5">Active public schedules</span>
            </div>

            {/* Stat 2: Registered Events */}
            <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-start text-left relative group">
              <div className="p-2.5 bg-black/[0.03] rounded-[12px] text-black shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[34px] font-semibold text-[#111111] tracking-tight mt-4 leading-none">
                <CountingNumber value={stats.totalRegs} />
              </span>
              <span className="text-[11px] font-semibold text-black uppercase tracking-wider mt-2">Registered Guests</span>
              <span className="text-[10px] text-[#666666] mt-0.5">Total registered seats</span>
            </div>

            {/* Stat 3: Saved Events */}
            <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-start text-left relative group">
              <div className="p-2.5 bg-black/[0.03] rounded-[12px] text-black shrink-0">
                <Copy className="w-4 h-4" />
              </div>
              <span className="text-[34px] font-semibold text-[#111111] tracking-tight mt-4 leading-none">
                <CountingNumber value={stats.drafts} />
              </span>
              <span className="text-[11px] font-semibold text-black uppercase tracking-wider mt-2">Saved Drafts</span>
              <span className="text-[10px] text-[#666666] mt-0.5">Unpublished drafts</span>
            </div>

            {/* Stat 4: Notifications */}
            <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-start text-left relative group">
              <div className="p-2.5 bg-black/[0.03] rounded-[12px] text-black shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-[34px] font-semibold text-[#111111] tracking-tight mt-4 leading-none">
                <CountingNumber value={notifications.length} />
              </span>
              <span className="text-[11px] font-semibold text-black uppercase tracking-wider mt-2">Workspace Alerts</span>
              <span className="text-[10px] text-[#666666] mt-0.5">Activity notification stream</span>
            </div>
          </div>

          {/* 3. FILTERS & SEARCH CONTROL BAR */}
          <div className="bg-white border border-black/[0.08] p-4 rounded-[20px] flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between w-full shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
            {/* Search Input */}
            <div className="relative flex-grow max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search studio events..."
                className="w-full bg-[#F9F9F9] border border-black/[0.08] pl-10 pr-4 py-2 text-xs text-black placeholder-black/30 focus:outline-none focus:border-black rounded-[12px] transition-all"
              />
            </div>

            {/* Selector Filters */}
            <div className="flex flex-wrap items-center gap-4 text-xs select-none">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-black/40">Category</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#F9F9F9] border border-black/[0.08] text-black/80 px-3 py-1.5 rounded-[12px] focus:outline-none focus:border-black cursor-pointer hover:bg-black/[0.01] transition-all text-xs"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-black/40">Status</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-[#F9F9F9] border border-black/[0.08] text-black/80 px-3 py-1.5 rounded-[12px] focus:outline-none focus:border-black cursor-pointer hover:bg-black/[0.01] transition-all text-xs"
                >
                  <option value="All">All States</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published / Active</option>
                  <option value="archived">Archived</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-black/40">Timeline</span>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#F9F9F9] border border-black/[0.08] text-black/80 px-3 py-1.5 rounded-[12px] focus:outline-none focus:border-black cursor-pointer hover:bg-black/[0.01] transition-all text-xs"
                >
                  <option value="All">Any Time</option>
                  <option value="Upcoming">Upcoming Only</option>
                  <option value="Past">Past Only</option>
                  <option value="Specific">Specific Date</option>
                </select>
                {selectedDate === 'Specific' && (
                  <input
                    type="date"
                    value={filterSpecificDate}
                    onChange={(e) => setFilterSpecificDate(e.target.value)}
                    className="bg-[#F9F9F9] border border-black/[0.08] text-black px-2 py-1 focus:outline-none focus:border-black font-ui rounded-[12px] text-xs transition-all"
                  />
                )}
              </div>
            </div>
          </div>

          {/* BULK ACTIONS BANNER */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between p-4 bg-black text-white rounded-[16px] font-mono text-xs w-full shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <span className="uppercase tracking-wider">
                    {selectedIds.size} Events Selected
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBulkClose}
                    className="hover:underline uppercase tracking-wider transition-colors"
                  >
                    Close Entry
                  </button>
                  <button
                    onClick={handleBulkArchive}
                    className="hover:underline uppercase tracking-wider transition-colors"
                  >
                    Archive Selected
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. TWO COLUMN MAIN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            
            {/* LEFT COLUMN: Events List (lg:col-span-8) */}
            <div className="lg:col-span-8 flex flex-col gap-10 w-full min-h-[50vh]">
              {loading ? (
                <div className="flex flex-col gap-5 w-full">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 w-full bg-white border border-black/[0.08] rounded-[20px] animate-pulse" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="bg-white border border-black/[0.08] p-8 rounded-[20px] w-full text-center">
                  <PremiumEmptyState 
                    type="organizer"
                    action={() => navigate('/create-event')}
                  />
                </div>
              ) : isFiltering ? (
                /* Filtered Events Card Grid */
                <div className="flex flex-col gap-6 w-full text-left">
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                    <h2 className="text-[13px] font-mono uppercase tracking-[0.2em] text-black/50">Search & Filter Results ({filteredEvents.length})</h2>
                    <button onClick={handleSelectAll} className="text-xs font-mono text-black hover:underline focus:outline-none">
                      {selectedIds.size === filteredEvents.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {filteredEvents.map(event => (
                      <EventCard 
                        key={event.id}
                        event={event}
                        isSelected={selectedIds.has(event.id)}
                        onSelect={(e) => handleSelectRow(event.id, e)}
                        onEdit={(e) => handleEditOpen(event, e)}
                        onDuplicate={(e) => handleDuplicate(event, e)}
                        onPublish={(e) => handlePublish(event, e)}
                        onToggleClose={(e) => handleToggleClose(event, e)}
                        onArchive={(e) => handleArchive(event, e)}
                        onDelete={(e) => handleDelete(event.id, event.title, e)}
                        onViewAnalytics={(e) => handleViewAnalytics(event, e)}
                        navigate={navigate}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* Organized Workspace sections when NOT searching */
                <div className="flex flex-col gap-10 w-full text-left">
                  
                  {/* Section A: Upcoming Scheduled Events */}
                  {upcomingEvents.length > 0 && (
                    <div className="flex flex-col gap-6 w-full">
                      <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                        <h2 className="text-[13px] font-mono uppercase tracking-[0.2em] text-black/80 font-bold">Upcoming Events ({upcomingEvents.length})</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {upcomingEvents.map(event => (
                          <EventCard 
                            key={event.id}
                            event={event}
                            isSelected={selectedIds.has(event.id)}
                            onSelect={(e) => handleSelectRow(event.id, e)}
                            onEdit={(e) => handleEditOpen(event, e)}
                            onDuplicate={(e) => handleDuplicate(event, e)}
                            onPublish={(e) => handlePublish(event, e)}
                            onToggleClose={(e) => handleToggleClose(event, e)}
                            onArchive={(e) => handleArchive(event, e)}
                            onDelete={(e) => handleDelete(event.id, event.title, e)}
                            onViewAnalytics={(e) => handleViewAnalytics(event, e)}
                            navigate={navigate}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section B: Drafts Pipeline */}
                  {draftEvents.length > 0 && (
                    <div className="flex flex-col gap-6 w-full">
                      <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                        <h2 className="text-[13px] font-mono uppercase tracking-[0.2em] text-black/80 font-bold">Drafts Pipeline ({draftEvents.length})</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {draftEvents.map(event => (
                          <EventCard 
                            key={event.id}
                            event={event}
                            isSelected={selectedIds.has(event.id)}
                            onSelect={(e) => handleSelectRow(event.id, e)}
                            onEdit={(e) => handleEditOpen(event, e)}
                            onDuplicate={(e) => handleDuplicate(event, e)}
                            onPublish={(e) => handlePublish(event, e)}
                            onToggleClose={(e) => handleToggleClose(event, e)}
                            onArchive={(e) => handleArchive(event, e)}
                            onDelete={(e) => handleDelete(event.id, event.title, e)}
                            onViewAnalytics={(e) => handleViewAnalytics(event, e)}
                            navigate={navigate}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section C: Recent Activity / All Events */}
                  <div className="flex flex-col gap-6 w-full">
                    <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                      <h2 className="text-[13px] font-mono uppercase tracking-[0.2em] text-black/80 font-bold">All Events Registry ({events.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {events.slice(0, 6).map(event => (
                        <EventCard 
                          key={event.id}
                          event={event}
                          isSelected={selectedIds.has(event.id)}
                          onSelect={(e) => handleSelectRow(event.id, e)}
                          onEdit={(e) => handleEditOpen(event, e)}
                          onDuplicate={(e) => handleDuplicate(event, e)}
                          onPublish={(e) => handlePublish(event, e)}
                          onToggleClose={(e) => handleToggleClose(event, e)}
                          onArchive={(e) => handleArchive(event, e)}
                          onDelete={(e) => handleDelete(event.id, event.title, e)}
                          onViewAnalytics={(e) => handleViewAnalytics(event, e)}
                          navigate={navigate}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Sidebar (lg:col-span-4) */}
            <div className="lg:col-span-4 flex flex-col gap-8 w-full">
              
              {/* Calendar Preview */}
              <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col">
                <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50">Calendar Preview</h3>
                  <span className="text-xs font-semibold text-[#111111]">{currentMonthName}</span>
                </div>
                {/* Month Days Grid */}
                <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center font-mono">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <span key={d} className="text-[10px] font-bold text-black/30 py-1">{d}</span>
                  ))}
                  {calendarDays.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "relative flex flex-col items-center justify-center py-2 text-xs rounded-[8px]",
                        item.isToday ? "bg-black text-white font-semibold" : "text-black",
                        !item.isCurrent && "opacity-15 pointer-events-none"
                      )}
                    >
                      <span>{item.day}</span>
                      {item.hasEvent && !item.isToday && (
                        <span className="absolute bottom-1 w-1 h-1 bg-black rounded-full" />
                      )}
                      {item.hasEvent && item.isToday && (
                        <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col">
                <div className="border-b border-black/[0.06] pb-3 mb-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50">Quick Workspace Actions</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Action A: Create Event */}
                  <button 
                    onClick={() => navigate('/create-event')}
                    className="border border-black/[0.08] hover:border-black p-4 rounded-[16px] hover:bg-black/[0.02] flex flex-col items-start transition-all duration-200 active:scale-[0.98] group text-left"
                  >
                    <Plus className="w-5 h-5 text-black group-hover:scale-110 transition-all" />
                    <span className="text-[11px] font-semibold text-[#111111] uppercase tracking-wider mt-3">Create Event</span>
                    <span className="text-[9px] text-[#666666] mt-0.5">Orchestrate new draft</span>
                  </button>

                  {/* Action B: Scan Ticket */}
                  <button 
                    onClick={() => {
                      const published = events.filter(e => e.status !== 'draft' && e.status !== 'archived');
                      if (published.length === 0) {
                        triggerToast('error', "No active events published to scan tickets for.");
                        return;
                      }
                      setQuickActionModal({ isOpen: true, action: 'scan' });
                    }}
                    className="border border-black/[0.08] hover:border-black p-4 rounded-[16px] hover:bg-black/[0.02] flex flex-col items-start transition-all duration-200 active:scale-[0.98] group text-left"
                  >
                    <Globe className="w-5 h-5 text-black group-hover:scale-110 transition-all" />
                    <span className="text-[11px] font-semibold text-[#111111] uppercase tracking-wider mt-3">Scan Ticket</span>
                    <span className="text-[9px] text-[#666666] mt-0.5">Validate guest passes</span>
                  </button>

                  {/* Action C: Manage Registrations */}
                  <button 
                    onClick={() => {
                      const published = events.filter(e => e.status !== 'draft' && e.status !== 'archived');
                      if (published.length === 0) {
                        triggerToast('error', "No active events found with registrations.");
                        return;
                      }
                      setQuickActionModal({ isOpen: true, action: 'registrations' });
                    }}
                    className="border border-black/[0.08] hover:border-black p-4 rounded-[16px] hover:bg-black/[0.02] flex flex-col items-start transition-all duration-200 active:scale-[0.98] group text-left"
                  >
                    <Users className="w-5 h-5 text-black group-hover:scale-110 transition-all" />
                    <span className="text-[11px] font-semibold text-[#111111] uppercase tracking-wider mt-3">Registrations</span>
                    <span className="text-[9px] text-[#666666] mt-0.5">Inspect attendee sheets</span>
                  </button>

                  {/* Action D: General Analytics */}
                  <button 
                    onClick={() => {
                      const published = events.filter(e => e.status !== 'draft' && e.status !== 'archived');
                      if (published.length === 0) {
                        triggerToast('error', "No published events found for metrics analytics.");
                        return;
                      }
                      setQuickActionModal({ isOpen: true, action: 'analytics' });
                    }}
                    className="border border-black/[0.08] hover:border-black p-4 rounded-[16px] hover:bg-black/[0.02] flex flex-col items-start transition-all duration-200 active:scale-[0.98] group text-left"
                  >
                    <BarChart2 className="w-5 h-5 text-black group-hover:scale-110 transition-all" />
                    <span className="text-[11px] font-semibold text-[#111111] uppercase tracking-wider mt-3">Analytics</span>
                    <span className="text-[9px] text-[#666666] mt-0.5">Observe core counters</span>
                  </button>
                </div>
              </div>

              {/* Notifications Timeline */}
              <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col">
                <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50">Recent Notifications</h3>
                  {notifications.some(n => !n.isRead) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  )}
                </div>

                {notifications.length === 0 ? (
                  <span className="text-xs text-black/40 py-2 uppercase font-mono">No recent notifications.</span>
                ) : (
                  <div className="flex flex-col gap-4">
                    {notifications.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-start gap-3 text-left">
                        <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-black" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-[#111111]">{item.title}</span>
                          <span className="text-[11px] text-[#666666] leading-relaxed">{item.message}</span>
                          <span className="text-[9px] text-black/30 uppercase mt-0.5">{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity Timeline */}
              <div className="bg-white border border-black/[0.08] p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col">
                <div className="border-b border-black/[0.06] pb-3 mb-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50">Recent Activity Logs</h3>
                </div>

                {activities.length === 0 ? (
                  <span className="text-xs text-black/40 py-2 uppercase font-mono">No recent activity logged.</span>
                ) : (
                  <div className="flex flex-col relative pl-4 border-l border-black/[0.06] ml-2 gap-6">
                    {activities.map((item, idx) => (
                      <div key={item.id || idx} className="relative flex flex-col text-left gap-0.5">
                        {/* Bullet Circle Node */}
                        <div className="absolute -left-[21.5px] top-1.5 w-[10px] h-[10px] rounded-full border border-black bg-white shrink-0" />
                        <span className="text-xs font-semibold text-[#111111]">{item.action}</span>
                        <span className="text-[9px] text-black/30 uppercase mt-0.5">{formatDate(item.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </PageContainer>

      {/* QUICK ACTIONS ROUTING MODAL */}
      <AnimatePresence>
        {quickActionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickActionModal({ isOpen: false, action: '' })}
              className="absolute inset-0 bg-[#090909]/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="bg-white border border-black/[0.08] w-full max-w-md p-6 z-10 flex flex-col rounded-[20px] shadow-[0_32px_60px_-16px_rgba(0,0,0,0.1)] relative text-left"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-4">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-black/50">
                  Select Event for Action
                </h3>
                <button 
                  onClick={() => setQuickActionModal({ isOpen: false, action: '' })}
                  className="text-black/40 hover:text-black focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {events.filter(e => e.status !== 'draft').map(event => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setQuickActionModal({ isOpen: false, action: '' });
                      if (quickActionModal.action === 'scan') {
                        navigate(`/organizer/events/${event.id}/attendees?scan=true`);
                      } else if (quickActionModal.action === 'registrations') {
                        navigate(`/organizer/events/${event.id}/attendees`);
                      } else if (quickActionModal.action === 'analytics') {
                        handleViewAnalytics(event);
                      }
                    }}
                    className="w-full text-left p-3.5 border border-black/[0.08] hover:border-black rounded-[12px] hover:bg-black/[0.01] transition-all flex items-center justify-between group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-[#111111] group-hover:underline">{event.title}</span>
                      <span className="text-[9px] font-mono text-black/40 uppercase">{event.category} • {formatDate(event.date)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT EVENT MODAL */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !formSaving && setEditingEvent(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="bg-white border border-black/[0.08] w-full max-w-xl h-auto max-h-[85vh] overflow-y-auto z-10 flex flex-col rounded-[20px] shadow-[0_32px_60px_-16px_rgba(0,0,0,0.12)] relative text-left"
            >
              <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between relative z-10">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Action // Edit Event</span>
                  <h2 className="text-lg font-semibold text-[#111111] mt-1 font-display">Configure Event Details</h2>
                </div>
                <button
                  type="button"
                  disabled={formSaving}
                  onClick={() => setEditingEvent(null)}
                  className="p-1 text-black/40 hover:text-black transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSave} className="p-6 flex flex-col gap-5 text-left relative z-10">
                {formError && (
                  <div className="text-xs text-red-600 font-mono uppercase border border-red-500/20 bg-red-50 px-4 py-2 rounded-[8px]">
                    {formError}
                  </div>
                )}

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Event Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px] transition-colors"
                    required
                    disabled={formSaving}
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px] cursor-pointer"
                    required
                    disabled={formSaving}
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Image URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Event Cover Image URL</label>
                  <input
                    type="url"
                    value={editForm.image}
                    onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                    className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px] transition-colors"
                    required
                    disabled={formSaving}
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Event Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px] transition-colors resize-none"
                    disabled={formSaving}
                  />
                </div>

                {/* Venue */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Venue Location</label>
                  <input
                    type="text"
                    value={editForm.venue}
                    onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                    className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px] transition-colors"
                    required
                    disabled={formSaving}
                  />
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Start Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px]"
                      required
                      disabled={formSaving}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Time Slot</label>
                    <input
                      type="text"
                      placeholder="e.g. 10:00 AM"
                      value={editForm.time}
                      onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                      className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px]"
                      required
                      disabled={formSaving}
                    />
                  </div>
                </div>

                {/* Capacity / Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Seat Capacity</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px]"
                      required
                      disabled={formSaving}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-black/50">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-[#F9F9F9] border border-black/[0.08] px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black rounded-[12px] cursor-pointer"
                      required
                      disabled={formSaving}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.06] mt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingEvent(null)}
                    disabled={formSaving}
                    className="rounded-[16px] px-5 py-2.5 text-xs border-black/[0.08] active:scale-[0.98]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={formSaving}
                    className="rounded-[16px] px-5 py-2.5 text-xs bg-black text-white active:scale-[0.98]"
                  >
                    {formSaving ? "Saving..." : "Save Details"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-[#090909]/40 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="bg-white border border-black/[0.08] w-full max-w-md p-6 z-10 flex flex-col rounded-[20px] shadow-[0_32px_60px_-16px_rgba(0,0,0,0.1)] relative text-left"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-red-600">
                  <span className="text-[9px] font-mono uppercase border border-red-500/20 px-2 py-0.5 tracking-wider bg-red-50 rounded-full">
                    Warning
                  </span>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-red-700">
                    {deleteConfirmation.title}
                  </h3>
                </div>
                
                <p className="text-xs text-[#666666] leading-relaxed font-light">
                  {deleteConfirmation.message}
                </p>

                <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.06] mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
                    className="rounded-[16px] px-5 py-2.5 text-xs border-black/[0.08]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={deleteConfirmation.onConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 rounded-[16px] px-5 py-2.5 text-xs active:scale-[0.98]"
                  >
                    Delete Permanently
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFIER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-4 py-3 bg-[#111] text-white border border-white/10 rounded-[12px] shadow-lg font-mono"
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              toast.type === 'success' ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-[9px] uppercase tracking-wider text-white/40">
              {toast.type}
            </span>
            <span className="text-xs tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </PageTransition>
  );
};

// Event Card Component
const EventCard = ({ 
  event, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDuplicate, 
  onPublish, 
  onToggleClose, 
  onArchive, 
  onDelete, 
  onViewAnalytics, 
  navigate, 
  formatDate 
}) => {
  const capacity = parseInt(event.capacity) || 0;
  const currentReg = parseInt(event.registeredCount) || 0;
  
  // Fill % analytics
  const fillPercent = capacity > 0 ? Math.min(Math.round((currentReg / capacity) * 100), 100) : 0;

  return (
    <div 
      onClick={() => navigate(`/events/${event.id}`)}
      className={cn(
        "bg-white border p-5 rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer relative z-10 w-full group",
        isSelected ? "border-black ring-1 ring-black bg-[#FAFAFA]" : "border-black/[0.08]"
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Top Info Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Multi-select checkmark button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onSelect(e); }}
              className="p-1 rounded-[6px] border border-black/[0.08] hover:border-black text-black shrink-0 transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[9px] font-mono text-black/50 uppercase tracking-widest leading-none">{event.category || "General"}</span>
              <h3 className="text-sm font-semibold text-[#111111] group-hover:underline line-clamp-1">{event.title}</h3>
            </div>
          </div>
          {renderStatusBadge(event.status)}
        </div>

        {/* Cover + Location info grid */}
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-[12px] border border-black/[0.08] overflow-hidden shrink-0 bg-[#F9F9F9]">
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
          <div className="flex flex-col gap-1 text-[11px] text-[#666666] items-start">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-black/40" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-black/40" />
              <span className="line-clamp-1 text-left">{event.venue || "TBA"}</span>
            </div>
          </div>
        </div>

        {/* Fill rate progress and registrations */}
        <div className="flex items-center justify-between gap-6 border-t border-black/[0.06] pt-4 mt-1">
          <div className="flex flex-col gap-1 w-24">
            <div className="flex justify-between text-[9px] font-mono text-black/40 uppercase tracking-wider">
              <span>Seats Filled</span>
              <span>{fillPercent}%</span>
            </div>
            <div className="h-1 bg-black/[0.05] rounded-full relative overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-black rounded-full" 
                style={{ width: `${fillPercent}%` }} 
              />
            </div>
          </div>

          <div className="flex gap-4 text-left">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-black/40 uppercase">Guests</span>
              <span className="text-xs font-semibold text-black">{currentReg} / {capacity}</span>
            </div>
            <div className="flex flex-col border-l border-black/[0.06] pl-4">
              <span className="text-[9px] font-mono text-black/40 uppercase">Bookmarks</span>
              <span className="text-xs font-semibold text-black">{event.favorites || event.bookmarks || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover action toolbar row */}
      <div 
        className="flex items-center gap-1.5 mt-4 pt-3 border-t border-black/[0.06] justify-end" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Publish (Only for Drafts) */}
        {event.status === 'draft' && (
          <button
            type="button"
            onClick={(e) => onPublish(event, e)}
            className="p-1.5 hover:bg-black hover:text-white border border-black/[0.08] hover:border-black transition-colors rounded-[8px]"
            title="Publish Event"
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Edit (Drafts, Published, Open, Closed) */}
        {event.status !== 'archived' && (
          <button
            type="button"
            onClick={(e) => onEdit(event, e)}
            className="p-1.5 hover:bg-black hover:text-white border border-black/[0.08] hover:border-black transition-colors rounded-[8px]"
            title="Edit Event"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Duplicate */}
        <button
          type="button"
          onClick={(e) => onDuplicate(event, e)}
          className="p-1.5 hover:bg-black hover:text-white border border-black/[0.08] hover:border-black transition-colors rounded-[8px]"
          title="Duplicate Event"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* View Attendees */}
        {event.status !== 'draft' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/organizer/events/${event.id}/attendees`);
            }}
            className="p-1.5 hover:bg-black hover:text-white border border-black/[0.08] hover:border-black transition-colors rounded-[8px]"
            title="Manage Attendees"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Toggle Registration Close/Open (Only for active events) */}
        {(event.status === 'open' || event.status === 'closed') && (
          <button
            type="button"
            onClick={(e) => onToggleClose(event, e)}
            className="p-1.5 hover:bg-black hover:text-white border border-black/[0.08] hover:border-black transition-colors rounded-[8px]"
            title={event.status === 'closed' ? "Open Registration" : "Close Registration"}
          >
            <ToggleRight className={cn("w-3.5 h-3.5", event.status === 'closed' ? "rotate-180" : "")} />
          </button>
        )}

        {/* Archive (Not for already archived events) */}
        {event.status !== 'archived' && (
          <button
            type="button"
            onClick={(e) => onArchive(event, e)}
            className="p-1.5 hover:bg-black hover:text-white border border-black/[0.08] hover:border-black transition-colors rounded-[8px]"
            title="Archive Event"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        )}

        {/* View Analytics */}
        <button
          type="button"
          onClick={(e) => onViewAnalytics(e)}
          className="p-1.5 hover:bg-black hover:text-white border border-black/[0.08] hover:border-black transition-colors rounded-[8px]"
          title="View Event Analytics"
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => onDelete(e)}
          className="p-1.5 hover:bg-red-600 hover:text-white border border-red-500/10 hover:border-red-600 text-red-600 transition-colors rounded-[8px]"
          title="Delete Event"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
