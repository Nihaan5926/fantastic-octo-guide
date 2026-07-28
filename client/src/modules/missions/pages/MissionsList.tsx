import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="mission_plans" title="Missions" subtitle="Manage mission plans" apiBase="/missions" />;
}