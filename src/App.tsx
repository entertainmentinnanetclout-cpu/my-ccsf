import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import { Loader2 } from 'lucide-react';
import React, { Suspense, lazy } from 'react';

const queryClient = new QueryClient();

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/shared/Layout';
import PWAInstallPrompt from './components/shared/PWAInstallPrompt';

const Index = lazy(() => import('./pages/Index'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Office = lazy(() => import('./pages/Office'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileCompletion = lazy(() => import('./pages/ProfileCompletion'));
const Judiciary = lazy(() => import('./pages/Judiciary'));
const Security = lazy(() => import('./pages/Security'));

// PRODUCTION MODE: Authentication required for all protected routes
const DEV_MODE = false;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <Routes>
                <Route element={<Layout />}>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* DEV MODE: Allow direct access to all dashboards */}
                  {DEV_MODE ? (
                    <>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/security/*" element={<Security />} />
                      <Route path="/admin/*" element={<Admin />} />
                      <Route path="/office" element={<Office />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/profile-completion" element={<ProfileCompletion />} />
                      <Route path="/judiciary" element={<Judiciary />} />
                    </>
                  ) : (
                    <>
                      {/* PRODUCTION: Protected routes with role-based access */}
                      <Route path="/dashboard" element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/security/*" element={
                        <ProtectedRoute allowedRoles={['security', 'admin']}>
                          <Security />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/*" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <Admin />
                        </ProtectedRoute>
                      } />
                      <Route path="/office" element={
                        <ProtectedRoute allowedRoles={['security', 'admin']}>
                          <Office />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile" element={
                        <ProtectedRoute allowedRoles={['student', 'security', 'admin']}>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile-completion" element={
                        <ProtectedRoute allowedRoles={['student', 'security', 'admin']}>
                          <ProfileCompletion />
                        </ProtectedRoute>
                      } />
                      <Route path="/judiciary" element={
                        <ProtectedRoute allowedRoles={['security', 'admin']}>
                          <Judiciary />
                        </ProtectedRoute>
                      } />
                    </>
                  )}
                  
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
            <PWAInstallPrompt />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
