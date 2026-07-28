import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="personnel_records" title="Directory" subtitle="Manage personnel records" apiBase="/personnel" />;
}