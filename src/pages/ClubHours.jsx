import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  subscribeToStudentClubHours 
} from '../services/clubHoursService';
import { PageTransition } from '../components/layout/PageTransition';
import { PageContainer } from '../components/layout/PageContainer';
import { SectionWrapper } from '../components/layout/SectionWrapper';
import { AxisMarker } from '../components/layout/AxisMarker';
import { cn } from '../utils/cn';
import { PremiumEmptyState } from '../components/ui/PremiumEmptyState';
import { 
  collection, query, where, onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { trackEvent } from '../services/analyticsService';
import { 
  ShieldCheck
} from 'lucide-react';

export const ClubHours = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Real-time ledger summary state
  const [ledgerSummary, setLedgerSummary] = useState({
    totalApprovedHours: 0,
    participationHours: 0,
    organizationHours: 0,
    approvedRecordCount: 0,
    records: []
  });

  // Pending student credit statuses
  const [pendingStatuses, setPendingStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track page view event
  useEffect(() => {
    trackEvent("club_hours_page_view", {
      actor_role: profile?.role || "student",
      has_pending_credit: pendingStatuses.length > 0
    });
  }, [profile, pendingStatuses.length]);

  // 1. Subscribe to verified hours in the ledger
  useEffect(() => {
    if (!profile?.uid) return;
    
    const unsubLedger = subscribeToStudentClubHours(profile.uid, (summary) => {
      setLedgerSummary(summary);
      setLoading(false);
    });

    return () => unsubLedger();
  }, [profile?.uid]);

  // 2. Subscribe to student's pending credit status in real-time
  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, "studentCreditStatus"),
      where("studentId", "==", profile.uid)
    );

    const unsubStatus = onSnapshot(q, (snap) => {
      const statuses = snap.docs.map(doc => doc.data());
      setPendingStatuses(statuses);
    });

    return () => unsubStatus();
  }, [profile?.uid]);

  // 3. Compute pending credit items
  const pendingCreditsList = useMemo(() => {
    const list = [...pendingStatuses];
    
    // Sort by updatedAt descending
    list.sort((a, b) => {
      const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate().toISOString() : (a.updatedAt || '');
      const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate().toISOString() : (b.updatedAt || '');
      return dateB.localeCompare(dateA);
    });

    return list;
  }, [pendingStatuses]);

  // 4. Compute club aggregation breakdown
  const clubBreakdown = useMemo(() => {
    const map = {};
    
    for (const record of ledgerSummary.records) {
      const clubId = record.clubId || 'unknown';
      const clubName = record.clubName || 'Unknown Club';
      const hrs = Number(record.hours) || 0;
      
      if (!map[clubId]) {
        map[clubId] = {
          clubId,
          clubName,
          totalHours: 0,
          recordCount: 0
        };
      }
      
      map[clubId].totalHours += hrs;
      map[clubId].recordCount += 1;
    }

    const list = Object.values(map);
    
    // Sort totalHours descending, then alphabetically by name
    list.sort((a, b) => {
      if (b.totalHours !== a.totalHours) {
        return b.totalHours - a.totalHours;
      }
      return a.clubName.localeCompare(b.clubName);
    });

    return list;
  }, [ledgerSummary.records]);

  // 5. Format approvedAt timestamp helper
  const formatApprovedDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      return date.toLocaleDateString("en-US", {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).toUpperCase();
    } catch {
      return String(timestamp);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasVerifiedRecords = ledgerSummary.approvedRecordCount > 0;
  const hasPendingRecords = pendingCreditsList.length > 0;

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="max-w-5xl py-12 md:py-20 flex flex-col gap-12 text-left relative font-ui">
          
          {/* Film Grain Layer */}
          <div
            className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
          />

          {/* PAGE HEADER */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 select-none">
            <div className="flex flex-col gap-4">
              <AxisMarker index="04" label="Club Hours Profile" />
              <h1 className="text-display-lg font-light mt-2 text-primary tracking-tight">My Club Hours</h1>
              <p className="text-body-m text-secondary max-w-xl font-light">
                Your verified participation record across campus events.
              </p>
            </div>
          </div>

          {/* TOTAL SUMMARY CARD DECK */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-white/5 relative z-10 select-none">
            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Total Verified Hours</span>
              <span className="text-display-md font-light text-accent">
                {ledgerSummary.totalApprovedHours} <span className="text-xs text-white/40 lowercase">hrs</span>
              </span>
              <span className="text-[10px] text-white/20 font-technical uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-400" />
                <span>Verified Credit</span>
              </span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Participation</span>
              <span className="text-display-md font-light text-primary">
                {ledgerSummary.participationHours} <span className="text-xs text-white/40 lowercase">hrs</span>
              </span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Event Attendance</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Organization</span>
              <span className="text-display-md font-light text-primary">
                {ledgerSummary.organizationHours} <span className="text-xs text-white/40 lowercase">hrs</span>
              </span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Coordinator Work</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-micro text-white/30 uppercase tracking-widest">Verified Records</span>
              <span className="text-display-md font-light text-primary">
                {ledgerSummary.approvedRecordCount}
              </span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Approved Entries</span>
            </div>
          </div>

          {/* EMPTY STATES & CONTENT SWITCH */}
          {!hasVerifiedRecords && !hasPendingRecords ? (
            <PremiumEmptyState 
              type="clubHours"
              action={() => navigate('/events')}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10 items-start">
              
              {/* LEFT & CENTER COLUMNS: Verified History & Pending */}
              <div className="lg:col-span-2 flex flex-col gap-12">
                
                {/* PENDING VERIFICATION CARD LIST */}
                {hasPendingRecords && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.65rem] font-technical uppercase tracking-[0.2em] text-accent">Section // Pending Verification</span>
                      <h3 className="text-body font-medium text-primary uppercase tracking-wider">Proposed Credits</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                      {pendingCreditsList.map((statusDoc) => {
                        const isReturned = statusDoc.status === "organizer_review";
                        const isDraft = statusDoc.status === "draft_allocation";
                        return (
                          <div 
                            key={statusDoc.eventId} 
                            className="p-5 border border-white/5 bg-[#111]/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-technical text-white/40 uppercase tracking-wider">
                                {statusDoc.clubName || "Club Credit"}
                              </span>
                              <h4 className="text-body-s font-light text-primary mt-0.5">
                                {statusDoc.eventTitle || statusDoc.eventId.replace('event_', '').replace(/_/g, ' ')}
                              </h4>
                            </div>

                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3">
                              <span className="text-body-s text-primary font-technical uppercase tracking-wider">
                                +{statusDoc.proposedHours} {statusDoc.proposedHours === 1 ? 'HR' : 'HRS'} PROPOSED
                              </span>
                              
                              <span className={cn(
                                "text-[9px] font-technical uppercase px-2 py-0.5 border leading-none font-semibold select-none",
                                isReturned 
                                  ? "border-orange-500/20 bg-orange-950/20 text-orange-400"
                                  : isDraft
                                    ? "border-white/10 bg-white/5 text-white/40"
                                    : "border-accent/20 bg-accent/5 text-accent"
                              )}>
                                {isReturned ? "ORGANIZER REVIEW" : isDraft ? "ORGANIZER ALLOCATING" : "PENDING FACULTY VERIFICATION"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VERIFIED CREDIT HISTORY LIST */}
                {hasVerifiedRecords && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.65rem] font-technical uppercase tracking-[0.2em] text-white/20">Section // Credit Log</span>
                      <h3 className="text-body text-primary uppercase tracking-wider font-semibold">Verified Credit History</h3>
                    </div>

                    <div className="flex flex-col border border-white/5 divide-y divide-white/5">
                      {ledgerSummary.records.map((record) => (
                        <div key={record.registrationId || `${record.studentId}_${record.eventId}`} className="p-5 flex flex-col gap-4 text-left">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-technical text-accent uppercase tracking-widest">{record.clubName}</span>
                              <h4 className="text-body-s font-light text-primary mt-1">{record.eventTitle}</h4>
                            </div>
                            <span className="text-body-m font-semibold font-technical text-accent">
                              +{record.hours} HRS
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-y-2 text-[10px] font-technical uppercase text-white/40 pt-2 border-t border-white/[0.02]">
                            <div className="flex items-center gap-4">
                              <span>{record.creditType.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>Approved {formatApprovedDate(record.approvedAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-green-400 font-semibold select-none">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: Hours by Club Breakdown */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.65rem] font-technical uppercase tracking-[0.2em] text-white/20">Section // Analytics</span>
                  <h3 className="text-body font-medium text-primary uppercase tracking-wider">Hours by Club</h3>
                </div>

                <div className="flex flex-col border border-white/5 divide-y divide-white/5 bg-white/[0.01]">
                  {clubBreakdown.length === 0 ? (
                    <div className="p-6 text-center text-xs text-white/20 select-none">
                      No club credit history recorded.
                    </div>
                  ) : (
                    clubBreakdown.map((club) => (
                      <div key={club.clubId} className="p-5 flex flex-col gap-1 text-left font-ui">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-light text-primary">{club.clubName}</span>
                          <span className="font-technical text-accent font-semibold">{club.totalHours} HRS</span>
                        </div>
                        <span className="text-[10px] text-white/20 font-technical uppercase mt-1">
                          {club.recordCount} Verified {club.recordCount === 1 ? 'Record' : 'Records'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
