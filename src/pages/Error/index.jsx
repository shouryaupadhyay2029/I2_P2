import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { PremiumEmptyState } from '../../components/ui/PremiumEmptyState';

export const ErrorPage = ({ type = '404' }) => {
  const navigate = useNavigate();

  const getErrorContent = () => {
    switch (type) {
      case '403':
        return {
          marker: '403',
          label: 'SYSTEMS EXCEPTION // 403 UNAUTHORIZED',
          title: 'ACCESS RESTRICTED',
          desc: 'Your security profile does not hold the required authorization level to view this route directory. Organizer or Admin privileges are required.',
          actionLabel: 'MAIN DASHBOARD',
          action: () => navigate('/')
        };
      case 'offline':
        return {
          marker: 'NET',
          label: 'SYSTEMS EXCEPTION // NETWORK OFFLINE',
          title: 'NO NETWORK CONNECTION',
          desc: 'Your client local network is currently unreachable. Check your router, local adapters, or active firewalls and retry.',
          actionLabel: 'RETRY',
          action: () => window.location.reload()
        };
      case '500':
      case 'database':
        return {
          marker: '500',
          label: 'SYSTEMS EXCEPTION // 500 DATABASE ERROR',
          title: 'OPERATION EXCEPTION',
          desc: 'The database server responded with an internal exception. This usually indicates a Firestore transaction lockout, network failure, or permission security failure.',
          actionLabel: 'RETRY',
          action: () => window.location.reload()
        };
      case '404':
      default:
        return {
          marker: '404',
          label: 'SYSTEMS EXCEPTION // 404 NOT FOUND',
          title: 'FRAME NOT FOUND',
          desc: 'The requested route address or document ID does not exist in the active records mapping database. It might have been moved or archived.',
          actionLabel: 'GO BACK',
          action: () => navigate(-1)
        };
    }
  };

  const error = getErrorContent();

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="min-h-[75vh] flex flex-col justify-center max-w-xl py-12 md:py-20 text-left relative font-ui">
          <AxisMarker index={error.marker} label="Diagnostic Log" />
          
          <div className="mt-8">
            <PremiumEmptyState 
              type="error"
              title={error.title}
              subtitle={error.desc}
              action={error.action}
              actionLabel={error.actionLabel}
            />
          </div>
        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
