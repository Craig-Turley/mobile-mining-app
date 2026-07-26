import { asc, eq, sql } from 'drizzle-orm';

import { appDb } from '@/db/app/client';
import { models } from '@/db/app/schema/models';
import {
  queue,
  type StoredQueueItem,
} from '@/db/app/schema/queue';
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
    .innerJoin(
      models,
      eq(queue.modelApplicationId, models.applicationId),
    )
    .orderBy(
      asc(queue.createdAt),
      asc(queue.applicationId),
    );
}

export function queueItemByApplicationIdQuery(
  applicationId: number,
) {
  return appDb
    .select()
    .from(queue)
    .where(eq(queue.applicationId, applicationId))
    .limit(1);
}

export async function getQueueItems(): Promise<
  QueueItemWithModel[]
> {
  return allQueueItemsQuery();
}

export async function getQueueItemByApplicationId(
  applicationId: number,
): Promise<StoredQueueItem | null> {
  const [storedQueueItem] =
    await queueItemByApplicationIdQuery(applicationId);

  return storedQueueItem ?? null;
}

export async function insertIntoQueue({
  modelApplicationId,
  entry,
}: InsertIntoQueueInput): Promise<StoredQueueItem> {
  const [storedQueueItem] = await appDb
    .insert(queue)
    .values({
      modelApplicationId,
      entry,
    })
    .returning();

  if (!storedQueueItem) {
    throw new Error('Failed to insert item into queue');
  }

  return storedQueueItem;
}

export async function deleteFromQueue(
  applicationId: number,
): Promise<number | null> {
  const [deletedQueueItem] = await appDb
    .delete(queue)
    .where(eq(queue.applicationId, applicationId))
    .returning({
      applicationId: queue.applicationId,
    });

  return deletedQueueItem?.applicationId ?? null;
}

export async function clearQueue(): Promise<number> {
  const deletedQueueItems = await appDb
    .delete(queue)
    .returning({
      applicationId: queue.applicationId,
    });

  return deletedQueueItems.length;
}
