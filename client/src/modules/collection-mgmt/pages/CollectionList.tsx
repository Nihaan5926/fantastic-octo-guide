import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="collection_requirements" title="Collection" subtitle="Manage collection requirements" apiBase="/collection" />;
}