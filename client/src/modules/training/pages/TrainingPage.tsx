import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="training_courses" title="Training" subtitle="Manage training courses" apiBase="/training/courses" />;
}