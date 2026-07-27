import type { Module, ModuleContext } from '../../core/types';
import router from './router';
import { db } from '../../db/knex';
import { logger } from '../../utils/logger';

const manifest = {
  name: 'archive',
  version: '1.0.0',
  category: 'Oversight',
  permissions: ['archive:read', 'archive:create', 'archive:update', 'archive:delete'],
  apiPrefix: '/api/archive',
  navItems: [
    { label: 'Archive', path: '/archive', icon: 'Archive', category: 'OVERSIGHT', order: 42 },
  ],
  dashboardWidgets: [
    { id: 'archive-status', title: 'Archive Status', icon: 'Archive', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

let retentionInterval: ReturnType<typeof setInterval> | null = null;

const mod: Module = {
  manifest,
  router,
  migrations: [],
  register: (_ctx: ModuleContext) => {
    if (retentionInterval) clearInterval(retentionInterval);
    retentionInterval = setInterval(async () => {
      try {
        const destroyedAt = new Date().toISOString();
        const records = await db('archive_records')
          .where('status', '!=', 'DESTROYED')
          .whereNotNull('destruction_date')
          .where('destruction_date', '<=', db.raw('CURRENT_DATE'));
        for (const record of records) {
          const existingMeta = typeof record.metadata === 'string'
            ? JSON.parse(record.metadata || '{}')
            : (record.metadata || {});
          const updatedMeta = JSON.stringify({ ...existingMeta, destroyed_at: destroyedAt });
          await db('archive_records').where({ id: record.id }).update({ status: 'DESTROYED', metadata: updatedMeta });
          logger.info(`Archive retention: destroyed record ${record.reference_number || record.id}`, { recordId: record.id });
        }
        if (records.length > 0) {
          logger.info(`Retention schedule processed: ${records.length} record(s) destroyed`);
        }
      } catch (e: any) {
        logger.error('Archive retention schedule error', { error: e.message });
      }
    }, 3600000); // Check every hour
    logger.info('Archive retention schedule started (hourly check)');
  },
};
export default mod;
