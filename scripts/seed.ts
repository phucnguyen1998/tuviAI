import { prisma } from '../packages/db/src/index.js';

const DEFAULT_PROMPT = `Bạn là trợ lý tử vi. Hãy luận quẻ tổng quan, rõ ràng, ngắn gọn, có cấu trúc.`;

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@tuvi.local' },
    update: { isAdmin: true, displayName: 'Admin' },
    create: {
      email: 'admin@tuvi.local',
      displayName: 'Admin',
      isAdmin: true,
    },
  });

  const prompt = await prisma.promptVersion.upsert({
    where: { name: 'reading_v1' },
    update: {
      systemPrompt: DEFAULT_PROMPT,
      isActive: true,
    },
    create: {
      name: 'reading_v1',
      systemPrompt: DEFAULT_PROMPT,
      isActive: true,
      notes: 'Seeded prompt version',
    },
  });

  await prisma.promptVersion.updateMany({
    where: {
      id: { not: prompt.id },
    },
    data: { isActive: false },
  });

  console.log('Seeded:', { adminUser: adminUser.id, promptVersion: prompt.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
