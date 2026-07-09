import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminCatalogService } from '../src/admin/catalog/admin-catalog.service';

type InsertedRow = Record<string, unknown> & { id: string };

function createService(returnedRows: InsertedRow[]) {
  const insertedValues: unknown[] = [];
  const recordedAudits: unknown[] = [];
  let index = 0;
  const db = {
    insert: () => ({
      values: (value: unknown) => {
        insertedValues.push(value);

        return {
          returning: async () => [returnedRows[index++]],
        };
      },
    }),
  };
  const service = new AdminCatalogService(
    { requireDb: () => db } as never,
    {
      record: async (value: unknown) => {
        recordedAudits.push(value);
      },
    } as never,
  );

  return { service, insertedValues, recordedAudits };
}

void test('admin catalog: create mutations record actor audit entries', async () => {
  const { service, insertedValues, recordedAudits } = createService([
    {
      id: 'category-1',
      slug: 'logos',
      name: 'Logos',
      description: null,
      sortOrder: 0,
    },
    {
      id: 'tag-1',
      slug: 'minimal',
      name: 'Minimal',
    },
    {
      id: 'license-1',
      licenseType: 'standard',
      name: 'Standard',
      description: null,
      priceMultiplier: '1.00',
      allowsCommercialUse: true,
      allowsResale: false,
      allowsModification: true,
      termsMarkdown: null,
    },
  ]);

  await service.createCategory({ slug: 'logos', name: 'Logos', sortOrder: 0 }, 'admin-1');
  await service.createTag({ slug: 'minimal', name: 'Minimal' }, 'admin-1');
  await service.createLicense(
    {
      licenseType: 'standard',
      name: 'Standard',
      priceMultiplier: '1.00',
      allowsCommercialUse: true,
      allowsResale: false,
      allowsModification: true,
    },
    'admin-1',
  );

  assert.equal(insertedValues.length, 3);
  assert.deepEqual(
    recordedAudits.map((audit) => ({
      actorUserId: (audit as { actorUserId: string }).actorUserId,
      action: (audit as { action: string }).action,
      entityType: (audit as { entityType: string }).entityType,
      entityId: (audit as { entityId: string }).entityId,
    })),
    [
      {
        actorUserId: 'admin-1',
        action: 'admin.catalog.create_category',
        entityType: 'category',
        entityId: 'category-1',
      },
      {
        actorUserId: 'admin-1',
        action: 'admin.catalog.create_tag',
        entityType: 'tag',
        entityId: 'tag-1',
      },
      {
        actorUserId: 'admin-1',
        action: 'admin.catalog.create_license',
        entityType: 'license',
        entityId: 'license-1',
      },
    ],
  );
});
