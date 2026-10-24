-- Users
CREATE TABLE users (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name        VARCHAR(80)  NOT NULL,
    last_name         VARCHAR(80)  NOT NULL,
    email             VARCHAR(160) NOT NULL,
    phone             VARCHAR(30)  NOT NULL,
    password_hash     VARCHAR(100) NOT NULL,
    role              VARCHAR(20)  NOT NULL DEFAULT 'USER',
    payment_status    VARCHAR(30)  NOT NULL DEFAULT 'UNPAID',
    account_status    VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    referral_code     VARCHAR(20)  NOT NULL,
    referred_by_id    BIGINT       NULL,
    created_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT uq_users_referral_code UNIQUE (referral_code),
    CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by_id) REFERENCES users(id)
);
CREATE INDEX ix_users_referred_by ON users(referred_by_id);

-- One referral relationship per account (enforced via users.referred_by_id being set once)

-- Payments
CREATE TABLE payments (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id               BIGINT        NOT NULL,
    internal_reference    VARCHAR(64)   NOT NULL,
    external_reference    VARCHAR(120)  NULL,
    mpesa_reference       VARCHAR(60)   NULL,
    amount                DECIMAL(12,2) NOT NULL,
    currency              VARCHAR(3)    NOT NULL DEFAULT 'KES',
    method                VARCHAR(30)   NOT NULL DEFAULT 'M_PESA',
    status                VARCHAR(30)   NOT NULL DEFAULT 'PENDING',
    activation_processed  BOOLEAN       NOT NULL DEFAULT FALSE,
    rejection_reason      VARCHAR(500)  NULL,
    reviewed_by           BIGINT        NULL,
    reviewed_at           DATETIME(6)   NULL,
    raw_callback          TEXT          NULL,
    created_at            DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at            DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_payments_internal_ref UNIQUE (internal_reference),
    CONSTRAINT uq_payments_external_ref UNIQUE (external_reference),
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_payments_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
CREATE INDEX ix_payments_user ON payments(user_id);
CREATE INDEX ix_payments_status ON payments(status);

-- Referral ledger entries (KES 30 credits)
CREATE TABLE referral_earnings (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    referrer_id     BIGINT        NOT NULL,
    referee_id      BIGINT        NOT NULL,
    payment_id      BIGINT        NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3)    NOT NULL DEFAULT 'KES',
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_ref_earn_payment UNIQUE (payment_id),
    CONSTRAINT uq_ref_earn_referee UNIQUE (referee_id),
    CONSTRAINT fk_ref_earn_referrer FOREIGN KEY (referrer_id) REFERENCES users(id),
    CONSTRAINT fk_ref_earn_referee FOREIGN KEY (referee_id) REFERENCES users(id),
    CONSTRAINT fk_ref_earn_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);
CREATE INDEX ix_ref_earn_referrer ON referral_earnings(referrer_id);

-- Video catalog
CREATE TABLE videos (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(200)  NOT NULL,
    description   VARCHAR(600)  NOT NULL,
    category      VARCHAR(40)   NOT NULL,
    duration_sec  INT           NOT NULL,
    reward        DECIMAL(12,2) NOT NULL,
    gradient_from VARCHAR(20)   NOT NULL DEFAULT '#f97316',
    gradient_to   VARCHAR(20)   NOT NULL DEFAULT '#ea580c',
    active        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- Video completions (one reward per user per video)
CREATE TABLE video_completions (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT        NOT NULL,
    video_id      BIGINT        NOT NULL,
    reward_amount DECIMAL(12,2) NOT NULL,
    completed_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_video_completion UNIQUE (user_id, video_id),
    CONSTRAINT fk_vc_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_vc_video FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Unified transaction ledger (immutable; corrections are separate reversal rows)
CREATE TABLE ledger_entries (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT        NOT NULL,
    type           VARCHAR(40)   NOT NULL,
    status         VARCHAR(20)   NOT NULL,
    amount         DECIMAL(12,2) NOT NULL,
    currency       VARCHAR(3)    NOT NULL DEFAULT 'KES',
    reference      VARCHAR(64)   NOT NULL,
    description    VARCHAR(300)  NOT NULL,
    source_id      BIGINT        NULL,   -- e.g. referral_earnings.id, video_completions.id, withdrawal_requests.id
    created_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_ledger_reference UNIQUE (reference),
    CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX ix_ledger_user_created ON ledger_entries(user_id, created_at);
CREATE INDEX ix_ledger_user_type ON ledger_entries(user_id, type);

-- Withdrawal / support requests
CREATE TABLE withdrawal_requests (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id              BIGINT        NOT NULL,
    amount               DECIMAL(12,2) NOT NULL,
    currency             VARCHAR(3)    NOT NULL DEFAULT 'KES',
    status               VARCHAR(40)   NOT NULL,   -- SUPPORT_REQUESTED, ADMIN_CONTACT_REQUIRED, etc.
    successful_referrals_at_request INT NOT NULL,
    note                 VARCHAR(500)  NULL,
    created_at           DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_wr_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX ix_wr_user ON withdrawal_requests(user_id);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    token_hash  VARCHAR(100) NOT NULL,
    expires_at  DATETIME(6)  NOT NULL,
    used_at     DATETIME(6)  NULL,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_prt_token UNIQUE (token_hash),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit log for admin actions
CREATE TABLE audit_logs (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id     BIGINT       NOT NULL,
    action       VARCHAR(60)  NOT NULL,
    target_type  VARCHAR(40)  NOT NULL,
    target_id    BIGINT       NOT NULL,
    reason       VARCHAR(500) NULL,
    created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id)
);
CREATE INDEX ix_audit_target ON audit_logs(target_type, target_id);

-- Seed the video catalog with the same entries the frontend previously hardcoded
INSERT INTO videos (title, description, category, duration_sec, reward, gradient_from, gradient_to) VALUES
('Mastering Personal Finance in 10 Minutes', 'Learn the fundamentals of budgeting, saving, and investing for long-term wealth.', 'Education', 600, 15.00, '#f97316', '#ea580c'),
('Intro to Modern Web Development', 'A friendly walkthrough of React, TypeScript, and how frontends are built today.', 'Technology', 900, 20.00, '#0ea5e9', '#0369a1'),
('Starting a Side Business on a Budget', 'Practical steps for turning a small idea into a real, profitable side hustle.', 'Business', 720, 18.00, '#16a34a', '#15803d'),
('Healthy Morning Routines That Stick', 'Simple lifestyle habits to build energy and focus throughout the day.', 'Lifestyle', 480, 12.00, '#795548', '#5d4037'),
('The Science of Fun: Why We Play', 'Entertainment meets psychology in this lighthearted look at joy and play.', 'Entertainment', 540, 10.00, '#a855f7', '#7e22ce'),
('Building Wealth with Compound Interest', 'Understand how small, consistent investments grow over decades.', 'Education', 780, 16.00, '#f59e0b', '#b45309'),
('Cloud Computing Explained Simply', 'What is the cloud, really? A clear explanation without the jargon.', 'Technology', 660, 14.00, '#6366f1', '#4338ca'),
('Negotiating Your First Salary', 'Confident, respectful approaches to getting paid what you are worth.', 'Business', 840, 19.00, '#0d9488', '#115e59');
