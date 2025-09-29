import * as fs from 'fs';
import * as path from 'path';
import { type SystemdServiceConfig, SystemdServiceSchema } from './schemas/systemd';
import { type OpenRCServiceConfig, OpenRCServiceSchema } from './schemas/openrc';
import { type RunitServiceConfig, RunitServiceSchema } from './schemas/runit';
import type { ServiceInput } from '.'; 

export function parseSystemdServiceFile(filePath: string): { name: string; config: SystemdServiceConfig } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const serviceName = path.basename(filePath, '.service');

  const config: Partial<SystemdServiceConfig> = {
    unit: {},
    service: {
        ExecStart: ''
    },
    install: {},
  };

  let currentSection: 'unit' | 'service' | 'install' | 'unknown' = 'unknown';

  for (const line of content.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith(';')) { 
      continue;
    }

    const sectionMatch = trimmedLine.match(/^\[(Unit|Service|Install)\]$/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase() as 'unit' | 'service' | 'install';
      continue;
    }

    if (currentSection !== 'unknown') {
      const keyValueMatch = trimmedLine.match(/^(\w+)\s*=\s*(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        const value = keyValueMatch[2].trim();

        const target = config[currentSection] as Record<string, any>;

        switch (key) {
          case 'Description':
          case 'Documentation':
          case 'Type':
          case 'ExecStart':
          case 'ExecStop':
          case 'ExecReload':
          case 'User':
          case 'Group':
          case 'WorkingDirectory':
          case 'PIDFile':
            target[key] = value;
            break;
          case 'Environment':
            if (!target.Environment) target.Environment = [];

            target.Environment.push(...value.split(/\s+/).filter(Boolean));
            break;
          case 'After':
          case 'Requires':
          case 'WantedBy':
          case 'RequiredBy':
            if (!target[key]) target[key] = [];

            target[key].push(...value.split(/\s+/).filter(Boolean));
            break;
          default:

            break;
        }
      }
    }
  }

  const validatedConfig = SystemdServiceSchema.parse(config);
  return { name: serviceName, config: validatedConfig };
}

export function parseOpenRCServiceFile(filePath: string): OpenRCServiceConfig {
  const content = fs.readFileSync(filePath, 'utf-8');
  const serviceNameFromFile = path.basename(filePath); 

  const config: Partial<OpenRCServiceConfig> = {
    serviceName: serviceNameFromFile,
    environment: {},
  };

  for (const line of content.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#') || !trimmedLine) continue;

    let match: RegExpMatchArray | null;

    if (!config.description && trimmedLine.match(/^#\s*(.*)/)) {
        config.description = trimmedLine.substring(1).trim();
    }

    match = trimmedLine.match(/^name\s*=\s*['"]?(\S+)['"]?$/);
    if (match) config.serviceName = match[1];

    match = trimmedLine.match(/^command\s*=\s*['"]?(\S+)['"]?$/);
    if (match) config.command = match[1];

    match = trimmedLine.match(/^command_args\s*=\s*['"]?(.*?)['"]?$/);
    if (match) config.command_args = match[1];

    match = trimmedLine.match(/^start_stop_daemon_args\s*=\s*['"]?(.*?)['"]?$/);
    if (match) config.start_stop_daemon_args = match[1];

    match = trimmedLine.match(/^pidfile\s*=\s*['"]?(\S+)['"]?$/);
    if (match) config.pidfile = match[1];

    match = trimmedLine.match(/^user\s*=\s*['"]?(\S+)['"]?$/);
    if (match) config.user = match[1];

    match = trimmedLine.match(/^group\s*=\s*['"]?(\S+)['"]?$/);
    if (match) config.group = match[1];

    match = trimmedLine.match(/^depend\s*=\s*['"]?(.*?)['"]?$/);
    if (match) {
        if (!config.depend) config.depend = [];
        config.depend.push(...match[1].split(/\s+/).filter(Boolean));
    }

    match = trimmedLine.match(/^export\s+(\S+)=['"]?(.*?)['"]?$/);
    if (match && config.environment) {
      config.environment[match[1]] = match[2];
    }
  }

  if (config.depend?.length === 0) config.depend = undefined;

  const validatedConfig = OpenRCServiceSchema.parse(config);
  return validatedConfig;
}

export function parseRunitServiceDirectory(dirPath: string): RunitServiceConfig {
  const serviceName = path.basename(dirPath);
  const runScriptPath = path.join(dirPath, 'run');
  const logRunScriptPath = path.join(dirPath, 'log', 'run');

  if (!fs.existsSync(runScriptPath) || !fs.statSync(runScriptPath).isFile()) {
    throw new Error(`Runit service directory "${dirPath}" does not contain a 'run' script.`);
  }

  const runScriptContent = fs.readFileSync(runScriptPath, 'utf-8');
  let logRunScriptContent: string | undefined;
  if (fs.existsSync(logRunScriptPath) && fs.statSync(logRunScriptPath).isFile()) {
    logRunScriptContent = fs.readFileSync(logRunScriptPath, 'utf-8');
  }

  const config: Partial<RunitServiceConfig> = {
    serviceName: serviceName,
    runScriptContent: runScriptContent,
    logRunScriptContent: logRunScriptContent,
    environment: {},
    dependencies: [], 
  };

  let extractedUser: string | undefined;
  let extractedGroup: string | undefined;

  for (const line of runScriptContent.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#') || !trimmedLine) continue;

    let match: RegExpMatchArray | null;

    match = trimmedLine.match(/^export\s+(\S+)=['"]?(.*?)['"]?$/);
    if (match && config.environment) {
      config.environment[match[1]] = match[2];
    }

    match = trimmedLine.match(/chpst(?:\s-u\s(\S+))?(?:\s-g\s(\S+))?/);
    if (match) {
        if (match[1]) extractedUser = match[1];
        if (match[2]) extractedGroup = match[2];
    }

  }

  if (Object.keys(config.environment || {}).length === 0) config.environment = undefined;
  if (config.dependencies?.length === 0) config.dependencies = undefined;
  if (extractedUser) config.user = extractedUser;
  if (extractedGroup) config.group = extractedGroup;

  const validatedConfig = RunitServiceSchema.parse(config);
  return validatedConfig;
}

export function parseServiceInput(inputPath: string): ServiceInput {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Path does not exist: ${inputPath}`);
  }

  const stats = fs.statSync(inputPath);
  const fileName = path.basename(inputPath);

  if (stats.isFile() && fileName.endsWith('.service')) {

    return { type: 'systemd', ...parseSystemdServiceFile(inputPath) };
  }

  if (stats.isFile() && inputPath.startsWith('/etc/init.d/')) {

    return { type: 'openrc', config: parseOpenRCServiceFile(inputPath) };
  }

  if (stats.isDirectory() && inputPath.includes('/service/')) { 
    const runScriptPath = path.join(inputPath, 'run');
    if (fs.existsSync(runScriptPath) && fs.statSync(runScriptPath).isFile()) {
        return { type: 'runit', config: parseRunitServiceDirectory(inputPath) };
    }
  }

  if (stats.isDirectory()) {
    const runScriptPath = path.join(inputPath, 'run');
    if (fs.existsSync(runScriptPath) && fs.statSync(runScriptPath).isFile()) {
        return { type: 'runit', config: parseRunitServiceDirectory(inputPath) };
    }
  }

  throw new Error(`Could not determine service type for path: ${inputPath}.
    Supported:
    - Systemd: Files ending with .service (e.g., /usr/lib/systemd/system/myapp.service)
    - OpenRC: Files in /etc/init.d/ (e.g., /etc/init.d/myapp)
    - Runit: Directories containing a 'run' script (e.g., /etc/service/myapp/)
  `);
}