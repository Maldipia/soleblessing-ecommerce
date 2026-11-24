-- Payment proofs — switch the storage bucket to PRIVATE (v1)
-- PREPARED FOR REVIEW — NOT APPLIED. Apply only after Pia's explicit approval,
-- TOGETHER WITH deploying the code that serves proofs via signed URLs
-- (api/upload-proof.js stores bucket paths; admin op 'proof_url' signs them;
-- the dashboard converts legacy public URLs to signed URLs automatically).
--
-- Effect: anonymous access to https://.../object/public/payment-proofs/* stops
-- working (that is the point — customer payment screenshots become private).
-- Admins keep full access through 10-minute signed URLs. No table data changes.

update storage.buckets set public = false where id = 'payment-proofs';

-- ROLLBACK:
--   update storage.buckets set public = true where id = 'payment-proofs';
