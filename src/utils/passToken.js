/**
 * passToken.js — NexEvent Cryptographic Pass Token Generator
 *
 * Generates ONE unique, cryptographically random pass token per registration.
 *
 * Token format: nxp_<UUID v4>
 * Example:      nxp_550e8400-e29b-41d4-a716-446655440000
 *
 * Invariants:
 * - Uses crypto.randomUUID() — NOT Math.random(), NOT Date.now()
 * - Does NOT depend on userId, eventId, email, or any user data
 * - Returns a fresh unique token on every invocation
 * - Two calls will NEVER produce the same token (UUID v4 collision probability ≈ 1/2^122)
 *
 * USAGE:
 * - Call ONCE during registration write, inside the Firestore transaction
 * - Store the result in Firestore as `passToken`
 * - NEVER call this function during rendering or QR display
 * - NEVER call this function to "refresh" a displayed pass
 */

/**
 * Generates a unique NexEvent pass token.
 * @returns {string} Token in format "nxp_<UUID-v4>"
 */
export const generatePassToken = () => {
  const uuid = crypto.randomUUID();
  return `nxp_${uuid}`;
};
