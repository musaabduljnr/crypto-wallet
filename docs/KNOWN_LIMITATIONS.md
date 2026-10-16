# Known Limitations & External Integration Blockers

**Document Version:** 1.0.0  
**Application:** ApexWallet  
**Milestone:** 4 (Controlled Launch Assessment)  
**Date:** October 2026  

---

## 1. Overview
In accordance with fintech transparency standards and the project's strict release rules, this document explicitly details all operational limitations, deferred capabilities, and external integration blockers.

---

## 2. Inventory of Known Limitations

### 2.1 Commercial Provider Credentials (Sandbox Boundary)
- **Current Behavior:** The application operates in transparent sandbox mode. All on-chain addresses, virtual bank accounts, and transactions use deterministic testnet generators and simulated broadcast hashes.
- **Limitation:** Live blockchain transactions and real Naira settlements cannot occur.
- **Resolution Prerequisites:**
  - Execute commercial agreement with Korapay Technologies Inc. and inject `KORAPAY_SECRET_KEY`.
  - Execute enterprise agreement with Fireblocks Inc., deploy Co-Signer nodes, and inject `FIREBLOCKS_API_KEY` and `FIREBLOCKS_SECRET_KEY`.

### 2.2 KYC Tier 2 & 3 Identity Verification
- **Current Behavior:** Users register and receive automatic Tier 1 status (Phone Number + Verified Email), permitting sandbox transactions up to ₦50,000 daily limit.
- **Limitation:** Tier 2 (BVN/NIN) and Tier 3 (Government-issued ID document verification) workflows are not connected to an automated KYC vendor.
- **Resolution Prerequisites:**
  - Integrate an approved Nigerian identity verification partner (e.g., Dojah, Smile ID, or QoreID).
  - Add biometric liveness checks and automated sanction screening.

### 2.3 External Delivery Channels (Transactional Email & SMS)
- **Current Behavior:** The in-app notification center is fully operational. Real-time bell badges and status updates display for all financial events.
- **Limitation:** Outbound delivery to external email inboxes or SMS numbers is deferred.
- **Resolution Prerequisites:**
  - Provision SendGrid or Resend API credentials (`RESEND_API_KEY`).
  - Configure DKIM and SPF records for `apexwallet.ng`.

### 2.4 Legal & Regulatory Filing Gate
- **Current Behavior:** The wallet software complies with SEC ARIP design standards and CBN risk controls.
- **Limitation:** The operating entity has not completed formal regulatory admission into the SEC ARIP sandbox cohort.
- **Resolution Prerequisites:**
  - Retain accredited Nigerian fintech regulatory counsel.
  - Submit formal application dossier and AML/CFT compliance policy to the Securities and Exchange Commission (SEC) Nigeria.

### 2.5 Hardware Security Module (HSM) Independent Penetration Test
- **Current Behavior:** Application code has passed static and dynamic internal security audits, automated invariant tests, and input validation checks.
- **Limitation:** No third-party white-box penetration test or SOC 2 Type II audit has been performed by an independent auditing firm.
- **Resolution Prerequisites:**
  - Engage an accredited cybersecurity firm (e.g., CertiK, Kudelski, or Cure53) for comprehensive smart contract, API, and cloud infrastructure penetration testing prior to public mainnet launch.
