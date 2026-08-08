import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getEvent } from '../../services/eventService';
import { 
  subscribeToEventRegistrations, 
  checkInAttendee, 
  cancelRegistration,
  checkInByTicket,
  checkInByPassToken
} from '../../services/registrationService';
import { trackEvent } from '../../services/analyticsService';
import { 
  saveDraftSubmissions, 
  submitForFacultyVerification, 
  subscribeToSubmissionAndAllocations 
} from '../../services/clubHoursService';
import { validateClubHours } from '../../utils/clubHours';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, ArrowLeft, Download, 
  Printer, CheckCircle2, ChevronLeft, ChevronRight, UserCheck,
  Camera, XCircle
} from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';

const PAGE_SIZE = 10;

export const Attendees = () => {
  const { eventId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // Main State
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Club Hours States
  const [submission, setSubmission] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Custom Override Modal States
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideStudent, setOverrideStudent] = useState(null);
  const [overrideHours, setOverrideHours] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Checked In | Not Checked In
  const [sortOrder, setSortOrder] = useState('Newest'); // Newest | Oldest
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set()); // Sets of registrant userId
  // Scanner State
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(''); // 'Invalid Ticket' | 'Already Checked In' | 'Wrong Event' | 'Registration Not Found'
  const [scannedAttendee, setScannedAttendee] = useState(null); // success scan record
  const [cameraLoading, setCameraLoading] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadJsQR = () => {
    return new Promise((resolve) => {
      if (window.jsQR) {
        resolve(window.jsQR);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
      script.onload = () => resolve(window.jsQR);
      document.body.appendChild(script);
    });
  };

  const startScanner = async () => {
    // Prevent double initialization (e.g. from React StrictMode)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setScanning(true);
    setScanError('');
    setScannedAttendee(null);
    setCameraLoading(true);
    isProcessingRef.current = false;

    try {
      const jsQR = await loadJsQR();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: "environment" } } 
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        await videoRef.current.play();
      }
      setCameraLoading(false);

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      const scanLoop = () => {
        if (!streamRef.current || !videoRef.current) return;

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          if (!isProcessingRef.current) {
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;

            // Center crop: extract the middle square of the video frame
            const scanSize = Math.floor(Math.min(videoWidth, videoHeight) * 0.7);
            const sx = Math.floor((videoWidth - scanSize) / 2);
            const sy = Math.floor((videoHeight - scanSize) / 2);

            // Constrain canvas size to 400x400 for high efficiency & noise filtering
            canvas.width = 400;
            canvas.height = 400;
            context.drawImage(videoRef.current, sx, sy, scanSize, scanSize, 0, 0, 400, 400);

            const imageData = context.getImageData(0, 0, 400, 400);
            
            // "attemptBoth" inversion is critical for robust scanning on phone screens (glare, dark mode QR)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });

            if (code && !isProcessingRef.current) {
              isProcessingRef.current = true; // Lock immediately to prevent duplicate scans
              handleScanResult(code.data);
            }
          }
        }
        
        if (streamRef.current && streamRef.current.active) {
          requestAnimationFrame(scanLoop);
        }
      };

      requestAnimationFrame(scanLoop);
    } catch (err) {
      console.error("Camera startup failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setScanError("CAMERA ACCESS REQUIRED");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setScanError("CAMERA UNAVAILABLE");
      } else {
        setScanError("SCANNER ERROR");
      }
      setCameraLoading(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setScanError('');
    setScannedAttendee(null);
    isProcessingRef.current = false;
  };

  const handleRescan = () => {
    setScanError('');
    setScannedAttendee(null);
    isProcessingRef.current = false;
  };

  const handleScanResult = async (data) => {
    let ticketId = "";
    let scannedUserId = "";
    let scannedEventId = "";
    let passToken = "";

    // ── PRIMARY PATH: new secure passToken QR format ─────────────────────────
    // QR payload: { v: 1, type: "nexevent_pass", token: "nxp_<UUID>" }
    try {
      const payload = JSON.parse(data);

      if (payload.type === "nexevent_pass" && payload.token) {
        passToken = payload.token;

        if (!passToken.startsWith("nxp_") || payload.v !== 1) {
          setScanError("INVALID PASS");
          return;
        }

        try {
          const result = await checkInByPassToken(passToken, eventId, user.uid);
          const matchedAttendee = attendees.find(a => a.passToken === passToken) ||
            attendees.find(a => a.userId === result.userId) ||
            { ...result, studentName: result.userName || result.userId };
          setScannedAttendee(matchedAttendee);
          triggerToast('success', `${matchedAttendee.studentName || 'Attendee'} checked in present.`);
        } catch (e) {
          console.error("Check-in by passToken failed:", e);
          const msg = e.message || "";
          if (msg.startsWith("WRONG_EVENT")) setScanError("WRONG EVENT");
          else if (msg.startsWith("CANCELLED_PASS")) setScanError("CANCELLED PASS");
          else if (msg.startsWith("ALREADY_CHECKED_IN")) setScanError("ALREADY VERIFIED");
          else if (msg.startsWith("UNKNOWN_TOKEN")) setScanError("PASS NOT FOUND");
          else if (msg.startsWith("MALFORMED_QR")) setScanError("INVALID PASS");
          else setScanError(e.message || "SCANNER ERROR");
        }
        return;
      }

      // ── LEGACY PATH: old QR format { ticketId, eventId, userId } ─────────
      ticketId = payload.ticketId;
      scannedEventId = payload.eventId;
      scannedUserId = payload.userId;
    } catch {
      // ── LEGACY STRING FALLBACK: "userId_eventId" format ──────────────────
      const parts = data.split('_');
      if (parts.length === 2) {
        scannedUserId = parts[0];
        scannedEventId = parts[1];
      } else {
        setScanError("INVALID PASS");
        return;
      }
    }

    // ── LEGACY VALIDATION ────────────────────────────────────────────────────
    if (scannedEventId !== eventId) {
      setScanError("WRONG EVENT");
      return;
    }

    const attendee = attendees.find(a =>
      (ticketId && a.ticketId === ticketId) ||
      (!ticketId && a.userId === scannedUserId)
    );

    if (!attendee) {
      setScanError("PASS NOT FOUND");
      return;
    }

    if (attendee.checkedIn) {
      setScanError("ALREADY VERIFIED");
      return;
    }

    try {
      if (ticketId) {
        await checkInByTicket(scannedUserId, eventId, ticketId, user.uid);
      } else {
        await checkInAttendee(scannedUserId, eventId, user.uid);
      }
      setScannedAttendee(attendee);
      triggerToast('success', `${attendee.studentName} checked in present.`);
    } catch (e) {
      console.error("Checkin fail:", e);
      const msg = e.message || "";
      if (msg.includes("Wrong Event") || msg.includes("WRONG_EVENT")) setScanError("WRONG EVENT");
      else if (msg.includes("cancelled") || msg.includes("CANCELLED_PASS")) setScanError("CANCELLED PASS");
      else if (msg.includes("Already Checked In") || msg.includes("ALREADY_CHECKED_IN")) setScanError("ALREADY VERIFIED");
      else if (msg.includes("Registration Not Found") || msg.includes("UNKNOWN_TOKEN")) setScanError("PASS NOT FOUND");
      else setScanError(e.message || "SCANNER ERROR");
    }
  };

  // Load Event and check authorization
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const eventData = await getEvent(eventId);
        if (!eventData) {
          triggerToast('error', "Target event could not be found.");
          setLoading(false);
          return;
        }

        const isCreator = eventData.creatorId === user?.uid;
        const isAdmin = profile?.role === 'admin';
        
        if (!isCreator && !isAdmin) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setEvent(eventData);
        setAuthorized(true);

        // Subscribe to registrations
        const unsubscribeReg = subscribeToEventRegistrations(eventId, (list) => {
          setAttendees(list);
          setLoading(false);
        });

        // Subscribe to submissions & allocations
        const unsubscribeSub = subscribeToSubmissionAndAllocations(eventId, ({ submission: subDoc, allocations: allocList }) => {
          setSubmission(subDoc);
          setAllocations(allocList);
        });

        return () => {
          unsubscribeReg();
          unsubscribeSub();
        };
      } catch (err) {
        console.error("Access verification error:", err);
        setAuthorized(false);
        setLoading(false);
      }
    };

    if (user?.uid && profile) {
      verifyAccess();
    }
  }, [eventId, user, profile]);

  // Dynamic Live Counts
  const stats = useMemo(() => {
    const registered = attendees.length;
    const checkedIn = attendees.filter(a => a.checkedIn).length;
    const capacity = event?.capacity || 0;
    const remaining = Math.max(capacity - registered, 0);
    const attendanceRate = registered > 0 ? Math.round((checkedIn / registered) * 100) : 0;

    return { registered, checkedIn, remaining, capacity, attendanceRate };
  }, [attendees, event]);

  // Search & Filter Operations
  const filteredAttendees = useMemo(() => {
    let list = [...attendees];

    // 1. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a => 
        (a.studentName || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.branch || '').toLowerCase().includes(q) ||
        (a.college || '').toLowerCase().includes(q) ||
        `${a.userId}_${eventId}`.toLowerCase().includes(q)
      );
    }

    // 2. Status Filters
    if (statusFilter === 'Checked In') {
      list = list.filter(a => a.checkedIn);
    } else if (statusFilter === 'Not Checked In') {
      list = list.filter(a => !a.checkedIn);
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortOrder === 'Newest') {
        return (b.registeredAt || '').localeCompare(a.registeredAt || '');
      } else {
        return (a.registeredAt || '').localeCompare(b.registeredAt || '');
      }
    });

    return list;
  }, [attendees, searchQuery, statusFilter, sortOrder, eventId]);

  // Paginated List
  const paginatedAttendees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAttendees.slice(start, start + PAGE_SIZE);
  }, [filteredAttendees, currentPage]);

  const totalPages = Math.ceil(filteredAttendees.length / PAGE_SIZE) || 1;

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortOrder]);

  // Club Hours Helpers
  const isClubHoursEnabled = event?.clubHours?.enabled === true && (Number(event.clubHours.participationHours) || 0) > 0;

  const allocationsMap = useMemo(() => {
    const map = {};
    allocations.forEach(alloc => {
      map[alloc.registrationId] = alloc;
    });
    return map;
  }, [allocations]);

  const handleSelectAllEligible = () => {
    const eligiblePresent = attendees.filter(a => a.checkedIn);
    setSelectedIds(new Set(eligiblePresent.map(a => a.userId)));
  };

  const handleApplyStandardCredit = async () => {
    if (selectedIds.size === 0) {
      triggerToast("error", "No students selected.");
      return;
    }
    setSavingDraft(true);
    try {
      const listToSave = [...allocations];
      const standardHours = event.clubHours.participationHours;
      
      const selectedEligible = attendees.filter(a => selectedIds.has(a.userId) && a.checkedIn);
      if (selectedEligible.length === 0) {
        triggerToast("error", "None of the selected students are verified present.");
        setSavingDraft(false);
        return;
      }

      selectedEligible.forEach(att => {
        const regId = `${att.userId}_${eventId}`;
        const existingIdx = listToSave.findIndex(a => a.registrationId === regId);
        const newAlloc = {
          registrationId: regId,
          studentId: att.userId,
          studentName: att.studentName,
          proposedHours: standardHours,
          allocationType: "standard",
          overrideReason: ""
        };
        if (existingIdx >= 0) {
          listToSave[existingIdx] = newAlloc;
        } else {
          listToSave.push(newAlloc);
        }
      });

      await saveDraftSubmissions(eventId, listToSave, event);
      setSelectedIds(new Set());
      triggerToast("success", `Standard credit applied to ${selectedEligible.length} students.`);
    } catch (err) {
      console.error("Failed to save draft standard credit:", err);
      triggerToast("error", err.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleOpenOverrideModal = (attendee) => {
    const regId = `${attendee.userId}_${eventId}`;
    const existingAlloc = allocationsMap[regId];
    setOverrideStudent(attendee);
    setOverrideHours(existingAlloc ? String(existingAlloc.proposedHours) : String(event.clubHours.participationHours));
    setOverrideReason(existingAlloc ? (existingAlloc.overrideReason || '') : '');
    setOverrideError('');
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e) => {
    if (e) e.preventDefault();
    setSavingOverride(true);
    setOverrideError("");

    const proposed = Number(overrideHours);
    const standardHours = event.clubHours.participationHours;
    const isCustom = proposed !== standardHours;
    const reason = overrideReason.trim();

    const valResult = validateClubHours({
      enabled: true,
      participationHours: proposed,
      organizerHours: 0
    });
    if (!valResult.valid) {
      setOverrideError(valResult.error);
      setSavingOverride(false);
      return;
    }

    if (isCustom && reason.length < 10) {
      setOverrideError("Override reason must be at least 10 characters long.");
      setSavingOverride(false);
      return;
    }
    if (isCustom && reason.length > 500) {
      setOverrideError("Override reason cannot exceed 500 characters.");
      setSavingOverride(false);
      return;
    }

    try {
      const listToSave = [...allocations];
      const regId = `${overrideStudent.userId}_${eventId}`;
      const existingIdx = listToSave.findIndex(a => a.registrationId === regId);
      const newAlloc = {
        registrationId: regId,
        studentId: overrideStudent.userId,
        studentName: overrideStudent.studentName,
        proposedHours: proposed,
        allocationType: isCustom ? "custom" : "standard",
        overrideReason: isCustom ? reason : ""
      };

      if (existingIdx >= 0) {
        listToSave[existingIdx] = newAlloc;
      } else {
        listToSave.push(newAlloc);
      }

      await saveDraftSubmissions(eventId, listToSave, event);
      setOverrideModalOpen(false);
      triggerToast("success", `Custom hours applied for ${overrideStudent.studentName}.`);
    } catch (err) {
      console.error("Failed to save custom override draft:", err);
      setOverrideError(err.message || "Failed to update allocation.");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleRemoveAllocation = async () => {
    setSavingOverride(true);
    try {
      const regId = `${overrideStudent.userId}_${eventId}`;
      const listToSave = allocations.filter(a => a.registrationId !== regId);
      await saveDraftSubmissions(eventId, listToSave, event);
      setOverrideModalOpen(false);
      triggerToast("success", `Allocation removed for ${overrideStudent.studentName}.`);
    } catch (err) {
      console.error("Failed to delete allocation draft:", err);
      setOverrideError(err.message || "Failed to delete allocation.");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (allocations.length === 0) {
      triggerToast("error", "No allocations proposed. Please configure at least one student allocation.");
      return;
    }
    
    // Local verification check: check if any student in allocations is no longer checkedIn in local attendees registry
    const presentUserIds = new Set(attendees.filter(a => a.checkedIn).map(a => a.userId));
    const invalidAllocations = allocations.filter(a => !presentUserIds.has(a.studentId));

    if (invalidAllocations.length > 0) {
      const names = invalidAllocations.map(a => `"${a.studentName}"`).join(", ");
      triggerToast("error", `${invalidAllocations.length} allocation(s) are no longer attendance eligible: ${names}. Review the highlighted attendee before submitting.`);
      return;
    }

    setSubmittingVerification(true);
    try {
      const result = await submitForFacultyVerification(eventId);
      if (result?.alreadySubmitted) {
        triggerToast("success", "Allocations have already been submitted successfully.");
      } else {
        triggerToast("success", "Allocations submitted for faculty verification.");
        trackEvent("club_hours_submitted", {
          event_id: eventId,
          actor_role: "organizer",
          allocation_count: allocations.length,
          standard_hours: event.clubHours.participationHours
        });
      }
    } catch (err) {
      console.error("Verification submission failed:", err);
      triggerToast("error", err.message || "Failed to submit for verification.");
    } finally {
      setSubmittingVerification(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopScanner();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Table Row Selection Helper
  const handleSelectRow = (userId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedAttendees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedAttendees.map(a => a.userId)));
    }
  };

  // 1. Check-in Single Attendee
  const handleCheckIn = async (userId) => {
    try {
      await checkInAttendee(userId, eventId, user.uid);
      triggerToast('success', "Attendee check-in verified successfully.");
    } catch (e) {
      console.error("[Attendees] Failed to check in attendee:", e);
      triggerToast('error', "Failed to check in attendee.");
    }
  };

  // 2. Bulk Check-in
  const handleBulkCheckIn = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(uid => checkInAttendee(uid, eventId, user.uid))
      );
      setSelectedIds(new Set());
      triggerToast('success', `Checked in ${selectedIds.size} attendees.`);
    } catch (e) {
      console.error("[Attendees] Failed to bulk check-in:", e);
      triggerToast('error', "Some check-in updates failed.");
    }
  };

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) return;
    await confirm({
      title: 'Cancel Registrations',
      message: `Warning: Are you sure you want to cancel registrations for the ${selectedIds.size} selected students? This will reclaim seat capacity.`,
      variant: 'danger',
      confirmText: 'Cancel Registrations',
      cancelText: 'Keep Registrations',
      onConfirm: async () => {
        try {
          const uids = Array.from(selectedIds);
          await Promise.all(
            uids.map(uid => cancelRegistration(`${uid}_${eventId}`, "organizer"))
          );
          uids.forEach(_uid => {
            trackEvent("registration_cancelled", {
              event_id: eventId,
              actor_role: "organizer"
            });
          });
          setSelectedIds(new Set());
          triggerToast('success', "Selected registrations removed.");
        } catch (e) {
          console.error("[Attendees] Failed to remove bookings:", e);
          triggerToast('error', "Failed to remove some bookings.");
          throw e;
        }
      }
    });
  };

  // 4. Export CSV
  const handleExportCSV = () => {
    if (filteredAttendees.length === 0) {
      triggerToast('error', "No attendee logs to export.");
      return;
    }

    const headers = ["Student Name", "Email", "College", "Branch", "Ticket ID", "Registration Time", "Check-in Status"];
    const rows = filteredAttendees.map(att => [
      `"${(att.studentName || 'Unknown Student').replace(/"/g, '""')}"`,
      `"${(att.email || '').replace(/"/g, '""')}"`,
      `"${(att.college || 'N/A').replace(/"/g, '""')}"`,
      `"${(att.branch || 'N/A').replace(/"/g, '""')}"`,
      `"${(att.ticketId || 'N/A').replace(/"/g, '""')}"`,
      `"${new Date(att.registeredAt).toLocaleString()}"`,
      att.checkedIn ? "Present" : "Absent"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendee_registry_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('success', "CSV export completed successfully.");
  };

  // 5. Print List (Future-ready browser native)
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <PageTransition>
        <PageContainer>
          <SectionWrapper className="min-h-[85vh] flex flex-col items-center justify-center text-center font-ui py-24">
            <div className="border border-white/10 p-12 max-w-xl bg-[#111] flex flex-col items-center relative select-none">
              <span className="text-micro text-accent font-technical uppercase tracking-widest mb-4">403 Access Denied</span>
              <h2 className="text-display-md text-primary font-light mb-6">Unauthorized Action</h2>
              <p className="text-body-s text-secondary leading-relaxed mb-8">
                You are not mapped as the coordinator for this event assignment. Attempting unauthorized retrieval is logged.
              </p>
              <Button variant="secondary" onClick={() => navigate('/organizer')} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Studio</span>
              </Button>
            </div>
          </SectionWrapper>
        </PageContainer>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="max-w-7xl py-12 md:py-20 flex flex-col gap-12 text-left relative font-ui">
          
          {/* HEADER BAR */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => navigate('/organizer')}
                className="text-micro text-accent uppercase tracking-widest font-technical flex items-center gap-1.5 focus:outline-none min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Studio</span>
              </button>
              <AxisMarker index="05" label="Attendee Registry CRM" />
              <h1 className="text-display-lg font-light tracking-tight mt-2 text-primary">{event?.title}</h1>
              <p className="text-body-m text-secondary max-w-xl font-light">
                Monitor attendee registrations, execute digital badge check-ins, and export CSV logs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row gap-3 w-full md:w-auto">
              <Button 
                variant="secondary" 
                onClick={startScanner} 
                className="flex items-center justify-center gap-2 border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent h-12 md:h-10 text-xs tracking-wider sm:col-span-2 md:col-span-1"
              >
                <Camera className="w-4 h-4" />
                <span>Scan QR</span>
              </Button>
              <Button variant="secondary" onClick={handlePrint} className="flex items-center justify-center gap-2 h-12 md:h-10 text-xs tracking-wider">
                <Printer className="w-4 h-4" />
                <span>Print Registry</span>
              </Button>
              <Button onClick={handleExportCSV} className="flex items-center justify-center gap-2 h-12 md:h-10 text-xs tracking-wider">
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* LIVE COUNTERS PANEL */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 py-6 border-y border-white/5 font-ui">
            <div className="flex flex-col gap-1.5 bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5 rounded-[8px] h-full justify-between min-h-[90px] sm:min-h-0">
              <span className="text-micro text-white/30 uppercase tracking-widest">Registered</span>
              <span className="text-display-md font-light text-primary leading-none my-1">{stats.registered}</span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Capacity Cap: {stats.capacity}</span>
            </div>
            <div className="flex flex-col gap-1.5 bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5 rounded-[8px] h-full justify-between min-h-[90px] sm:min-h-0">
              <span className="text-micro text-white/30 uppercase tracking-widest">Checked In</span>
              <span className="text-display-md font-light text-green-400 leading-none my-1">{stats.checkedIn}</span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Attendees Present</span>
            </div>
            <div className="flex flex-col gap-1.5 bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5 rounded-[8px] h-full justify-between min-h-[90px] sm:min-h-0">
              <span className="text-micro text-white/30 uppercase tracking-widest">Remaining Seats</span>
              <span className="text-display-md font-light text-accent leading-none my-1">{stats.remaining}</span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Open Entry slots</span>
            </div>
            <div className="flex flex-col gap-1.5 bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5 rounded-[8px] h-full justify-between min-h-[90px] sm:min-h-0">
              <span className="text-micro text-white/30 uppercase tracking-widest">Attendance %</span>
              <span className="text-display-md font-light text-primary leading-none my-1">{stats.attendanceRate}%</span>
              <span className="text-[10px] text-white/20 font-technical uppercase">Conversion Rate</span>
            </div>
          </div>

          {/* SEARCH & FILTERS CONTROLS */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between pb-2 w-full">
            
            {/* Search inputs */}
            <div className="relative flex-grow w-full lg:max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, organization, title, ID..."
                className="w-full bg-[#111]/80 border border-white/10 pl-10 pr-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-accent rounded-[6px] lg:rounded-none min-h-[44px] lg:min-h-0"
              />
            </div>

            {/* Filter actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-4 text-xs select-none w-full lg:w-auto">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <span className="text-[0.6rem] font-technical uppercase tracking-wider text-white/30 pl-1 sm:pl-0 text-left">Check-in Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#111] border border-white/10 text-white/80 px-3.5 py-3 lg:py-1.5 rounded-[6px] lg:rounded-none focus:outline-none cursor-pointer hover:bg-white/[0.02] w-full lg:w-48 text-sm lg:text-xs min-h-[44px] lg:min-h-0"
                >
                  <option value="All">All Registrants</option>
                  <option value="Checked In">Checked In Only</option>
                  <option value="Not Checked In">Not Checked In Only</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <span className="text-[0.6rem] font-technical uppercase tracking-wider text-white/30 pl-1 sm:pl-0 text-left">Registry Sort</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-[#111] border border-white/10 text-white/80 px-3.5 py-3 lg:py-1.5 rounded-[6px] lg:rounded-none focus:outline-none cursor-pointer hover:bg-white/[0.02] w-full lg:w-48 text-sm lg:text-xs min-h-[44px] lg:min-h-0"
                >
                  <option value="Newest">Newest First</option>
                  <option value="Oldest">Oldest First</option>
                </select>
              </div>
            </div>

          </div>

          {/* BULK OPERATIONS PANEL */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="flex flex-col sm:flex-row items-center justify-between p-4 bg-accent/5 border border-accent/20 text-xs gap-4 w-full"
              >
                <span className="font-technical uppercase text-accent tracking-wider font-semibold">
                  [{selectedIds.size}] Attendees Selected
                </span>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleBulkCheckIn}
                    className="px-4 py-2.5 bg-green-950/20 border border-green-500/20 hover:bg-green-950/40 text-green-400 font-technical uppercase transition-all duration-150 min-h-[44px] flex items-center justify-center rounded-[6px]"
                  >
                    Mark Present
                  </button>
                  <button
                    onClick={handleBulkRemove}
                    className="px-4 py-2.5 bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 text-red-400 font-technical uppercase transition-all duration-150 min-h-[44px] flex items-center justify-center rounded-[6px]"
                  >
                    Remove Selected
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 font-technical uppercase transition-all duration-150 min-h-[44px] flex items-center justify-center rounded-[6px]"
                  >
                    Clear Selection
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TABLE LOGS REGISTRY */}
          {filteredAttendees.length === 0 ? (
            <div className="py-24 text-center text-secondary text-body-s font-light border border-white/5 bg-white/[0.01]">
              No matching attendee logs found in this registry.
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden lg:flex flex-col border border-white/5 divide-y divide-white/5">
                {/* Header row */}
                <div className="flex items-center justify-between px-6 py-3 bg-white/[0.01] text-micro font-technical uppercase tracking-wider text-white/30 select-none">
                  <div className="w-[5%] flex items-center">
                    <input 
                      type="checkbox"
                      checked={paginatedAttendees.length > 0 && selectedIds.size === paginatedAttendees.length}
                      onChange={handleSelectAll}
                      className="rounded-none border-white/20 bg-[#111] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                  <span className="w-[18%]">Student Name</span>
                  <span className="w-[18%]">Email Address</span>
                  <span className="w-[12%]">College Campus</span>
                  <span className="w-[12%]">Branch / Dept</span>
                  <span className="w-[15%]">Ticket ID</span>
                  <span className="w-[10%]">Reg Date</span>
                  <span className="w-[10%] text-right">Verification Gate</span>
                </div>

                {paginatedAttendees.map((att) => {
                  const isSelected = selectedIds.has(att.userId);
                  return (
                    <div key={att.userId} className="flex flex-row items-center justify-between px-6 py-4 hover:bg-white/[0.01] font-ui">
                      {/* Selector Column */}
                      <div className="w-[5%] flex items-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          disabled={isClubHoursEnabled && !att.checkedIn}
                          onChange={() => handleSelectRow(att.userId)}
                          className="rounded-none border-white/20 bg-[#111] focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Name column */}
                      <div className="w-[18%] flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center font-display text-xs uppercase text-primary overflow-hidden shrink-0">
                          {att.avatar ? <img src={att.avatar} alt={att.studentName} className="w-full h-full object-cover" /> : att.studentName[0]}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-body-s text-primary font-light truncate">{att.studentName}</span>
                          {isClubHoursEnabled && (
                            <div className="flex items-center gap-2 mt-0.5 select-none">
                              {att.checkedIn ? (
                                <>
                                  <span className="text-[9px] font-technical uppercase text-accent font-semibold tracking-wider">
                                    {(() => {
                                      const regId = `${att.userId}_${eventId}`;
                                      const alloc = allocationsMap[regId];
                                      if (alloc) {
                                        return alloc.allocationType === "custom"
                                          ? `Custom: ${alloc.proposedHours} Hrs`
                                          : `Standard: ${alloc.proposedHours} Hrs`;
                                      }
                                      return `Eligible: ${event.clubHours.participationHours} Hrs pending`;
                                    })()}
                                  </span>
                                  {(!submission || submission.status !== "pending_faculty") && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenOverrideModal(att);
                                      }}
                                      className="text-[8px] font-technical uppercase text-white/40 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.02] px-1.5 py-0.5 leading-none transition-colors"
                                    >
                                      Override
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[9px] font-technical uppercase text-white/25">
                                  Not Verified // Ineligible
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <span className="w-[18%] text-xs text-white/50 font-light truncate select-all">{att.email}</span>

                      {/* College */}
                      <span className="w-[12%] text-xs text-white/50 font-light truncate">{att.college}</span>

                      {/* Branch */}
                      <span className="w-[12%] text-xs text-white/50 font-light truncate">{att.branch}</span>

                      {/* Ticket ID */}
                      <span className="w-[15%] text-xs font-mono text-white/40 truncate select-all">{att.ticketId || "N/A"}</span>

                      {/* Reg Date */}
                      <span className="w-[10%] text-xs text-white/30 font-technical uppercase">
                        {new Date(att.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>

                      {/* Check In Actions */}
                      <div className="w-[10%] flex items-center justify-end gap-3.5">
                        {att.checkedIn ? (
                          <span className="text-[10px] font-technical uppercase tracking-wider text-green-400 bg-green-950/20 border border-green-500/20 px-2 py-1 flex items-center gap-1 leading-none select-none">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(att.userId)}
                            className="text-[10px] font-technical uppercase tracking-widest text-accent hover:text-white bg-accent/5 border border-accent/15 hover:bg-accent hover:border-accent px-3 py-1.5 transition-all select-none focus:outline-none"
                          >
                            Verify Entry
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* MOBILE / TABLET CARD VIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {paginatedAttendees.map((att) => {
                  const isSelected = selectedIds.has(att.userId);
                  return (
                    <div 
                      key={att.userId} 
                      className={cn(
                        "bg-[#0d0d0d] border p-5 flex flex-col gap-4 relative rounded-[10px] text-left transition-all duration-200", 
                        isSelected ? "border-accent/30 bg-accent/[0.01]" : "border-white/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Selector checkbox */}
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            disabled={isClubHoursEnabled && !att.checkedIn}
                            onChange={() => handleSelectRow(att.userId)}
                            className="rounded-none border-white/20 bg-[#111] focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          />
                          
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center font-display text-sm uppercase text-primary overflow-hidden shrink-0">
                            {att.avatar ? <img src={att.avatar} alt={att.studentName} className="w-full h-full object-cover" /> : att.studentName[0]}
                          </div>
                          
                          {/* Name and Email */}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-white tracking-wide truncate">{att.studentName}</span>
                            <span className="text-[10px] text-white/40 truncate select-all">{att.email}</span>
                          </div>
                        </div>

                        {/* Verification badge status */}
                        <div className="shrink-0">
                          {att.checkedIn ? (
                            <span className="text-[9px] font-technical uppercase tracking-wider text-green-400 bg-green-950/20 border border-green-500/20 px-2.5 py-1 flex items-center gap-1 leading-none select-none rounded-[4px]">
                              <UserCheck className="w-3 h-3" />
                              <span>Present</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-technical uppercase tracking-wider text-white/30 bg-white/5 border border-white/10 px-2.5 py-1 flex items-center gap-1 leading-none select-none rounded-[4px]">
                              <span>Absent</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="h-px bg-white/[0.04] w-full" />

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[9px] font-technical uppercase tracking-wider text-white/20">Branch</span>
                          <span className="text-white/60 truncate font-light">{att.branch || '—'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[9px] font-technical uppercase tracking-wider text-white/20">College</span>
                          <span className="text-white/60 truncate font-light">{att.college || '—'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[9px] font-technical uppercase tracking-wider text-white/20">Ticket ID</span>
                          <span className="text-white/50 font-mono truncate select-all">{att.ticketId || '—'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[9px] font-technical uppercase tracking-wider text-white/20">Registered</span>
                          <span className="text-white/50 font-technical uppercase truncate">
                            {new Date(att.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {isClubHoursEnabled && (
                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-[6px] mt-1 select-none">
                          <div className="flex flex-col text-left min-w-0">
                            <span className="text-[8px] font-technical uppercase text-white/35">Club Hours Credit</span>
                            <span className="text-[10px] font-technical text-accent font-semibold tracking-wider truncate">
                              {(() => {
                                const regId = `${att.userId}_${eventId}`;
                                const alloc = allocationsMap[regId];
                                if (alloc) {
                                  return alloc.allocationType === "custom"
                                    ? `${alloc.proposedHours} Hrs (Override)`
                                    : `${alloc.proposedHours} Hrs (Standard)`;
                                }
                                return `${event.clubHours.participationHours} Hrs Pending`;
                              })()}
                            </span>
                          </div>
                          {att.checkedIn && (!submission || submission.status !== "pending_faculty") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenOverrideModal(att);
                              }}
                              className="text-[9px] font-technical uppercase text-accent hover:text-white border border-accent/20 hover:border-accent/40 bg-accent/5 px-2 py-1 leading-none transition-colors rounded-[4px] min-h-[32px] flex items-center shrink-0"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      )}

                      {!att.checkedIn && (
                        <button
                          onClick={() => handleCheckIn(att.userId)}
                          className="w-full mt-2 text-[11px] font-technical uppercase tracking-wider text-accent hover:text-white bg-accent/5 border border-accent/20 hover:bg-accent hover:border-accent py-3 transition-all select-none focus:outline-none rounded-[6px] min-h-[44px] flex items-center justify-center font-bold"
                        >
                          Verify Entry
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* PAGINATION PANEL */}
          {filteredAttendees.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-technical uppercase tracking-wider select-none pt-4 border-t border-white/5 gap-4">
              <span className="text-white/30 text-center sm:text-left">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, filteredAttendees.length)} of {filteredAttendees.length} entries
              </span>
              <div className="flex gap-2 justify-center w-full sm:w-auto">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:outline-none min-h-[44px] flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 border border-white/5 bg-white/[0.02] flex items-center justify-center min-h-[44px]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:outline-none min-h-[44px] flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

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

          {/* QR CHECK-IN SCANNER MODAL */}
          <AnimatePresence>
            {scanning && (() => {
              const EASE = [0.16, 1, 0.3, 1];
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={stopScanner}
                    className="absolute inset-0 bg-[#090909]/90 backdrop-blur-md"
                  />

                  {/* Scanner Content container */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="bg-[#141414]/95 border border-white/10 w-full max-w-md p-6 z-10 flex flex-col gap-6 rounded-none shadow-[0_32px_60px_-16px_rgba(0,0,0,0.8)] relative font-ui text-center"
                  >
                    {/* Style Injector */}
                    <style>{`
                      @keyframes scanLaser {
                        0% { top: 0%; }
                        50% { top: 100%; }
                        100% { top: 0%; }
                      }
                    `}</style>

                    {/* Grain Layer */}
                    <div
                      className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                    />

                    {/* Header */}
                    <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-4">
                      <div className="flex flex-col text-left">
                        <span className="text-[0.55rem] font-technical uppercase tracking-[0.2em] text-accent">Verify Gate // Camera active</span>
                        <h3 className="text-body-l font-light text-primary mt-0.5">Attendee QR Verification</h3>
                      </div>
                      <button
                        type="button"
                        onClick={stopScanner}
                        className="p-1 text-white/40 hover:text-white transition-colors focus:outline-none"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Scanner body */}
                    <div className="relative aspect-square w-full bg-black border border-white/5 overflow-hidden flex items-center justify-center">
                      
                      {/* Video Camera */}
                      <video 
                        ref={videoRef}
                        className={cn(
                          "w-full h-full object-cover",
                          (scannedAttendee || scanError || cameraLoading) ? "opacity-20" : "opacity-90"
                        )}
                      />

                      {/* Scanning Target Box indicator */}
                      {!scannedAttendee && !scanError && !cameraLoading && (
                        <div className="absolute inset-12 border border-white/10 flex items-center justify-center select-none pointer-events-none">
                          {/* Corner markers */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent" />
                          
                          {/* Laser pulse line */}
                          <div className="w-full h-[1.5px] bg-accent/80 absolute" style={{ animation: 'scanLaser 2s linear infinite' }} />
                          <span className="text-[9px] font-technical uppercase text-white/30 tracking-widest bg-black/60 px-2 py-0.5">Align Ticket QR</span>
                        </div>
                      )}

                      {/* Camera Loading Overlay */}
                      {cameraLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          <div className="w-6 h-6 border border-white/20 border-t-transparent rounded-full animate-spin" />
                          <span className="text-micro font-technical uppercase text-white/30 tracking-widest">Initializing Lens...</span>
                        </div>
                      )}

                      {/* Error screen check */}
                      {scanError && (
                        <div className="absolute inset-0 bg-[#0c0c0c]/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none z-30 font-ui border border-red-500/10">
                          <XCircle className="w-10 h-10 text-red-500 mb-4 animate-bounce" strokeWidth={1.2} />
                          
                          <span className="text-[8px] font-technical uppercase tracking-[0.25em] text-red-500/80 border border-red-500/20 bg-red-950/10 px-3 py-1 mb-4 leading-none">
                            ENTRY DENIED
                          </span>

                          <h3 className="text-sm font-technical uppercase tracking-wider text-red-400">{scanError}</h3>
                          
                          <p className="text-[11px] text-white/40 max-w-xs mt-2.5 mb-6 font-light leading-relaxed">
                            {scanError === "WRONG EVENT" && "This pass belongs to a different event configuration."}
                            {scanError === "INVALID PASS" && "This QR is not a valid NovaEvent pass."}
                            {scanError === "PASS NOT FOUND" && "No registration matches this NovaEvent pass."}
                            {scanError === "ALREADY VERIFIED" && "This attendee has already been marked present."}
                            {scanError === "CANCELLED PASS" && "This registration has been cancelled."}
                          </p>

                          <button
                            onClick={handleRescan}
                            className="px-4 py-2 border border-red-500/25 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-technical uppercase text-micro tracking-widest transition-all focus:outline-none"
                          >
                            Rescan QR
                          </button>
                        </div>
                      )}

                      {/* Success screen check */}
                      {scannedAttendee && (
                        <div className="absolute inset-0 bg-[#0c0c0c]/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none z-30 font-ui">
                          <CheckCircle2 className="w-10 h-10 text-accent mb-4" strokeWidth={1.2} />
                          
                          <span className="text-[8px] font-technical uppercase tracking-[0.25em] text-accent border border-accent/20 bg-accent/5 px-3 py-1 mb-4 leading-none">
                            NEX-PASS // ACCESS GRANTED
                          </span>
                          
                          <h4 className="text-[8px] font-technical text-white/25 uppercase tracking-widest">Student Name</h4>
                          <div className="text-sm font-light text-primary mt-0.5 mb-3">{scannedAttendee.studentName}</div>
                          
                          <h4 className="text-[8px] font-technical text-white/25 uppercase tracking-widest">Ticket ID</h4>
                          <div className="text-[10px] font-mono text-white/60 mt-0.5 mb-3">{scannedAttendee.ticketId || "N/A"}</div>
                          
                          <h4 className="text-[8px] font-technical text-white/25 uppercase tracking-widest">Event Name</h4>
                          <div className="text-[10px] font-light text-white/60 mt-0.5 mb-4 truncate max-w-[200px]">{event?.title}</div>
                          
                          <div className="text-[9px] font-technical uppercase tracking-widest text-green-400 bg-green-950/20 border border-green-500/20 px-3.5 py-1 flex items-center gap-1.5 leading-none mb-5">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>PRESENT</span>
                          </div>

                          <button
                            onClick={handleRescan}
                            className="px-4 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/80 font-technical uppercase text-micro tracking-widest transition-all focus:outline-none"
                          >
                            Scan Next Pass
                          </button>
                        </div>
                      )}

                    </div>

                    <div className="flex justify-center border-t border-white/5 pt-4">
                      <Button variant="secondary" onClick={stopScanner} size="sm">
                        Close Scanner
                      </Button>
                    </div>

                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>

          {/* CUSTOM HOUR OVERRIDE MODAL */}
          <AnimatePresence>
            {overrideModalOpen && overrideStudent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !savingOverride && setOverrideModalOpen(false)}
                  className="absolute inset-0 bg-[#090909]/85 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(8px)' }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-[#141414]/95 border border-white/10 w-full max-w-md p-6 z-10 flex flex-col gap-6 rounded-none shadow-[0_32px_60px_-16px_rgba(0,0,0,0.8)] relative font-ui text-left"
                >
                  {/* Grain Layer */}
                  <div
                    className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                  />

                  {/* Header */}
                  <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[0.55rem] font-technical uppercase tracking-[0.2em] text-accent">Config // Credit Override</span>
                      <h3 className="text-body-l font-light text-primary mt-0.5">Custom Hours Allocation</h3>
                    </div>
                    <button
                      type="button"
                      disabled={savingOverride}
                      onClick={() => setOverrideModalOpen(false)}
                      className="p-1 text-white/40 hover:text-white transition-colors focus:outline-none"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {overrideError && (
                    <div className="text-[0.65rem] text-red-400 font-technical uppercase border border-red-500/20 bg-red-950/20 px-3 py-2 z-10">
                      {overrideError}
                    </div>
                  )}

                  {/* Body Form */}
                  <form onSubmit={handleSaveOverride} className="flex flex-col gap-5 relative z-10">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[0.55rem] text-white/30 font-technical uppercase tracking-wider">Attendee</span>
                      <span className="text-body-s font-light text-primary">{overrideStudent.studentName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[0.55rem] text-white/30 font-technical uppercase tracking-wider">Standard Credit</span>
                        <span className="text-body-s font-light text-secondary">{event.clubHours.participationHours} HRS</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[0.55rem] text-white/30 font-technical uppercase tracking-wider">Allocation Type</span>
                        <span className="text-body-s font-light text-accent">
                          {Number(overrideHours) === event.clubHours.participationHours ? "STANDARD" : "CUSTOM OVERRIDE"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-micro text-primary">Proposed Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={overrideHours}
                        onChange={(e) => setOverrideHours(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent rounded-none transition-colors"
                        required
                        disabled={savingOverride}
                      />
                    </div>

                    {Number(overrideHours) !== event.clubHours.participationHours && (
                      <div className="flex flex-col gap-2">
                        <label className="text-micro text-primary">Override Reason</label>
                        <textarea
                          rows={3}
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Provide a justification for this custom hour override (minimum 10 characters)..."
                          className="w-full bg-[#111] border border-white/10 px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-accent rounded-none transition-colors resize-none"
                          required
                          disabled={savingOverride}
                        />
                        <span className="text-[9px] text-white/30 font-technical">
                          Characters: {overrideReason.trim().length} (min 10, max 500)
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 border-t border-white/5 pt-4 mt-2">
                      {/* Left: Remove allocation if it exists */}
                      {allocationsMap[`${overrideStudent.userId}_${eventId}`] ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleRemoveAllocation}
                          disabled={savingOverride}
                          className="border-red-500/20 bg-red-950/5 hover:bg-red-950/20 text-red-400 px-4"
                          size="sm"
                        >
                          Clear Allocation
                        </Button>
                      ) : (
                        <div />
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setOverrideModalOpen(false)}
                          disabled={savingOverride}
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={savingOverride}
                          size="sm"
                        >
                          {savingOverride ? "Saving..." : "Apply Credit"}
                        </Button>
                      </div>
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
