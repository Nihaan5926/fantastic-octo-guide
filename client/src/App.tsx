import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/Login';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import DashboardPage from './pages/Dashboard';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';

import reportsModule from './modules/reports';
import sourcesModule from './modules/sources';
import casesModule from './modules/cases';
import evidenceModule from './modules/evidence';
import osintModule from './modules/osint';
import analysisModule from './modules/analysis';
import threatsModule from './modules/threats';
import personnelModule from './modules/personal-management';
import orgChartModule from './modules/org-chart';
import trainingModule from './modules/training';
import watchCenterModule from './modules/watch-center';
import missionsModule from './modules/missions';
import targetingModule from './modules/targeting';
import collectionModule from './modules/collection-mgmt';
import taskingModule from './modules/tasking';
import geointModule from './modules/geoint';
import sigintModule from './modules/sigint';
import ciModule from './modules/ci';
import fintModule from './modules/fint';
import biometricsModule from './modules/biometrics';
import briefingsModule from './modules/briefings';
import messagingModule from './modules/messaging';
import liaisonModule from './modules/liaison';
import legalModule from './modules/legal';
import archiveModule from './modules/archive';
import budgetModule from './modules/budget';
import adminModule from './modules/admin';

const allModules = [
  reportsModule, sourcesModule, casesModule, evidenceModule,
  osintModule, analysisModule, threatsModule,
  personnelModule, orgChartModule, trainingModule, watchCenterModule,
  missionsModule, targetingModule, collectionModule, taskingModule,
  geointModule, sigintModule, ciModule, fintModule, biometricsModule,
  briefingsModule, messagingModule, liaisonModule,
  legalModule, archiveModule, budgetModule,
  adminModule,
];

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function LoadingFallback() {
  return (
    <div className="card text-center py-16">
      <div className="animate-pulse text-text-muted">Loading module...</div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="card text-center py-16">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-text-muted text-sm">Module under construction.</p>
    </div>
  );
}

function wrapWithSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingFallback />}>{element}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
          },
        }}
      />
      <ErrorBoundary>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {allModules.flatMap((mod) =>
              (mod.routes || []).map((r: any) => (
                <Route key={r.path} path={r.path} element={wrapWithSuspense(r.element)} />
              ))
            )}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
