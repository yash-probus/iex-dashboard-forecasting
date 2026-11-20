import mysql from 'mysql2/promise';

export class StarrocksService {
  private static pool: mysql.Pool | null = null;
  private static isAvailable: boolean = true;
  private static lastCheckTime: number = 0;
  private static readonly CIRCUIT_BREAKER_INTERVAL_MS = 60 * 1000; // retry every 60s

  private static getPool(): mysql.Pool {
    if (!this.pool) {
      this.pool = mysql.createPool({
        host: process.env.STARROCKS_HOST || 'prolt-prod-starrocks.probussense.com',
        port: Number(process.env.STARROCKS_PORT) || 9030,
        user: process.env.STARROCKS_USER || 'read_only_user',
        password: process.env.STARROCKS_PASSWORD || 'Probus@123',
        database: process.env.STARROCKS_DATABASE || 'prolt_hes_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 2000
      });
    }
    return this.pool;
  }

  public static async getAvailableMeters(): Promise<string[]> {
    if (!this.isAvailable && Date.now() - this.lastCheckTime < this.CIRCUIT_BREAKER_INTERVAL_MS) {
      return [];
    }

    try {
      const pool = this.getPool();
      const [rows]: any = await pool.query(`
        SELECT DISTINCT meter_number 
        FROM prolt_load_data 
        WHERE meter_number IS NOT NULL AND meter_number != ''
      `);
      this.isAvailable = true;
      this.lastCheckTime = Date.now();
      if (Array.isArray(rows)) {
        return rows.map((r: any) => r.meter_number);
      }
      return [];
    } catch (err: any) {
      this.isAvailable = false;
      this.lastCheckTime = Date.now();
      console.error('StarRocks getAvailableMeters error (temporarily disabled for 60s):', err.message);
      return [];
    }
  }

  /**
   * Fetch 15-minute aggregated consumer actual load data from StarRocks (prolt_load_data)
   */
  public static async getConsumerActualDemandMap(dates: string[], meterNo?: string): Promise<Map<string, number>> {
    const actualMap = new Map<string, number>();
    if (!dates || dates.length === 0) return actualMap;

    if (!this.isAvailable && Date.now() - this.lastCheckTime < this.CIRCUIT_BREAKER_INTERVAL_MS) {
      return actualMap;
    }

    try {
      const pool = this.getPool();
      const targetMeter = meterNo || 'X2521837'; // Default to X2521837 if no meter provided

      let [rows]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(datetime_slot, '%Y-%m-%d') as date_str,
          DATE_FORMAT(datetime_slot, '%H:%i') as time_str,
          ROUND(MAX(block_apparent_energy * 0.4), 2) as total_apparent_kvah,
          ROUND(MAX(block_active_energy * 0.4), 2) as total_active_kwh
        FROM prolt_load_data 
        WHERE DATE_FORMAT(datetime_slot, '%Y-%m-%d') IN (?)
          AND meter_number = ?
        GROUP BY datetime_slot, date_str, time_str
        ORDER BY datetime_slot ASC
      `, [dates, targetMeter]);

      // Fallback query if specific meter query has no rows for date and no specific meter was asked
      if ((!Array.isArray(rows) || rows.length === 0) && !meterNo) {
        [rows] = await pool.query(`
          SELECT 
            DATE_FORMAT(datetime_slot, '%Y-%m-%d') as date_str,
            DATE_FORMAT(datetime_slot, '%H:%i') as time_str,
            ROUND(MAX(block_apparent_energy * 0.4), 2) as total_apparent_kvah,
            ROUND(MAX(block_active_energy * 0.4), 2) as total_active_kwh
          FROM prolt_load_data 
          WHERE DATE_FORMAT(datetime_slot, '%Y-%m-%d') IN (?)
          GROUP BY datetime_slot, date_str, time_str
          ORDER BY datetime_slot ASC
        `, [dates]);
      }

      if (Array.isArray(rows)) {
        this.isAvailable = true;
        this.lastCheckTime = Date.now();
        rows.forEach((r: any) => {
          const dateStr = r.date_str;
          const timeStr = r.time_str;
          const val = Number(r.total_apparent_kvah || r.total_active_kwh || 0);
          
          actualMap.set(`${dateStr}_${timeStr}`, val);

          const parts = timeStr.split(':').map(Number);
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const intervalNum = Math.floor((parts[0] * 60 + parts[1]) / 15) + 1;
            actualMap.set(`${dateStr}_${intervalNum}`, val);
          }
        });
      }
    } catch (err: any) {
      this.isAvailable = false;
      this.lastCheckTime = Date.now();
      console.warn('[StarrocksService] StarRocks unreachable (temporarily cooling down for 60s):', err.message);
    }

    return actualMap;
  }
}
