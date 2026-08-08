import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { PageContainer } from './components/layout/PageContainer';
import { SectionWrapper } from './components/layout/SectionWrapper';
import { PageTransition } from './components/layout/PageTransition';
import { Button } from './components/ui/Button';
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const SignIn = React.lazy(() => import('./pages/Auth/SignIn').then(m => ({ default: m.SignIn })));
const SignUp = React.lazy(() => import('./pages/Auth/SignUp').then(m => ({ default: m.SignUp })));
const ForgotPassword = React.lazy(() => import('./pages/Auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const CreateEvent = React.lazy(() => import('./pages/CreateEvent').then(m => ({ default: m.CreateEvent })));
const EventDetails = React.lazy(() => import('./pages/EventDetails').then(m => ({ default: m.EventDetails })));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const MyEvents = React.lazy(() => import('./pages/MyEvents').then(m => ({ default: m.MyEvents })));
const Events = React.lazy(() => import('./pages/Events').then(m => ({ default: m.Events })));
const OrganizerStudio = React.lazy(() => import('./pages/Organizer').then(m => ({ default: m.OrganizerStudio })));
const Attendees = React.lazy(() => import('./pages/Organizer/Attendees').then(m => ({ default: m.Attendees })));
const AccessRequired = React.lazy(() => import('./pages/AccessRequired').then(m => ({ default: m.AccessRequired })));
const ActivateOrganizer = React.lazy(() => import('./pages/ActivateOrganizer').then(m => ({ default: m.ActivateOrganizer })));
const AdminConsole = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminConsole })));
const FacultyVerificationDesk = React.lazy(() => import('./pages/Faculty/VerificationDesk').then(m => ({ default: m.FacultyVerificationDesk })));
const ClubHours = React.lazy(() => import('./pages/ClubHours').then(m => ({ default: m.ClubHours })));
const ErrorPage = React.lazy(() => import('./pages/Error').then(m => ({ default: m.ErrorPage })));
const About = React.lazy(() => import('./pages/About').then(m => ({ default: m.About })));

import { ProtectedRoute } from './routes/ProtectedRoute';
import { OrganizerRoute } from './routes/OrganizerRoute';
import { FacultyRoute } from './routes/FacultyRoute';
import { AdminRoute } from './routes/AdminRoute';

const DummyPage = ({ title, desc }) => (
  <PageTransition>
    <PageContainer>
      <SectionWrapper className="min-h-[80vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-display-lg text-primary mb-6">{title}</h1>
        <p className="text-body-lg text-secondary max-w-2xl mx-auto mb-12">
          {desc}
        </p>
        <Button variant="secondary">Back to Top</Button>
      </SectionWrapper>
    </PageContainer>
  </PageTransition>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <LandingPage />
          </PageTransition>
        } />
        
        {/* Event Management Panel */}
        <Route path="/events/create" element={
          <OrganizerRoute>
            <CreateEvent />
          </OrganizerRoute>
        } />
        <Route path="/create-event" element={
          <OrganizerRoute>
            <CreateEvent />
          </OrganizerRoute>
        } />

        {/* Event Details Page */}
        <Route path="/events/:eventId" element={
          <EventDetails />
        } />
        
        {/* Authentication Routes */}
        <Route path="/auth/login" element={
          <PageTransition>
            <SignIn />
          </PageTransition>
        } />
        <Route path="/auth/register" element={
          <PageTransition>
            <SignUp />
          </PageTransition>
        } />
        <Route path="/auth/forgot-password" element={
          <PageTransition>
            <ForgotPassword />
          </PageTransition>
        } />

        {/* Profile & User Routes */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/my-events" element={
          <ProtectedRoute>
            <MyEvents />
          </ProtectedRoute>
        } />
        <Route path="/organizer" element={
          <OrganizerRoute>
            <OrganizerStudio />
          </OrganizerRoute>
        } />
        <Route path="/organizer/events/:eventId/attendees" element={
          <OrganizerRoute>
            <Attendees />
          </OrganizerRoute>
        } />
        <Route path="/access-required" element={
          <AccessRequired />
        } />
        <Route path="/activate-organizer" element={
          <ProtectedRoute>
            <ActivateOrganizer />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminConsole />
          </AdminRoute>
        } />
        <Route path="/faculty" element={
          <FacultyRoute>
            <FacultyVerificationDesk />
          </FacultyRoute>
        } />
        <Route path="/club-hours" element={
          <ProtectedRoute>
            <ClubHours />
          </ProtectedRoute>
        } />

        <Route path="/events" element={
          <PageTransition>
            <Events />
          </PageTransition>
        } />
        <Route path="/discover" element={
          <PageTransition>
            <DummyPage title="Discover" desc="Scroll down to see the transparent navigation bar smoothly transition to a blurred state with a hairline bottom border." />
          </PageTransition>
        } />
        <Route path="/about" element={
          <PageTransition>
            <About />
          </PageTransition>
        } />
        <Route path="/support" element={<DummyPage title="Support" desc="Premium architectural foundation complete." />} />
        <Route path="*" element={<ErrorPage type="404" />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <React.Suspense fallback={
          <div className="min-h-[85vh] flex flex-col items-center justify-center font-ui text-center gap-4 select-none">
            {/* Minimal layout stable loading skeleton matching NexEvent layout styling */}
            <div className="w-10 h-10 border border-white/10 border-t-accent rounded-full animate-spin" />
            <span className="text-micro font-technical uppercase tracking-widest text-white/30 animate-pulse">Loading Workspace...</span>
          </div>
        }>
          <AnimatedRoutes />
        </React.Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
