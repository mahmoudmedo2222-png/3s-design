DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "auth_sessions"
		GROUP BY "refresh_token_hash"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot create auth_sessions_refresh_token_hash_idx: duplicate refresh token hashes exist';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "auth_verification_tokens"
		GROUP BY "token_hash"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot create auth_verification_tokens_token_hash_idx: duplicate verification token hashes exist';
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_idx" ON "auth_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_family_idx" ON "auth_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_revoked_idx" ON "auth_sessions" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_verification_tokens_token_hash_idx" ON "auth_verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_verification_tokens_user_purpose_created_idx" ON "auth_verification_tokens" USING btree ("user_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "rate_limit_events_key_action_window_idx" ON "rate_limit_events" USING btree ("key","action","window_end");
