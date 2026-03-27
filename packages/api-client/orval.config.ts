import { defineConfig } from 'orval';

export default defineConfig({
  shorterlink: {
    input: {
      target: 'http://localhost:4000/api-json',
    },
    output: {
      target: './src/generated.ts',
      client: 'react-query',
      mode: 'single',
      override: {
        mutator: {
          path: './src/fetcher.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
