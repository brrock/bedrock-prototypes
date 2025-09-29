import { z } from 'zod';

export const RunitServiceSchema = z.object({
  serviceName: z.string().min(1, 'Runit service name is required.'),
  runScriptContent: z.string().min(1, 'Runit `run` script content is required.'),
  logRunScriptContent: z.string().optional(),
  user: z.string().optional(),
  group: z.string().optional(),
  environment: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});

export type RunitServiceConfig = z.infer<typeof RunitServiceSchema>;