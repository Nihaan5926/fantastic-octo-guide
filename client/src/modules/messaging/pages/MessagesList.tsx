import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="message_channels" title="Messaging" subtitle="Manage message channels" apiBase="/messaging/channels" />;
}