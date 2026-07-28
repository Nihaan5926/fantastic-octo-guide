import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="watch_logs" title="Watch Center" subtitle="Manage watch center logs" apiBase="/watch-center/logs" />;
}