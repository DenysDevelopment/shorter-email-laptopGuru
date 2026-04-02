-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "enabledModules" TEXT[] DEFAULT ARRAY['emails', 'videos', 'links', 'quicklinks', 'send', 'messaging', 'analytics']::TEXT[];
