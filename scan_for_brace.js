const fs = require('fs');
const path = require('path');

function scanFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                scanFiles(fullPath);
            }
        } else {
            if (stat.size >= 560) {
                const fd = fs.openSync(fullPath, 'r');
                const buffer = Buffer.alloc(1);
                fs.readSync(fd, buffer, 0, 1, 558); // Byte 558 (0-indexed) is the 559th byte? 
                // "Position 559" in error usually means index 559.
                // If "after JSON at position 559", it means index 559 is the first unexpected char.
                // So the JSON ended at 558.
                // So byte 558 should be '}' or whitespace.
                // Let's check byte 558 and 559.
                const buf2 = Buffer.alloc(2);
                fs.readSync(fd, buf2, 0, 2, 558);
                fs.closeSync(fd);

                // Check if byte 558 is '}'
                if (buf2[0] === 125) { // '}' is 125
                    console.log(`Match at 558: ${fullPath} (Size: ${stat.size})`);
                }
            }
        }
    }
}

scanFiles(process.cwd());
