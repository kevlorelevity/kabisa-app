import { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { CatalogView } from './views/CatalogView';
import { ModuleView } from './views/ModuleView';
import { ReviewView } from './views/ReviewView';
import { getAllSRSCards, migrateLegacySRSKeys } from './storage';
import { useModules } from './hooks/useModules';
import { isDue } from './srs';

function AppLayout() {
  const location = useLocation();
  const modules = useModules();

  // Run the legacy SRS key migration once on first mount. Idempotent.
  useEffect(() => {
    migrateLegacySRSKeys(modules);
  }, [modules]);

  // Recompute from localStorage whenever the route changes
  const dueCount = useMemo(() => {
    const cards = getAllSRSCards();
    return Object.values(cards).filter(isDue).length;
  }, [location.pathname]);

  return (
    <>
      <Nav dueCount={dueCount} />
      <main>
        <Routes>
          <Route path="/" element={<CatalogView />} />
          <Route path="/module/:id" element={<ModuleView />} />
          <Route path="/review" element={<ReviewView />} />
        </Routes>
      </main>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
