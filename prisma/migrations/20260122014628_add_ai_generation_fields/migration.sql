-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "generationMetadata" JSONB,
ADD COLUMN     "generationPrompt" TEXT;
