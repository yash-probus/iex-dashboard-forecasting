const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:iex_sec_k9P2mX_2026@8.231.105.144:5432/Prolt_Operations';

async function seedConsumerDemand() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('[Seed] Connected to PostgreSQL...');

  // 1. Fetch baseline slot averages per meter
  console.log('[Seed] Fetching historical meter slot profiles...');
  const profileRes = await client.query(`
    SELECT meter_id, slot_number, 
           AVG(forecasted_energy)::numeric as avg_forecast,
           COALESCE(AVG(confidence)::numeric, 0.91) as avg_conf
    FROM "forecasting"."consumer_demand_forecasting"
    GROUP BY meter_id, slot_number
    ORDER BY meter_id, slot_number;
  `);

  const profileMap = new Map();
  profileRes.rows.forEach(r => {
    const key = `${r.meter_id}_${r.slot_number}`;
    profileMap.set(key, {
      forecast: Number(r.avg_forecast) || 80,
      confidence: Number(r.avg_conf) || 0.91
    });
  });

  const meters = ['X2690027', 'X2140266', 'X2690028', 'X2691758', 'Q1896615', 'X2521837'];
  
  // Date range: 2026-10-23 to 2026-11-21 (tomorrow day-ahead)
  const startDate = new Date('2026-10-23T00:00:00Z');
  const endDate = new Date('2026-11-21T00:00:00Z');
  
  // Current time cutoff for actual energy: 2026-11-20 17:30 IST
  const nowIST = new Date('2026-11-20T17:30:00+05:30');

  console.log(`[Seed] Generating data from 2026-10-23 to 2026-11-21 for ${meters.length} meters...`);

  let totalInserted = 0;
  const BATCH_SIZE = 500;
  let batchValues = [];

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    // Day of week factor (0=Sun, 6=Sat)
    const dayOfWeek = d.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayFactor = isWeekend ? 0.88 : (1.0 + (dayOfWeek % 3) * 0.03);

    for (const meter of meters) {
      for (let slot = 1; slot <= 96; slot++) {
        const startMins = (slot - 1) * 15;
        const slotH = String(Math.floor(startMins / 60)).padStart(2, '0');
        const slotM = String(startMins % 60).padStart(2, '0');
        const timestampStr = `${dateStr} ${slotH}:${slotM}:00`;
        const slotTimeIST = new Date(`${dateStr}T${slotH}:${slotM}:00+05:30`);

        const p = profileMap.get(`${meter}_${slot}`) || { forecast: 90, confidence: 0.91 };
        
        // Realistic variation across days (-5% to +5%)
        const dayVariance = 1.0 + ((((slot * 13 + Number(dd) * 17) % 23) - 11) * 0.004);
        const forecast = Number((p.forecast * dayFactor * dayVariance).toFixed(4));
        const confidence = Number((p.confidence * (0.98 + (slot % 5) * 0.008)).toFixed(4));

        let actual = null;
        // If slot is in the past, populate realistic actual reading (multiple of 0.4)
        if (slotTimeIST <= nowIST) {
          const actVariation = 0.96 + ((((slot * 19 + Number(dd) * 7) % 21) - 10) * 0.006);
          const rawActual = forecast * actVariation;
          actual = Number((Math.round(Math.max(0.4, rawActual) / 0.4) * 0.4).toFixed(4));
        }

        batchValues.push({
          timestamp: timestampStr,
          slot_number: slot,
          actual_energy: actual,
          forecasted_energy: forecast,
          confidence: confidence,
          meter_id: meter
        });

        if (batchValues.length >= BATCH_SIZE) {
          await insertBatch(client, batchValues);
          totalInserted += batchValues.length;
          batchValues = [];
        }
      }
    }
  }

  if (batchValues.length > 0) {
    await insertBatch(client, batchValues);
    totalInserted += batchValues.length;
    batchValues = [];
  }

  console.log(`[Seed] Successfully seeded/updated ${totalInserted} rows into forecasting.consumer_demand_forecasting!`);
  await client.end();
}

async function insertBatch(client, rows) {
  const valuePlaceholders = [];
  const params = [];
  let paramIdx = 1;

  for (const r of rows) {
    valuePlaceholders.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5})`);
    params.push(r.timestamp, r.slot_number, r.actual_energy, r.forecasted_energy, r.confidence, r.meter_id);
    paramIdx += 6;
  }

  const query = `
    INSERT INTO "forecasting"."consumer_demand_forecasting" 
      ("timestamp", "slot_number", "actual_energy", "forecasted_energy", "confidence", "meter_id")
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (meter_id, "timestamp") DO UPDATE SET
      forecasted_energy = EXCLUDED.forecasted_energy,
      actual_energy = COALESCE(EXCLUDED.actual_energy, "forecasting"."consumer_demand_forecasting".actual_energy),
      confidence = EXCLUDED.confidence;
  `;

  await client.query(query, params);
}

seedConsumerDemand().catch(err => {
  console.error('[Seed] Error seeding data:', err);
  process.exit(1);
});
