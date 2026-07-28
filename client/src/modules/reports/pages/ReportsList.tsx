import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="intelligence_reports" title="Reports" subtitle="Manage intelligence reports" apiBase="/reports" />;
}