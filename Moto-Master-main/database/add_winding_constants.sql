-- ============================================================
-- MOTO MASTER - add the Winding "Calculation constants" columns
-- Run once in the Neon SQL Editor. Safe to run again.
-- Empty (NULL) = the default value is used.
-- ============================================================

ALTER TABLE design_winding_data
    ADD COLUMN IF NOT EXISTS slot_fill_factor NUMERIC(6,4)
        CHECK (slot_fill_factor > 0 AND slot_fill_factor <= 1),
    ADD COLUMN IF NOT EXISTS flux_density     NUMERIC(6,4)
        CHECK (flux_density > 0 AND flux_density <= 3),
    ADD COLUMN IF NOT EXISTS loss_factor_t    NUMERIC(8,3)
        CHECK (loss_factor_t >= 0 AND loss_factor_t <= 100),
    ADD COLUMN IF NOT EXISTS loss_factor_y    NUMERIC(8,3)
        CHECK (loss_factor_y >= 0 AND loss_factor_y <= 100);
