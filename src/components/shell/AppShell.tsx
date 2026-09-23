import React, { useEffect } from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import type { NavigationDestination } from '../../types/cockpit';
import {
  LayoutDashboard,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ClipboardList,
  SlidersHorizontal,
  Sun,
  Moon,
  Wifi,
  CloudRain,
  SunMedium,
  Wind,
  CloudFog,
  Flame,
  AlertTriangle,
  User,
  Truck,
  MonitorPlay,
  Boxes,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    currentDestination,
    setDestination,
    theme,
    toggleTheme,
    isDirectorOpen,
    toggleDirector,
    showSimulation,
    toggleSimulation,
    operatorName,
    operatorId,
    operatorSkill,
    machineModel,
    machineId,
    telemetry,
    weather,
    maxSafeSlopeDeg,
    safetyEvents,
    acknowledgeEvent,
    tickSimulation,
  } = useOperatorStore();

  // Run 1Hz deterministic simulation tick
  useEffect(() => {
    const timer = setInterval(() => {
      tickSimulation();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickSimulation]);

  // Global keyboard shortcut Ctrl+Shift+D for Director Console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleDirector();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDirector]);

  // Find any unacknowledged critical or violation alerts
  const criticalAlert = safetyEvents.find((e) => !e.acknowledged && (e.severity === 'critical' || e.severity === 'violation'));

  const navItems: { id: NavigationDestination; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <LayoutDashboard size={22} /> },
    { id: 'safety', label: 'Safety', icon: <ShieldAlert size={22} /> },
    { id: 'training', label: 'Training', icon: <GraduationCap size={22} /> },
    { id: 'insights', label: 'Insights', icon: <Sparkles size={22} /> },
    { id: 'digest', label: 'Digest', icon: <ClipboardList size={22} /> },
  ];

  const getWeatherIcon = () => {
    switch (weather) {
      case 'rain':
        return <CloudRain size={16} className="text-blue-400" />;
      case 'dust':
        return <Wind size={16} className="text-amber-400" />;
      case 'darkness':
        return <CloudFog size={16} className="text-slate-400" />;
      case 'heat':
        return <Flame size={16} className="text-orange-400" />;
      default:
        return <SunMedium size={16} className="text-amber-400" />;
    }
  };

  return (
    <div className="cockpit-frame">
      {/* Critical Safety Alert Banner Layer */}
      {criticalAlert && (
        <div
          style={{
            background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
            color: '#ffffff',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 999,
            borderBottom: '2px solid rgba(255,255,255,0.3)',
            animation: 'pulse-border-red 1.5s infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {criticalAlert.title}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.95 }}>
                {criticalAlert.triggerValue} — {criticalAlert.reason}
              </div>
            </div>
          </div>
          <button
            onClick={() => acknowledgeEvent(criticalAlert.id)}
            className="cockpit-btn"
            style={{
              background: '#ffffff',
              color: '#dc2626',
              border: 'none',
              fontWeight: 800,
              padding: '8px 20px',
              borderRadius: '6px',
            }}
          >
            Acknowledge Hazard
          </button>
        </div>
      )}

      {/* Main Body Layout (Left Rail + Work Area) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Compact Icon Rail */}
        <aside
          style={{
            width: 'var(--rail-width)',
            background: 'rgba(11, 15, 23, 0.95)',
            borderRight: '1px solid var(--cockpit-glass-border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            zIndex: 100,
            flexShrink: 0,
          }}
        >
          {/* Top Brand Glyph */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                background: 'linear-gradient(135deg, var(--cat-yellow) 0%, var(--cat-yellow-dark) 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0d1117',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '-0.03em',
                boxShadow: '0 4px 12px var(--cat-yellow-glow)',
              }}
              title="Caterpillar Smart Operator Assistant"
            >
              CAT
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
            {navItems.map((item) => {
              const isActive = currentDestination === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setDestination(item.id)}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255, 184, 0, 0.15)' : 'transparent',
                    border: isActive ? '1px solid var(--cat-yellow)' : '1px solid transparent',
                    color: isActive ? 'var(--cat-yellow)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                  title={item.label}
                  aria-label={item.label}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '-10px',
                        width: '4px',
                        height: '24px',
                        background: 'var(--cat-yellow)',
                        borderRadius: '0 4px 4px 0',
                        boxShadow: '0 0 10px var(--cat-yellow)',
                      }}
                    />
                  )}
                  {item.icon}
                  <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, letterSpacing: '0.02em' }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Director Console Trigger */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => toggleDirector()}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '8px',
                background: isDirectorOpen ? 'var(--cat-yellow)' : 'rgba(255, 255, 255, 0.05)',
                color: isDirectorOpen ? '#0d1117' : 'var(--text-muted)',
                border: '1px solid var(--cockpit-glass-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Open Director Console (Ctrl+Shift+D)"
              aria-label="Director Console"
            >
              <SlidersHorizontal size={20} />
              <span style={{ fontSize: '8px', fontWeight: 700 }}>DIRECTOR</span>
            </button>
          </div>
        </aside>

        {/* Content Column (Persistent Status Strip + Work Area) */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* Top Persistent Operator Status Bar */}
          <header
            style={{
              height: 'var(--header-height)',
              background: 'var(--cockpit-panel-bg)',
              backdropFilter: 'var(--cockpit-blur)',
              borderBottom: '1px solid var(--cockpit-glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              zIndex: 90,
              flexShrink: 0,
            }}
          >
            {/* Operator & Machine ID Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'rgba(14, 165, 233, 0.15)',
                    border: '1px solid var(--electric-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--electric-blue)',
                  }}
                >
                  <User size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {operatorName}{' '}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      ({operatorId})
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--electric-blue-light)', fontWeight: 600 }}>
                    {operatorSkill}
                  </div>
                </div>
              </div>

              <div style={{ height: '24px', width: '1px', background: 'var(--cockpit-glass-border)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'rgba(255, 184, 0, 0.15)',
                    border: '1px solid var(--cat-yellow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--cat-yellow)',
                  }}
                >
                  <Truck size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {machineId}{' '}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      ({machineModel})
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="mono-num">
                    Engine: {telemetry.engineHours.toFixed(1)} hrs
                  </div>
                </div>
              </div>
            </div>

            {/* Environment, Telematics & Theme Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Weather & Soil Adaptation Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid var(--cockpit-glass-border)',
                }}
              >
                {getWeatherIcon()}
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {weather}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>• Slope Limit:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: weather === 'rain' ? 'var(--safety-amber)' : 'var(--safety-green)',
                  }}
                  className="mono-num"
                >
                  {maxSafeSlopeDeg}° Max
                </span>
              </div>

              {/* ── Dashboard / 3D Simulation Segmented Toggle ── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(9, 12, 20, 0.85)',
                  border: '1px solid var(--cockpit-glass-border)',
                  borderRadius: '10px',
                  padding: '3px',
                  gap: '2px',
                }}
                title="Switch between Dashboard and 3D Simulation"
              >
                {/* Dashboard segment */}
                <button
                  id="toggle-dashboard"
                  onClick={() => !showSimulation || toggleSimulation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: showSimulation ? 'pointer' : 'default',
                    background: !showSimulation
                      ? 'linear-gradient(135deg, rgba(255,184,0,0.22) 0%, rgba(255,184,0,0.12) 100%)'
                      : 'transparent',
                    color: !showSimulation ? 'var(--cat-yellow)' : 'var(--text-muted)',
                    fontWeight: !showSimulation ? 700 : 500,
                    fontSize: '12px',
                    letterSpacing: '0.03em',
                    transition: 'all 0.2s ease',
                    boxShadow: !showSimulation ? '0 0 10px rgba(255,184,0,0.2)' : 'none',
                    outline: !showSimulation ? '1px solid rgba(255,184,0,0.4)' : 'none',
                  }}
                  aria-label="Show Dashboard"
                  aria-pressed={!showSimulation}
                >
                  <MonitorPlay size={15} />
                  <span>Dashboard</span>
                </button>

                {/* 3D Sim segment */}
                <button
                  id="toggle-simulation"
                  onClick={() => showSimulation || toggleSimulation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: !showSimulation ? 'pointer' : 'default',
                    background: showSimulation
                      ? 'linear-gradient(135deg, rgba(14,165,233,0.22) 0%, rgba(14,165,233,0.10) 100%)'
                      : 'transparent',
                    color: showSimulation ? 'var(--electric-blue)' : 'var(--text-muted)',
                    fontWeight: showSimulation ? 700 : 500,
                    fontSize: '12px',
                    letterSpacing: '0.03em',
                    transition: 'all 0.2s ease',
                    boxShadow: showSimulation ? '0 0 10px rgba(14,165,233,0.2)' : 'none',
                    outline: showSimulation ? '1px solid rgba(14,165,233,0.4)' : 'none',
                  }}
                  aria-label="Show 3D Simulation"
                  aria-pressed={showSimulation}
                >
                  <Boxes size={15} />
                  <span>3D Sim</span>
                </button>
              </div>

              {/* Connection Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--safety-green)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
                className="mono-num"
              >
                <Wifi size={14} />
                <span style={{ fontWeight: 700 }}>RTK Fixed</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>({telemetry.networkLatencyMs}ms)</span>
              </div>

              {/* Day / Night High-Contrast Toggle */}
              <button
                onClick={toggleTheme}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--cockpit-glass-border)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title={`Switch to ${theme === 'night' ? 'Day (High Sunlight)' : 'Night'} Mode`}
                aria-label="Toggle Theme"
              >
                {theme === 'night' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>

          {/* Primary View Container */}
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
