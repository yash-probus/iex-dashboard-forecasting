# Database Setup Guide

This project relies on PostgreSQL running inside a Docker container for its local development environment. The setup utilizes Docker managed volumes to ensure that no data is lost between server restarts.

## Prerequisites
- Docker Desktop or Docker Engine installed and running.
- DBeaver (or any equivalent SQL client) for database management.

## 1. DBeaver Connection Details
Once the database container is running, you can connect your SQL client using the following credentials:

| Setting | Value |
| --- | --- |
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `Prolt_Operations` |
| **Username** | `postgres` |
| **Password** | `postgres` |

> **Note**: Ensure that no other local PostgreSQL instance is currently occupying port `5432` on your host machine.

---

## 2. Docker Operational Commands

All commands below should be executed from within the `backend/` directory where the `docker-compose.yml` file is located.

### Start the Database
Start the PostgreSQL container in detached mode (running in the background):
```bash
docker-compose up -d
```

### Stop the Database
Gracefully stop the container without destroying it:
```bash
docker-compose stop
```

### Restart the Database
```bash
docker-compose restart
```

### View Database Logs
Tail the logs to troubleshoot connection or initialization issues:
```bash
docker logs -f iex-postgres
```

### Destroy the Container (Preserving Data)
Remove the container structure (the data volume will remain intact):
```bash
docker-compose down
```

### 🚨 Reset Data / Destroy Volume
If you want to completely wipe the database and start fresh (this destroys the `postgres_data` volume):
```bash
docker-compose down -v
```

---

## 3. Verifying the Setup

To manually verify that your infrastructure is healthy:

1. **Verify Container is Running:**
   ```bash
   docker ps
   ```
   *Expected Output:* You should see a container named `iex-postgres` mapped to `0.0.0.0:5432->5432/tcp`.

2. **Verify Volume Exists:**
   ```bash
   docker volume ls
   ```
   *Expected Output:* You should see a local volume explicitly named `postgres_data`.
