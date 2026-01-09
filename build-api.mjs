#!/usr/bin/env node

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const apiSrc = 'api';
const apiDest = '.vercel/functions';

// Clean and create destination directory
function cleanDir(dir) {
  if (existsSync(dir)) {
    execSync(`rm -rf ${dir}`);
  }
  mkdirSync(dir, { recursive: true });
}

// Copy file with .ts -> .js transformation
function copyAndCompile(srcFile) {
  const relPath = relative(apiSrc, srcFile);
  const destPath = join(apiDest, relPath).replace('.ts', '.js');
  
  // Get the directory and create it if needed
  const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
  mkdirSync(destDir, { recursive: true });
  
  // Copy the file as .js
  copyFileSync(srcFile, destPath);
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
console.log('Building API routes...');
cleanDir(apiDest);

const tsFiles = findTsFiles(apiSrc);
for (const file of tsFiles) {
  copyAndCompile(file);
}

console.log(`Built ${tsFiles.length} API routes`);
