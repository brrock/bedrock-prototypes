
import { z } from 'zod';

export const OpenRCServiceSchema = z.object({
  serviceName: z.string().min(1, 'OpenRC service name is required.'),
  command: z.string().optional(),
  command_args: z.string().optional(),
  start_stop_daemon_args: z.string().optional(),
  /** PID file location. */
  pidfile: z.string().optional(),
  user: z.string().optional(),
  group: z.string().optional(),
  depend: z.array(z.string()).optional(),
  environment: z.array(z.string()).optional(),
});

export type OpenRCServiceConfig = z.infer<typeof OpenRCServiceSchema>;