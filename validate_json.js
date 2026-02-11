const fs = require('fs');
const path = require('path');

function validateJsonFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                validateJsonFiles(fullPath);
            }
        } else if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                JSON.parse(content);
            } catch (e) {
                console.error(`Error in ${fullPath}: ${e.message}`);
            }
        }
    }
}

validateJsonFiles(process.cwd());
