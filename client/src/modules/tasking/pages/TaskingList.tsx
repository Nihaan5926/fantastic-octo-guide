import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="tasking_assignments" title="Tasking" subtitle="Manage tasking assignments" apiBase="/tasking" />;
}