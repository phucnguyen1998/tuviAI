import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Queue } from 'bullmq';
import { prisma } from '@tuvi/db';
import {
  birthInputSchema,
  createCorrectionSchema,
  createPromptVersionSchema,
  createSubmissionSchema,
} from '@tuvi/shared';
import { generateChart } from '@tuvi/tuvi-engine';

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: '*',
});

const adminToken = process.env.ADMIN_TOKEN;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const readingQueue = new Queue('reading', { connection: { url: redisUrl } });

server.get('/health', async () => ({ status: 'ok' }));

server.post('/submissions', async (request, reply) => {
  const parse = createSubmissionSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.status(400).send({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const birthInput = birthInputSchema.parse(parse.data.birthInput);
  const chart = generateChart(birthInput);

  const submission = await prisma.submission.create({
    data: {
      birthInput,
      status: 'CHART_READY',
      chart: {
        create: {
          engineVersion: chart.engineVersion,
          chartJson: chart,
        },
      },
    },
  });

  return { id: submission.id };
});

server.get('/submissions/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      chart: true,
      readings: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!submission) {
    return reply.status(404).send({ error: 'Not found' });
  }

  return submission;
});

server.post('/submissions/:id/readings', async (request, reply) => {
  const { id } = request.params as { id: string };
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) {
    return reply.status(404).send({ error: 'Submission not found' });
  }

  const promptVersion = await prisma.promptVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!promptVersion) {
    return reply.status(400).send({ error: 'No active prompt version' });
  }

  const reading = await prisma.reading.create({
    data: {
      submissionId: submission.id,
      promptVersionId: promptVersion.id,
      modelName: process.env.AI_MODEL || 'gpt-5-mini',
      status: 'QUEUED',
    },
  });

  await readingQueue.add(
    'reading',
    { readingId: reading.id },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );

  return { readingId: reading.id };
});

server.get('/readings/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const reading = await prisma.reading.findUnique({ where: { id } });
  if (!reading) {
    return reply.status(404).send({ error: 'Not found' });
  }

  return reading;
});

server.addHook('onRequest', async (request, reply) => {
  if (!request.url.startsWith('/admin')) {
    return;
  }
  if (!adminToken) {
    return reply.status(500).send({ error: 'ADMIN_TOKEN is not configured' });
  }
  const token = request.headers['x-admin-token'];
  if (token !== adminToken) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
});

server.get('/admin/submissions', async () => {
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      chart: true,
      readings: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  return submissions;
});

server.get('/admin/submissions/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      chart: true,
      readings: {
        orderBy: { createdAt: 'desc' },
        include: { corrections: true },
      },
    },
  });

  if (!submission) {
    return reply.status(404).send({ error: 'Not found' });
  }

  return submission;
});

server.post('/admin/readings/:id/corrections', async (request, reply) => {
  const { id } = request.params as { id: string };
  const parse = createCorrectionSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.status(400).send({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const adminUser = await prisma.user.findFirst({ where: { isAdmin: true } });
  if (!adminUser) {
    return reply.status(400).send({ error: 'Admin user not found' });
  }

  const reading = await prisma.reading.findUnique({ where: { id } });
  if (!reading) {
    return reply.status(404).send({ error: 'Reading not found' });
  }

  const correction = await prisma.correction.create({
    data: {
      readingId: reading.id,
      adminId: adminUser.id,
      type: parse.data.type,
      severity: parse.data.severity,
      correctedText: parse.data.correctedText,
      notes: parse.data.notes,
      span: parse.data.span,
      originalExcerpt: parse.data.originalExcerpt,
    },
  });

  return correction;
});

server.post('/admin/prompt-versions', async (request, reply) => {
  const parse = createPromptVersionSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.status(400).send({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const prompt = await prisma.promptVersion.create({
    data: {
      name: parse.data.name,
      systemPrompt: parse.data.systemPrompt,
      rubric: parse.data.rubric,
      temperature: parse.data.temperature,
      maxOutputTokens: parse.data.maxOutputTokens,
      notes: parse.data.notes,
    },
  });

  return prompt;
});

server.patch('/admin/prompt-versions/:id/activate', async (request, reply) => {
  const { id } = request.params as { id: string };
  const prompt = await prisma.promptVersion.findUnique({ where: { id } });
  if (!prompt) {
    return reply.status(404).send({ error: 'Prompt version not found' });
  }

  await prisma.promptVersion.updateMany({
    data: { isActive: false },
  });

  const updated = await prisma.promptVersion.update({
    where: { id },
    data: { isActive: true },
  });

  return updated;
});

const port = Number(process.env.PORT || 3001);

server
  .listen({ port, host: '0.0.0.0' })
  .catch((error) => {
    server.log.error(error);
    process.exit(1);
  });
