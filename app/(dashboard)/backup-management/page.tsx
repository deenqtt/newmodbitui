// File: app/(dashboard)/backup-management/page.tsx
import { Metadata } from 'next';
import { BackupDashboard } from '@/components/backup/BackupDashboard';

// Page metadata
export const metadata: Metadata = {
  title: 'Backup Management',
  description: 'Manage database and filesystem backups with automated retention policies',
};

export default function BackupManagementPage() {
  return (
    <div className='p-2 m-2'>
      <BackupDashboard />
    </div>
  );
}
