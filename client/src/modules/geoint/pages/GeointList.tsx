import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="geoint_features" title="GEOINT" subtitle="Manage geospatial intelligence features" apiBase="/geoint/features" />;
}