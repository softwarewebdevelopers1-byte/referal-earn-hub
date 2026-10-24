CREATE TABLE refresh_tokens (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT       NOT NULL,
    token_hash        VARCHAR(64)  NOT NULL,
    expires_at        DATETIME(6)  NOT NULL,
    revoked_at        DATETIME(6)  NULL,
    replaced_by_hash  VARCHAR(64)  NULL,
    created_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens(user_id);
