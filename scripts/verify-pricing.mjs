import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRICING_PATH = resolve(__dirname, "../src/data/pricing.json");

const EXPECTED_REGIONS = [
  "ap-northeast-2",
  "ap-northeast-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "us-east-1",
  "us-west-2",
  "eu-central-1",
  "eu-west-1",
];

const REQUIRED_EC2_TYPES = [
  "t8i.micro",
  "m8g.large",
  "c8g.large",
  "r8g.large",
  "m7i.large",
  "c7i.large",
  "r7i.large",
];

const REQUIRED_RDS_TYPES = [
  "db.m8g.large",
  "db.r8g.large",
  "db.m7i.large",
  "db.r7i.large",
];

const data = JSON.parse(readFileSync(PRICING_PATH, "utf8"));
const errors = [];

const regions = Array.isArray(data.regions) ? data.regions : [];
if (regions.length !== 8) {
  errors.push(`Expected 8 regions, found ${regions.length}`);
}

for (const regionId of EXPECTED_REGIONS) {
  const region = regions.find((r) => r.id === regionId);
  if (!region) {
    errors.push(`Missing region: ${regionId}`);
    continue;
  }

  const ec2Entries = Object.entries(region.ec2 ?? {});
  if (ec2Entries.length < 150) {
    errors.push(`${regionId}: EC2 count ${ec2Entries.length} < 150`);
  }
  for (const type of REQUIRED_EC2_TYPES) {
    const rate = region.ec2?.[type];
    if (!rate || !(rate.price > 0)) {
      errors.push(`${regionId}: missing or invalid EC2 rate for ${type}`);
    }
  }

  for (const engine of ["postgres", "mysql"]) {
    const instanceBucket = region.rds?.[engine]?.instance ?? {};
    const count = Object.keys(instanceBucket).length;
    if (count < 45) {
      errors.push(`${regionId} RDS ${engine}: class count ${count} < 45`);
    }
    for (const type of REQUIRED_RDS_TYPES) {
      const rate = instanceBucket[type];
      if (!rate || !(rate.single > 0) || !(rate.multi > 0)) {
        errors.push(`${regionId} RDS ${engine}: missing or invalid rate for ${type}`);
      }
    }
  }

  if (!(region.ebs?.gp3?.price > 0)) {
    errors.push(`${regionId}: invalid EBS gp3 price`);
  }
  if (!(region.s3?.standard?.tiers?.[0]?.price > 0)) {
    errors.push(`${regionId}: invalid S3 standard tier[0] price`);
  }
  if (!(region.nat?.hourly?.price > 0) || !(region.nat?.perGb?.price > 0)) {
    errors.push(`${regionId}: invalid NAT hourly/perGb price`);
  }
  if (!(region.alb?.hourly?.price > 0) || !(region.alb?.lcu?.price > 0)) {
    errors.push(`${regionId}: invalid ALB hourly/lcu price`);
  }
  const dt = region.dataTransfer ?? [];
  if (dt.length < 4 || !(dt[0]?.price > 0)) {
    errors.push(`${regionId}: invalid DataTransfer tiers (len=${dt.length})`);
  }

  console.log(
    `OK ${regionId.padEnd(15)} EC2=${String(ec2Entries.length).padStart(3)} · RDS(PG)=${Object.keys(region.rds.postgres.instance).length} · RDS(MySQL)=${Object.keys(region.rds.mysql.instance).length} · DT=${dt.length}`,
  );
}

if (errors.length > 0) {
  console.error("\nPricing verification failed:");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log("\nAll 8 regions pricing verified successfully.");
