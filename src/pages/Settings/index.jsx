import React, { useState } from 'react';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

export const Settings = () => {
  const { user, resetPassword } = useAuth();
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setLoading(true);
    setError('');
    try {
      const res = await resetPassword(user.email);
      if (res && res.error) {
        setError(res.error);
      } else {
        setResetSent(true);
      }
    } catch (err) {
      console.error("[Settings] Failed to send password reset link:", err);
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="max-w-4xl py-12 md:py-20 flex flex-col gap-16">
          {/* Section Axis Header */}
          <div className="relative">
            <AxisMarker index="01" label="Account Configuration" />
            <h1 className="text-display-lg font-light tracking-tight mt-6 text-primary">Settings</h1>
            <p className="text-body-lg text-secondary max-w-xl mt-4 font-light leading-relaxed">
              Manage your credentials, preferences, and account metadata.
            </p>
          </div>

          {/* Details Stack */}
          <div className="flex flex-col gap-12 pt-8 border-t border-white/5">
            {/* Setting Item: Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 pb-12 border-b border-white/5">
              <div className="flex flex-col gap-2">
                <span className="text-[0.65rem] font-technical uppercase tracking-[0.2em] text-white/30">Section // 01.A</span>
                <h3 className="text-body font-medium text-primary">User Metadata</h3>
              </div>
              <div className="col-span-2 flex flex-col gap-6 font-ui">
                <div className="flex flex-col gap-1.5">
                  <span className="text-micro text-white/30 uppercase tracking-widest">Signed In As</span>
                  <span className="text-body text-primary">{user?.displayName || "Campus Student"}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-micro text-white/30 uppercase tracking-widest">Email Address</span>
                  <span className="text-body text-primary">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Setting Item: Security */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 pb-12 border-b border-white/5">
              <div className="flex flex-col gap-2">
                <span className="text-[0.65rem] font-technical uppercase tracking-[0.2em] text-white/30">Section // 01.B</span>
                <h3 className="text-body font-medium text-primary">Security & Access</h3>
              </div>
              <div className="col-span-2 flex flex-col gap-6">
                <div className="flex flex-col gap-4 items-start">
                  <span className="text-micro text-white/30 uppercase tracking-widest block mb-1">Credential Actions</span>
                  <p className="text-body-s text-secondary leading-relaxed max-w-md">
                    Trigger an official reset link sent directly to your registered email address to change your password safely.
                  </p>
                  
                  {resetSent ? (
                    <div className="text-xs text-green-400 font-technical uppercase tracking-wider py-2 border border-green-500/20 bg-green-950/20 px-4 rounded-none">
                      Reset instructions sent to {user?.email}
                    </div>
                  ) : (
                    <Button 
                      variant="secondary" 
                      onClick={handlePasswordReset} 
                      disabled={loading}
                      size="sm"
                    >
                      {loading ? "Sending..." : "Request Password Reset"}
                    </Button>
                  )}
                  {error && <span className="text-xs text-red-400 font-technical uppercase mt-1">{error}</span>}
                </div>
              </div>
            </div>

            {/* Setting Item: Danger Zone */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 pb-12">
              <div className="flex flex-col gap-2">
                <span className="text-[0.65rem] font-technical uppercase tracking-[0.2em] text-red-500/40">Section // 01.C</span>
                <h3 className="text-body font-medium text-red-400/80">Account Control</h3>
              </div>
              <div className="col-span-2 flex flex-col gap-4 items-start">
                <span className="text-micro text-red-400/40 uppercase tracking-widest block mb-1">Danger Actions</span>
                <p className="text-body-s text-secondary leading-relaxed max-w-md">
                  Once deactivated, all registered events, archives, and custom user profiles will be permanently purged from the campus directories.
                </p>
                <Button 
                  variant="ghost" 
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/10 border border-red-500/20"
                  size="sm"
                  disabled={true}
                >
                  Deactivate Account
                </Button>
                <span className="text-[0.55rem] font-technical uppercase text-white/20">Deactivation is managed by system administrators.</span>
              </div>
            </div>
          </div>
        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
