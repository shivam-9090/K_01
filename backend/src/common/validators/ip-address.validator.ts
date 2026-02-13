import { BadRequestException } from '@nestjs/common';

/**
 * M-2 Fix: IP Address Validation Utility
 * Validates IPv4 and IPv6 addresses
 */
export class IpAddressValidator {
  // IPv4 pattern: 0-255.0-255.0-255.0-255
  private static readonly IPV4_PATTERN =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 pattern (standard, compressed, and IPv4-mapped)
  private static readonly IPV6_PATTERN =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  /**
   * Validates an IP address (IPv4 or IPv6)
   * @param ip - The IP address to validate
   * @returns true if valid, false otherwise
   */
  static isValid(ip: string | null | undefined): boolean {
    if (!ip) return true; // NULL/undefined is allowed (optional field)

    return this.isValidIPv4(ip) || this.isValidIPv6(ip);
  }

  /**
   * Validates an IPv4 address
   */
  static isValidIPv4(ip: string): boolean {
    return this.IPV4_PATTERN.test(ip);
  }

  /**
   * Validates an IPv6 address
   */
  static isValidIPv6(ip: string): boolean {
    return this.IPV6_PATTERN.test(ip);
  }

  /**
   * Validates and throws exception if invalid
   * @param ip - The IP address to validate
   * @throws BadRequestException if invalid
   */
  static validateOrThrow(ip: string | null | undefined): void {
    if (!ip) return; // NULL/undefined is allowed

    if (!this.isValid(ip)) {
      throw new BadRequestException(
        `Invalid IP address format: ${ip}. Must be valid IPv4 or IPv6.`,
      );
    }
  }

  /**
   * Sanitizes and returns valid IP or null
   * @param ip - The IP address to sanitize
   * @returns Valid IP or null
   */
  static sanitize(ip: string | null | undefined): string | null {
    if (!ip) return null;

    // Trim whitespace
    const trimmed = ip.trim();

    // Remove IPv6 zone ID if present (e.g., fe80::1%eth0 -> fe80::1)
    const withoutZone = trimmed.split('%')[0];

    // Validate and return
    return this.isValid(withoutZone) ? withoutZone : null;
  }

  /**
   * Extracts IP from Express request object
   * Handles X-Forwarded-For header for proxied requests
   */
  static extractFromRequest(req: any): string | null {
    // Check X-Forwarded-For header (proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2)
      // Use first IP (original client)
      const ips = forwarded.split(',');
      const clientIp = ips[0].trim();
      return this.sanitize(clientIp);
    }

    // Check X-Real-IP header (nginx)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return this.sanitize(realIp);
    }

    // Fallback to direct connection IP
    const remoteIp =
      req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
    return this.sanitize(remoteIp);
  }
}
