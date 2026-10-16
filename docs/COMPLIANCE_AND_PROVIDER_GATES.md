# Regulatory Compliance, Jurisdiction & Provider Gates

**Document Version:** 1.0.0  
**Target Market:** Federal Republic of Nigeria (Initial Launch)  
**Regulatory Frameworks:** SEC ARIP (Accelerated Regulatory Incubation Program) & CBN Guidelines on Virtual Asset Service Providers (VASPs)  
**Date:** October 2026  

---

## 1. Regulatory Framework & Licensing Status

Operating a crypto-fiat custodial wallet in Nigeria requires compliance with the Securities and Exchange Commission (SEC) Rules on Issuance, Offering Platforms and Custody of Digital Assets (May 2022) and the Accelerated Regulatory Incubation Program (ARIP):

| Requirement | Statutory Authority | Implementation in ApexWallet | Status |
| :--- | :--- | :--- | :---: |
| **VASP Registration / ARIP Cohort** | SEC Nigeria | Application dossier prepared; awaiting corporate legal submission | **LEGAL GATE** |
| **Tiered KYC Guidelines** | CBN / SEC | Tier 1 (Phone/Email, ₦50k limit); Tier 2 (BVN/NIN); Tier 3 (Govt ID) | **PARTIALLY IMPLEMENTED (Tier 1 Active)** |
| **AML/CFT Screening & Sanctions** | NFIU / SEC | Requires automated screening against UN/OFAC/PEP sanction lists | **PROVIDER BLOCKED** |
| **Custodial Segregation of Assets** | SEC Rule 23.0 | Institutional MPC custody (Fireblocks) segregating firm vs user funds | **ARCHITECTURE READY** |

> **Legal Disclaimer:** Nothing in this document or software constitutes formal legal advice. ApexWallet must retain qualified Nigerian legal counsel specializing in fintech regulation to complete formal filings prior to commercial launch.

---

## 2. Commercial Provider Prerequisites & Blockers

### 2.1 Fiat On-Ramp / Off-Ramp: Korapay Technologies Inc.
- **Provider Role:** NGN Dynamic Virtual Bank Account issuance, collection, and payout settlement.
- **Current Integration Mode:** Sandbox (Deterministic test accounts).
- **Production Blockers:**
  - Execution of commercial merchant processing agreement with Korapay.
  - Verification of corporate registration (CAC), Tax Clearance Certificate (TCC), and AML policy.
  - Whitelisting of production server egress IPs for webhook delivery.
  - Provisioning of live production credentials: `KORAPAY_PUBLIC_KEY`, `KORAPAY_SECRET_KEY`.

### 2.2 Digital Asset Custody: Fireblocks Inc.
- **Provider Role:** MPC key management, omnibus vault custody, address derivation, on-chain transaction signing, and mempool monitoring.
- **Current Integration Mode:** Sandbox (Deterministic SHA-256 address derivation and testnet transaction hashes).
- **Production Blockers:**
  - Fireblocks Enterprise subscription agreement and workspace provisioning.
  - Setup of redundant MPC Co-Signer nodes across distinct cloud availability zones.
  - Configuration of administrative Transaction Authorization Policies (TAP) enforcing multi-approver rules for large treasury withdrawals.
  - Provisioning of live production credentials: `FIREBLOCKS_API_KEY`, `FIREBLOCKS_SECRET_KEY`, and `FIREBLOCKS_WEBHOOK_SECRET`.

---

## 3. Tiered KYC Limits & Risk Controls

To mitigate fraud and prevent illicit financial flows under SEC ARIP rules:

```
TIER 1 (Automated upon registration)
├── Requirements: Verified Phone Number + Verified Email Address
├── Daily Transfer Limit: ₦50,000 (~$32 USD)
├── Single Transaction Limit: ₦20,000
└── Max Cumulative Balance: ₦300,000

TIER 2 (Requires Identity Verification Integration)
├── Requirements: Tier 1 + Verified Bank Verification Number (BVN) / National Identity Number (NIN)
├── Daily Transfer Limit: ₦500,000 (~$320 USD)
└── Single Transaction Limit: ₦200,000

TIER 3 (Requires Institutional KYC Review)
├── Requirements: Tier 2 + Government Issued ID + Proof of Address (Utility Bill < 3 months)
├── Daily Transfer Limit: ₦5,000,000 (~$3,200 USD)
└── Unrestricted on-chain crypto withdrawals subject to TAP review
```
