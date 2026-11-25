import { PrismaClient, UserRole } from '@prisma/client';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { hashPassword } from '../src/lib/auth';

const STATUTORY_EIP_CATALOG = [
  {
    code: 'EIP-INC-01',
    name: 'Încălțăminte antiderapantă bucătar (OB-E-A-FO SRC)',
    standardCode: 'EN ISO 20347',
    protectionType: 'Antialunecare',
    replacementMonths: 12,
  },
  {
    code: 'EIP-BON-01',
    name: 'Bonetă bucătar / beretă protecție păr',
    standardCode: 'HACCP / EN 340',
    protectionType: 'Igienic',
    replacementMonths: 6,
  },
  {
    code: 'EIP-HAL-01',
    name: 'Halat / tunică albă bucătar bumbac',
    standardCode: 'EN 340',
    protectionType: 'Termic',
    replacementMonths: 12,
  },
  {
    code: 'EIP-SOR-01',
    name: 'Șorț impermeabil protecție stropire',
    standardCode: 'EN 340',
    protectionType: 'Mecanic',
    replacementMonths: 12,
  },
  {
    code: 'EIP-MAN-01',
    name: 'Mănuși termoprotectoare cuptor',
    standardCode: 'EN 407',
    protectionType: 'Termic',
    replacementMonths: 12,
  },
  {
    code: 'EIP-BOC-01',
    name: 'Bocanci protecție S3 SRC bombeu compozit',
    standardCode: 'EN ISO 20345',
    protectionType: 'Mecanic',
    replacementMonths: 12,
  },
  {
    code: 'EIP-MAN-02',
    name: 'Mănuși electroizolante joasă tensiune',
    standardCode: 'EN 60903',
    protectionType: 'Electric',
    replacementMonths: 12,
  },
  {
    code: 'EIP-OCH-01',
    name: 'Ochelari protecție ecran filtru lumină albastră',
    standardCode: 'EN 166',
    protectionType: 'Optic',
    replacementMonths: 24,
  },
] as const;

interface InitialUserSpec {
  role: UserRole;
  username: string;
  email: string;
  name: string;
  password: string;
}

function resolveInitialUsers(): InitialUserSpec[] {
  const defaultPassword = process.env.INIT_DEFAULT_PASSWORD?.trim() || '';

  const specs: Array<{
    role: UserRole;
    envPrefix: string;
    defaultUsername: string;
    defaultEmail: string;
    defaultName: string;
  }> = [
    {
      role: 'ADMIN',
      envPrefix: 'INIT_ADMIN',
      defaultUsername: 'admin',
      defaultEmail: 'admin@ssm.ro',
      defaultName: 'Administrator',
    },
    {
      role: 'SSM',
      envPrefix: 'INIT_SSM',
      defaultUsername: 'ssm',
      defaultEmail: 'ssm@ssm.ro',
      defaultName: 'Specialist SSM',
    },
    {
      role: 'HR',
      envPrefix: 'INIT_HR',
      defaultUsername: 'hr',
      defaultEmail: 'hr@ssm.ro',
      defaultName: 'Resurse Umane',
    },
    {
      role: 'IGIENA',
      envPrefix: 'INIT_IGIENA',
      defaultUsername: 'igiena',
      defaultEmail: 'igiena@ssm.ro',
      defaultName: 'Inspector Igienă',
    },
  ];

  const missingOrWeak: string[] = [];
  const resolved: InitialUserSpec[] = [];

  for (const spec of specs) {
    const username = process.env[`${spec.envPrefix}_USERNAME`]?.trim() || spec.defaultUsername;
    const email = (process.env[`${spec.envPrefix}_EMAIL`]?.trim() || spec.defaultEmail).toLowerCase();
    const name = process.env[`${spec.envPrefix}_NAME`]?.trim() || spec.defaultName;
    const password = process.env[`${spec.envPrefix}_PASSWORD`]?.trim() || defaultPassword;

    if (!password || password.length < 6) {
      missingOrWeak.push(`${spec.role} (${spec.envPrefix}_PASSWORD sau INIT_DEFAULT_PASSWORD)`);
    }

    resolved.push({
      role: spec.role,
      username,
      email,
      name,
      password,
    });
  }

  if (missingOrWeak.length > 0) {
    throw new Error(
      `[bootstrap] Lipsesc parolele inițiale sau au sub 6 caractere pentru rolurile: ${missingOrWeak.join(', ')}. ` +
        'Setează INIT_DEFAULT_PASSWORD (minim 6 caractere) sau parolele specifice INIT_*_PASSWORD în variabilele de mediu Coolify înainte de prima pornire.'
    );
  }

  return resolved;
}

async function syncTemplates(prisma: PrismaClient): Promise<number> {
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

  return prisma.template.count();
}

async function seedInitialEipCatalog(prisma: PrismaClient): Promise<number> {
  const existingCount = await prisma.eipItem.count();
  if (existingCount > 0) {
    console.log(`[bootstrap] Catalog EIP există deja (${existingCount} articole), se păstrează.`);
    return existingCount;
  }

  for (const item of STATUTORY_EIP_CATALOG) {
    await prisma.eipItem.create({
      data: {
        code: item.code,
        name: item.name,
        standardCode: item.standardCode,
        protectionType: item.protectionType,
        replacementMonths: item.replacementMonths,
      },
    });
  }

  const count = await prisma.eipItem.count();
  console.log(`[bootstrap] Catalog EIP inițializat: ${count} articole standard.`);
  return count;
}

async function seedInitialUsers(prisma: PrismaClient): Promise<number> {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`[bootstrap] Utilizatorii există deja (${existingUsers}), parolele existente nu sunt modificate.`);
    return existingUsers;
  }

  const users = resolveInitialUsers();
  for (const user of users) {
    await prisma.user.create({
      data: {
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: hashPassword(user.password),
        isActive: true,
      },
    });
  }

  const count = await prisma.user.count();
  console.log(`[bootstrap] Inițializați ${count} utilizatori RBAC din variabilele de mediu.`);
  return count;
}

export async function bootstrap(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    console.log('[bootstrap] Pornire bootstrap sistem (fără date demo de firme/angajați)...');

    const templatesCount = await syncTemplates(prisma);
    const eipCount = await seedInitialEipCatalog(prisma);
    const usersCount = await seedInitialUsers(prisma);

    const [clientsCount, employeesCount, providersCount] = await Promise.all([
      prisma.client.count(),
      prisma.employee.count(),
      prisma.ssmProvider.count(),
    ]);

    console.log(
      `[bootstrap] Finalizat: users=${usersCount}, templates=${templatesCount}, eipItems=${eipCount}, ` +
        `clients=${clientsCount}, employees=${employeesCount}, providers=${providersCount}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('[bootstrap] EROARE CRITICĂ:', err);
    process.exit(1);
  });
}
