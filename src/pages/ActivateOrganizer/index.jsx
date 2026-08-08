import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { redeemInviteToken } from '../../services/inviteService';
import { useAuth } from '../../hooks/useAuth';
import { ArrowRight, Ticket } from 'lucide-react';
import { cn } from '../../utils/cn';

export const ActivateOrganizer = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [toast, setToast] = useState(null);

  // Auto-populate token if present in URL query
  useEffect(() => {
    const tokenQuery = searchParams.get('token');
    if (tokenQuery) {
      setToken(tokenQuery);
    }
  }, [searchParams]);

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleActivation = async (e) => {
    e.preventDefault();
    if (!user?.uid) {
      setErrorMessage("Authentication Required: You must be logged in to activate your access.");
      triggerToast('error', 'Authentication is required.');
      return;
    }
    if (!token.trim()) {
      setErrorMessage("Input Required: Please enter an invitation token.");
      triggerToast('error', 'Token input is blank.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await redeemInviteToken(token.trim(), user.uid);
      if (result.success) {
        setSuccessMessage(`Access Granted: Your profile is now verified as an organizer for "${result.clubName}".`);
        triggerToast('success', 'Activation successful.');
        
        // Wait 2.5 seconds to show the premium success state before redirecting to Organizer Studio
        setTimeout(() => {
          navigate('/organizer');
        }, 2500);
      }
    } catch (err) {
      // The error message from service holds premium, descriptive details (Invalid Token, Expired, Already Used, etc.)
      setErrorMessage(err.message || "Failed to redeem invitation token.");
      triggerToast('error', 'Validation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="min-h-[75vh] flex flex-col justify-center max-w-xl py-12 md:py-20 text-left relative">
          <AxisMarker index="08" label="Organizer Activation" />

          {/* Heading */}
          <div className="flex flex-col mb-8 mt-6">
            <span className="text-[9px] font-technical text-accent uppercase tracking-[0.3em] mb-3 font-medium">
              VERIFICATION // UPGRADE
            </span>
            <h1 className="text-[38px] leading-[1.1] font-display font-extralight text-white tracking-tighter">
              Organizer Invitation
            </h1>
            <p className="text-[13px] font-ui text-white/35 font-light mt-3 leading-relaxed">
              Redeem your invitation token to upgrade your student account to a Verified Organizer. This links your identity to your designated club.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleActivation} className="flex flex-col gap-6 py-6 border-y border-white/[0.05]">
            
            {/* Feedback Notifications */}
            {errorMessage && (
              <div className="text-xs text-red-400 font-technical uppercase border border-red-500/20 bg-red-950/20 px-4 py-3 leading-relaxed">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="text-xs text-green-400 font-technical uppercase border border-green-500/20 bg-green-950/20 px-4 py-3 leading-relaxed animate-pulse">
                {successMessage}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white/15">
                Verification Token Key
              </span>
              <div className="relative w-full group/input flex items-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-white/40 transition-colors z-10 pointer-events-none flex items-center justify-center">
                  <Ticket className="w-3.5 h-3.5" strokeWidth={1.25} />
                </span>
                <input
                  type="text"
                  placeholder="NEX_8A9DKL3M29XK4F7P..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading || !!successMessage}
                  className={cn(
                    "w-full h-[52px] bg-black border border-white/[0.045] rounded-[6px] font-ui text-[13px] text-primary transition-all duration-200",
                    "shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.95)] pr-12 pl-12",
                    "placeholder:text-white/15 focus:outline-none focus:border-accent/30 focus:ring-0 focus:shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.95)]",
                    (loading || !!successMessage) ? "opacity-50 cursor-not-allowed" : ""
                  )}
                />
              </div>
            </div>

            {/* Action CTA (Option A Control Strip Style) */}
            <motion.button
              whileHover={(!loading && !successMessage) ? "hover" : ""}
              className={cn(
                "group/btn relative w-full h-[52px] rounded-[6px] bg-[#141414] border border-white/[0.06] text-white flex items-center justify-between cursor-pointer overflow-hidden transition-colors duration-300 hover:bg-[#191919]",
                (loading || !!successMessage) ? "opacity-50 cursor-not-allowed" : ""
              )}
              type="submit"
              disabled={loading || !!successMessage}
            >
              {/* Top Accent line */}
              <motion.div
                className="absolute top-0 left-0 h-[2px] bg-accent z-10 pointer-events-none"
                initial={{ width: "25%" }}
                variants={{
                  hover: { width: "100%" }
                }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />

              <div className="flex flex-col items-start justify-center pl-4 text-left flex-1 h-full select-none">
                <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white font-light transition-colors group-hover/btn:text-accent">
                  Activate Access
                </span>
                <span className="text-[9px] font-technical uppercase tracking-[0.2em] text-white/30 font-light mt-0.5">
                  Redeem Token // Execute Verification
                </span>
              </div>

              <div className="w-[110px] h-full flex items-center justify-center border-l border-white/[0.06] group-hover/btn:border-white/15 transition-colors duration-300 bg-white/[0.005]">
                {loading ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="text-[9px] font-technical uppercase tracking-[0.2em] text-white/40 font-light group-hover/btn:text-white/60 transition-colors">
                      Execute
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover/btn:text-accent group-hover/btn:translate-x-1 transition-all duration-300" />
                  </div>
                )}
              </div>
            </motion.button>
          </form>

          {/* Toast Notification */}
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
