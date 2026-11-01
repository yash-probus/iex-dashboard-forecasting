import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import Navbar from '../components/Navbar';
import { useTheme } from '../components/ThemeProvider';

// ============================================================================
// 🪐 Fluid Aurora Ambient Mesh (Cinematic Background)
// Vibrant, clearly visible organic ambient gradient orbs with GPU slow-motion drift.
// ============================================================================
function FluidAuroraBackground({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 0 }}
    >
      {/* 1. Aurora Orb: Royal Cobalt Flare (Top Left Quadrant) */}
      <div
        className="absolute -top-[10%] -left-[5%] w-[65vw] h-[65vw] max-w-[900px] max-h-[900px] rounded-full animate-aurora-1 will-change-transform"
        style={{
          filter: 'blur(75px)',
          opacity: isDark ? 0.75 : 0.25,
          mixBlendMode: isDark ? 'screen' : 'normal',
          background: isDark
            ? 'radial-gradient(circle, rgba(37, 99, 235, 0.48) 0%, rgba(59, 130, 246, 0.22) 50%, transparent 72%)'
            : 'radial-gradient(circle, rgba(37, 99, 235, 0.16) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 72%)',
        }}
      />

      {/* 2. Aurora Orb: Kinetic Crimson / Rose Flare (Bottom Right Quadrant) */}
      <div
        className="absolute -bottom-[15%] -right-[5%] w-[60vw] h-[60vw] max-w-[850px] max-h-[850px] rounded-full animate-aurora-2 will-change-transform"
        style={{
          filter: 'blur(75px)',
          opacity: isDark ? 0.7 : 0.22,
          mixBlendMode: isDark ? 'screen' : 'normal',
          background: isDark
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.42) 0%, rgba(225, 29, 72, 0.18) 50%, transparent 72%)'
            : 'radial-gradient(circle, rgba(239, 68, 68, 0.14) 0%, rgba(225, 29, 72, 0.05) 50%, transparent 72%)',
        }}
      />

      {/* 3. Aurora Orb: Cosmic Indigo / Violet Core (Center Moving Orb) */}
      <div
        className="absolute top-[25%] left-[28%] w-[50vw] h-[50vw] max-w-[750px] max-h-[750px] rounded-full animate-aurora-3 will-change-transform"
        style={{
          filter: 'blur(80px)',
          opacity: isDark ? 0.65 : 0.2,
          mixBlendMode: isDark ? 'screen' : 'normal',
          background: isDark
            ? 'radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(6, 182, 212, 0.18) 50%, transparent 72%)'
            : 'radial-gradient(circle, rgba(124, 58, 237, 0.14) 0%, rgba(6, 182, 212, 0.04) 50%, transparent 72%)',
        }}
      />

      {/* 4. High-Tech Precision Cyber Grid Mesh Overlay (Visible in both Dark and Light modes) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px)'
            : 'linear-gradient(rgba(15, 23, 42, 0.048) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.048) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}

export default function DashboardLayout() {
  const { isDark } = useTheme();
  const location = useLocation();

  const isModulePage = location.pathname.startsWith('/forecast') || 
                       location.pathname.startsWith('/database') || 
                       location.pathname.startsWith('/dam') || 
                       location.pathname.startsWith('/gdam') || 
                       location.pathname.startsWith('/rtm') || 
                       location.pathname.startsWith('/rec') || 
                       location.pathname.startsWith('/resource-center') || 
                       location.pathname.startsWith('/market-operations') || 
                       location.pathname.startsWith('/up-market');

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      height: { lg: '100vh' },
      maxHeight: { lg: '100vh' },
      backgroundColor: isDark ? '#070A12' : '#F8FAFC',
      color: isDark ? '#F8FAFC' : '#0F172A',
      transition: 'background-color 250ms ease, color 250ms ease',
      position: 'relative',
      overflow: { xs: 'auto', lg: 'hidden' },
    }}>
      {/* 🪐 Fluid Aurora Ambient Mesh Background */}
      <FluidAuroraBackground isDark={isDark} />

      {/* Navbar Container */}
      <Box sx={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <Navbar />
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: 1, sm: 1.5 },
          pb: isModulePage ? { xs: 2, md: 1 } : { xs: 2, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
          minHeight: 0,
          overflowY: isModulePage ? { xs: 'auto', md: 'hidden' } : 'auto',
        }}
      >
        <Container maxWidth={false} disableGutters sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', px: { xs: 2, sm: 4 }, minHeight: 0, height: '100%' }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
