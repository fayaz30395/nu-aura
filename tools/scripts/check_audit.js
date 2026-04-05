const {Client} = require('pg');

async function checkAudit() {
  const client = new Client({
    connectionString: "jdbc:postgresql://ep-little-darkness-ad7czn2x-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require".replace("jdbc:postgresql://", "postgresql://"),
    user: "neondb_owner",
    password: "npg_xwHjDEtfb4o2",
  });

  try {
    await client.connect();
    const res = await client.query('SELECT * FROM hrms.audit_events ORDER BY created_at DESC LIMIT 10;');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkAudit();
