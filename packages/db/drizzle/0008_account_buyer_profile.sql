ALTER TABLE "user_profiles" ADD COLUMN "buyer_profile" jsonb DEFAULT '{}'::jsonb NOT NULL;
