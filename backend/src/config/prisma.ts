import { PrismaClient } from '@prisma/client';

let activeClient: PrismaClient | null = null;
let isBackupActive = false;

function getClient(): PrismaClient {
  if (activeClient) {
    return activeClient;
  }

  // Create primary client by default
  const primaryUrl = process.env.DATABASE_URL;
  
  activeClient = new PrismaClient({
    datasources: {
      db: {
        url: primaryUrl
      }
    }
  });

  return activeClient;
}

// Failover function called during $connect
async function connectWithFailover(): Promise<void> {
  const client = getClient();
  try {
    await client.$connect();
  } catch (error) {
    console.error('[Prisma] Primary database connection failed. Attempting failover to backup database...', error);
    const backupUrl = process.env.BACKUP_DATABASE_URL;
    if (!backupUrl) {
      console.error('[Prisma] Failover failed: BACKUP_DATABASE_URL is not defined.');
      throw error;
    }

    try {
      // Disconnect primary if any partial connection was made
      await client.$disconnect().catch(() => {});
      
      // Initialize backup client
      activeClient = new PrismaClient({
        datasources: {
          db: {
            url: backupUrl
          }
        }
      });
      isBackupActive = true;
      await activeClient.$connect();
      console.log('[Prisma] Connected successfully to backup database!');
    } catch (backupError) {
      console.error('[Prisma] Backup database connection also failed!', backupError);
      throw backupError;
    }
  }
}

// Proxy all property accesses to the active client
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (prop === '$connect') {
      return connectWithFailover;
    }
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export default prisma;
