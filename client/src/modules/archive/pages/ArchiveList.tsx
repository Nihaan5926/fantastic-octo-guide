import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="archive_records" title="Archive" subtitle="Manage archived records" apiBase="/archive" />;
}