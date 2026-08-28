import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { CatalogView } from './views/CatalogView';
import { ModuleView } from './views/ModuleView';
import { ReviewView } from './views/ReviewView';
import { LessonsView } from './views/LessonsView';
import { LessonView } from './views/LessonView';
import { migrateLegacySRSKeys } from './storage';
import { useModules } from './hooks/useModules';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthProvider } from './hooks/AuthProvider';
import { SignInGate } from './components/SignInGate';
import { SRSProvider } from './hooks/SRSProvider';
import { useSRS } from './hooks/useSRS';

function AppLayout() {
  const modules = useModules();
  const { dueCount } = useSRS();

  // Run the legacy SRS key migration once on first mount. Idempotent.
  // Only meaningful for the offline/localStorage path — once Supabase owns
  // SRS state, the legacy ksa_srs keys aren't read for display, so skip the
  // pointless localStorage write.
  useEffect(() => {
    if (isSupabaseConfigured()) return;
    migrateLegacySRSKeys(modules);
  }, [modules]);

  return (
    <>
      <Nav dueCount={dueCount} />
      <main>
        <Routes>
          <Route path="/" element={<CatalogView />} />
          <Route path="/module/:id" element={<ModuleView />} />
          <Route path="/lessons" element={<LessonsView />} />
          <Route path="/lesson/:id" element={<LessonView />} />
          <Route path="/review" element={<ReviewView />} />
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
          <SRSProvider>
            <AppLayout />
          </SRSProvider>
        </SignInGate>
      </BrowserRouter>
    </AuthProvider>
  );
}
