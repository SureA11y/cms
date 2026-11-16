// A Studio for developing and testing the SureA11y plugin against the
// project the maintainer set up for it. Not shipped.
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { table } from '@sanity/table';
import { surea11y } from '@surea11y/sanity';
import { schemaTypes } from './schemas/index.js';

export default defineConfig({
  name: 'default',
  title: 'SureA11y test studio',
  projectId: '1tmgxdtl',
  dataset: 'development',
  plugins: [structureTool(), table(), surea11y()],
  schema: { types: schemaTypes }
});
