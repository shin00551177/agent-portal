import jwt from './node_modules/jsonwebtoken/index.js';
const keyId = process.env.APPLE_IAP_KEY_ID;
const issuerId = process.env.APPLE_IAP_ISSUER_ID;
const keyB64 = process.env.APPLE_IAP_PRIVATE_KEY_B64;
const privateKey = Buffer.from(keyB64, 'base64').toString('utf-8');
const now = Math.floor(Date.now()/1000);
const token = jwt.sign({iss:issuerId,iat:now,exp:now+1200,aud:'appstoreconnect-v1'},privateKey,{algorithm:'ES256',header:{kid:keyId,alg:'ES256'}});
const h = {Authorization:'Bearer '+token};
const TWOMI_IOS = '6756947139';

// 1. Sales/Financial Reports - get cumulative revenue
// Use the Proceeds report to get all-time data
const { gunzipSync } = await import('zlib');

async function getReportRequests() {
  const r = await fetch(`https://api.appstoreconnect.apple.com/v1/apps/${TWOMI_IOS}/analyticsReportRequests?limit=5`,{headers:h});
  const d = await r.json();
  return d.data || [];
}

// Get store engagement (downloads, CVR) - already working
async function getEngagement() {
  const reqs = await getReportRequests();
  const reqId = reqs[0]?.id;
  if (!reqId) return null;
  
  const repsR = await fetch(`https://api.appstoreconnect.apple.com/v1/analyticsReportRequests/${reqId}/reports?limit=200`,{headers:h});
  const repsD = await repsR.json();
  const engReport = repsD.data?.find(r=>r.attributes.category==='APP_STORE_ENGAGEMENT'&&r.attributes.name.includes('Discovery'));
  if (!engReport) return null;
  
  // Get all instances for cumulative
  const instsR = await fetch(`https://api.appstoreconnect.apple.com/v1/analyticsReports/${engReport.id}/instances?limit=200`,{headers:h});
  const instsD = await instsR.json();
  const instances = instsD.data || [];
  
  let totalDL=0, totalViews=0, firstDL=0, reDL=0;
  for (const inst of instances) {
    const segR = await fetch(`https://api.appstoreconnect.apple.com/v1/analyticsReportInstances/${inst.id}/segments`,{headers:h});
    const segD = await segR.json();
    const url = segD.data?.[0]?.attributes?.url;
    if (!url) continue;
    const buf = await (await fetch(url)).arrayBuffer();
    let text; try{text=gunzipSync(Buffer.from(buf)).toString('utf-8');}catch{text=Buffer.from(buf).toString('utf-8');}
    const lines = text.trim().split('\n').slice(1);
    for (const line of lines) {
      const cols = line.split('\t');
      if (cols.length < 12) continue;
      const event=cols[3], type=cols[4], src=cols[5];
      const count = parseInt(cols[10]||'0');
      if (event==='Page view'&&type==='Product page') totalViews+=count;
      if (event==='App Unit'||event==='Download') {
        totalDL+=count;
        if (src==='App Store'||!src) firstDL+=count; else reDL+=count;
      }
    }
  }
  const cvr = totalViews>0?(totalDL/totalViews*100).toFixed(1):'-';
  const dates = instances.map(i=>i.attributes.processingDate).sort();
  return {totalDL, totalViews, cvr, firstDL, reDL, from:dates[0], to:dates[dates.length-1]};
}

// Get financial data via Sales Reporter
async function getSalesData() {
  // Use the Finance Reports endpoint
  const today = new Date();
  const results = [];
  
  // Get monthly reports for all available months
  for (let offset=0; offset<18; offset++) {
    const d = new Date(today);
    d.setMonth(d.getMonth()-offset);
    const reportDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    
    const r = await fetch(
      `https://api.appstoreconnect.apple.com/v1/salesReports?filter[frequency]=MONTHLY&filter[reportDate]=${reportDate}&filter[reportType]=SALES&filter[vendorNumber]=${process.env.APPLE_VENDOR_NUMBER||'93468267'}&filter[reportSubType]=SUMMARY`,
      {headers:h}
    );
    if (!r.ok) continue;
    const buf = await r.arrayBuffer();
    let text; try{text=gunzipSync(Buffer.from(buf)).toString('utf-8');}catch{text=Buffer.from(buf).toString('utf-8');}
    
    const lines = text.trim().split('\n').slice(1);
    let monthRevenue=0, monthUnits=0;
    for (const line of lines) {
      const cols = line.split('\t');
      if (cols[2]==='TWOMI'||cols[2]==='Twomi'||String(cols[14])===TWOMI_IOS||String(cols[15])===TWOMI_IOS) {
        monthRevenue += parseFloat(cols[8]||'0')||0;
        monthUnits += parseInt(cols[7]||'0')||0;
      }
    }
    if (monthRevenue>0||monthUnits>0) results.push({month:reportDate, revenue:monthRevenue, units:monthUnits});
    if (offset>6&&results.length===0) break;
  }
  return results;
}

console.log('Fetching Store Engagement data...');
const engagement = await getEngagement();
if (engagement) {
  console.log('\n=== iOS Store Analytics (Cumulative) ===');
  console.log(`Period: ${engagement.from} 〜 ${engagement.to}`);
  console.log(`Total Downloads: ${engagement.totalDL.toLocaleString()}`);
  console.log(`Page Views: ${engagement.totalViews.toLocaleString()}`);
  console.log(`CVR: ${engagement.cvr}%`);
} else {
  console.log('No engagement data');
}

console.log('\nFetching Sales data...');
const sales = await getSalesData().catch(e=>{ console.error('sales error:', e.message); return []; });
if (sales.length>0) {
  console.log('\n=== iOS Revenue by Month ===');
  let total=0, totalUnits=0;
  for (const s of sales.sort((a,b)=>a.month.localeCompare(b.month))) {
    console.log(`${s.month}: $${s.revenue.toFixed(2)} / ${s.units} units`);
    total+=s.revenue; totalUnits+=s.units;
  }
  console.log(`TOTAL: $${total.toFixed(2)} / ${totalUnits} IAP`);
}
