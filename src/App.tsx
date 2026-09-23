import { useEffect } from 'react';
import { useOperatorStore } from './store/useOperatorStore';
import { AppShell } from './components/shell/AppShell';
import { TodayView } from './views/TodayView';
import { SafetyView } from './views/SafetyView';
import { TrainingView } from './views/TrainingView';
import { InsightsView } from './views/InsightsView';
import { DigestView } from './views/DigestView';
import { SimulationView } from './views/SimulationView';
import { DirectorConsole } from './components/director/DirectorConsole';
import type { NavigationDestination } from './types/cockpit';

export function App() {
  const { currentDestination, setDestination, showSimulation } = useOperatorStore();

  // Sync route with URL hash for easy direct bookmarking or refreshes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '') as NavigationDestination;
      if (['today', 'safety', 'training', 'insights', 'digest'].includes(hash)) {
        setDestination(hash);
      }
    };

    // Initial check
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setDestination]);

  // Update hash whenever destination changes
  useEffect(() => {
    if (window.location.hash !== `#/${currentDestination}`) {
      window.history.replaceState(null, '', `#/${currentDestination}`);
    }
  }, [currentDestination]);

  const renderActiveView = () => {
    // 3D Simulation overrides the dashboard content area
    if (showSimulation) return <SimulationView />;

    switch (currentDestination) {
      case 'today':
        return <TodayView />;
      case 'safety':
        return <SafetyView />;
      case 'training':
        return <TrainingView />;
      case 'insights':
        return <InsightsView />;
      case 'digest':
        return <DigestView />;
      default:
        return <TodayView />;
    }
  };

  return (
    <AppShell>
      {renderActiveView()}
      <DirectorConsole />
    </AppShell>
  );
}

export default App;
