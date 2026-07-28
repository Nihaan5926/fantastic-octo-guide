import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="target_packages" title="Targeting" subtitle="Manage target packages" apiBase="/targeting" />;
}