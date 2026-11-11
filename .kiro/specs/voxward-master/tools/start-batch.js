// Build a work-batch moving the given external keys planned -> ready -> active.
// Usage: node start-batch.js <out.json> KEY...
const fs = require("fs");
const [out, ...keys] = process.argv.slice(2);
const members = [];
for (const status of ["ready", "active"]) for (const k of keys) members.push({ verb: "work-transition", externalKey: k, status });
fs.writeFileSync(out, JSON.stringify({ schemaVersion: "tcrn.work-batch.v1", members }));
console.log(members.length);
