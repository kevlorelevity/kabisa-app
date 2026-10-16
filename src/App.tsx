import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { UpdateBanner } from './components/UpdateBanner';
import { LessonsView } from './views/LessonsView';
import { PracticeView } from './views/PracticeView';
import { LessonView } from './views/LessonView';
import { DrillView } from './views/DrillView';
import { GrammarView } from './views/GrammarView';
import { GrammarProvider } from './components/GrammarProvider';
import { ProfileProvider } from './hooks/ProfileProvider';
import { OnboardingGate } from './components/OnboardingGate';
import { ConsentGate } from './components/ConsentGate';
import { TermsView } from './views/TermsView';
import { InviteView } from './views/InviteView';
import { claimPendingReferral, loadReferralStats } from './lib/referrals';
import { ProfileView } from './views/ProfileView';
import { AdminProgressView } from './views/AdminProgressView';
import { AdminGrammarView } from './views/AdminGrammarView';
import { FeedbackButton } from './components/FeedbackButton';
import { AdminProvider } from './components/AdminProvider';
import { AuthProvider } from './hooks/AuthProvider';
import { SignInGate } from './components/SignInGate';
import { useEffect, type ReactNode } from 'react';
import { loadOverrides } from './lib/contentOverrides';
import { ProgressSync } from './components/ProgressSync';
import { LeaderboardHost } from './components/LeaderboardHost';
import { InstallHost } from './components/InstallPrompt';

/** A new page (e.g. the next lesson) opens at its top, with the lesson introduction in view. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppLayout() {
  // Admin live edits (content_override) on top of the bundled lesson JSON.
  useEffect(() => {
    void loadOverrides();
    // Signed up through a friend's invite? Credit them now that sign-up is complete.
    void claimPendingReferral().then(() => loadReferralStats(true));
  }, []);
  return (
    <>
      <UpdateBanner />
      <ProgressSync />
      <LeaderboardHost />
      <InstallHost />
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<LessonsView />} />
          <Route path="/lessons" element={<Navigate to="/" replace />} />
          <Route path="/lesson/:id" element={<LessonView />} />
          <Route path="/lesson/:id/practice" element={<PracticeView />} />
          <Route path="/lesson/:id/drill" element={<DrillView />} />
          <Route path="/grammar" element={<GrammarView />} />
          <Route path="/grammar/:slug" element={<GrammarView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/invite" element={<InviteView />} />
          <Route path="/admin/progress" element={<AdminProgressView />} />
          <Route path="/admin/grammar" element={<AdminGrammarView />} />
          <Route path="/admin/grammar/:slug" element={<AdminGrammarView />} />
          {/* Retired surfaces (old module catalog, SRS review) — send old links home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FeedbackButton />
    </>
  );
}

/** Pages anyone can open without signing in (the Terms, linked from sign-up and the landing page). */
function PublicPages({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (pathname === '/terms') return <TermsView />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PublicPages>
          <SignInGate>
            <ProfileProvider>
              <ConsentGate>
                <OnboardingGate>
                  <AdminProvider>
                    <GrammarProvider>
                      <AppLayout />
                    </GrammarProvider>
                  </AdminProvider>
                </OnboardingGate>
              </ConsentGate>
            </ProfileProvider>
          </SignInGate>
        </PublicPages>
      </BrowserRouter>
    </AuthProvider>
  );
}
