/**
 * clubHours.js — Centralized Club Hours Utilities for NexEvent
 *
 * Handles validation, normalization, and locking checks for event club hours.
 * Invariants:
 * - Hours must be numeric.
 * - Hours must be between 0 and 100.
 * - Hours must be multiples of 0.5 (e.g. 1.5, 8.0, 16.5).
 * - Handles legacy/backward compatibility for old events safely.
 */

/**
 * Normalizes an event's clubHours configuration, returning a safe default
 * if it doesn't exist or is legacy.
 * @param {object} event - Event document data
 * @returns {object} Normalized clubHours configuration
 */
export const normalizeClubHours = (event) => {
  if (!event || !event.clubHours) {
    return {
      enabled: false,
      participationHours: 0,
      organizerHours: 0
    };
  }

  const { enabled, participationHours, organizerHours } = event.clubHours;
  return {
    enabled: !!enabled,
    participationHours: !isNaN(Number(participationHours)) ? Number(participationHours) : 0,
    organizerHours: !isNaN(Number(organizerHours)) ? Number(organizerHours) : 0
  };
};

/**
 * Validates a clubHours configuration object.
 * @param {object} config - Configuration from UI/form
 * @returns {{ valid: boolean, error?: string }} Result of validation
 */
export const validateClubHours = (config) => {
  if (!config) {
    return { valid: false, error: "Configuration is missing." };
  }

  if (config.enabled === undefined) {
    return { valid: false, error: "Enabled parameter is missing." };
  }

  if (!config.enabled) {
    return { valid: true }; // Disabled configuration is always valid
  }

  const partHours = Number(config.participationHours);
  const orgHours = Number(config.organizerHours);

  // Check for NaN or Infinity
  if (isNaN(partHours) || !isFinite(partHours)) {
    return { valid: false, error: "Participation hours must be a valid number." };
  }
  if (isNaN(orgHours) || !isFinite(orgHours)) {
    return { valid: false, error: "Organizer hours must be a valid number." };
  }

  // Range checks
  if (partHours < 0 || partHours > 100) {
    return { valid: false, error: "Participation hours must be between 0 and 100." };
  }
  if (orgHours < 0 || orgHours > 100) {
    return { valid: false, error: "Organizer hours must be between 0 and 100." };
  }

  // 0.5 increment checks
  // Multiples of 0.5 are equivalent to multiples of 1 after multiplying by 2
  if ((partHours * 2) % 1 !== 0) {
    return { valid: false, error: "Participation hours must be in increments of 0.5." };
  }
  if ((orgHours * 2) % 1 !== 0) {
    return { valid: false, error: "Organizer hours must be in increments of 0.5." };
  }

  return { valid: true };
};

/**
 * Checks if an event's clubHours configuration is locked.
 * Locked when clubHoursLocked is true, or if there is at least one active registration.
 * @param {object} event - Event document data
 * @returns {boolean} True if locked
 */
export const isClubHoursLocked = (event) => {
  if (!event) return false;
  return !!event.clubHoursLocked || (Number(event.registeredCount) || 0) > 0;
};

/**
 * Helper to safely extract participation credit hours if enabled.
 * @param {object} event - Event document data
 * @returns {number} Hours
 */
export const getParticipationHours = (event) => {
  const norm = normalizeClubHours(event);
  return norm.enabled ? norm.participationHours : 0;
};

/**
 * Resolves the student's credit state for a given event, registration, allocation, submission, and ledger.
 * Returns one of:
 * - "verified" (ledger entry exists)
 * - "organizer_review" (returned state)
 * - "pending_faculty" (submitted to faculty)
 * - "draft_allocation" (allocation saved as draft by organizer)
 * - "eligible" (verified present, but no draft allocation saved yet)
 * - "attendance_pending" (confirmed registration but not checked in yet)
 * - "not_eligible" (fallback or cancelled)
 * 
 * Priority:
 * 1. IF ledger entry approved -> verified
 * 2. ELSE IF submission returned AND allocation exists -> organizer_review
 * 3. ELSE IF submission pending_faculty AND allocation exists -> pending_faculty
 * 4. ELSE IF allocation exists -> draft_allocation
 * 5. ELSE IF registration attendance verified -> eligible
 * 6. ELSE -> attendance_pending
 */
export const resolveStudentClubCreditState = ({ registration, studentCreditStatus, ledgerEntry }) => {
  if (ledgerEntry && ledgerEntry.status === 'approved') {
    return 'verified';
  }
  
  if (registration?.status === 'cancelled') {
    return 'not_eligible';
  }

  if (studentCreditStatus) {
    if (studentCreditStatus.status === 'organizer_review') {
      return 'organizer_review';
    }
    if (studentCreditStatus.status === 'pending_faculty') {
      return 'pending_faculty';
    }
    if (studentCreditStatus.status === 'draft_allocation') {
      return 'draft_allocation';
    }
  }
  
  const isPresent = registration?.checkedIn === true || registration?.attendanceStatus === 'present';
  if (isPresent) {
    return 'eligible';
  }
  
  if (registration?.status === 'confirmed') {
    return 'attendance_pending';
  }
  
  return 'not_eligible';
};
