import axios from 'axios';
import fs from 'fs';
import path from 'path';

const STATES = [
  "Daman & Diu", "Uttar Pradesh", "Arunachal Pradesh", "Dadar Nagar Haveli", "Maharashtra (MSEDCL)",
  "Delhi (BRPL)", "Telangana (NPDCL)", "Maharashtra (BEST)", "Andhra Pradesh (EPDCL)", "Uttarakhand",
  "Rajasthan", "Jharkhand", "Odisha (TPCODL)", "Maharashtra (AEML)", "Bihar", "Gujarat", "Punjab",
  "Odisha (TPWODL)", "Karnataka (BESCOM)", "Himachal Pradesh", "Telangana (SPDCL)", "Odisha (TPSODL)",
  "Delhi (TPDDL)", "Kerala", "Assam", "Tamilnadu", "West Bengal", "Pondicherry", "Delhi (BYPL)",
  "Haryana", "Madhya Pradesh", "Maharashtra (TPC-D)", "Chhattisgarh", "Andhra Pradesh (CPDCL)",
  "Andhra Pradesh (SPDCL)", "Chandigarh", "Goa", "Odisha (TPNODL)", "Meghalaya"
];

const IEX_API_BASE = 'https://www.iexindia.com/api/v1/calculator';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeAll() {
  const results: any[] = [];
  console.log(`[LCC Scraper] Starting batch crawl of landed cost charges for ${STATES.length} states/utilities...`);

  for (let sIdx = 0; sIdx < STATES.length; sIdx++) {
    const state = STATES[sIdx];
    console.log(`[LCC Scraper] [${sIdx + 1}/${STATES.length}] Scraping State: ${state}`);
    
    try {
      // 1. Fetch Categories
      const categoriesRes = await axios.get(`${IEX_API_BASE}/consumer-category`, { params: { state }, timeout: 15000 });
      const categories = Object.values(categoriesRes.data.data || {}) as string[];

      for (const category of categories) {
        // 2. Fetch Voltages
        const voltagesRes = await axios.get(`${IEX_API_BASE}/voltage`, { params: { state, consumerCategory: category }, timeout: 15000 });
        const voltages = Object.values(voltagesRes.data.data || {}) as string[];

        for (const voltage of voltages) {
          // 3. Fetch Months
          const monthsRes = await axios.get(`${IEX_API_BASE}/tod-months`, { params: { voltage, state, consumerCategory: category }, timeout: 15000 });
          const months = Object.values(monthsRes.data.data || {}) as string[];

          for (const month of months) {
            // 4. Fetch Slots
            const slotsRes = await axios.get(`${IEX_API_BASE}/tod-slots`, { params: { voltage, state, consumerCategory: category, month }, timeout: 15000 });
            const slots = Object.values(slotsRes.data.data || {}) as string[];

            for (const slot of slots) {
              try {
                // 5. Query final calculator to fetch charges
                const calcRes = await axios.get(IEX_API_BASE, {
                  params: { voltage, state, consumerCategory: category, todMonth: month, todSlot: slot, iexPrice: '6' },
                  timeout: 15000
                });
                
                const charges = calcRes.data.data;
                results.push({
                  state,
                  category,
                  voltage,
                  month,
                  slot,
                  charges
                });
                console.log(`[LCC Scraper] Saved: ${state} | ${category} | ${voltage}kV | ${month} | ${slot}`);
              } catch (e: any) {
                console.error(`[LCC Scraper] Error calculating for ${state} | ${category} | ${voltage}kV | ${month} | ${slot}: ${e.message}`);
              }
              // Polite rate limit delay to avoid hitting security block
              await delay(150);
            }
          }
        }
      }
    } catch (e: any) {
      console.error(`[LCC Scraper] Failed to fetch base lists for state ${state}: ${e.message}`);
    }
    // Delay between states
    await delay(500);
  }

  // Save raw data to JSON file
  const outputPath = path.join(__dirname, '../../landed_cost_charges.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`[LCC Scraper] Crawl completed successfully! Scraped ${results.length} combinations.`);
  console.log(`[LCC Scraper] Output saved to: ${outputPath}`);
}

scrapeAll();
