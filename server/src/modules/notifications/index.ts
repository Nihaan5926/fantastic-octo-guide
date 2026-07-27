import type { Module, ModuleContext } from '../../core/types';
import router from './router';

interface EntityEventPayload {
  entityType: string;
  entityId: string;
  title: string;
  userId: string;
}

const manifest = {
  name: 'notifications',
  version: '1.0.0',
  category: 'Foundation',
  permissions: ['notifications:read'],
  apiPrefix: '/api/notifications',
  navItems: [],
  dashboardWidgets: [
    {
      id: 'notifications-feed',
      title: 'Recent Notifications',
      icon: 'Bell',
      defaultWidth: 4,
      defaultHeight: 2,
    },
  ],
  globalSearchEnabled: false,
} as const;

const notificationsModule: Module = {
  manifest,
  router,
  migrations: [
    {
      name: 'notifications_001_create_table',
      up: async (knex) => {
        if (await knex.schema.hasTable('notifications')) return;
        await knex.schema.createTable('notifications', (t) => {
          t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
          t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').index();
          t.string('type', 100).notNullable();
          t.string('title', 500).notNullable();
          t.text('message').nullable();
          t.boolean('is_read').defaultTo(false).index();
          t.string('related_type', 100).nullable();
          t.uuid('related_id').nullable();
          t.jsonb('metadata').defaultTo('{}');
          t.timestamp('created_at').defaultTo(knex.fn.now());
        });
      },
      down: async (knex) => {
        await knex.schema.dropTableIfExists('notifications');
      },
    },
  ],
  register: (ctx: ModuleContext) => {
    async function createNotification(payload: EntityEventPayload, action: 'created' | 'updated' | 'deleted'): Promise<any> {
      const type = `${payload.entityType}:${action}`;
      const [notification] = await ctx.db('notifications').insert({
        user_id: payload.userId,
        type,
        title: `${payload.entityType.charAt(0).toUpperCase() + payload.entityType.slice(1)} ${action}: ${payload.title}`,
        related_type: payload.entityType,
        related_id: payload.entityId,
        metadata: { action },
      }).returning('*');

      ctx.io.to(`user:${payload.userId}`).emit('notification:new', notification);
      return notification;
    }

    ctx.eventBus.on('entity:created', async (payload: EntityEventPayload) => {
      try {
        await createNotification(payload, 'created');
      } catch (err: any) {
        console.error('[Notifications] Failed to create:', err.message);
      }
    });

    ctx.eventBus.on('entity:updated', async (payload: EntityEventPayload) => {
      try {
        await createNotification(payload, 'updated');
      } catch (err: any) {
        console.error('[Notifications] Failed to create:', err.message);
      }
    });

    ctx.eventBus.on('entity:deleted', async (payload: EntityEventPayload) => {
      try {
        await createNotification(payload, 'deleted');
      } catch (err: any) {
        console.error('[Notifications] Failed to create:', err.message);
      }
    });
  },
};

export default notificationsModule;
