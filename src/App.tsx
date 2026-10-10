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
import { ProfileView } from './views/ProfileView';
import { FeedbackButton } from './components/FeedbackButton';
import { AdminProvider } from './components/AdminProvider';
import { AuthProvider } from './hooks/AuthProvider';
import { SignInGate } from './components/SignInGate';
import { useEffect } from 'react';
import { loadOverrides } from './lib/contentOverrides';
import { ProgressSync } from './components/ProgressSync';

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
  }, []);
  return (
    <>
      <UpdateBanner />
      <ProgressSync />
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
          {/* Retired surfaces (old module catalog, SRS review) — send old links home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FeedbackButton />
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SignInGate>
          <ProfileProvider>
            <OnboardingGate>
              <AdminProvider>
                <GrammarProvider>
                  <AppLayout />
                </GrammarProvider>
              </AdminProvider>
            </OnboardingGate>
          </ProfileProvider>
        </SignInGate>
      </BrowserRouter>
    </AuthProvider>
  );
}
