# Guardian alert access review

Reviewed against the enabled Cocoon Cloud database on 17 October 2026.

The initial `outbox_recipient` policy contained an unqualified correlated column reference. PostgreSQL resolved it inside `guardian_enrollments`, yielding `g.id = g.recipient_id`, rather than matching the message's enrollment. The deployed policy was corrected to use `g.id = notify_outbox.recipient_id` explicitly.

Independent database assertions ran inside one transaction with synthetic users and an alert, then rolled back. They confirmed: the intended opted-in guardian can read the alert; an unrelated user cannot; the traveller can read their alert; a revoked guardian loses access. No test accounts, alerts or messages were retained or sent. All assertions passed.

Lovable subsequently persisted the matching correction in `drizzle/migrations/0005_cocoon_outbox_recipient_qualified_review.sql` and added six isolated PostgreSQL rollback tests. This review does not certify the entire production backend or provider delivery.
