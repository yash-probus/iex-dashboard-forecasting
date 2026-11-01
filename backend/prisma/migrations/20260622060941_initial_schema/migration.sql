-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('DAM', 'GDAM', 'RTM');

-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('ACTIVE', 'REPLACED', 'DELETED');

-- CreateEnum
CREATE TYPE "UploadAction" AS ENUM ('UPLOAD', 'REPLACE', 'DELETE');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "market" "MarketType" NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "status" "DatasetStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadHistory" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "market" "MarketType" NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "action" "UploadAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamRecord" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "intervalNumber" SMALLINT NOT NULL,
    "intervalTime" VARCHAR(15) NOT NULL,
    "purchaseBid" DECIMAL(18,4) NOT NULL,
    "sellBid" DECIMAL(18,4) NOT NULL,
    "mcv" DECIMAL(18,4) NOT NULL,
    "fsv" DECIMAL(18,4) NOT NULL,
    "mcp" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "DamRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GdamRecord" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "intervalNumber" SMALLINT NOT NULL,
    "intervalTime" VARCHAR(15) NOT NULL,
    "purchaseBid" DECIMAL(18,4) NOT NULL,
    "sellBidTotal" DECIMAL(18,4) NOT NULL,
    "sellBidSolar" DECIMAL(18,4) NOT NULL,
    "sellBidNonSolar" DECIMAL(18,4) NOT NULL,
    "sellBidHydro" DECIMAL(18,4) NOT NULL,
    "mcvTotal" DECIMAL(18,4) NOT NULL,
    "mcvSolar" DECIMAL(18,4) NOT NULL,
    "mcvNonSolar" DECIMAL(18,4) NOT NULL,
    "mcvHydro" DECIMAL(18,4) NOT NULL,
    "fsvTotal" DECIMAL(18,4) NOT NULL,
    "fsvSolar" DECIMAL(18,4) NOT NULL,
    "fsvNonSolar" DECIMAL(18,4) NOT NULL,
    "fsvHydro" DECIMAL(18,4) NOT NULL,
    "mcp" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "GdamRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RtmRecord" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "intervalNumber" SMALLINT NOT NULL,
    "intervalTime" VARCHAR(15) NOT NULL,
    "sessionId" VARCHAR(50) NOT NULL,
    "purchaseBid" DECIMAL(18,4) NOT NULL,
    "sellBid" DECIMAL(18,4) NOT NULL,
    "mcv" DECIMAL(18,4) NOT NULL,
    "fsv" DECIMAL(18,4) NOT NULL,
    "mcp" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "RtmRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_username_idx" ON "Admin"("username");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Dataset_market_idx" ON "Dataset"("market");

-- CreateIndex
CREATE INDEX "Dataset_deliveryDate_idx" ON "Dataset"("deliveryDate");

-- CreateIndex
CREATE INDEX "Dataset_status_idx" ON "Dataset"("status");

-- CreateIndex
CREATE INDEX "Dataset_market_deliveryDate_idx" ON "Dataset"("market", "deliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_market_deliveryDate_key" ON "Dataset"("market", "deliveryDate");

-- CreateIndex
CREATE INDEX "UploadHistory_datasetId_idx" ON "UploadHistory"("datasetId");

-- CreateIndex
CREATE INDEX "UploadHistory_market_idx" ON "UploadHistory"("market");

-- CreateIndex
CREATE INDEX "UploadHistory_deliveryDate_idx" ON "UploadHistory"("deliveryDate");

-- CreateIndex
CREATE INDEX "UploadHistory_action_idx" ON "UploadHistory"("action");

-- CreateIndex
CREATE INDEX "UploadHistory_timestamp_idx" ON "UploadHistory"("timestamp");

-- CreateIndex
CREATE INDEX "DamRecord_datasetId_idx" ON "DamRecord"("datasetId");

-- CreateIndex
CREATE INDEX "DamRecord_intervalNumber_idx" ON "DamRecord"("intervalNumber");

-- CreateIndex
CREATE INDEX "DamRecord_intervalTime_idx" ON "DamRecord"("intervalTime");

-- CreateIndex
CREATE UNIQUE INDEX "DamRecord_datasetId_intervalNumber_key" ON "DamRecord"("datasetId", "intervalNumber");

-- CreateIndex
CREATE INDEX "GdamRecord_datasetId_idx" ON "GdamRecord"("datasetId");

-- CreateIndex
CREATE INDEX "GdamRecord_intervalNumber_idx" ON "GdamRecord"("intervalNumber");

-- CreateIndex
CREATE INDEX "GdamRecord_intervalTime_idx" ON "GdamRecord"("intervalTime");

-- CreateIndex
CREATE UNIQUE INDEX "GdamRecord_datasetId_intervalNumber_key" ON "GdamRecord"("datasetId", "intervalNumber");

-- CreateIndex
CREATE INDEX "RtmRecord_datasetId_idx" ON "RtmRecord"("datasetId");

-- CreateIndex
CREATE INDEX "RtmRecord_intervalNumber_idx" ON "RtmRecord"("intervalNumber");

-- CreateIndex
CREATE INDEX "RtmRecord_intervalTime_idx" ON "RtmRecord"("intervalTime");

-- CreateIndex
CREATE UNIQUE INDEX "RtmRecord_datasetId_intervalNumber_key" ON "RtmRecord"("datasetId", "intervalNumber");

-- AddForeignKey
ALTER TABLE "UploadHistory" ADD CONSTRAINT "UploadHistory_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamRecord" ADD CONSTRAINT "DamRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdamRecord" ADD CONSTRAINT "GdamRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RtmRecord" ADD CONSTRAINT "RtmRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
