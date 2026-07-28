import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="external_partners" title="Liaison" subtitle="Manage external partners" apiBase="/liaison" />;
}