import React from "react";
import { useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";

/**
 * PremiumEmptyState component containing custom vector illustrations and slow, GPU-accelerated micro-animations.
 * Uses CSS keyframe animations for high performance to keep the main thread idle and maintain stable 60 FPS.
 */
export const PremiumEmptyState = ({
  type = "events",
  title,
  subtitle,
  action,
  actionLabel,
  className
}) => {
  // ── 1. RENDER SVG ILLUSTRATIONS BY VARIANT ──
  const renderIllustration = () => {
    switch (type) {
      case "featured":
        return (
          <svg viewBox="0 0 200 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75" strokeLinecap="square">
            {/* Architectural grid lines */}
            <line x1="10" y1="20" x2="190" y2="20" strokeDasharray="2 4" className="opacity-40" />
            <line x1="10" y1="80" x2="190" y2="80" strokeDasharray="2 4" className="opacity-40" />
            <line x1="30" y1="10" x2="30" y2="90" strokeDasharray="2 4" className="opacity-40" />
            <line x1="170" y1="10" x2="170" y2="90" strokeDasharray="2 4" className="opacity-40" />

            {/* Frame boundary */}
            <rect x="20" y="15" width="160" height="70" stroke="rgba(255,255,255,0.08)" />

            {/* Corner alignment markers */}
            <path d="M 15,15 L 25,15 M 20,10 L 20,20" />
            <path d="M 175,15 L 185,15 M 180,10 L 180,20" />
            <path d="M 15,85 L 25,85 M 20,80 L 20,90" />
            <path d="M 175,85 L 185,85 M 180,80 L 180,90" />

            {/* Central focus marker */}
            <circle cx="100" cy="50" r="10" strokeDasharray="3 3" />
            <circle cx="100" cy="50" r="2" fill="currentColor" className="text-accent opacity-80" />

            {/* Scanning line (Slow vertical loop - GPU translation only) */}
            <line
              x1="22"
              y1="0"
              x2="178"
              y2="0"
              className="stroke-accent/40"
              strokeWidth="1"
              style={{
                animation: "featured-scan 8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite"
              }}
            />

            {/* Orange locator point with slow locator blink */}
            <circle
              cx="45"
              cy="35"
              r="2"
              className="fill-accent"
              style={{
                animation: "locator-blink 8s linear infinite"
              }}
            />
          </svg>
        );

      case "events":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75">
            {/* Grid references */}
            <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="1 3" className="opacity-30" />
            
            {/* Background Event Card Outlines */}
            <rect x="15" y="45" width="55" height="35" rx="1" strokeDasharray="3 2" className="opacity-30" />
            <rect x="22" y="32" width="55" height="35" rx="1" strokeDasharray="3 2" className="opacity-50" />

            {/* Primary Elevated / Active Card */}
            <g
              style={{
                animation: "card-hover 7s ease-in-out infinite"
              }}
            >
              {/* Outer boundary */}
              <rect x="30" y="18" width="55" height="35" rx="1" stroke="rgba(255,255,255,0.2)" />
              {/* Internal technical mockups */}
              <line x1="36" y1="26" x2="60" y2="26" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="36" y1="32" x2="78" y2="32" stroke="rgba(255,255,255,0.08)" />
              <line x1="36" y1="38" x2="70" y2="38" stroke="rgba(255,255,255,0.08)" />
              {/* Orange status tick */}
              <rect x="75" y="24" width="4" height="4" className="fill-accent stroke-none" />
            </g>

            {/* Focus alignment guide marks */}
            <path d="M 8,12 L 12,12 M 10,10 L 10,14" />
            <path d="M 88,88 L 92,88 M 90,86 L 90,90" />
          </svg>
        );

      case "search":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75" strokeLinecap="square">
            {/* Coordinate grid */}
            <circle cx="45" cy="45" r="30" strokeDasharray="1 4" className="opacity-40" />

            {/* Crosshairs */}
            <line x1="45" y1="5" x2="45" y2="85" strokeDasharray="2 3" className="opacity-30" />
            <line x1="5" y1="45" x2="85" y2="45" strokeDasharray="2 3" className="opacity-30" />

            {/* Technical magnifying lens construct */}
            <g>
              {/* Lens housing */}
              <circle cx="45" cy="45" r="20" stroke="rgba(255,255,255,0.25)" />
              {/* Handle blueprint */}
              <line x1="59.14" y1="59.14" x2="80" y2="80" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <line x1="64" y1="68" x2="68" y2="64" stroke="rgba(255,255,255,0.4)" />
              
              {/* Orange focal tick mark */}
              <circle cx="45" cy="45" r="2.5" className="fill-accent stroke-none" />
              
              {/* Animated sweep line (rotating sweep) */}
              <line
                x1="45"
                y1="45"
                x2="45"
                y2="25"
                className="stroke-accent/40"
                strokeWidth="1"
                style={{
                  transformOrigin: "45px 45px",
                  animation: "search-sweep 10s cubic-bezier(0.25, 1, 0.5, 1) infinite"
                }}
              />
            </g>
          </svg>
        );

      case "registrations":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75">
            {/* Alignment frames */}
            <rect x="8" y="8" width="84" height="84" strokeDasharray="10 70" className="opacity-30" />

            {/* NexPass Ticket Outline */}
            <g
              style={{
                animation: "ticket-sway 9s ease-in-out infinite"
              }}
              className="origin-center"
            >
              {/* Ticket borders with perforated cutouts */}
              <path
                d="M 25,20 L 75,20 A 5,5 0 0,1 75,30 L 75,70 A 5,5 0 0,1 75,80 L 25,80 A 5,5 0 0,1 25,70 L 25,30 A 5,5 0 0,1 25,20 Z"
                stroke="rgba(255,255,255,0.22)"
              />
              
              {/* Perforation line */}
              <line x1="36" y1="22" x2="36" y2="78" strokeDasharray="3 3" className="opacity-55" />
              
              {/* Ticket details schema */}
              <circle cx="56" cy="32" r="2.5" className="fill-accent stroke-none" />
              <line x1="48" y1="46" x2="68" y2="46" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
              <line x1="48" y1="54" x2="64" y2="54" stroke="rgba(255,255,255,0.08)" />
              <line x1="48" y1="60" x2="60" y2="60" stroke="rgba(255,255,255,0.08)" />

              {/* Security alignment ticks */}
              <path d="M 28,25 L 32,25" />
              <path d="M 28,75 L 32,75" />
            </g>
          </svg>
        );

      case "clubHours":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75">
            {/* Blueprint guidelines */}
            <line x1="5" y1="20" x2="95" y2="20" className="opacity-30" />
            <line x1="5" y1="80" x2="95" y2="80" className="opacity-30" />

            {/* Technical Ledger Container */}
            <g>
              <rect x="15" y="24" width="70" height="52" stroke="rgba(255,255,255,0.18)" />
              
              {/* Ledger Columns */}
              <line x1="32" y1="24" x2="32" y2="76" className="opacity-30" />
              <line x1="72" y1="24" x2="72" y2="76" className="opacity-30" />

              {/* Rows */}
              <line x1="15" y1="36" x2="85" y2="36" className="opacity-30" strokeDasharray="2 2" />
              <line x1="15" y1="48" x2="85" y2="48" className="opacity-20" />
              <line x1="15" y1="60" x2="85" y2="60" className="opacity-20" />

              {/* Approval stamp outline (Slow fade in/out every 6s) */}
              <g
                style={{
                  transform: "rotate(-12deg) translate(25px, 20px)",
                  transformOrigin: "center",
                  animation: "stamp-pulse 6s ease-in-out infinite"
                }}
              >
                <rect x="25" y="32" width="30" height="13" stroke="#FAFAFA" strokeWidth="1" className="opacity-80" />
                <line x1="28" y1="38" x2="52" y2="38" stroke="#FAFAFA" strokeWidth="1.5" className="opacity-80" />
              </g>
            </g>
          </svg>
        );

      case "organizer":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-[#FAFAFA]/10" fill="none" strokeWidth="0.75" strokeLinecap="square">
            {/* Isometric technical grid nodes */}
            <line x1="15" y1="50" x2="85" y2="50" stroke="rgba(250,250,250,0.12)" />

            {/* Milestone 1 */}
            <circle cx="25" cy="50" r="4.5" stroke="rgba(250,250,250,0.22)" className="bg-black" />
            <circle
              cx="25"
              cy="50"
              r="2"
              className="fill-accent stroke-none"
              style={{
                animation: "node-pulse 8s ease-in-out infinite"
              }}
            />

            {/* Milestone 2 */}
            <circle cx="50" cy="50" r="4.5" stroke="rgba(250,250,250,0.12)" />
            <line x1="50" y1="55" x2="50" y2="70" strokeDasharray="2 2" className="opacity-30" />
            <circle cx="50" cy="70" r="1.5" className="fill-white/20 stroke-none" />

            {/* Milestone 3 */}
            <circle cx="75" cy="50" r="4.5" stroke="rgba(250,250,250,0.12)" />
            <line x1="75" y1="45" x2="75" y2="30" strokeDasharray="2 2" className="opacity-30" />
            <circle cx="75" cy="30" r="1.5" className="fill-white/20 stroke-none" />

            {/* Blueprint measurements */}
            <path d="M 25,35 L 29,35 M 25,35 L 25,45" className="opacity-30" />
            <text x="28" y="32" className="fill-white/15 text-[5px] font-mono tracking-tighter" stroke="none">WORKSPACE_00</text>
          </svg>
        );

      case "faculty":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-[#FAFAFA]/10" fill="none" strokeWidth="0.75">
            {/* Clipboard technical body */}
            <rect x="25" y="16" width="50" height="68" rx="1.5" stroke="rgba(250,250,250,0.18)" />

            {/* Clipboard Clip */}
            <path d="M 40,16 L 40,12 L 60,12 L 60,16 Z" stroke="rgba(250,250,250,0.3)" fill="rgba(250,250,250,0.03)" />
            <circle cx="50" cy="18" r="1" className="fill-accent stroke-none" />

            {/* Internal Sheet Text Blueprint */}
            <line x1="34" y1="32" x2="66" y2="32" stroke="rgba(250,250,250,0.12)" />
            <line x1="34" y1="40" x2="58" y2="40" stroke="rgba(250,250,250,0.08)" />
            <line x1="34" y1="48" x2="62" y2="48" stroke="rgba(250,250,250,0.08)" />
            <line x1="34" y1="56" x2="52" y2="56" stroke="rgba(250,250,250,0.08)" />

            {/* Empty check-marker placeholder */}
            <rect x="34" y="66" width="6" height="6" stroke="rgba(250,250,250,0.15)" />
            <path
              d="M 36,69 L 38,71 L 42,67"
              stroke="#FAFAFA"
              strokeWidth="1.25"
              style={{
                animation: "draw-check 7s cubic-bezier(0.16, 1, 0.3, 1) infinite"
              }}
            />
          </svg>
        );

      case "notifications":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75">
            {/* Coordinate grid circle */}
            <circle cx="50" cy="50" r="38" strokeDasharray="1 6" className="opacity-30" />

            {/* Central hub node */}
            <circle cx="50" cy="50" r="4.5" stroke="rgba(255,255,255,0.25)" />
            <circle cx="50" cy="50" r="2.5" className="fill-accent stroke-none" />

            {/* Connection Node 1 */}
            <line x1="50" y1="50" x2="25" y2="30" className="opacity-30" />
            <circle cx="25" cy="30" r="3.5" stroke="rgba(255,255,255,0.15)" />
            <circle cx="25" cy="30" r="1.5" className="fill-white/10 stroke-none" />

            {/* Connection Node 2 */}
            <line x1="50" y1="50" x2="75" y2="30" className="opacity-30" />
            <circle cx="75" cy="30" r="3.5" stroke="rgba(255,255,255,0.15)" />
            <circle cx="75" cy="30" r="1.5" className="fill-white/10 stroke-none" />

            {/* Connection Node 3 */}
            <line x1="50" y1="50" x2="50" y2="76" className="opacity-30" />
            <circle cx="50" cy="76" r="3.5" stroke="rgba(255,255,255,0.15)" />
            <circle
              cx="50"
              cy="76"
              r="1.5"
              className="fill-accent stroke-none"
              style={{
                animation: "node-blink 6s linear infinite"
              }}
            />
          </svg>
        );

      case "bookmarks":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75" strokeLinecap="square">
            {/* Tech grid coordinate plane */}
            <line x1="50" y1="10" x2="50" y2="90" strokeDasharray="2 4" className="opacity-25" />
            <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="2 4" className="opacity-25" />

            {/* Outlined Bookmark Ribbon */}
            <g
              style={{
                animation: "bookmark-sway 8s ease-in-out infinite"
              }}
              className="origin-top"
            >
              {/* Ribbon Border */}
              <path
                d="M 38,20 L 62,20 L 62,75 L 50,65 L 38,75 Z"
                stroke="rgba(255,255,255,0.22)"
                fill="rgba(255,255,255,0.01)"
              />
              
              {/* Inner geometric markings */}
              <line x1="43" y1="28" x2="57" y2="28" stroke="rgba(255,255,255,0.12)" />
              <line x1="43" y1="36" x2="57" y2="36" stroke="rgba(255,255,255,0.12)" />
              <circle cx="50" cy="48" r="2" className="fill-accent stroke-none" />
            </g>
          </svg>
        );

      case "archive":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75">
            {/* Grid references */}
            <rect x="5" y="5" width="90" height="90" strokeDasharray="3 15" className="opacity-20" />

            {/* Shelf blueprint outline */}
            <line x1="15" y1="74" x2="85" y2="74" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
            <line x1="15" y1="77" x2="85" y2="77" stroke="rgba(255,255,255,0.1)" />

            {/* Folders */}
            <g
              style={{
                animation: "folder-breathing 8s ease-in-out infinite"
              }}
            >
              {/* Folder 1 */}
              <path d="M 22,74 L 22,35 L 32,35 L 35,40 L 44,40 L 44,74 Z" stroke="rgba(255,255,255,0.18)" />
              <circle cx="33" cy="57" r="1.5" className="fill-white/10 stroke-none" />

              {/* Folder 2 (Slightly tilted) */}
              <path
                d="M 48,74 L 48,35 L 58,35 L 61,40 L 70,40 L 70,74 Z"
                stroke="rgba(255,255,255,0.22)"
                style={{
                  transform: "rotate(3deg) translate(-2px, -3px)",
                  transformOrigin: "48px 74px"
                }}
              />
              <circle cx="59" cy="57" r="1.5" className="fill-accent stroke-none" />
            </g>

            {/* Structural notches */}
            <path d="M 12,74 L 15,74 M 85,74 L 88,74" />
          </svg>
        );

      case "error":
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/10" fill="none" strokeWidth="0.75" strokeLinecap="square">
            {/* Technical warning panel */}
            <polygon points="50,15 88,80 12,80" stroke="rgba(255,255,255,0.18)" />
            <polygon points="50,20 84,77 16,77" stroke="rgba(255,255,255,0.05)" />

            {/* Central alert locator marker */}
            <line x1="50" y1="36" x2="50" y2="56" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            
            <circle
              cx="50"
              cy="65"
              r="2"
              className="fill-accent stroke-none"
              style={{
                animation: "locator-blink 2s linear infinite"
              }}
            />

            {/* Diagnostic guidelines */}
            <line x1="5" y1="50" x2="15" y2="50" />
            <line x1="85" y1="50" x2="95" y2="50" />
          </svg>
        );
    }
  };

  // ── 2. ESTABLISH TYPOGRAPHIC DEFAULTS BY VARIANT ──
  const getDefaults = () => {
    switch (type) {
      case "featured":
        return {
          label: "DISCOVERY ENGINE // FEATURED EMPTY",
          title: "FEATURED ARCHIVE EMPTY",
          subtitle: "The discovery engine is awaiting the next featured showcase.",
        };
      case "events":
        return {
          label: "DISCOVERY ENGINE // EMPTY",
          title: "No events available yet.",
          subtitle: "Create your first event to begin accepting registrations.",
          actionLabel: "CLEAR FILTERS"
        };
      case "search":
        return {
          label: "SEARCH INDEX // NO RECORDS",
          title: "SEARCH RETURNED ZERO MATCHES",
          subtitle: "No records correspond to the current query.",
          actionLabel: "RESET SEARCH"
        };
      case "registrations":
        return {
          label: "PASS SYSTEM // VACANT",
          title: "No Registrations",
          subtitle: "Registrations will appear here once attendees begin signing up.",
          actionLabel: "DISCOVER EVENTS"
        };
      case "clubHours":
        return {
          label: "LEDGER INDEX // EMPTY",
          title: "NO DATA RECORDED",
          subtitle: "Activity logs will appear here after validation.",
        };
      case "organizer":
        return {
          label: "WORKSPACE // INITIAL",
          title: "NO EVENTS PUBLISHED",
          subtitle: "Create your first event to initialize your organizer workspace.",
          actionLabel: "CREATE EVENT"
        };
      case "faculty":
        return {
          label: "VERIFICATION DESK // CLEAR",
          title: "NO SUBMISSIONS WAITING",
          subtitle: "All pending submissions have been reviewed.",
        };
      case "notifications":
        return {
          label: "COMMUNICATION MUX // INBOX",
          title: "You're all caught up.",
          subtitle: "There are currently no new notifications.",
        };
      case "bookmarks":
        return {
          label: "USER ARCHIVE // BOOKMARKS",
          title: "NO SAVED EVENTS",
          subtitle: "Bookmark interesting experiences to access them later.",
        };
      case "archive":
        return {
          label: "ARCHIVAL RETRIEVAL // EMPTY",
          title: "ARCHIVE NOT INITIALIZED",
          subtitle: "Completed events will appear here.",
        };
      case "error":
        return {
          label: "SYSTEMS EXCEPTION // INTERRUPT",
          title: "SYNC INTERRUPTED",
          subtitle: "Connection to the archive service could not be established.",
          actionLabel: "RETRY"
        };
      default:
        return {
          label: "ARCHIVAL REGISTRY // VACANT",
          title: "NO DATA AVAILABLE",
          subtitle: "The registry directory is currently empty.",
        };
    }
  };

  const defaults = getDefaults();
  const activeLabel = defaults.label;
  const activeTitle = title || defaults.title;
  const activeSubtitle = subtitle || defaults.subtitle;
  const activeActionLabel = actionLabel || defaults.actionLabel;

  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div
      className={cn(
        "w-full py-20 px-8 flex flex-col items-center justify-center text-center relative select-none overflow-hidden border transition-all duration-300",
        isHome 
          ? "bg-black/[0.01] border-black/[0.06] text-black" 
          : "bg-[#070707] border-white/5 text-primary",
        type === "featured" ? "py-16 aspect-[21/9]" : "",
        className
      )}
    >
      {/* Dynamic inline styles to register performant GPU keyframes exactly once */}
      <style>{`
        @keyframes featured-scan {
          0% { transform: translateY(15px); opacity: 0; }
          8% { opacity: 0.45; }
          45% { opacity: 0.45; }
          55% { transform: translateY(75px); opacity: 0.05; }
          100% { transform: translateY(75px); opacity: 0; }
        }
        @keyframes locator-blink {
          0%, 85%, 100% { opacity: 0.25; }
          90%, 95% { opacity: 1; }
        }
        @keyframes card-hover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes search-sweep {
          0% { transform: rotate(0deg); }
          12% { transform: rotate(360deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ticket-sway {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(1deg) translateY(-2px); }
        }
        @keyframes stamp-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.75; }
        }
        @keyframes draw-check {
          0%, 80%, 100% { stroke-dasharray: 20; stroke-dashoffset: 20; }
          30%, 65% { stroke-dasharray: 20; stroke-dashoffset: 0; }
        }
        @keyframes node-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes node-blink {
          0%, 88%, 100% { opacity: 0.15; }
          92%, 96% { opacity: 1; }
        }
        @keyframes bookmark-sway {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes folder-breathing {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.985); }
        }
      `}</style>

      {/* Architectural blueprint grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* ── 3. ILLUSTRATION CONTAINER ── */}
      <div
        className={cn(
          "relative z-10 w-24 h-24 mb-6 text-white/25 flex items-center justify-center",
          type === "featured" ? "w-56 h-28 mb-3" : ""
        )}
      >
        {renderIllustration()}
      </div>

      {/* ── 4. TYPOGRAPHY CONTENT BLOCK ── */}
      <span className="text-[0.6rem] font-technical text-accent uppercase tracking-[0.35em] mb-3 relative z-10">
        {activeLabel}
      </span>
      
      <h3 className={cn(
        "text-display-s text-primary mb-3 font-light uppercase tracking-tight relative z-10",
        type === "featured" ? "text-display-xs mb-2" : ""
      )}>
        {activeTitle}
      </h3>
      
      <p className={cn(
        "text-body-s text-secondary max-w-sm font-light mb-6 relative z-10 leading-relaxed",
        type === "featured" ? "max-w-md mb-0" : ""
      )}>
        {activeSubtitle}
      </p>

      {/* ── 5. OPTIONAL ACTIONS (CTA) ── */}
      {action && activeActionLabel && type !== "featured" && (
        <button
          type="button"
          onClick={action}
          className="relative z-10 px-5 py-2 text-micro font-technical uppercase tracking-wider text-white/80 bg-transparent border border-white/10 hover:border-accent hover:bg-accent/[0.04] transition-all duration-180 cursor-pointer"
        >
          {activeActionLabel}
        </button>
      )}
    </div>
  );
};
