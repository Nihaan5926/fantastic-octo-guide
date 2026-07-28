import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="briefings" title="Briefings" subtitle="Manage intelligence briefings" apiBase="/briefings" />;
}