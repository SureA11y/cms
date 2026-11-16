// A Studio for developing and testing the SureA11y plugin against the
// project the maintainer set up for it. Not shipped.
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { table } from '@sanity/table';
import { surea11y } from '@surea11y/sanity';
import { schemaTypes } from './schemas/index.js';

export default defineConfig({
  name: 'default',
  title: 'SureA11y test studio',
  projectId: '1tmgxdtl',
  dataset: 'development',
  plugins: [
    structureTool(),
    // The live preview of the test website (dev/preview-site).
    presentationTool({
      previewUrl: { origin: 'http://localhost:3334', preview: '/?id=surea11y-test-article' }
    }),
    table(),
    surea11y({ previewOrigins: ['http://localhost:3334'] })
  ],
  schema: { types: schemaTypes }
});
