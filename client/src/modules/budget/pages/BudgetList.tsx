import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="program_budgets" title="Budget" subtitle="Manage program budgets" apiBase="/budget" />;
}