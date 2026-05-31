const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '..', 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

console.log(`Checking ${files.length} JavaScript files in ${jsDir}...`);

let totalErrors = 0;

// Simple parser to extract imports and exports
files.forEach(file => {
  const filePath = path.join(jsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all imports: e.g. import { a, b } from './c.js';
  // or import a from './c.js';
  const importRegex = /import\s+({[\s\S]*?}|[*\w\s,]+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importSpecifiers = match[1].trim();
    const importPath = match[2];
    
    // Resolve import path relative to current file
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const targetFile = resolvedPath.endsWith('.js') ? resolvedPath : resolvedPath + '.js';
    
    if (!fs.existsSync(targetFile)) {
      console.error(`[ERROR] File ${file} imports from non-existent file: ${importPath}`);
      totalErrors++;
      continue;
    }
    
    // Read the imported file to verify exports
    const targetContent = fs.readFileSync(targetFile, 'utf8');
    
    // If it's a named import { a, b, c }
    if (importSpecifiers.startsWith('{')) {
      const names = importSpecifiers
        .replace(/[{}]/g, '')
        .split(',')
        .map(n => n.trim().split(/\s+as\s+/)[0]) // handle 'a as b'
        .filter(n => n.length > 0);
        
      names.forEach(name => {
        // Look for export function name, export const name, export class name, export let name, export default name
        // Or export { ... name ... }
        const exportRegex1 = new RegExp(`export\\s+(function|const|let|var|class|async\\s+function)\\s+[^;]*?\\b${name}\\b`);
        const exportRegex2 = new RegExp(`export\\s+\\{[^}]*?\\b${name}\\b[^}]*?\\}`);
        
        const hasExport = exportRegex1.test(targetContent) || exportRegex2.test(targetContent);
        
        if (!hasExport) {
          console.error(`[ERROR] File ${file} imports '${name}' from '${importPath}', but it is not exported!`);
          totalErrors++;
        }
      });
    }
  }
});

console.log(`Import check finished. Total errors found: ${totalErrors}`);
if (totalErrors > 0) {
  process.exit(1);
} else {
  console.log("All imports and exports are perfectly aligned!");
}
