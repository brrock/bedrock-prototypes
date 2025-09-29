import { z } from 'zod';
import { type GlobalService, GlobalServiceSchema } from './schemas/global';
import { type SystemdServiceConfig, SystemdServiceSchema } from './schemas/systemd';
import { OpenRCServiceSchema, type OpenRCServiceConfig } from './schemas/openrc';
import { RunitServiceSchema, type RunitServiceConfig } from './schemas/runit';
import {
  convertSystemdToGlobalSimple,
  convertOpenRCToGlobalSimple,
  convertRunitToGlobalSimple,
} from './converters';
import { parseServiceInput } from './parsers'; 

export type ServiceInput =
  | { type: 'systemd'; name: string; config: SystemdServiceConfig }
  | { type: 'openrc'; config: OpenRCServiceConfig }
  | { type: 'runit'; config: RunitServiceConfig };

export const ServiceInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('systemd'), name: z.string(), config: SystemdServiceSchema }),
  z.object({ type: z.literal('openrc'), config: OpenRCServiceSchema }),
  z.object({ type: z.literal('runit'), config: RunitServiceSchema }),
]);

export function convertService(input: ServiceInput): GlobalService {
  const validatedInput = ServiceInputSchema.parse(input);

  switch (validatedInput.type) {
    case 'systemd':
      return convertSystemdToGlobalSimple(validatedInput.name, validatedInput.config);
    case 'openrc':
      return convertOpenRCToGlobalSimple(validatedInput.config);
    case 'runit':
      return convertRunitToGlobalSimple(validatedInput.config);
    default:

      throw new Error(`Unsupported service type: ${(validatedInput as any).type}`);
  }
}

export function main() {
    const inputPath = process.argv[2]; 
    if (!inputPath) {
        console.error('Usage: bun index.ts <path-to-service-file-or-directory>');
        process.exit(1);
    }

    try {

        const parsedInput: ServiceInput = parseServiceInput(inputPath);

        const result = convertService(parsedInput);

        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Schema Validation Error during parsing or conversion:');

            error.errors.forEach(err => {
                console.error(`- Path: ${err.path.join('.') || 'root'} | Message: ${err.message}`);
            });
        } else if (error instanceof Error) {
            console.error('Error processing service input:', error.message);
        } else {
            console.error('An unexpected error occurred:', error);
        }
        process.exit(1);
    }
}

main();