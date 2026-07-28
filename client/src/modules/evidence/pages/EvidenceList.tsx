import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="evidence" title="Evidence" subtitle="Manage evidence records" apiBase="/evidence" />;
}