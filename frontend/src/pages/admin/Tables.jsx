import React from 'react';
import CafeTableManager from '../../components/CafeTableManager.jsx';

export default function AdminTables() {
  return (
    <div style={{ maxWidth: '1200px' }}>
      <CafeTableManager canManage={true} />
    </div>
  );
}
