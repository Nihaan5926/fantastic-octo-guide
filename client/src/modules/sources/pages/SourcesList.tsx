import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function SourcesList() {
  return <GenericCrudPage tableName="sources" title="Sources" subtitle="Manage intelligence sources and handlers" apiBase="/sources" />;
}
