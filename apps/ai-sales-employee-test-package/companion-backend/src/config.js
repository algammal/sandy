const CALL_MODES = ['disabled', 'test', 'live'];
const PROVIDERS = ['twilio', 'sip_trunk'];

export function loadConfig(env = process.env) {
  const config = {
    port: Number(env.PORT ?? 8080),
    adminApiToken: env.ADMIN_API_TOKEN ?? '',
    dataDir: env.DATA_DIR ?? './data',
    retentionDays: Number(env.DATA_RETENTION_DAYS ?? 365),
    elevenlabs: {
      apiKey: env.ELEVENLABS_API_KEY ?? '',
      agentId: env.ELEVENLABS_AGENT_ID ?? '',
      phoneNumberId: env.ELEVENLABS_PHONE_NUMBER_ID ?? '',
      provider: env.ELEVENLABS_TELEPHONY_PROVIDER ?? 'twilio',
      webhookSecret: env.ELEVENLABS_WEBHOOK_SECRET ?? '',
      baseUrl: env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io',
    },
    callMode: env.CALL_MODE ?? 'disabled',
    testAllowlist: (env.TEST_ALLOWLIST ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    dryRun: (env.DRY_RUN ?? 'true') !== 'false',
    companyName: env.COMPANY_NAME ?? '',
    agentPersonaName: env.AGENT_PERSONA_NAME ?? 'Sam',
    // Shared secret for the in-call sales_flow_step tool (controller mode). Empty = endpoint disabled.
    salesFlowToolSecret: env.SALES_FLOW_TOOL_SECRET ?? '',
  };

  const errors = [];
  if (config.adminApiToken.length < 24) errors.push('ADMIN_API_TOKEN must be at least 24 characters');
  if (!CALL_MODES.includes(config.callMode)) errors.push(`CALL_MODE must be one of ${CALL_MODES.join(', ')}`);
  if (!PROVIDERS.includes(config.elevenlabs.provider)) {
    errors.push(`ELEVENLABS_TELEPHONY_PROVIDER must be one of ${PROVIDERS.join(', ')}`);
  }
  if (!config.elevenlabs.webhookSecret) errors.push('ELEVENLABS_WEBHOOK_SECRET is required');
  if (config.salesFlowToolSecret && config.salesFlowToolSecret.length < 24) errors.push('SALES_FLOW_TOOL_SECRET must be at least 24 characters');
  if (config.callMode !== 'disabled' && !config.dryRun) {
    for (const [key, value] of [
      ['ELEVENLABS_API_KEY', config.elevenlabs.apiKey],
      ['ELEVENLABS_AGENT_ID', config.elevenlabs.agentId],
      ['ELEVENLABS_PHONE_NUMBER_ID', config.elevenlabs.phoneNumberId],
      ['COMPANY_NAME', config.companyName],
    ]) {
      if (!value || value.startsWith('replace-with')) errors.push(`${key} is required when calls are enabled`);
    }
  }
  if (errors.length) throw new Error(`Invalid configuration:\n- ${errors.join('\n- ')}`);
  return config;
}
