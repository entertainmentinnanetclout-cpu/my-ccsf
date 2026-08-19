import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { PilotModeProvider } from './contexts/PilotModeContext';
import { RuntimeControlProvider } from './contexts/RuntimeControlContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DeveloperRoute } from './components/developer/DeveloperRoute';
import { FeatureRoute, RuntimeControlBoundary } from './components/developer/RuntimeControlBoundary';
import { PilotRouteGuard } from './components/pilot/PilotRouteGuard';
import { PilotPostProfileRedirect } from './components/pilot/PilotPostProfileRedirect';
import { OfficialEntryIntentBoundary, PilotEntryIntentBoundary } from './components/pilot/PilotIntentBoundary';
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
import SafetyQuest from './pages/SafetyQuest';
import DeveloperPortalV2 from './pages/DeveloperPortalV2';
import PilotAuth from './pages/pilot/PilotAuth';
import PilotLanding from './pages/pilot/PilotLanding';
import PilotSession from './pages/pilot/PilotSession';
import PilotReportTracking from './pages/pilot/PilotReportTracking';
import PilotReviews from './pages/pilot/PilotReviews';
import PilotReviewManagement from './pages/pilot/PilotReviewManagement';
import PilotResources from './pages/pilot/PilotResources';
import PilotContentManagement from './pages/pilot/PilotContentManagement';
import CampusPilotPage from './pages/pilot/CampusPilotPage';
import SuperAdminPilotPage from './pages/pilot/SuperAdminPilotPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

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
              <RuntimeControlProvider>
                <RuntimeControlBoundary>
                  <PilotModeProvider>
                    <Routes>
                      <Route path="/developer" element={<DeveloperRoute><DeveloperPortalV2 /></DeveloperRoute>} />
                      <Route path="/pilot/auth" element={<PilotEntryIntentBoundary><PilotAuth /></PilotEntryIntentBoundary>} />

                      <Route element={<PilotInstitutionalLayout />}>
                        <Route path="/pilot" element={<ProtectedRoute allowedRoles={['student']}><PilotRouteGuard allowedRoles={['student']}><PilotLanding /></PilotRouteGuard></ProtectedRoute>} />
                        <Route path="/pilot/session/:sessionId" element={<FeatureRoute feature="pilot_reporting"><ProtectedRoute allowedRoles={['student']}><PilotRouteGuard allowedRoles={['student']}><PilotSession /></PilotRouteGuard></ProtectedRoute></FeatureRoute>} />
                        <Route path="/pilot/report/:reportId" element={<FeatureRoute feature="pilot_reporting"><ProtectedRoute allowedRoles={['student', 'security', 'admin']}><PilotRouteGuard allowedRoles={['student', 'security', 'admin']}><PilotReportTracking /></PilotRouteGuard></ProtectedRoute></FeatureRoute>} />
                        <Route path="/pilot/reviews" element={<FeatureRoute feature="pilot_reviews"><ProtectedRoute allowedRoles={['student']}><PilotRouteGuard allowedRoles={['student']}><PilotReviews /></PilotRouteGuard></ProtectedRoute></FeatureRoute>} />
                        <Route path="/pilot/resources" element={<FeatureRoute feature="pilot_resources"><ProtectedRoute allowedRoles={['student']}><PilotRouteGuard allowedRoles={['student']}><PilotResources /></PilotRouteGuard></ProtectedRoute></FeatureRoute>} />
                        <Route path="/pilot/safety-quest" element={<FeatureRoute feature="safety_quest"><ProtectedRoute allowedRoles={['student']}><PilotRouteGuard allowedRoles={['student']}><SafetyQuest /></PilotRouteGuard></ProtectedRoute></FeatureRoute>} />
                        <Route path="/security/pilot" element={<FeatureRoute feature="cps_portal"><FeatureRoute feature="pilot_reporting"><ProtectedRoute allowedRoles={['security', 'admin']}><PilotRouteGuard allowedRoles={['security', 'admin']}><CampusPilotPage /></PilotRouteGuard></ProtectedRoute></FeatureRoute></FeatureRoute>} />
                        <Route path="/security/pilot/reviews" element={<FeatureRoute feature="cps_portal"><FeatureRoute feature="pilot_reviews"><ProtectedRoute allowedRoles={['security', 'admin']}><PilotRouteGuard allowedRoles={['security', 'admin']}><PilotReviewManagement /></PilotRouteGuard></ProtectedRoute></FeatureRoute></FeatureRoute>} />
                        <Route path="/admin/pilot" element={<FeatureRoute feature="admin_portal"><FeatureRoute feature="pilot_reporting"><ProtectedRoute allowedRoles={['admin']}><PilotRouteGuard allowedRoles={['admin']}><SuperAdminPilotPage /></PilotRouteGuard></ProtectedRoute></FeatureRoute></FeatureRoute>} />
                        <Route path="/admin/pilot/reviews" element={<FeatureRoute feature="admin_portal"><FeatureRoute feature="pilot_reviews"><ProtectedRoute allowedRoles={['admin']}><PilotRouteGuard allowedRoles={['admin']}><PilotReviewManagement /></PilotRouteGuard></ProtectedRoute></FeatureRoute></FeatureRoute>} />
                        <Route path="/admin/pilot/content" element={<FeatureRoute feature="admin_portal"><ProtectedRoute allowedRoles={['admin']}><PilotRouteGuard allowedRoles={['admin']}><PilotContentManagement /></PilotRouteGuard></ProtectedRoute></FeatureRoute>} />
                      </Route>

                      <Route path="/safety-quest" element={<FeatureRoute feature="safety_quest"><ProtectedRoute allowedRoles={['student']}><SafetyQuest /></ProtectedRoute></FeatureRoute>} />
                      <Route element={<Layout />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<OfficialEntryIntentBoundary><Auth /></OfficialEntryIntentBoundary>} />
                        <Route path="/dashboard" element={<FeatureRoute feature="official_dashboard"><ProtectedRoute allowedRoles={['student']}><PilotPostProfileRedirect><Dashboard /></PilotPostProfileRedirect></ProtectedRoute></FeatureRoute>} />
                        <Route path="/security/*" element={<FeatureRoute feature="cps_portal"><ProtectedRoute allowedRoles={['security', 'admin']}><Security /></ProtectedRoute></FeatureRoute>} />
                        <Route path="/admin/*" element={<FeatureRoute feature="admin_portal"><ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute></FeatureRoute>} />
                        <Route path="/office" element={<FeatureRoute feature="cps_portal"><ProtectedRoute allowedRoles={['security', 'admin']}><Office /></ProtectedRoute></FeatureRoute>} />
                        <Route path="/profile" element={<ProtectedRoute allowedRoles={['student', 'security', 'admin']}><Profile /></ProtectedRoute>} />
                        <Route path="/profile-completion" element={<ProtectedRoute allowedRoles={['student', 'security', 'admin']}><PilotPostProfileRedirect><ProfileCompletion /></PilotPostProfileRedirect></ProtectedRoute>} />
                        <Route path="/judiciary" element={<FeatureRoute feature="judiciary"><ProtectedRoute allowedRoles={['security', 'admin']}><Judiciary /></ProtectedRoute></FeatureRoute>} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                    <PWAInstallPrompt />
                    <PWAUpdatePrompt />
                  </PilotModeProvider>
                </RuntimeControlBoundary>
              </RuntimeControlProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ApplicationErrorBoundary>
);

export default App;
