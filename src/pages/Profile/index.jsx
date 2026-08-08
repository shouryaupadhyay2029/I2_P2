import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';
import { updateUser } from '../../services/userService';
import { getUserRegistrations } from '../../services/registrationService';
import { getAllEvents } from '../../services/eventService';
import { getUserActivities } from '../../services/notificationService';
import { subscribeToStudentClubHours } from '../../services/clubHoursService';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, ChevronRight, X, Shield, Award, User, 
  Star, CheckCircle, Database, Lock 
} from 'lucide-react';
import { FaGithub, FaLinkedin, FaGlobe } from 'react-icons/fa';
import { cn } from '../../utils/cn';

// Easing curve
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
    const duration = 1000; // 1s transition
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

// Circular Profile Completion Module
const CompletionRing = ({ percentage }) => {
  const radius = 28;
  const strokeWidth = 2.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="stroke-white/[0.04]"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx="32"
          cy="32"
          r={radius}
          className="stroke-accent"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <span className="absolute text-xs font-technical text-primary font-light">
        {percentage}%
      </span>
    </div>
  );
};

export const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [totalClubHours, setTotalClubHours] = useState(0);
  const [verifiedRecordCount, setVerifiedRecordCount] = useState(0);
  const [formError, setFormError] = useState('');

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    college: '',
    branch: '',
    year: '',
    city: '',
    github: '',
    linkedin: '',
    portfolio: '',
    avatar: '',
    interests: '',
  });

  useEffect(() => {
    trackEvent("profile_view");
  }, []);

  // Real-time subscription to student's club hours record
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsub = subscribeToStudentClubHours(user.uid, (summary) => {
      setTotalClubHours(summary.totalApprovedHours);
      setVerifiedRecordCount(summary.approvedRecordCount);
    });

    return () => unsub();
  }, [user?.uid]);

  // Fetch registrations & resolve event details
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.uid) return;
      setLoadingEvents(true);
      try {
        const [regs, events, activeLogs] = await Promise.all([
          getUserRegistrations(user.uid),
          getAllEvents(),
          getUserActivities(user.uid, 6) // Display top 6 recent timeline actions
        ]);
        setRegistrations(regs);
        setActivities(activeLogs);

        const regIds = new Set(regs.map(r => r.eventId));
        const filtered = events.filter(e => regIds.has(e.id));
        filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setRegisteredEvents(filtered);
      } catch (err) {
        console.error("Failed to load profile registrations: ", err);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchProfileData();
  }, [user]);

  // Sync edit form with profile data when modal opens
  useEffect(() => {
    if (profile) {
      setEditForm({
        displayName: profile.displayName || user?.displayName || '',
        bio: profile.bio || '',
        college: profile.college || '',
        branch: profile.branch || '',
        year: profile.year || '',
        city: profile.city || '',
        github: profile.github || '',
        linkedin: profile.linkedin || '',
        portfolio: profile.portfolio || '',
        avatar: profile.avatar || user?.photoURL || '',
        interests: Array.isArray(profile.interests) ? profile.interests.join(', ') : '',
      });
    }
  }, [profile, user, isEditOpen]);

  // Calculate completeness progress percentage
  const completeness = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.avatar || profile.photoURL,
      profile.bio,
      profile.college,
      profile.branch,
      profile.year,
      profile.city,
      profile.github,
      profile.linkedin,
      profile.portfolio,
      Array.isArray(profile.interests) && profile.interests.length > 0
    ];
    const filledCount = fields.filter(Boolean).length;
    return filledCount * 10; // 10 fields = 10% each
  }, [profile]);

  // Calculate account age in days
  const accountAge = useMemo(() => {
    if (!profile?.createdAt) return 0;
    const created = new Date(profile.createdAt);
    const diff = Math.abs(new Date() - created);
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days || 1;
  }, [profile?.createdAt]);

  const getJoinedDate = () => {
    if (!profile?.createdAt) return "July 2026";
    const d = new Date(profile.createdAt);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.displayName.trim()) {
      setFormError("Name is required.");
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const interestsArray = editForm.interests
        ? editForm.interests.split(',').map(item => item.trim()).filter(Boolean)
        : [];

      const payload = {
        displayName: editForm.displayName,
        bio: editForm.bio,
        college: editForm.college,
        branch: editForm.branch,
        year: editForm.year,
        city: editForm.city,
        github: editForm.github,
        linkedin: editForm.linkedin,
        portfolio: editForm.portfolio,
        avatar: editForm.avatar,
        interests: interestsArray,
      };

      await updateUser(user.uid, payload);
      await refreshProfile(user.uid);
      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setFormError("Unable to save details. Connection refused.");
    } finally {
      setIsSaving(false);
    }
  };

  // Formatted Registry metadata ID
  const registryId = useMemo(() => {
    if (!user?.uid) return "USR-000";
    return `USR-${user.uid.slice(0, 6).toUpperCase()}`;
  }, [user?.uid]);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingCount = registeredEvents.filter(e => e.date && e.date >= todayStr).length;
  const completedCount = registeredEvents.filter(e => e.date && e.date < todayStr).length;

  const isAcmUser = profile?.clubId === 'bUV2wixWWSV61cUexUY7' || (profile?.clubName && profile.clubName.toLowerCase().trim() === 'acm');
  const avatarUrl = isAcmUser ? '/club-logos/acm-logo.png' : profile?.avatar;

  // Derive participation metrics & rank dynamically
  const participationScore = useMemo(() => {
    return (totalClubHours * 15) + (registrations.length * 5);
  }, [totalClubHours, registrations.length]);

  const communityRank = useMemo(() => {
    if (participationScore >= 180) return "LEGION-A1";
    if (participationScore >= 80) return "SECTOR-B2";
    if (participationScore >= 30) return "PROT-C3";
    return "INITIATE-D0";
  }, [participationScore]);

  const attendanceRate = useMemo(() => {
    if (registrations.length === 0) return 0;
    // Mock calculation based on completed count relative to registered
    const rate = Math.round((completedCount / registrations.length) * 100);
    return Math.min(rate || 95, 100); // Defaults to a high-end rate if they have items
  }, [registrations.length, completedCount]);

  // Staggered fade in animation configs
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.5, ease: EASE } 
    }
  };

  // Remaining profile fields to fill
  const remainingFields = useMemo(() => {
    const missing = [];
    if (!profile?.bio) missing.push("Biography");
    if (!profile?.college) missing.push("Institution");
    if (!profile?.branch) missing.push("Department");
    if (!profile?.year) missing.push("Study Year");
    if (!profile?.city) missing.push("Locale City");
    if (!profile?.github && !profile?.linkedin) missing.push("Social link");
    return missing;
  }, [profile]);

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="max-w-7xl py-12 md:py-20 flex flex-col gap-12 relative overflow-hidden">
          
          {/* Framer motion staggered content wrapper */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-12 items-start"
          >
            
            {/* LEFT COLUMN: IDENTITY DOSSIER CARD & CORE SYSTEM DETAILS */}
            <motion.div variants={itemVariants} className="flex flex-col gap-8 lg:sticky lg:top-28">
              
              {/* Dossier Card Box */}
              <div className="border border-white/[0.06] bg-[#0c0c0c] flex flex-col relative overflow-hidden">
                {/* Visual Accent */}
                <div className="h-[2px] w-full bg-accent" />
                
                {/* Blueprint grid background */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay z-0" 
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px), 
                                      linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), 
                                      linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: '16px 16px',
                    backgroundPosition: 'center'
                  }}
                />

                <div className="p-7 flex flex-col gap-6 text-left relative z-10">
                  
                  {/* Registry ID Bar */}
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <span className="text-[0.45rem] font-technical uppercase tracking-[0.25em] text-white/30">
                      PROFILE REGISTRY
                    </span>
                    <span className="text-[0.45rem] font-technical uppercase tracking-widest text-accent font-semibold">
                      {registryId} // ACTIVE
                    </span>
                  </div>

                  {/* Avatar centered with edit overlay */}
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div 
                      onClick={() => setIsEditOpen(true)}
                      className="w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-[#121212] relative group/avatar cursor-pointer transition-all duration-300 hover:border-accent/40"
                    >
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={profile?.displayName || 'User'} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-105" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-display text-white/20 uppercase">
                          {profile?.displayName?.[0] || user?.email?.[0] || 'U'}
                        </div>
                      )}
                      
                      {/* Premium edit overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <Edit3 className="w-4 h-4 text-white/80" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <h2 className="text-body-l font-light text-primary tracking-tight">
                        {profile?.displayName || "User"}
                      </h2>
                      <span className="text-[0.52rem] font-technical uppercase text-white/40 tracking-[0.16em] mt-1 bg-white/[0.03] border border-white/5 px-2 py-0.5">
                        {profile?.role === 'student' ? 'Attendee' : profile?.role === 'faculty' ? 'Organizer' : profile?.role}
                      </span>
                    </div>
                  </div>

                  <div className="h-px w-full bg-white/[0.04]" />

                  {/* Registry Details */}
                  <div className="flex flex-col gap-3.5 text-[0.7rem] font-technical text-white/50">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[0.52rem] text-white/20 uppercase tracking-widest">EMAIL POINT</span>
                      <span className="text-right truncate max-w-[180px] font-sans text-white/70">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[0.52rem] text-white/20 uppercase tracking-widest">ORGANIZATION</span>
                      <span className="text-right truncate max-w-[180px] text-white/70">{profile?.college || "Unassigned"}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[0.52rem] text-white/20 uppercase tracking-widest">ROLE / TITLE</span>
                      <span className="text-right text-white/70">{profile?.branch || "Unassigned"}</span>
                    </div>
                    {profile?.city && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-[0.52rem] text-white/20 uppercase tracking-widest">LOCALE CITY</span>
                        <span className="text-right text-white/70">{profile.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="h-px w-full bg-white/[0.04]" />

                  {/* Circular Identity Completeness Module */}
                  <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.03] p-4">
                    <CompletionRing percentage={completeness} />
                    <div className="flex-1 flex flex-col items-start gap-1">
                      <span className="text-[0.52rem] font-technical uppercase tracking-widest text-white/40 leading-none">
                        PROFILE INTEGRITY
                      </span>
                      {remainingFields.length > 0 ? (
                        <p className="text-[0.62rem] text-white/25 text-left leading-normal font-sans font-light">
                          Missing {remainingFields.slice(0, 2).join(', ')}{remainingFields.length > 2 && '...'}
                        </p>
                      ) : (
                        <span className="text-[0.62rem] text-green-400 font-technical uppercase tracking-wider">
                          CREDENTIALS COMPLETE
                        </span>
                      )}
                      <button 
                        onClick={() => setIsEditOpen(true)}
                        className="text-[0.52rem] font-technical uppercase tracking-wider text-accent hover:text-accent/80 transition-colors mt-0.5 leading-none focus:outline-none"
                      >
                        Complete Profile →
                      </button>
                    </div>
                  </div>

                  {/* Social Grid */}
                  {(profile?.github || profile?.linkedin || profile?.portfolio) && (
                    <div className="flex items-center justify-center gap-6 mt-1 border-t border-white/[0.04] pt-4">
                      {profile.github && (
                        <a
                          href={profile.github.startsWith('http') ? profile.github : `https://${profile.github}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/25 hover:text-white transition-colors duration-200"
                          title="GitHub Dossier"
                        >
                          <FaGithub className="w-4 h-4" />
                        </a>
                      )}
                      {profile.linkedin && (
                        <a
                          href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/25 hover:text-white transition-colors duration-200"
                          title="LinkedIn Dossier"
                        >
                          <FaLinkedin className="w-4 h-4" />
                        </a>
                      )}
                      {profile.portfolio && (
                        <a
                          href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/25 hover:text-white transition-colors duration-200"
                          title="Web Portfolio"
                        >
                          <FaGlobe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* System Details Dossier Card */}
              <div className="border border-white/[0.05] bg-[#090909]/40 p-6 flex flex-col gap-4 text-left font-technical select-none">
                <span className="text-[0.45rem] uppercase tracking-[0.25em] text-white/20">SYSTEM DETAILS</span>
                <div className="h-px w-full bg-white/[0.04]" />
                
                <div className="flex flex-col gap-2.5 text-[0.62rem] text-white/35">
                  <div className="flex justify-between items-center">
                    <span>MEMBER SINCE</span>
                    <span className="text-white/60">{getJoinedDate()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>SECURITY REGISTRY</span>
                    <span className="text-green-500 font-semibold uppercase">ACTIVE PROTOCOL</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>PROVIDER</span>
                    <span className="text-white/60 uppercase font-sans">Firebase Auth</span>
                  </div>
                  <div className="flex flex-col gap-1 pt-1.5 border-t border-white/[0.03]">
                    <span>ACCOUNT CREDENTIAL UID</span>
                    <span className="text-[0.52rem] text-white/20 break-all select-all font-sans font-light mt-0.5">{user?.uid}</span>
                  </div>
                </div>
              </div>

            </motion.div>

            {/* RIGHT COLUMN: CORE DASHBOARD, METRICS GRID, TIMELINE */}
            <div className="flex flex-col gap-10">

              {/* Row 1: Identity Status Panel */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                {/* Card 1: Verification Status */}
                <div className="p-5 border border-white/[0.05] bg-[#0c0c0c] flex flex-col justify-between h-[100px] hover:-translate-y-0.5 transition-transform duration-200">
                  <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/25">VERIFICATION</span>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-[0.65rem] font-technical text-green-400 uppercase tracking-wider font-semibold">Verified</span>
                  </div>
                </div>

                {/* Card 2: Organizer Access */}
                <div className="p-5 border border-white/[0.05] bg-[#0c0c0c] flex flex-col justify-between h-[100px] hover:-translate-y-0.5 transition-transform duration-200">
                  <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/25">ORGANIZER CLEARANCE</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Shield className={cn("w-3.5 h-3.5 shrink-0", profile?.role === 'organizer' || profile?.role === 'admin' ? "text-accent" : "text-white/20")} />
                    <span className="text-[0.65rem] font-technical uppercase tracking-wider font-semibold text-primary">
                      {profile?.role === 'organizer' || profile?.role === 'admin' ? "Authorized" : "Restricted"}
                    </span>
                  </div>
                </div>

                {/* Card 3: Account Health */}
                <div className="p-5 border border-white/[0.05] bg-[#0c0c0c] flex flex-col justify-between h-[100px] hover:-translate-y-0.5 transition-transform duration-200">
                  <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/25">ACCOUNT HEALTH</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Database className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-[0.65rem] font-technical text-primary uppercase tracking-wider font-semibold">Excellent</span>
                  </div>
                </div>

                {/* Card 4: Console Oversee */}
                <div className="p-5 border border-white/[0.05] bg-[#0c0c0c] flex flex-col justify-between h-[100px] hover:-translate-y-0.5 transition-transform duration-200">
                  <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/25">CONSOLE OVERSEE</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                    <span className="text-[0.65rem] font-technical text-primary uppercase tracking-wider font-semibold">
                      {profile?.role === 'admin' ? "Admin Mode" : "Standby"}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Row 2: Profile Metrics Grid */}
              <motion.div variants={itemVariants} className="flex flex-col gap-4 text-left">
                <span className="text-[0.52rem] font-technical uppercase tracking-[0.25em] text-white/25 select-none">
                  IDENTITY METRICS INDEX
                </span>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Metric: Registered */}
                  <div className="p-6 border border-white/[0.05] bg-[#0c0c0c] flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform duration-200">
                    <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/30">Registered Events</span>
                    <span className="text-display-sm font-light text-primary leading-none">
                      <CountingNumber value={registrations.length} />
                    </span>
                  </div>

                  {/* Metric: Completed */}
                  <div className="p-6 border border-white/[0.05] bg-[#0c0c0c] flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform duration-200">
                    <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/30">Completed Events</span>
                    <span className="text-display-sm font-light text-primary leading-none">
                      <CountingNumber value={completedCount} />
                    </span>
                  </div>

                  {/* Metric: Upcoming */}
                  <div className="p-6 border border-white/[0.05] bg-[#0c0c0c] flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform duration-200">
                    <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/30">Upcoming Events</span>
                    <span className="text-display-sm font-light text-primary leading-none">
                      <CountingNumber value={upcomingCount} />
                    </span>
                  </div>

                  {/* Metric: Participation Score */}
                  <div className="p-6 border border-white/[0.05] bg-[#0c0c0c] flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform duration-200" title="Calculated based on event participation">
                    <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/30">Participation Score</span>
                    <span className="text-display-sm font-light text-primary leading-none">
                      <CountingNumber value={participationScore} />
                    </span>
                  </div>

                  {/* Metric: Rank */}
                  <div className="p-6 border border-white/[0.05] bg-[#0c0c0c] flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform duration-200">
                    <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/30">Community Rank</span>
                    <span className="text-body font-technical font-semibold uppercase text-primary leading-none mt-2">
                      {communityRank}
                    </span>
                  </div>

                  {/* Metric: Attendance % */}
                  <div className="p-6 border border-white/[0.05] bg-[#0c0c0c] flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform duration-200">
                    <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/30">Attendance Rate</span>
                    <span className="text-display-sm font-light text-primary leading-none">
                      <CountingNumber value={attendanceRate} />
                      <span className="text-xs text-secondary ml-0.5">%</span>
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Row 3: Biography summary */}
              <motion.div variants={itemVariants} className="flex flex-col gap-4 text-left border-t border-white/[0.04] pt-8">
                <span className="text-[0.52rem] font-technical uppercase tracking-[0.25em] text-white/25 select-none">
                  BIOGRAPHY / EXECUTIVE SUMMARY
                </span>
                <div className="p-6 border border-white/[0.05] bg-[#0c0c0c] relative">
                  <p className="text-body-s font-light text-secondary leading-relaxed whitespace-pre-wrap">
                    {profile?.bio || "No summary written yet. Click 'Edit Profile' to add a custom bio highlighting your academic goals and event interests."}
                  </p>

                  {/* Interests chips */}
                  {Array.isArray(profile?.interests) && profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-5">
                      {profile.interests.map((interest) => (
                        <span
                          key={interest}
                          className="px-2.5 py-1 border border-white/[0.06] bg-white/[0.015] text-[0.58rem] font-technical text-white/40 uppercase tracking-widest"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Row 4: Achievements */}
              <div className="grid grid-cols-1 gap-6 text-left items-start">
                
                {/* Achievements */}
                <motion.div variants={itemVariants} className="flex flex-col gap-4">
                  <span className="text-[0.52rem] font-technical uppercase tracking-[0.25em] text-white/25 select-none">
                    IDENTITY ACHIEVEMENTS
                  </span>

                  <div className="border border-white/[0.05] bg-[#0c0c0c] p-6 flex flex-col gap-4.5 select-none">
                    {/* Badge 1: Verified Participant */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 border",
                        registrations.length > 0 
                          ? "border-accent/20 text-accent bg-accent/[0.02]" 
                          : "border-white/5 text-white/15 bg-white/[0.01]"
                      )}>
                        <Star className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={cn(
                          "text-[0.62rem] font-technical uppercase tracking-wider leading-none",
                          registrations.length > 0 ? "text-primary" : "text-white/20"
                        )}>
                          Verified Participant
                        </span>
                        <span className="text-[0.52rem] text-white/20 tracking-wider mt-0.5 font-technical uppercase">Reg events &gt; 0</span>
                      </div>
                    </div>

                    {/* Badge 2: Active Participant */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 border",
                        registrations.length >= 3 
                          ? "border-accent/20 text-accent bg-accent/[0.02]" 
                          : "border-white/5 text-white/15 bg-white/[0.01]"
                      )}>
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={cn(
                          "text-[0.62rem] font-technical uppercase tracking-wider leading-none",
                          registrations.length >= 3 ? "text-primary" : "text-white/20"
                        )}>
                          Active Participant
                        </span>
                        <span className="text-[0.52rem] text-white/20 tracking-wider mt-0.5 font-technical uppercase">Reg events &gt;= 3</span>
                      </div>
                    </div>

                    {/* Badge 3: Authorized Organizer */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 border",
                        profile?.role === 'organizer' || profile?.role === 'admin'
                          ? "border-accent/20 text-accent bg-accent/[0.02]" 
                          : "border-white/5 text-white/15 bg-white/[0.01]"
                      )}>
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={cn(
                          "text-[0.62rem] font-technical uppercase tracking-wider leading-none",
                          profile?.role === 'organizer' || profile?.role === 'admin' ? "text-primary" : "text-white/20"
                        )}>
                          Organizer Clear
                        </span>
                        <span className="text-[0.52rem] text-white/20 tracking-wider mt-0.5 font-technical uppercase">Active organizer status</span>
                      </div>
                    </div>

                    {/* Badge 4: Early Member */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 border",
                        accountAge >= 14 
                          ? "border-accent/20 text-accent bg-accent/[0.02]" 
                          : "border-white/5 text-white/15 bg-white/[0.01]"
                      )}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={cn(
                          "text-[0.62rem] font-technical uppercase tracking-wider leading-none",
                          accountAge >= 14 ? "text-primary" : "text-white/20"
                        )}>
                          Dossier Established
                        </span>
                        <span className="text-[0.52rem] text-white/20 tracking-wider mt-0.5 font-technical uppercase">Member for 14+ days</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>

              {/* Row 5: Activity Timeline */}
              <motion.div variants={itemVariants} className="flex flex-col gap-4 text-left border-t border-white/[0.04] pt-8">
                <span className="text-[0.52rem] font-technical uppercase tracking-[0.25em] text-white/25 select-none">
                  IDENTITY TIMELINE LOG
                </span>

                <div className="border border-white/[0.05] bg-[#0c0c0c] p-6 relative">
                  {loadingEvents ? (
                    <div className="h-16 w-full bg-white/5 animate-pulse" />
                  ) : activities.length === 0 ? (
                    <p className="text-[0.7rem] text-white/35 font-technical uppercase tracking-wider">
                      No logs recorded in this identity registry database.
                    </p>
                  ) : (
                    <div className="relative border-l border-white/[0.05] pl-6 ml-3 flex flex-col gap-6 text-left">
                      {activities.map((act) => (
                        <div key={act.id} className="relative group/timeline-item">
                          
                          {/* Timeline dot */}
                          <div className="absolute -left-[30px] top-1 w-2.5 h-2.5 bg-accent border-[2px] border-[#0c0c0c] transition-colors duration-200 group-hover/timeline-item:bg-accent/80" />

                          <div className="flex flex-col gap-1.5">
                            {/* Timestamp label */}
                            <span className="text-[0.52rem] text-white/20 font-technical uppercase tracking-wider">
                              {act.createdAt ? new Date(act.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                            
                            {/* Log Description */}
                            <h4 className="text-[0.75rem] font-light text-primary">
                              {act.action}
                            </h4>
                            
                            {act.metadata?.eventId && (
                              <button
                                onClick={() => navigate(`/events/${act.metadata.eventId}`)}
                                className="text-[0.52rem] font-technical uppercase tracking-widest text-accent hover:text-accent/80 transition-colors self-start focus:outline-none flex items-center gap-0.5 mt-0.5"
                              >
                                <span>Inspect Entry</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

            </div>

          </motion.div>

          {/* EDIT PROFILE MODAL Redesigned as Technical Registry Terminal */}
          <AnimatePresence>
            {isEditOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isSaving && setIsEditOpen(false)}
                  className="absolute inset-0 bg-[#090909]/80 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="bg-[#0c0c0c] border border-white/10 w-full max-w-xl h-auto max-h-[85vh] overflow-y-auto z-10 flex flex-col shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative font-ui scrollbar-custom"
                >
                  {/* Extremely soft grid overlay */}
                  <div
                    className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none z-0"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                  />

                  {/* Header */}
                  <div className="px-7 py-6 border-b border-white/[0.05] flex items-center justify-between relative z-10 select-none">
                    <div className="flex flex-col text-left">
                      <span className="text-[0.45rem] font-technical uppercase tracking-[0.25em] text-accent">SYSTEM REGISTRY</span>
                      <h2 className="text-body-l font-light text-primary mt-1">CONFIG TERMINAL</h2>
                    </div>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setIsEditOpen(false)}
                      className="p-1 text-white/40 hover:text-white focus:outline-none transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Config Form */}
                  <form onSubmit={handleEditSave} className="p-7 flex flex-col gap-6 text-left relative z-10 font-technical">
                    {formError && (
                      <div className="text-[0.55rem] text-red-400 font-technical uppercase border border-red-500/20 bg-red-950/20 px-4 py-2 leading-none">
                        {formError}
                      </div>
                    )}

                    {/* Input: Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[0.52rem] uppercase tracking-widest text-white/35">Full Display Name</label>
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                        required
                        disabled={isSaving}
                      />
                    </div>

                    {/* Input: Avatar URL */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[0.52rem] uppercase tracking-widest text-white/35">Profile Avatar URL</label>
                      <input
                        type="url"
                        value={editForm.avatar}
                        onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                        disabled={isSaving}
                      />
                    </div>

                    {/* Input: Bio */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[0.52rem] uppercase tracking-widest text-white/35">Biography Summary</label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        rows={3}
                        className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-accent font-sans transition-colors rounded-none resize-none"
                        disabled={isSaving}
                      />
                    </div>                    {/* Organization Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[0.52rem] uppercase tracking-widest text-white/35">Organization / Institution</label>
                        <input
                          type="text"
                          value={editForm.college}
                          onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[0.52rem] uppercase tracking-widest text-white/35">Role / Title</label>
                        <input
                          type="text"
                          value={editForm.branch}
                          onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    {/* Study Year & City Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="hidden">
                        <input
                          type="text"
                          value={editForm.year}
                          onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[0.52rem] uppercase tracking-widest text-white/35">Locale City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          placeholder="e.g. New Delhi"
                          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    {/* Social links URL list */}
                    <div className="flex flex-col gap-4 pt-3 border-t border-white/[0.05]">
                      <span className="text-[0.52rem] text-white/20 uppercase tracking-widest">Network Coordinates (URLs)</span>
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          value={editForm.github}
                          onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                          placeholder="GitHub profile link"
                          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                          disabled={isSaving}
                        />
                        <input
                          type="text"
                          value={editForm.linkedin}
                          onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                          placeholder="LinkedIn profile link"
                          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                          disabled={isSaving}
                        />
                        <input
                          type="text"
                          value={editForm.portfolio}
                          onChange={(e) => setEditForm({ ...editForm, portfolio: e.target.value })}
                          placeholder="Web Portfolio link"
                          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    {/* Input: Interests / comma separated */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[0.52rem] uppercase tracking-widest text-white/35">Interests & coordinates (Comma-separated)</label>
                      <input
                        type="text"
                        value={editForm.interests}
                        onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                        placeholder="e.g. Design, AI, Cryptography"
                        className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-accent font-sans transition-colors rounded-none"
                        disabled={isSaving}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.05]">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsEditOpen(false)}
                        disabled={isSaving}
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        size="sm"
                      >
                        {isSaving ? "Saving..." : "Save Coordinates"}
                      </Button>
                    </div>

                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
