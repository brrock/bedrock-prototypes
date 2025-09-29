import { z } from 'zod';
import { type GlobalService, GlobalServiceSchema } from './schemas/global';
import type { SystemdServiceConfig } from './schemas/systemd';
import type { OpenRCServiceConfig } from './schemas/openrc';
import type { RunitServiceConfig } from './schemas/runit';

export function convertSystemdToGlobalSimple(
  serviceName: string,
  systemdConfig: SystemdServiceConfig
): GlobalService {
  const service = systemdConfig.service;
  const unit = systemdConfig.unit;
  const install = systemdConfig.install;

  const envVars: Record<string, string> = {};
  if (service?.Environment) {
    service.Environment.forEach(env => {
      const parts = env.split('=');
      if (parts.length > 1) {
        envVars[parts[0]] = parts.slice(1).join('=');
      } else {
        envVars[parts[0]] = ''; 
      }
    });
  }

  const dependencies = [
    ...(unit?.After || []),
    ...(unit?.Requires || []),
  ].filter((dep, i, self) => self.indexOf(dep) === i);

  const globalService: GlobalService = {
    name: serviceName,
    description: unit?.Description,
    exec: service?.ExecStart || '',
    startCommand: service?.ExecStart,
    stopCommand: service?.ExecStop,
    restartCommand: service?.ExecReload,
    user: service?.User,
    group: service?.Group,
    workingDirectory: service?.WorkingDirectory,
    environment: Object.keys(envVars).length > 0 ? Object.entries(envVars).map(([k, v]) => `${k}=${v}`) : undefined,
    dependencies: dependencies.length > 0 ? dependencies : undefined,
    autoStart: !!((install?.WantedBy && install.WantedBy.length > 0) || (install?.RequiredBy && install.RequiredBy.length > 0)),
    notes: `Converted from Systemd (Type: ${service?.Type || 'simple'}). PIDFile: ${service?.PIDFile || 'N/A'}`,
  };

  return GlobalServiceSchema.parse(globalService);
}

export function convertOpenRCToGlobalSimple(
  openrcConfig: OpenRCServiceConfig
): GlobalService {
  let execCommand = '';
  if (openrcConfig.command) {
    execCommand = `${openrcConfig.command} ${openrcConfig.command_args || ''}`.trim();
  } else if (openrcConfig.start_stop_daemon_args) {

    execCommand = `start-stop-daemon ${openrcConfig.start_stop_daemon_args}`;
  }

  const globalService: GlobalService = {
    name: openrcConfig.serviceName,
    description: undefined,
    exec: execCommand || '',
    user: openrcConfig.user,
    group: openrcConfig.group,
    dependencies: openrcConfig.depend?.length ? openrcConfig.depend : undefined,
    environment: openrcConfig.environment,
    autoStart: true, 
    notes: `Converted from OpenRC. PIDFile: ${openrcConfig.pidfile || 'N/A'}.`,
  };

  return GlobalServiceSchema.parse(globalService);
}

export function convertRunitToGlobalSimple(
  runitConfig: RunitServiceConfig
): GlobalService {
  let primaryExec = '';
  let extractedUser = runitConfig.user;
  let extractedGroup = runitConfig.group;

  const runScriptLines = runitConfig.runScriptContent.split('\n')
    .map(line => line.trim())
    .filter(line => !line.startsWith('#') && line.length > 0);

  for (let i = runScriptLines.length - 1; i >= 0; i--) {
    const line = runScriptLines[i];
    if (line.startsWith('exec')) {
      primaryExec = line.substring('exec'.length).trim();
      break;
    } else if (line.startsWith('chpst')) {

      const chpstMatch = line.match(/chpst(?:\s-u\s(\S+))?(?:\s-g\s(\S+))?\s*(.*)/);
      if (chpstMatch) {
        if (chpstMatch[1]) extractedUser = chpstMatch[1];
        if (chpstMatch[2]) extractedGroup = chpstMatch[2];
        primaryExec = chpstMatch[3] || '';
        if (primaryExec.startsWith('exec')) { 
            primaryExec = primaryExec.substring('exec'.length).trim();
        }
        break;
      }
    }
  }

  const globalService: GlobalService = {
    name: runitConfig.serviceName,
    exec: primaryExec || '',
    user: extractedUser,
    group: extractedGroup,
    environment: runitConfig.environment,
    dependencies: runitConfig.dependencies?.length ? runitConfig.dependencies : undefined,
    autoStart: true, 
    notes: 'Converted from runit. `run` script parsing is a simplification; verify `exec` command, user, and group.',
  };

  return GlobalServiceSchema.parse(globalService);
}