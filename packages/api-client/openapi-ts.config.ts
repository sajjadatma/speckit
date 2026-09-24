import { defineConfig } from '@hey-api/openapi-ts';

const outputPath = process.env.OPENAPI_OUTPUT ?? './src/generated';

export default defineConfig({
  input: '../../apps/api/dist/openapi.json',
  output: {
    path: outputPath,
    importFileExtension: '.ts',
    postProcess: ['prettier'],
  },
  plugins: ['@hey-api/typescript', '@hey-api/client-fetch', '@hey-api/sdk'],
});
