import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="fint_entities" title="FININT" subtitle="Manage financial intelligence" apiBase="/fint" />;
}