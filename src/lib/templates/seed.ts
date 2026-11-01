import { prisma } from '../prisma';
import { TEMPLATE_CATALOG } from './definitions';

export async function seedTemplates() {
  console.log(`Seeding ${TEMPLATE_CATALOG.length} templates into PostgreSQL...`);
  
  for (const tpl of TEMPLATE_CATALOG) {
    const manifestJson = JSON.stringify({
      fields: tpl.fields,
      collections: tpl.collections || [],
    });

    await prisma.template.upsert({
      where: { code: tpl.code },
      update: {
        name: tpl.name,
        family: tpl.family,
        originalFilename: tpl.originalFilename,
        normalizedFilename: tpl.normalizedFilename,
        format: tpl.format,
        contextLevel: tpl.contextLevel,
        status: tpl.status,
        version: tpl.version,
        description: tpl.description,
        reviewer: tpl.reviewer,
        manifestJson,
      },
      create: {
        code: tpl.code,
        name: tpl.name,
        family: tpl.family,
        originalFilename: tpl.originalFilename,
        normalizedFilename: tpl.normalizedFilename,
        format: tpl.format,
        contextLevel: tpl.contextLevel,
        status: tpl.status,
        version: tpl.version,
        description: tpl.description,
        reviewer: tpl.reviewer,
        manifestJson,
      },
    });
  }

  const count = await prisma.template.count();
  console.log(`Successfully synced ${count} templates in database.`);
  return count;
}

if (require.main === module) {
  seedTemplates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error seeding templates:', err);
      process.exit(1);
    });
}
