import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="org_units" title="Org Chart" subtitle="Manage organizational units" apiBase="/org-chart/units" />;
}