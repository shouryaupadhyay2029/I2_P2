import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  subscribeToFacultySubmissions, 
  subscribeToSubmissionAndAllocations,
  approveSubmission, 
  returnSubmission,
  getSubmissionAuditTrail
} from '../../services/clubHoursService';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { PremiumEmptyState } from '../../components/ui/PremiumEmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertTriangle, Info
} from 'lucide-react';

export const FacultyVerificationDesk = () => {
  const { profile } = useAuth();
  
  // Lists States
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [returnedSubmissions, setReturnedSubmissions] = useState([]);
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Active Review State
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [reviewAllocations, setReviewAllocations] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Return workflow state
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Filter tab state: "pending" | "history"
  const [activeTab, setActiveTab] = useState('pending');

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const role = (profile?.role || 'student').toLowerCase().trim();
  const isAdmin = role === 'admin';
  const assignedClubs = useMemo(() => profile?.assignedClubIds || [], [profile]);
  const hasNoScope = !isAdmin && assignedClubs.length === 0;

  // Subscribe to submissions matching the clubs
  useEffect(() => {
    if (hasNoScope) {
      setLoading(false);
    }
  }, [hasNoScope]);

  // Dynamic loading of all clubs to map IDs to Names
  const [clubsList, setClubsList] = useState([]);
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const { getDocs, collection } = await import('firebase/firestore');
        const { db } = await import('../../firebase/firestore');
        const snap = await getDocs(collection(db, "clubs"));
        const list = snap.docs.map(doc => doc.data());
        setClubsList(list);
      } catch (e) {
        console.error("Failed to load clubs list:", e);
      }
    };
    fetchClubs();
  }, []);

  const adminClubIds = useMemo(() => {
    return clubsList.map(c => c.clubId);
  }, [clubsList]);

  const targetClubIds = useMemo(() => {
    if (isAdmin) return adminClubIds;
    return assignedClubs;
  }, [isAdmin, adminClubIds, assignedClubs]);

  // Real-time subscriptions
  useEffect(() => {
    if (targetClubIds.length === 0) {
      if (!loading && targetClubIds.length === 0 && (isAdmin && adminClubIds.length > 0)) {
        setLoading(false);
      }
      return;
    }

    const unsubPending = subscribeToFacultySubmissions(targetClubIds, "pending_faculty", (list) => {
      setPendingSubmissions(list);
      setLoading(false);
    });

    const unsubReturned = subscribeToFacultySubmissions(targetClubIds, "returned", (list) => {
      setReturnedSubmissions(list);
    });

    const unsubApproved = subscribeToFacultySubmissions(targetClubIds, "approved", (list) => {
      setApprovedSubmissions(list);
    });

    return () => {
      unsubPending();
      unsubReturned();
      unsubApproved();
    };
  }, [targetClubIds, isAdmin, adminClubIds.length, loading]);

  // Load allocations and audit trail for active submission review
  useEffect(() => {
    if (!activeSubmission) {
      setReviewAllocations([]);
      setAuditTrail([]);
      setErrorText('');
      return;
    }

    const unsub = subscribeToSubmissionAndAllocations(activeSubmission.eventId, ({ allocations }) => {
      setReviewAllocations(allocations);
    });

    getSubmissionAuditTrail(activeSubmission.eventId).then(trail => {
      setAuditTrail(trail);
    });

    return () => unsub();
  }, [activeSubmission]);

  // Actions
  const handleApprove = async () => {
    if (!activeSubmission) return;
    setProcessingAction(true);
    setErrorText('');

    try {
      const result = await approveSubmission(activeSubmission.eventId);
      if (result?.alreadyApproved) {
        triggerToast('success', "This submission has already been approved.");
      } else {
        triggerToast('success', "Submission approved and club hours ledger entries created.");
      }
      setActiveSubmission(null);
    } catch (e) {
      console.error("Approval transaction failed:", e);
      // Map error codes to user-friendly copy
      const msg = e.message || '';
      if (msg.includes('CONCURRENT_APPROVAL')) {
        setErrorText("CONCURRENT APPROVAL: This submission was verified by another authorized faculty member.");
      } else if (msg.includes('ATTENDANCE_CHANGED')) {
        setErrorText("ATTENDANCE CHANGED: One or more allocations no longer match verified present attendance.");
      } else if (msg.includes('INVALID_ALLOCATION')) {
        setErrorText("INVALID ALLOCATION: This submission contains an invalid club credit allocation.");
      } else if (msg.includes('AUTHORITY_REMOVED')) {
        setErrorText("AUTHORITY REMOVED: Your verification authority for this club is no longer active.");
      } else {
        setErrorText(e.message || "Failed to approve allocations.");
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReturn = async (e) => {
    if (e) e.preventDefault();
    if (!activeSubmission) return;

    const reason = returnReason.trim();
    if (reason.length < 10) {
      setErrorText("Return reason must be at least 10 characters long.");
      return;
    }
    if (reason.length > 500) {
      setErrorText("Return reason cannot exceed 500 characters.");
      return;
    }

    setProcessingAction(true);
    setErrorText('');

    try {
      await returnSubmission(activeSubmission.eventId, reason);
      triggerToast('success', "Submission returned to organizer for correction.");
      setShowReturnConfirm(false);
      setReturnReason('');
      setActiveSubmission(null);
    } catch (e) {
      console.error("Return failed:", e);
      const msg = e.message || '';
      if (msg.includes('AUTHORITY_REMOVED')) {
        setErrorText("AUTHORITY REMOVED: Your verification authority for this club is no longer active.");
      } else {
        setErrorText(e.message || "Failed to return submission.");
      }
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="max-w-7xl py-12 md:py-20 flex flex-col gap-12 text-left relative font-ui">
          
          {/* Grain Overlay */}
          <div
            className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
          />

          {/* HEADER BAR */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="flex flex-col gap-4">
              <AxisMarker index="06" label="Faculty Review Desk" />
              <h1 className="text-display-lg font-light tracking-tight mt-2 text-primary">Verification Desk</h1>
              <p className="text-body-m text-secondary max-w-xl font-light">
                Review attendance-backed club credit submissions from student organizers.
              </p>
            </div>
          </div>

          {/* STATS OVERVIEW BAR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-white/5 relative z-10 select-none">
            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Pending Review</span>
              <span className="text-display-md font-light text-accent">{pendingSubmissions.length}</span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Requires Action</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Assigned Clubs</span>
              <span className="text-display-md font-light text-primary">
                {isAdmin ? "ALL" : assignedClubs.length}
              </span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Authorized Scope</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Verified</span>
              <span className="text-display-md font-light text-green-400">{approvedSubmissions.length}</span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Approved Events</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Returned</span>
              <span className="text-display-md font-light text-primary">{returnedSubmissions.length}</span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Pending Corrections</span>
            </div>
          </div>

          {/* AUTHORITY REMOVED WARNING */}
          {hasNoScope && (
            <div className="p-8 border border-red-500/20 bg-red-950/5 text-center relative z-10">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" strokeWidth={1.2} />
              <h3 className="text-body-m font-technical uppercase text-red-400 tracking-wider">No Assigned Clubs</h3>
              <p className="text-xs text-white/40 max-w-md mx-auto mt-2 leading-relaxed font-light">
                You are not currently assigned to a club verification scope. Contact an administrator to link your account to club verification roles.
              </p>
            </div>
          )}

          {!hasNoScope && (
            <div className="flex flex-col gap-8 relative z-10">
              
              {/* VERIFICATION SCOPE PANEL */}
              <div className="p-6 border border-white/5 bg-[#141414]/15 relative z-10 flex flex-col gap-2 font-ui select-none text-left animate-fadeIn">
                <span className="text-[10px] font-technical uppercase tracking-wider text-white/30">Verification Scope</span>
                {isAdmin ? (
                  <span className="text-xs text-accent font-technical uppercase tracking-wide">
                    GLOBAL ACCESS // ALL UNIVERSITY CLUBS AUTHORIZED
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2.5 mt-1">
                    {assignedClubs.map(cid => {
                      const clubObj = clubsList.find(c => c.clubId === cid);
                      const displayName = clubObj ? (clubObj.shortName || clubObj.name) : cid;
                      return (
                        <span 
                          key={cid} 
                          className="px-2.5 py-1 text-[10px] font-technical uppercase tracking-wider border border-accent/20 bg-accent/5 text-accent"
                          title={clubObj?.name || cid}
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                )}
                <span className="text-[9px] text-white/20 font-mono mt-1 uppercase">
                  {isAdmin ? "Global Administrator Coverage" : `${assignedClubs.length} Active Scope Assigned`}
                </span>
              </div>

              {/* TABS HEADER */}
              <div className="flex border-b border-white/5 text-xs font-technical uppercase tracking-wider select-none">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={cn(
                    "px-6 py-3 border-b-2 transition-all",
                    activeTab === 'pending'
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-white/40 hover:text-white"
                  )}
                >
                  Pending Submissions ({pendingSubmissions.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "px-6 py-3 border-b-2 transition-all",
                    activeTab === 'history'
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-white/40 hover:text-white"
                  )}
                >
                  Review History ({returnedSubmissions.length + approvedSubmissions.length})
                </button>
              </div>

              {/* TABS CONTENT */}
              {activeTab === 'pending' ? (
                <div className="flex flex-col gap-6">
                  {pendingSubmissions.length === 0 ? (
                    <PremiumEmptyState 
                      type="faculty"
                    />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {pendingSubmissions.map((sub) => {
                        return (
                          <div 
                            key={sub.eventId} 
                            className="p-6 border border-white/5 bg-[#111]/10 hover:bg-[#111]/20 transition-all flex flex-col gap-6 text-left"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-technical text-accent uppercase tracking-widest">{sub.clubName}</span>
                                <h3 className="text-body-l font-light text-primary mt-1">{sub.eventTitle}</h3>
                              </div>
                              <span className="text-[9px] font-technical uppercase text-orange-400 border border-orange-500/20 bg-orange-950/10 px-2 py-0.5">
                                PENDING REVIEW
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5 text-[11px] font-technical uppercase text-white/40">
                              <div className="flex flex-col gap-0.5">
                                <span>Submitted By</span>
                                <span className="text-primary font-ui lowercase mt-0.5 text-xs">organizer</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span>Submitted At</span>
                                <span className="text-primary mt-0.5">
                                  {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span>Standard Hours</span>
                                <span className="text-primary mt-0.5">{sub.standardParticipationHours} HRS</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span>Student Count</span>
                                <span className="text-primary mt-0.5">{sub.totalSubmittedStudents} Present</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mt-2">
                              {/* Override Indicator */}
                              <div className="flex items-center gap-1.5 text-[10px] font-technical uppercase tracking-wider text-accent">
                                <Info className="w-3.5 h-3.5" />
                                <span>Review Required</span>
                              </div>

                              <Button
                                onClick={() => setActiveSubmission(sub)}
                                className="text-[9px] font-technical uppercase tracking-widest px-4 py-2"
                                size="sm"
                              >
                                Review Submission
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // HISTORY TAB
                <div className="flex flex-col gap-6">
                  {returnedSubmissions.length === 0 && approvedSubmissions.length === 0 ? (
                    <PremiumEmptyState 
                      type="archive"
                    />
                  ) : (
                    <div className="flex flex-col border border-white/5 divide-y divide-white/5">
                      {/* Header row */}
                      <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-white/[0.01] text-micro font-technical uppercase tracking-wider text-white/30 select-none">
                        <span className="w-[30%]">Event Details</span>
                        <span className="w-[20%]">Club</span>
                        <span className="w-[15%]">Credits / Qty</span>
                        <span className="w-[15%]">Updated Date</span>
                        <span className="w-[20%] text-right">Verification State</span>
                      </div>

                      {[...returnedSubmissions, ...approvedSubmissions].map((sub) => (
                        <div key={sub.eventId} className="flex flex-col lg:flex-row lg:items-center justify-between p-6 hover:bg-white/[0.01] gap-4 lg:gap-0 font-ui text-left">
                          <div className="w-full lg:w-[30%] flex flex-col gap-0.5">
                            <span className="text-body-s font-light text-primary">{sub.eventTitle}</span>
                            <span className="text-[10px] text-white/20 font-technical uppercase">{sub.eventId}</span>
                          </div>

                          <span className="w-full lg:w-[20%] text-xs text-white/50 font-light truncate">{sub.clubName}</span>

                          <div className="w-full lg:w-[15%] flex flex-col text-xs text-white/40 font-technical uppercase">
                            <span className="text-primary">{sub.standardParticipationHours} HRS standard</span>
                            <span>{sub.totalSubmittedStudents} allocations</span>
                          </div>

                          <span className="w-full lg:w-[15%] text-xs text-white/30 font-technical uppercase">
                            {new Date(sub.updatedAt || sub.createdAt).toLocaleDateString()}
                          </span>

                          <div className="w-full lg:w-[20%] flex items-center justify-start lg:justify-end">
                            {sub.status === "approved" ? (
                              <span className="text-[9px] font-technical uppercase tracking-wider text-green-400 bg-green-950/20 border border-green-500/20 px-2 py-1 leading-none select-none">
                                Verified
                              </span>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[9px] font-technical uppercase tracking-wider text-red-400 bg-red-950/20 border border-red-500/20 px-2 py-1 leading-none select-none">
                                  Returned
                                </span>
                                <span className="text-[8px] text-white/30 max-w-[150px] truncate block" title={sub.returnReason}>
                                  {sub.returnReason}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE SUBMISSION REVIEW MODAL/PANEL */}
          <AnimatePresence>
            {activeSubmission && (
              <div className="fixed inset-0 z-50 flex items-center justify-end p-0">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !processingAction && setActiveSubmission(null)}
                  className="absolute inset-0 bg-[#090909]/80 backdrop-blur-sm"
                />

                {/* Sidebar Drawer */}
                <motion.div
                  initial={{ x: "100%", filter: "blur(8px)" }}
                  animate={{ x: 0, filter: "blur(0px)" }}
                  exit={{ x: "100%", filter: "blur(8px)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 40 }}
                  className="bg-[#0f0f0f] border-l border-white/10 w-full max-w-2xl h-screen z-10 flex flex-col justify-between relative shadow-[0_32px_60px_-16px_rgba(0,0,0,0.8)]"
                >
                  {/* Grain Layer */}
                  <div
                    className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                  />

                  {/* Top Bar Header */}
                  <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between shrink-0 select-none relative z-10">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[0.55rem] font-technical uppercase tracking-[0.2em] text-accent">Review // Pipeline Document</span>
                      <h3 className="text-body-m font-light text-primary mt-0.5">Verify Student Allocations</h3>
                    </div>
                    <button
                      type="button"
                      disabled={processingAction}
                      onClick={() => setActiveSubmission(null)}
                      className="p-1 text-white/40 hover:text-white transition-colors focus:outline-none"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Main Scroll Content */}
                  <div className="flex-grow overflow-y-auto px-8 py-8 flex flex-col gap-8 text-left relative z-10">
                    
                    {/* Error Box display */}
                    {errorText && (
                      <div className="p-4 border border-red-500/20 bg-red-950/20 text-xs font-technical uppercase text-red-400">
                        {errorText}
                      </div>
                    )}

                    {/* Metadata summary */}
                    <div className="flex flex-col gap-4 p-5 bg-white/[0.01] border border-white/5">
                      <h4 className="text-[10px] font-technical uppercase tracking-widest text-white/30">Event Configuration Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-2 text-[11px] font-technical uppercase text-white/40">
                        <div className="flex flex-col gap-0.5">
                          <span>Event Title</span>
                          <span className="text-primary text-xs font-ui normal-case mt-0.5">{activeSubmission.eventTitle}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span>Club</span>
                          <span className="text-primary mt-0.5">{activeSubmission.clubName}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span>Standard Credit</span>
                          <span className="text-primary mt-0.5">{activeSubmission.standardParticipationHours} HRS</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Allocations List */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-technical uppercase tracking-widest text-white/30">Proposed Allocation List</h4>
                        <span className="text-[10px] font-technical text-accent">[{reviewAllocations.length}] Present Students</span>
                      </div>

                      <div className="flex flex-col border border-white/5 divide-y divide-white/5">
                        {reviewAllocations.map((alloc) => {
                          const isCustom = alloc.allocationType === "custom";
                          return (
                            <div key={alloc.registrationId} className="p-4 flex flex-col gap-3 font-ui text-left">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-light text-primary">{alloc.studentName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-technical uppercase text-green-400 bg-green-950/10 border border-green-500/20 px-1.5 py-0.5">
                                    PRESENT ✓
                                  </span>
                                  <span className={cn(
                                    "text-[9px] font-technical uppercase px-2 py-0.5 border leading-none font-semibold",
                                    isCustom 
                                      ? "border-orange-500/20 bg-orange-950/20 text-orange-400"
                                      : "border-white/10 bg-white/5 text-white/60"
                                  )}>
                                    {alloc.proposedHours} HRS {isCustom && "// OVERRIDE"}
                                  </span>
                                </div>
                              </div>

                              {isCustom && (
                                <div className="p-3 bg-orange-950/5 border border-orange-500/10 text-[10px] text-white/50 leading-relaxed font-light">
                                  <span className="font-technical text-orange-400 uppercase tracking-widest block mb-1">Override Reason</span>
                                  "{alloc.overrideReason}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Historical Audit Trail */}
                    {auditTrail.length > 0 && (
                      <div className="flex flex-col gap-4 mt-4">
                        <h4 className="text-[10px] font-technical uppercase tracking-widest text-white/30">Document Audit Trail</h4>
                        <div className="flex flex-col gap-3.5 pl-2 border-l border-white/5">
                          {auditTrail.map((log, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5 text-[10px] font-technical text-white/40">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  log.action === "approved" ? "bg-green-400" : log.action === "returned" ? "bg-red-400" : "bg-white/40"
                                )} />
                                <span className="uppercase text-primary font-semibold">{log.action}</span>
                                <span>by</span>
                                <span className="lowercase">{log.actorRole}</span>
                                <span className="text-white/20">— {new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                              {log.reason && (
                                <span className="text-white/30 italic pl-3 mt-0.5">"{log.reason}"</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Bottom Action Footer */}
                  <div className="p-8 border-t border-white/5 shrink-0 flex flex-col gap-4 relative z-10 select-none bg-[#090909]">
                    
                    {showReturnConfirm ? (
                      <form onSubmit={handleReturn} className="flex flex-col gap-4 text-left">
                        <label className="text-micro text-primary">Return Justification Reason</label>
                        <textarea
                          rows={3}
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder="Provide a detailed feedback response pointing out corrections required (minimum 10 characters)..."
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent rounded-none transition-colors resize-none"
                          required
                          disabled={processingAction}
                        />
                        <div className="flex justify-between items-center text-[9px] text-white/30 font-technical">
                          <span>Characters: {returnReason.trim().length} (min 10, max 500)</span>
                          <div className="flex gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setShowReturnConfirm(false)}
                              disabled={processingAction}
                              className="px-3 py-1 bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 font-technical uppercase"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={processingAction || returnReason.trim().length < 10}
                              className="px-3 py-1 bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 text-red-400 font-technical uppercase"
                            >
                              {processingAction ? "Returning..." : "Confirm Return"}
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="flex gap-3 justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowReturnConfirm(true)}
                          disabled={processingAction}
                          className="border-red-500/20 bg-red-950/5 hover:bg-red-950/20 text-red-400 font-technical uppercase text-[10px] tracking-wider min-w-[180px]"
                        >
                          Return for Correction
                        </Button>
                        <Button
                          type="button"
                          onClick={handleApprove}
                          disabled={processingAction}
                          className="border border-green-500/20 bg-green-950/10 hover:bg-green-950/25 text-green-400 font-technical uppercase text-[10px] tracking-wider min-w-[200px]"
                        >
                          {processingAction ? "Verifying..." : "Verify & Approve Credit"}
                        </Button>
                      </div>
                    )}

                  </div>

                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* TOAST FEEDBACK NOTIFICATIONS */}
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
                <span className="text-[0.65rem] font-technical uppercase tracking-wider text-white/40">{toast.type}</span>
                <span className="text-xs font-ui tracking-wide">{toast.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
