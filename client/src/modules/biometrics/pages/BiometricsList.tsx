import React from 'react';
import GenericCrudPage from '../../../components/common/GenericCrudPage';

export default function Page() {
  return <GenericCrudPage tableName="biometric_records" title="Biometrics" subtitle="Manage biometric records" apiBase="/biometrics" />;
}