const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcDir);
let changedFiles = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Remove Bird from lucide-react import
    // It could be 'Bird,' or ', Bird' or just 'Bird' inside { }
    content = content.replace(/,\s*Bird\b/g, '');
    content = content.replace(/\bBird\s*,/g, '');
    content = content.replace(/\{\s*Bird\s*\}/g, '{}');
    
    // 2. If the import is now just `import { } from 'lucide-react'`, we can remove it
    content = content.replace(/import\s*\{\s*\}\s*from\s*['"]lucide-react['"];?\n?/g, '');

    // 3. Replace <Bird ... /> with <NovaLogo ... />
    content = content.replace(/<Bird\b/g, '<NovaLogo');

    // 4. Replace icon: Bird reference
    content = content.replace(/\bicon:\s*Bird\b/g, 'icon: NovaLogo');

    // 5. If it was modified, add the import for NovaLogo
    if (content !== original) {
        // Calculate relative path to components/NovaLogo.tsx
        let relativeDir = path.relative(path.dirname(file), path.join(srcDir, 'components'));
        if (relativeDir === '') {
            relativeDir = '.';
        } else if (!relativeDir.startsWith('.')) {
            relativeDir = './' + relativeDir;
        }
        // Normalize backslashes to forward slashes for imports
        const importPath = relativeDir.replace(/\\/g, '/') + '/NovaLogo';
        
        // Add import after the last import statement or at the top
        const importMatch = content.match(/import .*?;?\n/g);
        if (importMatch) {
            const lastImport = importMatch[importMatch.length - 1];
            content = content.replace(lastImport, lastImport + `import { NovaLogo } from '${importPath}';\n`);
        } else {
            content = `import { NovaLogo } from '${importPath}';\n` + content;
        }

        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
        console.log('Updated', file);
    }
}
console.log(`Replaced Bird with NovaLogo in ${changedFiles} files.`);
