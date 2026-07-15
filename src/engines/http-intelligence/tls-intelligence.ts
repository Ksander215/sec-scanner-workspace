/**
 * HTTP Intelligence Engine — TLS Intelligence
 *
 * Analyzes TLS configuration, certificates, cipher suites.
 * Provides TLS grading (A+ through F/T).
 *
 * Strategy: use data from TLS probe + response headers
 * to build a comprehensive TLS security profile.
 */

import {
  TlsVersion,
  TlsVersionStatus,
  TlsGrade,
  TlsCipherSuite,
  TlsCertificateInfo,
  TlsProfile,
  TlsProbeResult,
} from './http-types.ts';
import type { HttpResponse } from './http-types.ts';

// ═══════════════════════════════════════════════════════════════
// TLS Version Status Mapping
// ═══════════════════════════════════════════════════════════════

const TLS_VERSION_STATUS: Record<TlsVersion, TlsVersionStatus> = {
  [TlsVersion.Tls1_3]: TlsVersionStatus.Secure,
  [TlsVersion.Tls1_2]: TlsVersionStatus.Acceptable,
  [TlsVersion.Tls1_1]: TlsVersionStatus.Insecure,
  [TlsVersion.Tls1_0]: TlsVersionStatus.Insecure,
  [TlsVersion.Ssl3_0]: TlsVersionStatus.Deprecated,
  [TlsVersion.Unknown]: TlsVersionStatus.Unknown,
};

// ═══════════════════════════════════════════════════════════════
// Known Cipher Suite Analysis
// ═══════════════════════════════════════════════════════════════

const SECURE_CIPHERS = new Set([
  'TLS_AES_256_GCM_SHA384',
  'TLS_AES_128_GCM_SHA256',
  'TLS_CHACHA20_POLY1305_SHA256',
  'TLS_AES_128_CCM_SHA256',
  'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
  'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
  'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
  'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
  'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
  'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
]);

const WEAK_CIPHERS = new Set([
  'TLS_RSA_WITH_RC4_128_SHA',
  'TLS_RSA_WITH_DES_CBC_SHA',
  'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
  'TLS_ECDHE_RSA_WITH_RC4_128_SHA',
  'TLS_ECDHE_ECDSA_WITH_RC4_128_SHA',
]);

function analyzeCipherSuite(name: string, protocol: TlsVersion): TlsCipherSuite {
  const isSecure = SECURE_CIPHERS.has(name);
  const isWeak = WEAK_CIPHERS.has(name);
  const keySize = extractKeySize(name);
  const algorithm = extractAlgorithm(name);

  let status: TlsVersionStatus;
  if (isWeak || keySize < 128) {
    status = TlsVersionStatus.Insecure;
  } else if (isSecure) {
    status = TlsVersionStatus.Secure;
  } else {
    status = TlsVersionStatus.Acceptable;
  }

  return {
    name,
    protocol,
    keySize,
    algorithm,
    status,
  };
}

function extractKeySize(cipher: string): number {
  // Common patterns: AES_256, AES_128, CHACHA20 (256)
  const aes256 = cipher.match(/AES[_-]256/);
  if (aes256) return 256;
  const aes128 = cipher.match(/AES[_-]128/);
  if (aes128) return 128;
  if (cipher.includes('CHACHA20')) return 256;
  const rc4 = cipher.match(/RC4[_-]?(\d+)/);
  if (rc4) return parseInt(rc4[1], 10);
  const des = cipher.match(/DES[_-]?(\d+)/);
  if (des) return parseInt(des[1], 10) * 8; // DES key in bits
  return 0;
}

function extractAlgorithm(cipher: string): string {
  if (cipher.includes('GCM')) return 'AES-GCM';
  if (cipher.includes('CBC')) return 'AES-CBC';
  if (cipher.includes('CHACHA20')) return 'ChaCha20-Poly1305';
  if (cipher.includes('RC4')) return 'RC4';
  if (cipher.includes('3DES') || cipher.includes('DES')) return '3DES';
  if (cipher.includes('CCM')) return 'AES-CCM';
  return 'Unknown';
}

// ═══════════════════════════════════════════════════════════════
// Certificate Analysis
// ═══════════════════════════════════════════════════════════════

function analyzeCertificate(cert: TlsCertificateInfo): TlsCertificateInfo {
  const now = new Date();
  const expiresAt = new Date(cert.notAfter);
  const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining < 0;
  const isSelfSigned = cert.issuer === cert.subject || cert.issuer === 'Unknown';
  const isWildcard = cert.sanEntries.some(s => s.startsWith('*.'));
  const isWeakKey = cert.publicKeyAlgorithm.toUpperCase().includes('EC')
    ? cert.publicKeySize < 160  // ECDSA: 160-bit minimum (P-256 = 256-bit)
    : cert.publicKeySize < 2048; // RSA: 2048-bit minimum

  return {
    ...cert,
    daysRemaining,
    isExpired,
    isSelfSigned,
    isWildcard,
    isWeakKey,
  };
}

function detectChainIssues(certs: readonly TlsCertificateInfo[]): string[] {
  const issues: string[] = [];

  if (certs.length === 0) {
    issues.push('No certificate chain found');
    return issues;
  }

  const leaf = certs[0];

  // Check leaf cert
  if (leaf.isExpired) {
    issues.push('Leaf certificate has expired');
  }
  if (leaf.daysRemaining < 30) {
    issues.push(`Leaf certificate expires in ${leaf.daysRemaining} days — renewal recommended`);
  }
  if (leaf.isSelfSigned) {
    issues.push('Certificate is self-signed — not trusted by default');
  }
  if (leaf.isWeakKey) {
    issues.push(`Weak public key size: ${leaf.publicKeySize} bits — minimum 2048 recommended`);
  }
  if (leaf.sanEntries.length === 0) {
    issues.push('No Subject Alternative Names (SAN) found');
  }

  // Check chain length
  if (certs.length === 1) {
    issues.push('Certificate chain has only leaf — intermediate certificates may be missing');
  }

  // Check for mixed trust (self-signed in chain)
  for (let i = 1; i < certs.length; i++) {
    if (certs[i].isSelfSigned) {
      // Root CA is typically self-signed — OK
      if (i < certs.length - 1) {
        issues.push(`Intermediate certificate at position ${i} is self-signed`);
      }
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════
// HSTS Parsing
// ═══════════════════════════════════════════════════════════════

interface HstsInfo {
  readonly enabled: boolean;
  readonly maxAge: number;
  readonly includeSubdomains: boolean;
  readonly preload: boolean;
}

function parseHsts(hstsHeader: string | null): HstsInfo {
  if (!hstsHeader) {
    return { enabled: false, maxAge: 0, includeSubdomains: false, preload: false };
  }

  let maxAge = 0;
  let includeSubdomains = false;
  let preload = false;

  for (const directive of hstsHeader.split(';')) {
    const trimmed = directive.trim().toLowerCase();
    if (trimmed.startsWith('max-age=')) {
      maxAge = parseInt(trimmed.split('=')[1], 10) || 0;
    } else if (trimmed === 'includesubdomains') {
      includeSubdomains = true;
    } else if (trimmed === 'preload') {
      preload = true;
    }
  }

  return {
    enabled: maxAge > 0,
    maxAge,
    includeSubdomains,
    preload,
  };
}

// ═══════════════════════════════════════════════════════════════
// TLS Grading
// ═══════════════════════════════════════════════════════════════

function calculateTlsGrade(profile: {
  version: TlsVersion;
  hstsEnabled: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;
  ocspStapling: boolean;
  cipherSuites: readonly TlsCipherSuite[];
  leafCertificate: TlsCertificateInfo | null;
  chainIssues: readonly string[];
}): TlsGrade {
  let score = 0;

  // Version (max 30 points)
  const versionStatus = TLS_VERSION_STATUS[profile.version];
  if (versionStatus === TlsVersionStatus.Secure) score += 30;
  else if (versionStatus === TlsVersionStatus.Acceptable) score += 20;
  else if (versionStatus === TlsVersionStatus.Insecure) score += 5;

  // HSTS (max 30 points)
  if (profile.hstsEnabled) {
    score += 10;
    if (profile.hstsMaxAge >= 31536000) score += 10; // 1 year
    else if (profile.hstsMaxAge >= 2592000) score += 5; // 30 days
    if (profile.hstsIncludeSubdomains) score += 5;
    if (profile.hstsPreload) score += 5;
  }

  // OCSP Stapling (max 10 points)
  if (profile.ocspStapling) score += 10;

  // Cipher suites (max 15 points)
  if (profile.cipherSuites.length > 0) {
    const secureCount = profile.cipherSuites.filter(c => c.status === TlsVersionStatus.Secure).length;
    const weakCount = profile.cipherSuites.filter(c => c.status === TlsVersionStatus.Insecure || c.status === TlsVersionStatus.Deprecated).length;
    if (weakCount === 0) score += 10;
    else if (weakCount <= 1) score += 5;
    if (secureCount >= 3) score += 5;
  }

  // Certificate (max 15 points)
  const leaf = profile.leafCertificate;
  if (leaf) {
    if (!leaf.isExpired && !leaf.isSelfSigned) score += 5;
    if (!leaf.isWeakKey && leaf.publicKeySize >= 2048) score += 5;
    if (leaf.daysRemaining > 90) score += 5;
  }

  // Chain issues (penalties)
  score -= profile.chainIssues.length * 5;

  // Map score to grade
  if (score >= 90) return TlsGrade.A_Plus;
  if (score >= 80) return TlsGrade.A;
  if (score >= 65) return TlsGrade.B;
  if (score >= 50) return TlsGrade.C;
  if (score >= 35) return TlsGrade.D;
  if (score >= 20) return TlsGrade.E;
  if (score >= 10) return TlsGrade.F;
  return TlsGrade.T;
}

// ═══════════════════════════════════════════════════════════════
// TLS Intelligence — Main Class
// ═══════════════════════════════════════════════════════════════

export class TlsIntelligence {
  /**
   * Build a TLS profile from probe result + response headers.
   */
  buildProfile(
    probeResult: TlsProbeResult | null,
    response: HttpResponse | null,
  ): TlsProfile | null {
    if (!probeResult && !response) return null;

    // TLS version
    const tlsVersion = probeResult?.tlsVersion ?? TlsVersion.Unknown;
    const versionStatus = TLS_VERSION_STATUS[tlsVersion];

    // Cipher suites
    const cipherSuites: TlsCipherSuite[] = [];
    if (probeResult?.cipherSuite) {
      cipherSuites.push(analyzeCipherSuite(probeResult.cipherSuite, tlsVersion));
    }

    // ALPN
    const alpnProtocols = probeResult?.alpnProtocols ?? [];

    // HSTS from response headers
    const hstsHeader = response?.headers.get('strict-transport-security') ?? null;
    const hsts = parseHsts(hstsHeader);

    // OCSP
    const ocspStapling = probeResult?.ocspStapling ?? false;

    // Certificate chain
    const rawCerts = probeResult?.certificateChain ?? [];
    const certificateChain = rawCerts.map(analyzeCertificate);
    const leafCertificate = certificateChain.length > 0 ? certificateChain[0] : null;

    // Chain issues
    const chainIssues = detectChainIssues(certificateChain);

    // Build profile
    const profile: Omit<TlsProfile, 'overallGrade'> = {
      version: tlsVersion,
      versionStatus,
      cipherSuites: Object.freeze(cipherSuites),
      alpnProtocols: Object.freeze(alpnProtocols),
      hstsEnabled: hsts.enabled,
      hstsMaxAge: hsts.maxAge,
      hstsIncludeSubdomains: hsts.includeSubdomains,
      hstsPreload: hsts.preload,
      ocspStapling,
      certificateChain: Object.freeze(certificateChain),
      leafCertificate,
      chainIssues: Object.freeze(chainIssues),
    };

    const overallGrade = calculateTlsGrade(profile);

    return Object.freeze({
      ...profile,
      overallGrade,
    });
  }

  /**
   * Build a TLS profile from a mock-friendly raw data structure.
   * Used by tests and the adapter when TLS probe is not available.
   */
  buildProfileFromRaw(data: {
    tlsVersion?: TlsVersion;
    cipherSuite?: string;
    alpnProtocols?: string[];
    certificateChain?: TlsCertificateInfo[];
    ocspStapling?: boolean;
    hstsHeader?: string | null;
  }): TlsProfile {
    const tlsVersion = data.tlsVersion ?? TlsVersion.Unknown;
    const versionStatus = TLS_VERSION_STATUS[tlsVersion];

    const cipherSuites: TlsCipherSuite[] = [];
    if (data.cipherSuite) {
      cipherSuites.push(analyzeCipherSuite(data.cipherSuite, tlsVersion));
    }

    const alpnProtocols = Object.freeze(data.alpnProtocols ?? []);

    const hsts = parseHsts(data.hstsHeader ?? null);
    const ocspStapling = data.ocspStapling ?? false;

    const rawCerts = data.certificateChain ?? [];
    const certificateChain = Object.freeze(rawCerts.map(analyzeCertificate));
    const leafCertificate = certificateChain.length > 0 ? certificateChain[0] : null;
    const chainIssues = Object.freeze(detectChainIssues(certificateChain));

    const profile: Omit<TlsProfile, 'overallGrade'> = {
      version: tlsVersion,
      versionStatus,
      cipherSuites: Object.freeze(cipherSuites),
      alpnProtocols,
      hstsEnabled: hsts.enabled,
      hstsMaxAge: hsts.maxAge,
      hstsIncludeSubdomains: hsts.includeSubdomains,
      hstsPreload: hsts.preload,
      ocspStapling,
      certificateChain,
      leafCertificate,
      chainIssues,
    };

    const overallGrade = calculateTlsGrade(profile);

    return Object.freeze({
      ...profile,
      overallGrade,
    });
  }
}