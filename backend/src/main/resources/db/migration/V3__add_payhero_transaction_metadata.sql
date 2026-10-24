ALTER TABLE payments
    ADD COLUMN provider_reference VARCHAR(120) NULL,
    ADD COLUMN checkout_request_id VARCHAR(120) NULL,
    ADD COLUMN merchant_request_id VARCHAR(120) NULL,
    ADD COLUMN initiated_phone VARCHAR(30) NULL,
    ADD COLUMN provider_phone VARCHAR(30) NULL,
    ADD COLUMN provider_result_code INT NULL,
    ADD COLUMN provider_result_description VARCHAR(500) NULL,
    ADD COLUMN callback_received_at DATETIME(6) NULL,
    ADD COLUMN payment_completed_at DATETIME(6) NULL;

CREATE UNIQUE INDEX uq_payments_provider_reference ON payments(provider_reference);
CREATE UNIQUE INDEX uq_payments_mpesa_reference ON payments(mpesa_reference);
CREATE INDEX ix_payments_checkout_request_id ON payments(checkout_request_id);
