process.chdir('/app');
const {PrismaClient} = require('/app/app/generated/prisma');
const db = new PrismaClient();
async function main() {
  const ps = await db.proposal.findMany({
    where:{domain:'aso',targetId:'twomi',status:'pending'},
    orderBy:{createdAt:'desc'},
    take:13,
    select:{title:true,rationale:true}
  });
  ps.forEach((p,i)=>{
    const r = JSON.parse(p.rationale);
    const before = (r.currentValue||'').slice(0,60);
    const after = (r.proposed||'').slice(0,60);
    console.log(`[${i+1}/${ps.length}] [${r.field}] ${p.title}`);
    console.log(`  Before: "${before || '(未設定)'}"`);
    console.log(`  After:  "${after}"`);
  });
  process.exit(0);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
