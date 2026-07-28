import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="sigint_intercepts" title="SIGINT" subtitle="Manage signals intelligence" apiBase="/sigint" />;
}