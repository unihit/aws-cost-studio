const p = require("../src/data/pricing.json");
const r = p.regions[0];
const nulls = [];
function walk(o, path) {
  if (o === null) nulls.push(path);
  else if (o && typeof o === "object") for (const k of Object.keys(o)) walk(o[k], path + "." + k);
}
walk(r, "");
console.log("region", r.id, "ec2", Object.keys(r.ec2).length);
console.log("nulls", nulls.length, nulls.slice(0, 30));
console.log("ebs", JSON.stringify(r.ebs, null, 1));
console.log("rds storage", JSON.stringify(r.rds.postgres.storage, null, 1));
console.log("nat", JSON.stringify(r.nat));
console.log("alb", JSON.stringify(r.alb));
console.log("dt", JSON.stringify(r.dataTransfer));
console.log("s3", JSON.stringify(r.s3.standard.tiers), JSON.stringify(r.s3.deepArchive));
