#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { build } from 'esbuild';

const apiSrc = 'api';
const apiDest = '.vercel/functions';

// Clean and create destination directory
function cleanDir(dir) {
  if (existsSync(dir)) {
    execSync(`rm -rf ${dir}`);
  }
  mkdirSync(dir, { recursive: true });
}

// Compile TypeScript to JavaScript using esbuild
async function compileTsFile(srcFile) {
  const relPath = relative(apiSrc, srcFile);
  const destPath = join(apiDest, relPath).replace('.ts', '.js');

  // Get the directory and create it if needed
  const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
  mkdirSync(destDir, { recursive: true });

  // Use esbuild to compile the TypeScript file to JavaScript
  await build({
    entryPoints: [srcFile],
    outfile: destPath,
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    external: ['stripe'], // Don't bundle stripe, let Vercel handle it
    minify: false,
    sourcemap: false,
  });

  console.log(`Compiled: ${relPath} -> ${relPath.replace('.ts', '.js')}`);
}

// Recursively find all .ts files
function findTsFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Main build script
async function main() {
  console.log('Building API routes...');
  cleanDir(apiDest);

  // Compile API routes for Vercel
  const tsFiles = findTsFiles(apiSrc);
  for (const file of tsFiles) {
    await compileTsFile(file);
  }
  console.log(`Built ${tsFiles.length} API routes`);

  // Compile Services and Utils for local server (in-place)
  console.log('Building services and utils...');
  const dirsToCompile = ['services', 'utils'];

  // Read dependencies to exclude from bundle
  let external = [];
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    external = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
  } catch (e) {
    console.warn('Could not read package.json dependencies');
  }

  for (const dir of dirsToCompile) {
    if (!existsSync(dir)) continue;
    const files = findTsFiles(dir);
    for (const file of files) {
      await build({
        entryPoints: [file],
        outfile: file.replace('.ts', '.js'),
        bundle: true, // Bundle to resolve local imports (e.g. from utils, api)
        platform: 'node',
        target: 'node18',
        format: 'esm',
        external: external, // Exclude node_modules
        sourcemap: false,
        define: {
          'import.meta.env.DEV': 'false',
          'import.meta.env.VITE_SUPABASE_URL': 'process.env.VITE_SUPABASE_URL',
          'import.meta.env.SUPABASE_SERVICE_ROLE_KEY': 'process.env.SUPABASE_SERVICE_ROLE_KEY'
        }
      });
      console.log(`Compiled: ${file} -> ${file.replace('.ts', '.js')}`);
    }
  }
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
