import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';
import { getAllEvents } from '../../services/eventService';
import { registerForEvent, getUserRegistrations } from '../../services/registrationService';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Calendar, MapPin, Search, X } from 'lucide-react';
import { resolveEventImage } from '../../utils/eventImage';
import { getParticipationHours } from '../../utils/clubHours';
import { PremiumEmptyState } from '../../components/ui/PremiumEmptyState';
import { Button } from '../../components/ui/Button';

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

// Easing curves
const EASE = [0.16, 1, 0.3, 1];

const DirectoryEventCard = ({
  event,
  registered,
  isClosed,
  currentReg,
  formatDate,
  navigate,
  handleRegister,
  setPreviewEvent,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/events/${event.id}`)}
      className="group relative bg-white border border-black/10 rounded-[22px] overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] cursor-pointer flex flex-col h-full text-left select-none"
    >
      {/* Large Image */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden bg-black/5"
        onClick={(e) => {
          e.stopPropagation();
          setPreviewEvent(event);
        }}
      >
        <img
          src={resolveEventImage(event)}
          alt={event.title || 'Event cover'}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {/* Subtle overlay indicator for preview */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="text-[10px] font-technical uppercase tracking-widest bg-white/95 border border-black/10 px-3 py-1.5 rounded-full text-black/90">
            Quick View
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow justify-between gap-6">
        <div>
          {/* Top row: Category & Status */}
          <div className="flex items-center justify-between text-[0.6rem] font-technical uppercase tracking-widest text-black/40 mb-3.5">
            <span>{event.category || 'General'}</span>
            <span className={cn(isClosed ? "text-black/30" : "text-black/70")}>
              {isClosed ? 'Closed' : 'Open'}
            </span>
          </div>

          {/* Title and Arrow */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <h3 className="text-lg font-light text-[#1A1A1A] leading-snug group-hover:text-black transition-colors duration-200">
              {event.title}
            </h3>
            <span className="text-lg text-black/30 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0">
              ↗
            </span>
          </div>

          {/* Details list */}
          <div className="space-y-2 border-t border-black/5 pt-4 mt-2">
            <div className="flex justify-between items-center text-[0.68rem] font-technical text-black/40 uppercase tracking-wider">
              <span>Date</span>
              <span className="text-black/75 font-ui tracking-normal font-light">{formatDate(event.date)}</span>
            </div>
            <div className="flex justify-between items-center text-[0.68rem] font-technical text-black/40 uppercase tracking-wider">
              <span>Location</span>
              <span className="text-black/75 font-ui tracking-normal font-light truncate max-w-[150px]">{event.venue || 'Main Venue'}</span>
            </div>
            <div className="flex justify-between items-center text-[0.68rem] font-technical text-black/40 uppercase tracking-wider">
              <span>Seats</span>
              <span className="text-black/75 font-ui tracking-normal font-light">
                {event.capacity || '80'} ({currentReg} registered)
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button at bottom */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (registered) navigate('/my-events');
            else if (isClosed) navigate(`/events/${event.id}`);
            else handleRegister(event.id, e);
          }}
          className={cn(
            "w-full py-3.5 text-[0.62rem] font-technical uppercase tracking-widest rounded-full border transition-all duration-200 text-center min-h-[44px] flex items-center justify-center font-bold cursor-pointer",
            registered
              ? "bg-black/5 text-black/90 border-black/10 hover:bg-black/10"
              : isClosed
                ? "bg-transparent text-black/30 border-black/5 cursor-not-allowed"
                : "bg-transparent text-black border-black/10 hover:bg-black hover:text-white hover:border-black"
          )}
          disabled={isClosed && !registered}
        >
          {registered ? 'View Pass' : isClosed ? 'Registration Closed' : 'Register'}
        </button>
      </div>
    </div>
  );
};

export const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State lists
  const [events, setEvents] = useState([]);
  const [userRegIds, setUserRegIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast notifications state
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // Search & Filter Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Newest');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');

  // Preview Modal State
  const [previewEvent, setPreviewEvent] = useState(null);

  // References for scrolling
  const filterSectionRef = useRef(null);

  const sortOptions = useMemo(() => [
    { value: 'Newest', label: 'Newest First' },
    { value: 'Oldest', label: 'Oldest First' },
    { value: 'Deadline', label: 'Deadline' },
    { value: 'Soonest', label: 'Soonest Event' },
    { value: 'Seats', label: 'Seats Remaining' },
    { value: 'Alphabetical', label: 'Alphabetical' }
  ], []);

  // Date operations helper
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nextWeekStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter & Sort Calculation (Memoized)
  const processedEvents = useMemo(() => {
    let list = [...events];

    // 0. Filter out drafts and archived events from public view
    list = list.filter(e => e.status !== 'draft' && e.status !== 'archived');

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.organizer || '').toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (selectedCategory !== 'All') {
      list = list.filter(e => (e.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    // 3. Status Filter
    if (selectedStatus !== 'All') {
      list = list.filter(e => (e.status || '').toLowerCase() === selectedStatus.toLowerCase());
    }

    // 4. Date Timeline Filter
    if (selectedDate !== 'All') {
      const today = new Date();
      list = list.filter(e => {
        if (!e.date) return false;
        if (selectedDate === 'Today') {
          return e.date === todayStr;
        }
        if (selectedDate === 'This Week') {
          return e.date >= todayStr && e.date <= nextWeekStr;
        }
        if (selectedDate === 'This Month') {
          const eDate = new Date(e.date);
          return eDate.getFullYear() === today.getFullYear() && eDate.getMonth() === today.getMonth();
        }
        if (selectedDate === 'Upcoming') {
          return e.date >= todayStr;
        }
        return true;
      });
    }

    // 5. Location Filter
    if (selectedLocation !== 'All') {
      list = list.filter(e => {
        const v = (e.venue || '').toLowerCase();
        if (selectedLocation === 'Virtual') {
          return v.includes('online') || v.includes('virtual') || v.includes('zoom') || v.includes('meet') || v.includes('teams');
        } else if (selectedLocation === 'On-Campus') {
          return !v.includes('online') && !v.includes('virtual') && !v.includes('zoom') && !v.includes('meet') && !v.includes('teams');
        }
        return true;
      });
    }

    // 6. Price Filter
    if (selectedPrice !== 'All') {
      if (selectedPrice === 'Paid') {
        return [];
      }
    }

    // 7. Sort selector logic
    list.sort((a, b) => {
      // Prioritize Live status above all other parameters
      const isLiveA = a.status === 'live' ? 1 : 0;
      const isLiveB = b.status === 'live' ? 1 : 0;
      if (isLiveA !== isLiveB) {
        return isLiveB - isLiveA;
      }

      if (selectedSort === 'Newest') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (selectedSort === 'Oldest') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      if (selectedSort === 'Deadline') {
        return (a.registrationDeadline || '').localeCompare(b.registrationDeadline || '');
      }
      if (selectedSort === 'Soonest') {
        return (a.date || '').localeCompare(b.date || '');
      }
      if (selectedSort === 'Seats') {
        const seatsA = (parseInt(a.capacity) || 0) - (parseInt(a.registeredCount) || 0);
        const seatsB = (parseInt(b.capacity) || 0) - (parseInt(b.registeredCount) || 0);
        return seatsB - seatsA; // descending remaining seats
      }
      if (selectedSort === 'Alphabetical') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }, [events, searchQuery, selectedCategory, selectedStatus, selectedDate, selectedSort, selectedLocation, selectedPrice, todayStr, nextWeekStr]);

  // Load events and user metadata
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsList, regs] = await Promise.all([
        getAllEvents(),
        user?.uid ? getUserRegistrations(user.uid) : Promise.resolve([])
      ]);

      setEvents(eventsList);
      setUserRegIds(new Set(regs.map(r => r.eventId)));
    } catch (err) {
      console.error("Failed to load events discovery logs:", err);
      setError("Failed to retrieve event directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewEvent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Instant Card Registration Handler
  const handleRegister = async (eventId, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      triggerToast('error', 'You must be logged in to register.');
      return;
    }
    try {
      await registerForEvent(user.uid, eventId);
      // Immediately reflect in local state
      setUserRegIds(prev => new Set([...prev, eventId]));
      // Update events count locally without full refetch
      setEvents(prevEvents => prevEvents.map(evt => {
        if (evt.id === eventId) {
          const cap = parseInt(evt.capacity) || 0;
          const currentCount = (parseInt(evt.registeredCount) || 0) + 1;
          return {
            ...evt,
            registeredCount: currentCount,
            status: currentCount >= cap ? 'closed' : evt.status
          };
        }
        return evt;
      }));
      triggerToast('success', 'Successfully registered for this event.');
      const matchedEvent = events.find(evt => evt.id === eventId);
      trackEvent("event_registration", {
        event_id: eventId,
        event_category: matchedEvent?.category || "General",
        registration_source: "directory"
      });
    } catch (err) {
      console.error("[Events] Failed to register for event.", err);
      triggerToast('error', err.message || 'Registration transaction failed.');
    }
  };

  // Card Share Handler
  const handleShare = (eventId, eventTitle, e) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      triggerToast('success', `Copied link for "${eventTitle}" to clipboard.`);
    }).catch(() => {
      triggerToast('error', 'Clipboard access denied.');
    });
  };

  // Track page view
  useEffect(() => {
    trackEvent("archive_view");
  }, []);

  // Debounced search logging
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      trackEvent("event_search", {
        search_length: searchQuery.trim().length,
        results_count: processedEvents.length
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchQuery, processedEvents.length]);

  // Track filter selections
  const isInitialFilterMount = useRef(true);
  useEffect(() => {
    if (isInitialFilterMount.current) {
      isInitialFilterMount.current = false;
      return;
    }
    trackEvent("event_filter", {
      category: selectedCategory,
      status: selectedStatus,
      date_range: selectedDate,
      results_count: processedEvents.length
    });
  }, [selectedCategory, selectedStatus, selectedDate, processedEvents.length]);

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

  const featuredEvent = useMemo(() => {
    const upcoming = events.filter(e => e.status !== 'draft' && e.status !== 'archived' && e.date && e.date >= todayStr);
    if (upcoming.length > 0) {
      upcoming.sort((a, b) => a.date.localeCompare(b.date));
      return upcoming[0];
    }
    const publicEvents = events.filter(e => e.status !== 'draft' && e.status !== 'archived');
    if (publicEvents.length > 0) {
      publicEvents.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return publicEvents[0];
    }
    return null;
  }, [events, todayStr]);

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' ||
      selectedCategory !== 'All' ||
      selectedStatus !== 'All' ||
      selectedDate !== 'All' ||
      selectedLocation !== 'All' ||
      selectedPrice !== 'All';
  }, [searchQuery, selectedCategory, selectedStatus, selectedDate, selectedLocation, selectedPrice]);

  return (
    <PageTransition>
      <div className="landing-light-theme relative min-h-screen bg-[#F5F2EB] text-[#1a1a1a] overflow-hidden font-ui">
        {/* Grain Layer */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />

        {/* Subtle Architectural Grid Lines */}
        <div className="absolute inset-0 flex justify-between pointer-events-none z-0 px-8 md:px-16 opacity-[0.03]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-black" />
          ))}
        </div>

        {/* Warm Radial Glow */}
        <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,rgba(255,253,245,0.6)_0%,transparent_75%)]" />

        <PageContainer className="relative z-10 px-6 md:px-16 py-12 md:py-24 max-w-[1400px] mx-auto flex flex-col gap-24 bg-transparent">
          
          {/* SECTION 1: Hero */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-12 md:pt-20">
            {/* Left aligned title */}
            <div className="col-span-1 lg:col-span-8 flex flex-col items-start">
              <span className="text-[0.6rem] font-technical uppercase tracking-[0.25em] text-black/40 mb-6 block">
                ARCHIVE // VOLUME 01
              </span>
              <h1 className="text-[4rem] md:text-[6.5rem] leading-[0.92] tracking-tight text-black font-light">
                <span className="block" style={{ fontFamily: "'Instrument Serif', serif" }}>Discover</span>
                <span className="italic block" style={{ fontFamily: "'Instrument Serif', serif" }}>Exceptional</span>
                <span className="block" style={{ fontFamily: "'Instrument Serif', serif" }}>Events.</span>
              </h1>
            </div>

            {/* Right aligned Technical Metadata */}
            <div className="col-span-1 lg:col-span-4 flex flex-col items-start lg:items-end lg:text-right pb-4 gap-2 border-l lg:border-l-0 lg:border-r border-black/10 pl-6 lg:pl-0 lg:pr-6">
              <span className="text-[0.45rem] font-technical uppercase tracking-[0.2em] text-black/20">Catalog Ref.</span>
              <span className="text-xs font-technical uppercase tracking-wider text-black/70">ARC-EVT-2026</span>
              
              <span className="text-[0.45rem] font-technical uppercase tracking-[0.2em] text-black/20 mt-2">Edition</span>
              <span className="text-xs font-technical uppercase tracking-wider text-black/70">Vol. 01 Edition</span>
              
              <span className="text-[0.45rem] font-technical uppercase tracking-[0.2em] text-black/20 mt-2">Database Connection</span>
              <span className="text-xs font-technical uppercase tracking-wider text-black/70">Firestore Active</span>
            </div>
          </section>

          <div className="h-px w-full bg-black/10" />

          {/* SECTION 2: Search + Filters */}
          <section ref={filterSectionRef} className="flex flex-col gap-10">
            {/* Search Bar */}
            <div className="relative w-full max-w-4xl mx-auto">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none">
                <Search className="w-4 h-4 text-black/30" />
                <span className="w-px h-5 bg-black/15" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search events by title, category, venue..."
                className="w-full bg-white border border-black/10 rounded-full pl-16 pr-12 py-5 text-sm text-black/80 placeholder:text-black/30 focus:outline-none focus:border-black/35 transition-all duration-300 shadow-sm"
                style={{ caretColor: '#1a1a1a' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Premium Chips Filters */}
            <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
              {/* Category Filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-black/5 pb-4">
                <span className="w-24 text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30 shrink-0">Category</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={cn(
                      "px-4 py-1.5 text-[0.68rem] font-technical uppercase tracking-wider rounded-full border transition-all duration-200 cursor-pointer font-bold",
                      selectedCategory === 'All'
                        ? "bg-black text-white border-black"
                        : "bg-transparent text-black/60 border-black/10 hover:text-black hover:border-black/20"
                    )}
                  >
                    All
                  </button>
                  {CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "px-4 py-1.5 text-[0.68rem] font-technical uppercase tracking-wider rounded-full border transition-all duration-200 cursor-pointer font-bold",
                        selectedCategory === category
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-black/60 border-black/10 hover:text-black hover:border-black/20"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-black/5 pb-4">
                <span className="w-24 text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30 shrink-0">Date</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'All', label: 'Any Time' },
                    { value: 'Today', label: 'Today' },
                    { value: 'This Week', label: 'This Week' },
                    { value: 'This Month', label: 'This Month' },
                    { value: 'Upcoming', label: 'Upcoming' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedDate(opt.value)}
                      className={cn(
                        "px-4 py-1.5 text-[0.68rem] font-technical uppercase tracking-wider rounded-full border transition-all duration-200 cursor-pointer font-bold",
                        selectedDate === opt.value
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-black/60 border-black/10 hover:text-black hover:border-black/20"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-black/5 pb-4">
                <span className="w-24 text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30 shrink-0">Location</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'All', label: 'All Locations' },
                    { value: 'On-Campus', label: 'On-Campus' },
                    { value: 'Virtual', label: 'Virtual / Online' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedLocation(opt.value)}
                      className={cn(
                        "px-4 py-1.5 text-[0.68rem] font-technical uppercase tracking-wider rounded-full border transition-all duration-200 cursor-pointer font-bold",
                        selectedLocation === opt.value
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-black/60 border-black/10 hover:text-black hover:border-black/20"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-black/5 pb-4">
                <span className="w-24 text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30 shrink-0">Price</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'All', label: 'All Prices' },
                    { value: 'Free', label: 'Free' },
                    { value: 'Paid', label: 'Paid' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedPrice(opt.value)}
                      className={cn(
                        "px-4 py-1.5 text-[0.68rem] font-technical uppercase tracking-wider rounded-full border transition-all duration-200 cursor-pointer font-bold",
                        selectedPrice === opt.value
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-black/60 border-black/10 hover:text-black hover:border-black/20"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-black/5 pb-4">
                <span className="w-24 text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30 shrink-0">Status</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'All', label: 'All Statuses' },
                    { value: 'Open', label: 'Open' },
                    { value: 'Closed', label: 'Closed' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedStatus(opt.value)}
                      className={cn(
                        "px-4 py-1.5 text-[0.68rem] font-technical uppercase tracking-wider rounded-full border transition-all duration-200 cursor-pointer font-bold",
                        selectedStatus === opt.value
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-black/60 border-black/10 hover:text-black hover:border-black/20"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By Filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <span className="w-24 text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30 shrink-0">Sort By</span>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedSort(opt.value)}
                      className={cn(
                        "px-4 py-1.5 text-[0.68rem] font-technical uppercase tracking-wider rounded-full border transition-all duration-200 cursor-pointer font-bold",
                        selectedSort === opt.value
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-black/60 border-black/10 hover:text-black hover:border-black/20"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset filter button */}
              {(selectedCategory !== 'All' || selectedStatus !== 'All' || selectedDate !== 'All' || selectedSort !== 'Newest' || selectedLocation !== 'All' || selectedPrice !== 'All' || searchQuery.trim()) && (
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedStatus('All');
                      setSelectedDate('All');
                      setSelectedSort('Newest');
                      setSelectedLocation('All');
                      setSelectedPrice('All');
                    }}
                    className="flex items-center gap-1.5 text-[0.6rem] font-technical uppercase tracking-widest text-black/40 hover:text-black transition-colors duration-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </section>

          <div className="h-px w-full bg-black/10" />

          {/* SECTION 3: Featured Event */}
          {!hasActiveFilters && featuredEvent && (
            <section className="flex flex-col gap-8">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <span className="text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30">
                  Featured Event
                </span>
                <span className="text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30">
                  ARC-01 // FOCUS
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-white border border-black/10 rounded-[24px] p-6 md:p-8 overflow-hidden relative">
                {/* Subtle radial shine behind featured image */}
                <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_left,rgba(0,0,0,0.015)_0%,transparent_50%)]" />

                {/* Left side: Large Image */}
                <div
                  className="col-span-1 lg:col-span-7 overflow-hidden rounded-[16px] aspect-[16/10] bg-black/5 relative z-10 cursor-pointer"
                  onClick={() => setPreviewEvent(featuredEvent)}
                >
                  <img
                    src={resolveEventImage(featuredEvent)}
                    alt={featuredEvent.title}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                  {/* Category overlay */}
                  <span className="absolute top-4 left-4 text-[10px] font-technical uppercase tracking-widest bg-white/95 text-black/70 px-3 py-1 rounded-full border border-black/10">
                    {featuredEvent.category || "General"}
                  </span>
                </div>

                {/* Right side: Editorial text & metadata */}
                <div className="col-span-1 lg:col-span-5 flex flex-col justify-between h-full text-left relative z-10 gap-6">
                  <div className="flex flex-col gap-4">
                    <span className="text-[0.55rem] font-technical uppercase tracking-[0.2em] text-black/40">
                      Featured Volume // 01
                    </span>
                    <h2 className="text-3xl md:text-4xl font-light text-[#1A1A1A] leading-tight">
                      {featuredEvent.title}
                    </h2>
                    <p className="text-sm text-black/50 leading-relaxed font-light font-ui">
                      {featuredEvent.description || "Join us for this curated experience designed for the community."}
                    </p>
                  </div>

                  {/* Metadata list */}
                  <div className="space-y-3 border-y border-black/5 py-4 my-2">
                    <div className="flex justify-between items-center text-xs font-technical text-black/40 uppercase tracking-wider">
                      <span>Date</span>
                      <span className="text-black/80 font-ui tracking-normal">{formatDate(featuredEvent.date)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-technical text-black/40 uppercase tracking-wider">
                      <span>Location</span>
                      <span className="text-black/80 truncate max-w-[200px] font-ui tracking-normal">{featuredEvent.venue || "Main Venue"}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-technical text-black/40 uppercase tracking-wider">
                      <span>Seats</span>
                      <span className="text-black/80 font-ui tracking-normal font-light">
                        {featuredEvent.capacity || "80"} ({(parseInt(featuredEvent.registeredCount) || 0)} registered)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-technical text-black/40 uppercase tracking-wider">
                      <span>Organizer</span>
                      <span className="text-black/80 truncate max-w-[200px] font-ui tracking-normal">{featuredEvent.organizer || "NovaEvent"}</span>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-wrap gap-4 mt-2">
                    <button
                      onClick={(e) => {
                        const registered = userRegIds.has(featuredEvent.id);
                        const capacity = parseInt(featuredEvent.capacity) || 0;
                        const currentReg = parseInt(featuredEvent.registeredCount) || 0;
                        const isClosed = featuredEvent.status?.toLowerCase() === 'closed' || (capacity - currentReg) <= 0;

                        if (registered) navigate('/my-events');
                        else if (isClosed) navigate(`/events/${featuredEvent.id}`);
                        else handleRegister(featuredEvent.id, e);
                      }}
                      className={cn(
                        "flex-grow sm:flex-grow-0 px-8 py-3.5 text-xs font-technical uppercase tracking-widest rounded-full transition-all duration-200 text-center cursor-pointer font-bold",
                        userRegIds.has(featuredEvent.id)
                          ? "bg-black/10 text-black border border-black/20 hover:bg-black/20"
                          : (parseInt(featuredEvent.capacity) || 0) <= (parseInt(featuredEvent.registeredCount) || 0)
                            ? "bg-black/5 text-black/30 border border-black/5 cursor-not-allowed"
                            : "bg-black text-white border border-black hover:bg-black/90"
                      )}
                      disabled={((parseInt(featuredEvent.capacity) || 0) <= (parseInt(featuredEvent.registeredCount) || 0)) && !userRegIds.has(featuredEvent.id)}
                    >
                      {userRegIds.has(featuredEvent.id)
                        ? "Registered // View Pass"
                        : (parseInt(featuredEvent.capacity) || 0) <= (parseInt(featuredEvent.registeredCount) || 0)
                          ? "Registration Closed"
                          : "Register for Event"}
                    </button>

                    <button
                      onClick={() => navigate(`/events/${featuredEvent.id}`)}
                      className="flex-grow sm:flex-grow-0 px-8 py-3.5 text-xs font-technical uppercase tracking-widest rounded-full border border-black/10 hover:border-black/30 hover:bg-black/5 transition-all duration-200 text-center text-black/70 hover:text-black cursor-pointer font-bold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 4: Events Grid */}
          <section className="flex flex-col gap-8">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <span className="text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30">
                {hasActiveFilters ? "Search Results" : "All Archive Events"}
              </span>
              <span className="text-[0.6rem] font-technical uppercase tracking-[0.2em] text-black/30">
                Index Count // {processedEvents.length}
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-black/10 rounded-[22px] overflow-hidden aspect-[4/5] animate-pulse flex flex-col gap-4 p-5">
                    <div className="aspect-[16/10] bg-black/5 rounded-[12px] w-full" />
                    <div className="h-6 bg-black/5 w-3/4 rounded mt-2" />
                    <div className="h-4 bg-black/5 w-1/2 rounded" />
                    <div className="h-10 bg-black/5 w-full rounded mt-auto" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <PremiumEmptyState
                type="error"
                subtitle={error}
                action={() => fetchData()}
              />
            ) : processedEvents.length === 0 ? (
              searchQuery.trim() ? (
                <PremiumEmptyState
                  type="search"
                  action={() => setSearchQuery('')}
                />
              ) : (
                <PremiumEmptyState
                  type="events"
                  action={() => {
                    setSelectedCategory('All');
                    setSelectedStatus('All');
                    setSelectedDate('All');
                    setSelectedLocation('All');
                    setSelectedPrice('All');
                    setSearchQuery('');
                  }}
                />
              )
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12"
              >
                {processedEvents
                  .filter(e => hasActiveFilters || e.id !== featuredEvent?.id)
                  .map((event, idx) => {
                    const registered = userRegIds.has(event.id);
                    const capacity = parseInt(event.capacity) || 0;
                    const currentReg = parseInt(event.registeredCount) || 0;
                    const seatsRemaining = Math.max(capacity - currentReg, 0);
                    const isClosed = event.status?.toLowerCase() === 'closed' || seatsRemaining <= 0;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.05, ease: EASE }}
                      >
                        <DirectoryEventCard
                          event={event}
                          registered={registered}
                          isClosed={isClosed}
                          seatsRemaining={seatsRemaining}
                          currentReg={currentReg}
                          formatDate={formatDate}
                          getParticipationHours={getParticipationHours}
                          navigate={navigate}
                          handleRegister={handleRegister}
                          handleShare={handleShare}
                          setPreviewEvent={setPreviewEvent}
                          cardIndex={idx}
                        />
                      </motion.div>
                    );
                  })}
              </motion.div>
            )}
          </section>

          {/* SECTION 5: Editorial Statistics */}
          <section className="flex flex-col gap-8 my-12">
            <div className="h-px w-full bg-black/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 py-16 bg-transparent select-none text-left">
              {[
                { value: "120+", label: "Events Hosted" },
                { value: "98%", label: "Attendance Rate" },
                { value: "3,500+", label: "Registrations" },
                { value: "75+", label: "Organizers" }
              ].map((stat, idx) => (
                <div key={idx} className="flex flex-col gap-3">
                  <span className="text-[4rem] md:text-[5.5rem] font-light leading-none text-[#1A1A1A]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {stat.value}
                  </span>
                  <span className="text-[0.62rem] font-technical uppercase tracking-[0.25em] text-black/40">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-px w-full bg-black/10" />
          </section>

          {/* SECTION 6: Call To Action */}
          <section className="flex flex-col py-16 relative w-full items-start text-left gap-12 max-w-4xl">
            <span className="text-[0.6rem] font-technical uppercase tracking-[0.25em] text-black/40">
              NovaEvent Publishing // Vol. 01
            </span>
            <h2 className="text-4xl md:text-6xl leading-[0.95] tracking-tight font-light text-[#1A1A1A]">
              Ready to host<br className="hidden md:block"/> your next event?
            </h2>

            <div className="flex flex-wrap items-center gap-6 mt-4">
              <button
                onClick={() => navigate('/create-event')}
                className="px-10 py-4 text-xs font-technical uppercase tracking-widest rounded-full bg-black text-white border border-black hover:bg-black/90 transition-all duration-200 cursor-pointer font-bold"
              >
                Create Event
              </button>
              <button
                onClick={() => filterSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 text-xs font-technical uppercase tracking-widest rounded-full border border-black/10 hover:border-black/30 text-black/70 hover:text-black transition-all duration-200 cursor-pointer font-bold"
              >
                Browse Categories
              </button>
            </div>
          </section>

        </PageContainer>
      </div>

      {/* LIGHTWEIGHT EVENT PREVIEW MODAL */}
      <AnimatePresence>
        {previewEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewEvent(null)}
              className="absolute inset-0 bg-[#090909]/40 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
              transition={{ duration: 0.35, ease: EASE }}
              className="bg-white border border-black/10 w-full max-w-2xl h-auto z-10 rounded-[24px] shadow-[0_32px_60px_-16px_rgba(0,0,0,0.15)] relative font-ui flex flex-col md:flex-row overflow-hidden text-left"
            >
              {/* Grain Layer */}
              <div
                className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
              />

              {/* Close button */}
              <button
                type="button"
                onClick={() => setPreviewEvent(null)}
                className="absolute top-4 right-4 z-30 p-2.5 bg-white/90 border border-black/10 hover:bg-black/5 text-black/60 hover:text-black transition-colors rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Left Column: Image */}
              <div className="w-full md:w-1/2 aspect-[16/10] md:aspect-auto md:min-h-[400px] relative bg-[#111]">
                <img
                  src={resolveEventImage(previewEvent)}
                  alt={previewEvent.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Right Column: Text & Actions */}
              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between text-left relative z-20 gap-6">
                <div className="flex flex-col gap-4">
                  {/* Meta header */}
                  <div className="flex flex-wrap items-center justify-between text-[0.6rem] font-technical uppercase tracking-widest text-black/30 border-b border-black/5 pb-3">
                    <span>{previewEvent.category || "General"}</span>
                    <span>{previewEvent.status || "Open"}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-light text-black/95 leading-tight">{previewEvent.title}</h2>

                  {/* Meta list */}
                  <div className="flex flex-col gap-2.5 text-xs text-black/40 font-technical uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-black/20" />
                      <span className="font-ui tracking-normal text-black/70">{formatDate(previewEvent.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-black/20" />
                      <span className="font-ui tracking-normal text-black/70">{previewEvent.venue || "TBA"}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-black/50 leading-relaxed mt-2 line-clamp-4 font-light">
                    {previewEvent.description || "Join us for this premium event hosted by our organization."}
                  </p>
                </div>

                {/* Actions footer */}
                <div className="flex flex-col gap-3 pt-6 border-t border-black/5">
                  <div className="flex items-center justify-between text-[0.62rem] font-technical text-black/30 uppercase tracking-wider">
                    <span>Capacity Seats</span>
                    <span>
                      {Math.max((parseInt(previewEvent.capacity) || 0) - (parseInt(previewEvent.registeredCount) || 0), 0)} / {previewEvent.capacity || 0} remaining
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPreviewEvent(null);
                        navigate(`/events/${previewEvent.id}`);
                      }}
                      size="sm"
                      className="flex-grow h-11 md:h-10 rounded-full"
                    >
                      Open Details
                    </Button>
                    <Button
                      onClick={() => {
                        handleRegister(previewEvent.id);
                        setPreviewEvent(null);
                      }}
                      disabled={userRegIds.has(previewEvent.id) || (parseInt(previewEvent.capacity) || 0) <= (parseInt(previewEvent.registeredCount) || 0)}
                      size="sm"
                      className="flex-grow h-11 md:h-10 rounded-full"
                    >
                      {userRegIds.has(previewEvent.id) ? "Registered" : "Register"}
                    </Button>
                  </div>
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
            className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3 bg-white border border-black/10 rounded-full shadow-lg"
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              toast.type === 'success' ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-[0.6rem] font-technical uppercase tracking-wider text-black/40">
              {toast.type}
            </span>
            <span className="text-xs font-ui tracking-wide text-black/80">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};
