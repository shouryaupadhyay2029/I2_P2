/**
 * Dynamically resolves the correct event lifecycle status based on dates,
 * times, capacities, and manual override statuses.
 * 
 * LifeCycle States:
 * - draft: Manual override.
 * - archived: Manual override.
 * - completed: Past event duration (start time + 3 hours).
 * - live: Active event window (start time to start time + 3 hours).
 * - closed: Registration closed (past deadline or capacity reached).
 * - open: Registration open (default published active state).
 */
export const resolveEventStatus = (event) => {
  // If explicitly draft, archived, closed, cancelled, completed, or deleted preserve manual state
  const s = (event.status || 'draft').toLowerCase();
  if (s === 'draft' || s === 'archived' || s === 'closed' || s === 'cancelled' || s === 'completed' || s === 'deleted') {
    return s;
  }

  const now = new Date();

  // Parse Event Start Date-Time
  let eventStart = null;
  if (event.date) {
    const timeStr = event.time || '00:00';
    eventStart = new Date(`${event.date}T${timeStr}`);
  }

  // Parse Registration Deadline
  let deadline = null;
  if (event.registrationDeadline) {
    deadline = new Date(`${event.registrationDeadline}T23:59:59`);
  } else if (event.date) {
    // Fallback: deadline is the start time of the event
    const timeStr = event.time || '00:00';
    deadline = new Date(`${event.date}T${timeStr}`);
  }

  // 1. Check if Event is Completed or Live
  if (eventStart && !isNaN(eventStart.getTime())) {
    const eventEnd = new Date(eventStart.getTime() + 3 * 60 * 60 * 1000); // 3-hour default duration
    if (now > eventEnd) {
      return 'completed';
    }
    if (now >= eventStart && now <= eventEnd) {
      return 'live';
    }
  }

  // 2. Check if Registration is Closed
  const capacity = parseInt(event.capacity) || 0;
  const registered = parseInt(event.registeredCount) || 0;
  const isFull = capacity > 0 && registered >= capacity;
  const isPastDeadline = deadline && !isNaN(deadline.getTime()) && now > deadline;

  if (isFull || isPastDeadline) {
    return 'closed';
  }

  // 3. Default state for published events
  return 'open';
};

/**
 * Validates status transitions:
 * - draft -> published (or deleted)
 * - published -> archived | cancelled | completed (or deleted)
 */
export const isValidStatusTransition = (currentStatus, nextStatus) => {
  let current = (currentStatus || 'draft').toLowerCase();
  let next = (nextStatus || 'draft').toLowerCase();

  // Normalize open, closed, live to published
  if (current === 'open' || current === 'closed' || current === 'live') {
    current = 'published';
  }
  if (next === 'open' || next === 'closed' || next === 'live') {
    next = 'published';
  }

  if (current === next) return true;

  if (current === 'draft') {
    return next === 'published' || next === 'deleted';
  }

  if (current === 'published') {
    return next === 'archived' || next === 'cancelled' || next === 'completed' || next === 'deleted';
  }

  return false;
};
