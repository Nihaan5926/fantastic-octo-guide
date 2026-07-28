import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="osint_collection_tasks" title="OSINT Tasks" subtitle="Manage OSINT collection tasks" apiBase="/osint/tasks" />;
}