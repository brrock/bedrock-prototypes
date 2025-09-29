import { z } from 'zod';

export const GlobalServiceSchema = z.object({
  name: z.string().min(1, 'Service name cannot be empty.'),
  description: z.string().optional(),
  exec: z.string().min(1, 'Execution command cannot be empty.'),
  startCommand: z.string().optional(), 
  stopCommand: z.string().optional(), 
  restartCommand: z.string().optional(),
  user: z.string().optional(),
  group: z.string().optional(),
  workingDirectory: z.string().optional(),
  environment: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  autoStart: z.boolean().default(true),
  notes: z.string().optional(),
});

export type GlobalService = z.infer<typeof GlobalServiceSchema>;