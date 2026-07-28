import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="entity_relationships" title="Relationships" subtitle="Manage entity relationships" apiBase="/analysis/relationships" />;
}