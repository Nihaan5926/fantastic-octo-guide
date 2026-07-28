import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="cases" title="Cases" subtitle="Manage investigation cases" apiBase="/cases" />;
}