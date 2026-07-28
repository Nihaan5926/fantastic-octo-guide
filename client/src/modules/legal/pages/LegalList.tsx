import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="legal_reviews" title="Legal" subtitle="Manage legal reviews" apiBase="/legal" />;
}