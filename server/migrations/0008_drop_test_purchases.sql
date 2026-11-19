-- Live payments start: the purchases made with Stripe's test mode (Checkout session ids "cs_test_...") are removed.
-- Live purchases ("cs_live_...") are not touched.
DELETE FROM plus WHERE session LIKE 'cs_test_%';
