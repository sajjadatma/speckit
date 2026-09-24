import { ConfigModule } from '@nestjs/config';

import { parseApiEnvironment } from './env.js';

export const appConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validate: (input) => {
    const parsed = parseApiEnvironment(input);

    return {
      ...input,
      corsOrigins: parsed.corsOrigins,
      databaseUrl: parsed.databaseUrl,
      port: parsed.port,
      nodeEnv: parsed.nodeEnv,
    };
  },
});
