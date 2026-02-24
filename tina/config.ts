import { defineConfig } from 'tinacms';
import { CATEGORY_OPTIONS } from '../src/lib/categories';
import { TOOL_CATEGORY_OPTIONS } from '../src/lib/tool-categories';

export default defineConfig({
  branch: process.env.TINA_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main',
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'uploads',
      publicFolder: 'public',
    },
  },
  schema: {
    collections: [
      {
        name: 'dummy',
        label: 'Dummy',
        path: 'content/dummy',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
          }
        ]
      }
    ],
  },
});
