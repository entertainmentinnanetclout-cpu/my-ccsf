import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { PilotModeProvider } from './contexts/PilotModeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PilotRouteGuard } from './components/pilot/PilotRouteGuard';
import { PilotPostProfileRedirect } from './components/pilot/PilotPostProfileRedirect';
import PilotInstitutionalLayout from './components/pilot/PilotInstitutionalLayout';
import Layout from './components/shared/Layout';
import PWAInstallPrompt from './components/shared/PWAInstallPrompt';
import PWAUpdatePrompt from './components/shared/PWAUpdatePrompt';
import { ApplicationErrorBoundary } from './components/shared/ApplicationErrorBoundary';
import { ConnectivityBanner } from './components/shared/ConnectivityBanner';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Office from './pages/Office';
import Profile from './pages/Profile';
import ProfileCompletion from './pages/ProfileCompletion';
import Judiciary from './pages/Judiciary';
import Security from './pages/Security';
import PilotAuth from './pages/pilot/PilotAuth';
import PilotLanding from './pages/pilot/PilotLanding';
import PilotSession from './pages/pilot/PilotSession';
import PilotReportTracking from './pages/pilot/PilotReportTracking';
import PilotResources from './pages/pilot/PilotResources';
import CampusPilotPage from './pages/pilot/CampusPilotPage';
import SuperAdminPilotPage from './pages/pilot/SuperAdminPilotPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ApplicationErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ConnectivityBanner />
          <BrowserRouter>
            <AuthProvider>
              <PilotModeProvider>
                <Routes>
                  <Route path="/pilot/auth" element={<PilotAuth />} />

                  <Route element={<PilotInstitutionalLayout />}>
                    <Route path="/pilot" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <PilotRouteGuard allowedRoles={['student']}><PilotLanding /></PilotRouteGuard>
                      </ProtectedRoute>
                    } />
                    <Route path="/pilot/session/:sessionId" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <PilotRouteGuard allowedRoles={['student']}><PilotSession /></PilotRouteGuard>
                      </ProtectedRoute>
                    } />
                    <Route path="/pilot/report/:reportId" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <PilotRouteGuard allowedRoles={['student']}><PilotReportTracking /></PilotRouteGuard>
                      </ProtectedRoute>
                    } />
                    <Route path="/pilot/resources" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <PilotRouteGuard allowedRoles={['student']}><PilotResources /></PilotRouteGuard>
                      </ProtectedRoute>
                    } />
                    <Route path="/security/pilot" element={
                      <ProtectedRoute allowedRoles={['security', 'admin']}>
                        <PilotRouteGuard allowedRoles={['security', 'admin']}><CampusPilotPage /></PilotRouteGuard>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/pilot" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PilotRouteGuard allowedRoles={['admin']}><SuperAdminPilotPage /></PilotRouteGuard>
                      </ProtectedRoute>
                    } />
                  </Route>

                  <Route element={<Layout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />

                    <Route path="/dashboard" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <PilotPostProfileRedirect><Dashboard /></PilotPostProfileRedirect>
                      </ProtectedRoute>
                    } />
                    <Route path="/security/*" element={
                      <ProtectedRoute allowedRoles={['security', 'admin']}><Security /></ProtectedRoute>
                    } />
                    <Route path="/admin/*" element={
                      <ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>
                    } />
                    <Route path="/office" element={
                      <ProtectedRoute allowedRoles={['security', 'admin']}><Office /></ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute allowedRoles={['student', 'security', 'admin']}><Profile /></ProtectedRoute>
                    } />
                    <Route path="/profile-completion" element={
                      <ProtectedRoute allowedRoles={['student', 'security', 'admin']}><ProfileCompletion /></ProtectedRoute>
                    } />
                    <Route path="/judiciary" element={
                      <ProtectedRoute allowedRoles={['security', 'admin']}><Judiciary /></ProtectedRoute>
                    } />

                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
              </PilotModeProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ApplicationErrorBoundary>
);

export default App;
