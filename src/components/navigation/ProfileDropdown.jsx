import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmContext';
import { useMagnet } from '../../hooks/useMagnet';
import { 
  User, 
  Ticket, 
  Calendar, 
  Shield, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1];

export const ProfileDropdown = () => {
  const { user, profile, logout } = useAuth();
  const confirm = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [ringActive, setRingActive] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Avatar magnetic pull (stronger — 7px, it's a small target)
  const { ref: avatarRef, x: avatarX, y: avatarY, handlers: avatarHandlers } = useMagnet({
    maxDelta: 7,
    damping: 22,
    stiffness: 240,
  });

  // Close on outside click / Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    const confirmed = await confirm({
      title: 'Sign Out',
      message: 'You are about to end your current NovaEvent session.',
      variant: 'logout',
      confirmText: 'Sign Out',
      cancelText: 'Cancel'
    });
    if (confirmed) {
      await logout();
    }
  };

  const getInitial = () => user?.displayName?.[0] || user?.email?.[0] || 'U';

  const role = (profile?.role || 'student').toLowerCase().trim();
  const showStudio = role === 'organizer' || role === 'admin';
  const showAdmin = role === 'admin';

  const menuItems = [
    { label: 'Profile', to: '/profile', icon: User },
    { label: 'My Events', to: '/my-events', icon: Ticket },
    ...(showStudio ? [{ label: 'Organizer Studio', to: '/organizer', icon: Calendar }] : []),
    ...(showAdmin ? [{ label: 'Admin Dashboard', to: '/admin', icon: Shield }] : []),
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 8, 
      scale: 0.98 
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.18,
        ease: EASE,
        staggerChildren: 0.02
      }
    },
    exit: {
      opacity: 0,
      y: 8,
      scale: 0.98,
      transition: {
        duration: 0.15,
        ease: EASE
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 4 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.2, ease: EASE }
    }
  };

  const isAcmUser = profile?.clubId === 'bUV2wixWWSV61cUexUY7' || (profile?.clubName && profile.clubName.toLowerCase().trim() === 'acm');
  const avatarUrl = isAcmUser ? '/club-logos/acm-logo.png' : (profile?.avatar || user?.photoURL);
  const displayName = profile?.displayName || user?.displayName || 'User';
  const email = profile?.email || user?.email || '';

  let badgeLabel = 'Attendee';
  if (role === 'admin') {
    badgeLabel = 'Administrator';
  } else if (role === 'faculty' || role === 'organizer') {
    badgeLabel = 'Organizer';
  }

  return (
    <div className="relative font-sans text-black" ref={dropdownRef}>
      {/* Avatar Button */}
      <motion.button
        ref={avatarRef}
        style={{ x: avatarX, y: avatarY }}
        {...avatarHandlers}
        whileTap={{ scale: 0.93, transition: { duration: 0.13, ease: EASE } }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setRingActive(true)}
        onMouseLeave={() => setRingActive(false)}
        animate={{
          boxShadow: ringActive ? '0 4px 12px rgba(0,0,0,0.1)' : '0 0px 0px rgba(0,0,0,0)'
        }}
        transition={{ duration: 0.22, ease: EASE }}
        className="w-9 h-9 rounded-full bg-[#111] border border-white/[0.09] text-white flex items-center justify-center font-display text-base uppercase focus:outline-none relative z-50 will-change-transform"
        aria-label="Open profile menu"
      >
        {/* Soft inner glow on hover */}
        <motion.span
          className="absolute inset-0 rounded-full"
          animate={{ opacity: ringActive ? 1 : 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
        />
        {avatarUrl ? (
          <motion.img
            src={avatarUrl}
            alt={displayName}
            width={36}
            height={36}
            animate={{ scale: ringActive ? 1.05 : 1 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="w-full h-full object-cover rounded-full relative z-10"
          />
        ) : (
          <motion.span 
            animate={{ scale: ringActive ? 1.05 : 1 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="relative z-10 text-white/80 group-hover:text-white transition-colors duration-200"
          >
            {getInitial()}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ backgroundColor: '#F5F3EE' }}
            className="absolute right-0 top-[calc(100%+14px)] w-[calc(100vw-32px)] sm:w-[380px] rounded-[24px] border border-black/[0.08] backdrop-blur-[18px] shadow-[0_20px_40px_rgba(0,0,0,0.06)] flex flex-col z-50 p-6 gap-4 overflow-hidden"
          >
            {/* Overlay background for glassmorphism */}
            <div className="absolute inset-0 bg-white/75 pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col w-full h-full gap-4">
              {/* Profile Header */}
              <div className="flex items-start gap-4 pb-4 border-b border-black/[0.06]">
                <div className="w-14 h-14 rounded-full border border-black/[0.08] bg-black/[0.02] flex items-center justify-center font-display text-lg uppercase text-black shrink-0 relative overflow-hidden select-none">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={displayName} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    getInitial()
                  )}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <h3 className="text-[17px] font-semibold text-black leading-snug truncate">
                    {displayName}
                  </h3>
                  <p className="text-[14px] text-black/50 truncate max-w-full leading-normal mb-2 select-all font-sans">
                    {email}
                  </p>
                  <span className="inline-block px-2.5 py-1 text-[11px] font-medium rounded-full bg-black/[0.04] border border-black/[0.06] text-black/75 w-fit">
                    {badgeLabel}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="flex flex-col gap-1.5 py-1">
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      variants={itemVariants}
                      type="button"
                      onClick={() => { setIsOpen(false); navigate(item.to); }}
                      className="w-full px-3 py-2.5 rounded-[12px] flex items-center justify-between text-left transition-all duration-200 hover:bg-black/[0.03] hover:translate-x-1 group cursor-pointer text-black/75 hover:text-black focus:outline-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <IconComponent size={18} className="text-black/50 group-hover:text-black transition-colors" />
                        <span className="text-[14px] font-medium">{item.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-black/35 group-hover:text-black/60 transition-colors" />
                    </motion.button>
                  );
                })}

                {/* Sign Out Item */}
                <motion.button
                  variants={itemVariants}
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2.5 rounded-[12px] flex items-center justify-between text-left transition-all duration-200 hover:bg-red-500/[0.04] hover:translate-x-1 group cursor-pointer text-black/75 hover:text-red-600 focus:outline-none"
                >
                  <div className="flex items-center gap-3.5">
                    <LogOut size={18} className="text-black/50 group-hover:text-red-600 transition-colors" />
                    <span className="text-[14px] font-medium">Sign Out</span>
                  </div>
                  <ChevronRight size={14} className="text-black/35 group-hover:text-red-600 transition-colors" />
                </motion.button>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 text-[12px] text-black/40 border-t border-black/[0.06] pt-4 select-none">
                <ShieldCheck size={14} className="text-black/40" />
                <span>Signed in securely</span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
