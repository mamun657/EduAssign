// Removes temporary debug/probe scripts left over from Phase 3 + Phase 4 troubleshooting
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);
const toRemove = [
  'probe.js',
  'probe2.js',
  'probe3.js',
  'probe-admin-cors.js',
  'probe-teacher.js',
  'cleanup-p3test.js',
];
for (const p of toRemove) {
  const fp = path.join(dir, p);
  if (fs.existsSync(fp)) {
    try {
      fs.unlinkSync(fp);
      console.log('removed:', p);
    } catch (e) {
      console.log('failed to remove', p, e.message);
    }
  }
}
