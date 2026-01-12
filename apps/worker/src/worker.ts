import { Worker } from 'bullmq';
import { prisma } from '@tuvi/db';
import { generateReading } from '@tuvi/ai';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const worker = new Worker(
  'reading',
  async (job) => {
    const { readingId } = job.data as { readingId: string };

    const reading = await prisma.reading.findUnique({
      where: { id: readingId },
      include: {
        submission: {
          include: { chart: true },
        },
        promptVersion: true,
      },
    });

    if (!reading) {
      throw new Error('Reading not found');
    }

    if (!process.env.OPENAI_API_KEY) {
      await prisma.reading.update({
        where: { id: reading.id },
        data: {
          status: 'FAILED',
          readingText: 'OPENAI_API_KEY is not configured. Please set it in .env.',
        },
      });
      return;
    }

    await prisma.reading.update({
      where: { id: reading.id },
      data: { status: 'RUNNING' },
    });

    const prompt = reading.promptVersion;
    const payload = {
      birthInput: reading.submission.birthInput,
      chartJson: reading.submission.chart?.chartJson,
      question: 'Luận quẻ tổng quan',
    };

    const result = await generateReading({
      systemPrompt: prompt.systemPrompt,
      userPayload: payload,
      model: reading.modelName,
      temperature: prompt.temperature ?? undefined,
      maxOutputTokens: prompt.maxOutputTokens ?? undefined,
    });

    await prisma.reading.update({
      where: { id: reading.id },
      data: {
        status: 'DONE',
        readingText: result.text,
        modelName: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      },
    });
  },
  {
    connection: { url: redisUrl },
  }
);

worker.on('failed', async (job, error) => {
  if (!job) {
    return;
  }
  const { readingId } = job.data as { readingId: string };
  await prisma.reading.update({
    where: { id: readingId },
    data: {
      status: 'FAILED',
      readingText: `Worker error: ${error.message}`,
    },
  });
});

process.on('SIGINT', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
