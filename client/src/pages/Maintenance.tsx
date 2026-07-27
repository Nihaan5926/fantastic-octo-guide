import React from 'react';

export default function MaintenancePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="card text-center max-w-md w-full">
        <div className="text-5xl mb-4">&#128736;</div>
        <h1 className="text-2xl font-bold mb-2">System Maintenance</h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          The platform is currently undergoing scheduled maintenance.
          Administrators can still access the system. Please check back shortly.
        </p>
      </div>
    </div>
  );
}
