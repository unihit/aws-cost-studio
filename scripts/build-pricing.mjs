/**
 * Reverse-engineered AWS Pricing Calculator data pipeline.
 *
 * Source chain (discovered via Chrome DevTools network capture on calculator.aws):
 *   config.js -> manifest/en_US.json -> data/{serviceCode}/en_US.json
 *   -> pricing/2.0/meteredUnitMaps/...
 *
 * The script snapshots the exact meter rates used by the calculator into
 * src/data/pricing.json so the SPA can run fully offline with real numbers.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "src/data/pricing.json");

const CDN = "https://calculator.aws";
const PRICING = `${CDN}/pricing/2.0/meteredUnitMaps`;

const REGIONS = [
  { id: "ap-northeast-2", label: "서울", awsName: "Asia Pacific (Seoul)", flag: "KR", short: "Seoul" },
  { id: "ap-northeast-1", label: "도쿄", awsName: "Asia Pacific (Tokyo)", flag: "JP", short: "Tokyo" },
  { id: "ap-southeast-1", label: "싱가포르", awsName: "Asia Pacific (Singapore)", flag: "SG", short: "Singapore" },
  { id: "ap-southeast-2", label: "시드니", awsName: "Asia Pacific (Sydney)", flag: "AU", short: "Sydney" },
  { id: "us-east-1", label: "버지니아", awsName: "US East (N. Virginia)", flag: "US", short: "N. Virginia" },
  { id: "us-west-2", label: "오리건", awsName: "US West (Oregon)", flag: "US", short: "Oregon" },
  { id: "eu-central-1", label: "프랑크푸르트", awsName: "EU (Frankfurt)", flag: "DE", short: "Frankfurt" },
  { id: "eu-west-1", label: "아일랜드", awsName: "EU (Ireland)", flag: "IE", short: "Ireland" },
];

const EC2_FAMILIES = /^(t8i|t4g|t3|m6i|m6g|m7i|m7g|m8g|c6g|c6i|c7i|c7g|c8g|r6g|r6i|r7i|r7g|r8g|g4dn|g5)\./;
const RDS_TYPES = /^db\.(t4g|t3|m6g|m6i|m7g|m7i|m8g|r6g|r6i|r7g|r7i|r8g)\.(micro|small|medium|large|xlarge|2xlarge|4xlarge)$/;
const TB = 1024; // GB per TB

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 aws-cost-studio" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await sleep(350 * (i + 1));
    }
  }
  throw new Error(`Failed ${url}: ${lastErr?.message}`);
}

const num = (v) => {
  const n = Number.parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function findKey(obj, exact, includes) {
  if (!obj) return undefined;
  if (exact && obj[exact] !== undefined) return exact;
  if (includes) return Object.keys(obj).find((k) => k.includes(includes));
  return undefined;
}

function pickRate(obj, keys) {
  for (const k of keys) {
    const hit = findKey(obj, k, k);
    if (hit && obj[hit]) return { key: hit, value: obj[hit] };
  }
  return null;
}

/* ---------------------------------- EC2 ---------------------------------- */
async function buildEC2(region) {
  const regionPart = encodeURIComponent(region.awsName);
  const url = `${PRICING}/ec2/USD/current/ec2-calc/${regionPart}/OnDemand/Shared/Linux/NA/No%20License%20required/Yes/index.json`;
  const j = await getJSON(url);
  const bucket = j.regions[region.awsName] || {};
  const out = {};
  for (const [key, v] of Object.entries(bucket)) {
    const type = v["Instance Type"];
    if (!type || !EC2_FAMILIES.test(type)) continue;
    const price = num(v.price);
    if (!price) continue;
    out[type] = {
      price,
      vcpu: num(v.vCPU),
      mem: num(v.Memory),
      family: v["Instance Family"] ?? "",
      rateCode: v.rateCode,
      key,
    };
  }
  return { url, rates: out };
}

/* ---------------------------------- EBS ---------------------------------- */
async function buildEBS(region) {
  const url = `${PRICING}/ec2/USD/current/ebs-calculator.json`;
  const j = await getJSON(url);
  const r = j.regions[region.awsName] || {};
  const pick = (...names) => {
    const hit = pickRate(r, names);
    return hit ? { price: num(hit.value.price), rateCode: hit.value.rateCode, key: hit.key } : null;
  };
  const gp3ThroughputGiBps = pick("Provisioned Throughput gp3 per GiBps mo");
  return {
    url,
    rates: {
      gp3: pick("Storage General Purpose gp3 GB Mo"),
      gp2: pick("Storage General Purpose gp2 GB Mo"),
      io1: pick("Storage Provisioned IOPS io1 GB Mo"),
      io2: pick("Storage Provisioned IOPS io2 GB Mo", "Storage Provisioned IOPS io2 GB month"),
      st1: pick("Storage Throughput Optimized HDD st1 GB Mo"),
      sc1: pick("Storage Cold HDD sc1 GB Mo"),
      standard: pick("Storage Magnetic standard GB Mo"),
      snapshot: pick("Storage Snapshot Amazon S3 GB Mo", "Storage Snapshot GB Mo"),
      gp3Iops: pick("Provisioned EBS IOPS gp3 Volumes per IOPS Mo"),
      gp3ThroughputPerMBps: gp3ThroughputGiBps
        ? {
            price: gp3ThroughputGiBps.price / TB,
            rateCode: gp3ThroughputGiBps.rateCode,
            key: `${gp3ThroughputGiBps.key} / 1024`,
            sourcePricePerGiBps: gp3ThroughputGiBps.price,
          }
        : null,
      io1Iops: pick("Provisioned EBS IOPS io1 Volumes per IOPS Mo"),
      io2IopsTier1: pick("Provisioned EBS IOPS io2 Volumes per IOPS Mo"),
      io2IopsTier2: pick("Provisioned EBS IOPS Tier 2 io2 Volumes per IOPS Mo"),
      io2IopsTier3: pick("Provisioned EBS IOPS Tier 3 io2 Volumes per IOPS Mo"),
      freeIops: 3000,
      freeThroughputMBps: 125,
    },
  };
}

/* ---------------------------------- RDS ---------------------------------- */
let rdsFiles = null;
async function getRDSFiles() {
  if (rdsFiles) return rdsFiles;
  const [pg, mysql] = await Promise.all([
    getJSON(`${PRICING}/rds/USD/current/rds-postgresql-ondemand.json`),
    getJSON(`${PRICING}/rds/USD/current/rds-mysql-ondemand.json`),
  ]);
  rdsFiles = { pg, mysql };
  return rdsFiles;
}

function rdsInstances(file, engineName, regionName) {
  const bucket = file.regions[regionName] || {};
  const sets = Object.keys(file.sets).filter((s) => s.includes(engineName));
  const singleSets = sets.filter((s) => /Single-AZ Current Generation/.test(s));
  const multiSets = sets.filter((s) => /Multi-AZ Current Generation/.test(s) && !/readable standbys/.test(s));
  const out = {};
  const ensure = (type) => (out[type] ??= { single: 0, multi: 0, vcpu: 0, mem: 0, rateCode: "" });
  for (const setName of singleSets) {
    for (const k of file.sets[setName]) {
      const v = bucket[k];
      if (!v || !RDS_TYPES.test(v["Instance Type"] ?? "")) continue;
      const row = ensure(v["Instance Type"]);
      row.single = num(v.price);
      row.vcpu = num(v.vCPU) || row.vcpu;
      row.mem = num(v.Memory) || row.mem;
      row.rateCode = v.rateCode;
    }
  }
  for (const setName of multiSets) {
    for (const k of file.sets[setName]) {
      const v = bucket[k];
      if (!v || !RDS_TYPES.test(v["Instance Type"] ?? "")) continue;
      const row = ensure(v["Instance Type"]);
      row.multi = num(v.price);
      row.vcpu = num(v.vCPU) || row.vcpu;
      row.mem = num(v.Memory) || row.mem;
    }
  }
  for (const type of Object.keys(out)) {
    if (!out[type].multi && out[type].single) out[type].multi = out[type].single * 2;
  }
  return out;
}

function rdsStorage(bucket) {
  const pick = (...names) => {
    const hit = pickRate(bucket, names);
    return hit ? { price: num(hit.value.price), rateCode: hit.value.rateCode, key: hit.key } : null;
  };
  return {
    gp3: {
      single: pick("Database Storage Single AZ General Purpose-GP3"),
      multi: pick("Database Storage Multi AZ General Purpose-GP3"),
    },
    gp2: {
      single: pick("Database Storage Single AZ General Purpose"),
      multi: pick("Database Storage Multi AZ General Purpose"),
    },
    io1: {
      single: pick("Database Storage Single AZ Provisioned IOPS"),
      multi: pick("Database Storage Multi AZ Provisioned IOPS"),
    },
    io2: {
      single: pick("Database Storage Single AZ Provisioned IOPS-IO2"),
      multi: pick("Database Storage Multi AZ Provisioned IOPS-IO2"),
    },
    iops: {
      single: pick("Provisioned IOPS Single AZ"),
      multi: pick("Provisioned IOPS Multi AZ"),
    },
    gp3Iops: {
      single: pick("Provisioned GP3 IOPS Single AZ"),
      multi: pick("Provisioned GP3 IOPS Multi AZ"),
    },
    throughput: {
      single: pick("Provisioned Throughput Single AZ"),
      multi: pick("Provisioned Throughput Multi AZ"),
    },
    backup: pick("Storage Snapshot"),
  };
}

async function buildRDS(region) {
  const { pg, mysql } = await getRDSFiles();
  return {
    url: `${PRICING}/rds/USD/current/rds-{engine}-ondemand.json`,
    postgres: {
      instance: rdsInstances(pg, "PostgreSQL", region.awsName),
      storage: rdsStorage(pg.regions[region.awsName] || {}),
    },
    mysql: {
      instance: rdsInstances(mysql, "MySQL", region.awsName),
      storage: rdsStorage(mysql.regions[region.awsName] || {}),
    },
  };
}

/* ---------------------------------- S3 ----------------------------------- */
let s3Files = null;
async function getS3Files() {
  if (s3Files) return s3Files;
  const names = [
    "s3-standard",
    "s3-standard-infrequent",
    "s3-onezone-infrequent",
    "s3-glacier-instantretrieval",
    "s3-glacier-flexibleretrieval",
  ];
  const entries = await Promise.all(
    names.map(async (n) => [n, await getJSON(`${PRICING}/s3/USD/current/${n}.json`)]),
  );
  const deep = await getJSON(`${PRICING}/s3glacierdeeparchive/USD/current/s3glacierdeeparchive.json`);
  s3Files = Object.fromEntries(entries);
  s3Files["s3-deep-archive"] = deep;
  return s3Files;
}

async function buildS3(region) {
  const files = await getS3Files();
  const bucket = (name) => files[name]?.regions?.[region.awsName] || {};
  const std = bucket("s3-standard");
  const ia = bucket("s3-standard-infrequent");
  const oz = bucket("s3-onezone-infrequent");
  const gir = bucket("s3-glacier-instantretrieval");
  const gfr = bucket("s3-glacier-flexibleretrieval");
  const gda = bucket("s3-deep-archive");
  const rate = (obj, ...names) => {
    const hit = pickRate(obj, names);
    return hit ? { price: num(hit.value.price), rateCode: hit.value.rateCode, key: hit.key } : null;
  };
  return {
    url: `${PRICING}/s3/USD/current/s3-standard.json`,
    standard: {
      tiers: [
        rate(std, "Standard Storage First 50 TB per GB Mo"),
        rate(std, "Standard Storage Next 450 TB per GB Mo"),
        rate(std, "Standard Storage Over 500 TB per GB Mo"),
      ],
      put: rate(std, "PUT COPY/POST or LIST requests per Requests"),
      get: rate(std, "GET and all other requests per Requests"),
    },
    standardIA: {
      storage: rate(ia, "Standard Infrequent Access Storage per GB-Mo"),
      put: rate(ia, "PUT COPY/POST or LIST requests to Standard Infrequent Access per Requests"),
      get: rate(ia, "GET and all other requests to Standard Infrequent Access per Requests"),
      retrieval: rate(ia, "Object Retrieval in Standard Infrequent Access per GB"),
    },
    onezoneIA: {
      storage: rate(oz, "One Zone Infrequent Access Storage per GB-Mo"),
      put: rate(oz, "PUT COPY/POST or LIST requests to One Zone Infrequent Access per Requests"),
      get: rate(oz, "GET and all other requests to One Zone Infrequent Access per Requests"),
      retrieval: rate(oz, "Object Retrieval in One Zone Infrequent Access per GB"),
    },
    glacierIR: {
      storage: rate(gir, "Glacier Instant Retrieval Storage"),
      put: rate(gir, "PUT COPY/POST or LIST requests to Glacier Instant Retrieval per Requests"),
      get: rate(gir, "GET and all other requests to Glacier Instant Retrieval per Requests"),
      retrieval: rate(gir, "Object Retrieval in Glacier Instant Retrieval per GB"),
    },
    glacierFlexible: {
      storage: rate(gfr, "Glacier Storage per GB Mo"),
      put: rate(gfr, "PUT requests to Glacier per Requests"),
      get: rate(gfr, "GET and all other requests to GLACIER per Requests"),
      retrieval: rate(gfr, "Glacier S3 Standard Retrieval RestoreObject"),
    },
    deepArchive: {
      storage: rate(gda, "Glacier Deep Archive GB Mo"),
      put: rate(gda, "PUT to Glacier Deep Archive Requests"),
      get: null,
      retrieval: rate(gda, "S3 Standard-Retrieval GB"),
    },
  };
}

/* ------------------------------ NAT / ALB / DT --------------------------- */
async function buildNAT(region) {
  const url = `${PRICING}/ec2/USD/current/natgateway.json`;
  const j = await getJSON(url);
  const r = j.regions[region.awsName] || {};
  return {
    url,
    hourly: (() => {
      const h = pickRate(r, ["Hourly charge for NAT Gateways"]);
      return h ? { price: num(h.value.price), rateCode: h.value.rateCode, key: h.key } : null;
    })(),
    perGb: (() => {
      const h = pickRate(r, ["Charge for per GB data processed by NatGateways"]);
      return h ? { price: num(h.value.price), rateCode: h.value.rateCode, key: h.key } : null;
    })(),
  };
}

async function buildALB(region) {
  const url = `${PRICING}/elb/USD/current/elb.json`;
  const j = await getJSON(url);
  const r = j.regions[region.awsName] || {};
  return {
    url,
    hourly: (() => {
      const h = pickRate(r, ["Application Load Balancer Hours"]);
      return h ? { price: num(h.value.price), rateCode: h.value.rateCode, key: h.key } : null;
    })(),
    lcu: (() => {
      const h = pickRate(r, ["Application Load Balancer LCU Hours"]);
      return h ? { price: num(h.value.price), rateCode: h.value.rateCode, key: h.key } : null;
    })(),
  };
}

let dtFile = null;
async function buildDataTransfer(region) {
  dtFile ??= await getJSON(`${PRICING}/datatransfer/USD/current/datatransfer-calc.json`);
  const r = dtFile.regions[region.awsName] || {};
  const tiers = [
    { upToTb: 10, ...(pickRate(r, ["DataTransfer External Outbound Next 10 TB"])?.value ?? {}) },
    { upToTb: 50, ...(pickRate(r, ["DataTransfer External Outbound Next 40 TB"])?.value ?? {}) },
    { upToTb: 150, ...(pickRate(r, ["DataTransfer External Outbound Next 100 TB"])?.value ?? {}) },
    { upToTb: Infinity, ...(pickRate(r, ["DataTransfer External Outbound Greater than 150 TB"])?.value ?? {}) },
  ].map((t) => ({ upToTb: t.upToTb, price: num(t.price), rateCode: t.rateCode }));
  return { url: `${PRICING}/datatransfer/USD/current/datatransfer-calc.json`, tiers };
}

/* ---------------------------------- main --------------------------------- */
const meta = {
  generatedAt: new Date().toISOString(),
  currency: "USD",
  hoursPerMonth: 730,
  gbPerTb: TB,
  fxKrwPerUsd: 1380,
  regions: REGIONS,
  sources: {
    manifest: "https://d1qsjq9pzbk1k6.cloudfront.net/manifest/en_US.json",
    serviceDefinitionBase: "https://d1qsjq9pzbk1k6.cloudfront.net/data/{serviceCode}/en_US.json",
    pricingBase: PRICING,
    regionList: "https://d1qsjq9pzbk1k6.cloudfront.net/manifest/regionList/publish.json",
    config: "https://calculator.aws/c9243d48-d6c6-4d74-8864-f82eee5e79aa/config.js",
  },
  formulas: {
    ec2: "hourly_rate × 730 × quantity × utilization",
    ebs: "gb × $/GB-mo + max(0, iops−3000) × $/IOPS-mo + max(0, MBps−125) × $/MBps-mo",
    rds: "instance_hourly × 730 × qty × AZ_multiplier + storage_GB × $/GB-mo × AZ_multiplier",
    s3: "tiered GB storage + PUT/GET requests + retrieval",
    nat: "hourly × 730 × count + GB processed × $/GB",
    alb: "hourly × 730 × count + LCU × $/LCU-hr × 730",
    dataTransfer: "tiered GB outbound (10 TB / 40 TB / 100 TB / remainder)",
  },
};

console.log("Reverse-engineering AWS Pricing Calculator rates...");
const regions = [];
for (const region of REGIONS) {
  process.stdout.write(`  • ${region.id} ${region.label} ... `);
  const [ec2, ebs, rds, s3, nat, alb, dataTransfer] = await Promise.all([
    buildEC2(region),
    buildEBS(region),
    buildRDS(region),
    buildS3(region),
    buildNAT(region),
    buildALB(region),
    buildDataTransfer(region),
  ]);
  regions.push({
    ...region,
    ec2: ec2.rates,
    ebs: ebs.rates,
    rds,
    s3,
    nat: { hourly: nat.hourly, perGb: nat.perGb },
    alb: { hourly: alb.hourly, lcu: alb.lcu },
    dataTransfer: dataTransfer.tiers,
  });
  const ec2Count = Object.keys(ec2.rates).length;
  const rdsCount = Object.keys(rds.postgres.instance).length;
  console.log(`EC2 ${ec2Count} types · RDS ${rdsCount} classes`);
}

const payload = { meta, regions };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`\nWrote ${OUT}`);
console.log(`Regions: ${regions.length} · size: ${(JSON.stringify(payload).length / 1024).toFixed(0)} KB`);
