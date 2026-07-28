import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="ci_investigations" title="CI" subtitle="Manage counter-intelligence" apiBase="/ci/investigations" />;
}