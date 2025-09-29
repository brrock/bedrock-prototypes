import { z } from 'zod';

export const SystemdServiceSchema = z.object({
  unit: z.object({
    Description: z.string().optional(),
    After: z.array(z.string()).optional(),
    Requires: z.array(z.string()).optional(),
    Documentation: z.string().optional(), 
  }).optional(),
  service: z.object({
    Type: z.enum(['simple', 'forking', 'oneshot', 'notify', 'idle']).default('simple').optional(),
    ExecStart: z.string().min(1, 'Systemd ExecStart command is required.'),
    ExecStop: z.string().optional(),
    ExecReload: z.string().optional(),
    User: z.string().optional(),
    Group: z.string().optional(),
    WorkingDirectory: z.string().optional(),
    Environment: z.array(z.string()).optional(), 
    PIDFile: z.string().optional(), 
  }).optional(),
  install: z.object({
    WantedBy: z.array(z.string()).optional(),
    RequiredBy: z.array(z.string()).optional(),
  }).optional(),
});

export type SystemdServiceConfig = z.infer<typeof SystemdServiceSchema>;