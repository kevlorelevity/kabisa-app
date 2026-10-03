import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Nav } from './components/Nav';
import { LessonsView } from './views/LessonsView';
import { PracticeView } from './views/PracticeView';
import { LessonView } from './views/LessonView';
import { DrillView } from './views/DrillView';
import { GrammarView } from './views/GrammarView';
import { GrammarProvider } from './components/GrammarProvider';
import { AuthProvider } from './hooks/AuthProvider';
import { SignInGate } from './components/SignInGate';

function AppLayout() {
  return (
    <>
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
          {/* Retired surfaces (old module catalog, SRS review) — send old links home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SignInGate>
          <GrammarProvider>
            <AppLayout />
          </GrammarProvider>
        </SignInGate>
      </BrowserRouter>
    </AuthProvider>
  );
}
