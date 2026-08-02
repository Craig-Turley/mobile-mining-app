import { asc, eq, sql } from 'drizzle-orm';
import { appDb } from '@/db/app/client';
import { models } from '@/db/app/schema/models';
import { queue, type StoredQueueItem } from '@/db/app/schema/queue';
import { type Entry } from '@/lib/entry';

export type InsertIntoQueueInput = {
  modelApplicationId: number;
  entry: Entry;
};

export type QueueItemWithModel = StoredQueueItem & {
  model: {
    name: string;
  };
};

export function allQueueItemsQuery() {
  return appDb
    .select({
      applicationId: queue.applicationId,
      modelApplicationId: queue.modelApplicationId,
      entry: queue.entry,
      createdAt: queue.createdAt,
      updatedAt: queue.updatedAt,

      model: {
        name: sql<string>`
          json_extract(${models.model}, '$.name')
        `,
      },
    })
    .from(queue)
    .innerJoin(models, eq(queue.modelApplicationId, models.applicationId))
    .orderBy(asc(queue.createdAt), asc(queue.applicationId));
}

export function queueItemByApplicationIdQuery(applicationId: number) {
  return appDb.select().from(queue).where(eq(queue.applicationId, applicationId)).limit(1);
}

export async function insertIntoQueueQuery({ modelApplicationId, entry }: InsertIntoQueueInput) {
  return appDb
    .insert(queue)
    .values({
      modelApplicationId,
      entry,
    })
    .returning();
}

export async function deleteFromQueueQuery(applicationId: number) {
  return appDb.delete(queue).where(eq(queue.applicationId, applicationId)).returning({
    applicationId: queue.applicationId,
  });
}

export async function clearQueueQuery() {
  return appDb.delete(queue).returning({
    applicationId: queue.applicationId,
  });
}
