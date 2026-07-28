import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="threat_actors" title="Threat Actors" subtitle="Manage threat actors and indicators" apiBase="/threats" />;
}