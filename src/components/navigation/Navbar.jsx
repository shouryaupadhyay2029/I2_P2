import React, { useState, useEffect } from "react";
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Wordmark } from "./Wordmark";
import { NavGroup, NavLink } from "./NavLink";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { AuthModal } from "../auth/AuthModal";
import { ProfileDropdown } from "./ProfileDropdown";
import { X, LogOut } from "lucide-react";
import { useConfirm } from "../../context/ConfirmContext";
import { cn } from "../../utils/cn";

export const Navbar = () => {
  const { scrollY } = useScroll();
  const { isAuthenticated, user, logout, profile } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();

  const isLightNavbar = location.pathname === '/' || location.pathname.startsWith('/organizer');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  // Continuous scroll-driven values — no binary state flip
  // Background opacity: 0 at top → 0.92 after 300px
  // Border opacity: 0 → 0.04
  // Padding compression: 1.5rem → 0.875rem
  const rawBgOpacity = useTransform(scrollY, [0, 300], [0, 0.92]);
  const bgOpacity = useSpring(rawBgOpacity, { damping: 30, stiffness: 120, mass: 0.5 });
  const borderOpacity = useTransform(scrollY, [0, 250], [0, 0.04]);
  const paddingY = useTransform(scrollY, [0, 200], [1.5, 0.875]);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    const confirmed = await confirm({
      title: "Sign Out",
      message: "You are about to end your current NovaEvent session.",
      variant: "logout",
      confirmText: "Sign Out",
      cancelText: "Cancel"
    });
    if (confirmed) {
      await logout();
    }
  };

  const role = (profile?.role || "student").toLowerCase().trim();
  const showStudio = role === "organizer" || role === "admin";
  const showFaculty = role === "faculty" || role === "admin";
  const showAdmin = role === "admin";

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <motion.header
          className={cn(
            "pointer-events-auto flex items-center justify-between w-full max-w-[1200px] backdrop-blur-md rounded-full px-6 py-2.5 transition-all duration-300",
            isLightNavbar
              ? "bg-white/80 border border-black/[0.06] text-black shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
              : "bg-[#101010]/80 border border-white/[0.08] text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)]"
          )}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Left: Logo */}
          <div className="flex items-center gap-6">
            <Wordmark />
          </div>

          {/* Center: Floating Navigation links */}
          <NavGroup className="hidden lg:flex items-center gap-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/events">Explore</NavLink>
            <NavLink to="/my-events">Events</NavLink>
            <NavLink to="/organizer">Dashboard</NavLink>
            <NavLink to="/events">Search</NavLink>
            <NavLink to="/create-event">Create Event</NavLink>
          </NavGroup>

          {/* Right: Auth / Profile */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                  className={cn(
                    "transition-all",
                    isLightNavbar ? "text-black/60 hover:text-black" : "text-white/60 hover:text-white"
                  )}
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                  className={cn(
                    "transition-all",
                    isLightNavbar
                      ? "bg-black text-white hover:bg-black/90 border border-black/10"
                      : "bg-white text-black hover:bg-white/90 border border-white/20"
                  )}
                >
                  Get Started
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="block">
                  <ProfileDropdown />
                </div>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={cn(
                "lg:hidden p-2 focus:outline-none transition-colors duration-200",
                isLightNavbar ? "text-black/50 hover:text-black" : "text-white/50 hover:text-white/90"
              )}
              aria-label="Open navigation"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="8" x2="21" y2="8" />
                <line x1="3" y1="16" x2="21" y2="16" />
              </svg>
            </button>
          </div>
        </motion.header>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />



      {/* Mobile Bottom Sheet Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex items-end">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet Panel */}
            <motion.div
              initial={{ y: "100%", filter: "blur(8px)" }}
              animate={{ y: 0, filter: "blur(0px)" }}
              exit={{ y: "100%", filter: "blur(8px)" }}
              transition={{ type: "spring", stiffness: 350, damping: 38 }}
              className="relative w-full bg-[#0d0d0d]/90 border-t border-white/10 backdrop-blur-2xl rounded-t-[24px] px-6 pb-8 pt-6 flex flex-col gap-6 shadow-[0_-16px_36px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto select-none"
            >
              {/* Grain Texture */}
              <div
                className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none rounded-t-[24px]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
              />

              {/* Drag Handle Indicator */}
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto -mt-2 mb-1 shrink-0" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
                <Wordmark />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Links Grid / List */}
              <div className="flex flex-col gap-2.5 font-mono text-[0.8rem] uppercase tracking-[0.2em] text-left">
                <span className="text-[0.6rem] text-white/20 font-technical tracking-[0.25em] mb-1">Platform Navigation</span>

                {/* Discover Link */}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate("/"); }}
                  className={cn(
                    "flex items-center justify-between p-3.5 border transition-all duration-300",
                    location.pathname === "/"
                      ? "border-accent/20 bg-accent/5 text-accent font-medium"
                      : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                  )}
                >
                  <span>Discover</span>
                  {location.pathname === "/" && <span className="w-1.5 h-1.5 bg-accent" />}
                </button>

                {/* Events Link */}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate("/events"); }}
                  className={cn(
                    "flex items-center justify-between p-3.5 border transition-all duration-300",
                    location.pathname.startsWith("/events")
                      ? "border-accent/20 bg-accent/5 text-accent font-medium"
                      : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                  )}
                >
                  <span>Events Catalog</span>
                  {location.pathname.startsWith("/events") && <span className="w-1.5 h-1.5 bg-accent" />}
                </button>

                {/* Archive Link */}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate("/about"); }}
                  className={cn(
                    "flex items-center justify-between p-3.5 border transition-all duration-300",
                    location.pathname === "/about"
                      ? "border-accent/20 bg-accent/5 text-accent font-medium"
                      : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                  )}
                >
                  <span>Archive</span>
                  {location.pathname === "/about" && <span className="w-1.5 h-1.5 bg-accent" />}
                </button>

                {/* Authenticated Routes */}
                {isAuthenticated ? (
                  <>
                    <div className="h-[1px] w-full bg-white/5 my-2" />
                    <span className="text-[0.6rem] text-white/20 font-technical tracking-[0.25em] mb-1">User Account</span>

                    {/* Profile */}
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); navigate("/profile"); }}
                      className={cn(
                        "flex items-center justify-between p-3.5 border transition-all duration-300",
                        location.pathname === "/profile"
                          ? "border-accent/20 bg-accent/5 text-accent font-medium"
                          : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                      )}
                    >
                      <span>Profile Registry</span>
                      {location.pathname === "/profile" && <span className="w-1.5 h-1.5 bg-accent" />}
                    </button>

                    {/* My Events */}
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); navigate("/my-events"); }}
                      className={cn(
                        "flex items-center justify-between p-3.5 border transition-all duration-300",
                        location.pathname === "/my-events"
                          ? "border-accent/20 bg-accent/5 text-accent font-medium"
                          : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                      )}
                    >
                      <span>My Registrations</span>
                      {location.pathname === "/my-events" && <span className="w-1.5 h-1.5 bg-accent" />}
                    </button>

                    {/* Organizer Studio */}
                    {showStudio && (
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); navigate("/organizer"); }}
                        className={cn(
                          "flex items-center justify-between p-3.5 border transition-all duration-300",
                          location.pathname.startsWith("/organizer")
                            ? "border-accent/20 bg-accent/5 text-accent font-medium"
                            : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                        )}
                      >
                        <span>Organizer Studio</span>
                        {location.pathname.startsWith("/organizer") && <span className="w-1.5 h-1.5 bg-accent" />}
                      </button>
                    )}

                    {/* Admin Console */}
                    {showAdmin && (
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); navigate("/admin"); }}
                        className={cn(
                          "flex items-center justify-between p-3.5 border transition-all duration-300",
                          location.pathname.startsWith("/admin")
                            ? "border-accent/20 bg-accent/5 text-accent font-medium"
                            : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                        )}
                      >
                        <span>Admin Console</span>
                        {location.pathname.startsWith("/admin") && <span className="w-1.5 h-1.5 bg-accent" />}
                      </button>
                    )}

                    {/* Settings */}
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); navigate("/settings"); }}
                      className={cn(
                        "flex items-center justify-between p-3.5 border transition-all duration-300",
                        location.pathname === "/settings"
                          ? "border-accent/20 bg-accent/5 text-accent font-medium"
                          : "border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                      )}
                    >
                      <span>Settings</span>
                      {location.pathname === "/settings" && <span className="w-1.5 h-1.5 bg-accent" />}
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center justify-between p-3.5 border border-red-500/20 bg-red-950/5 text-red-400/80 hover:text-red-400 hover:bg-red-950/10 transition-all duration-300 mt-2"
                    >
                      <span>Sign Out</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="h-[1px] w-full bg-white/5 my-2" />
                    {/* Login / SignUp buttons for unauthenticated mobile users */}
                    <div className="flex gap-4 w-full mt-2 font-mono text-[0.7rem]">
                      <Button
                        variant="ghost"
                        className="flex-1 py-3.5"
                        onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true); }}
                      >
                        Login
                      </Button>
                      <Button
                        className="flex-1 py-3.5 bg-white text-black hover:bg-white/90 border border-white/10"
                        onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true); }}
                      >
                        Get Started
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
