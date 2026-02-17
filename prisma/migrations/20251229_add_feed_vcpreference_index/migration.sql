-- CreateIndex
-- Optimizes feed queries that filter by region, role, and vcPreference
CREATE INDEX "Post_region_role_vcPreference_createdAt_idx" ON "Post"("region", "role", "vcPreference", "createdAt");
