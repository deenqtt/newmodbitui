-- AlterTable
ALTER TABLE "DeviceExternal" ADD COLUMN     "lastPayload" JSONB,
ADD COLUMN     "lastUpdatedByMqtt" TIMESTAMP(3);
