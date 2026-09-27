import { describe, expect, it } from "vitest";
import {
  TRANSPARENT_GIF_BYTES,
  generateTrackingId,
  hashIpAddress,
  injectTrackingPixel,
  isValidTrackingId,
} from "@/lib/tracking";

describe("Email Tracking Utilities", () => {
  describe("GIF buffer", () => {
    it("is a valid GIF89a 1x1 image", () => {
      expect(TRANSPARENT_GIF_BYTES.length).toBe(42);
      const header = TRANSPARENT_GIF_BYTES.subarray(0, 6).toString("ascii");
      expect(header).toBe("GIF89a");
    });
  });

  describe("Tracking ID generation and validation", () => {
    it("generates a valid UUID tracking ID", () => {
      const id = generateTrackingId();
      expect(id).toBeDefined();
      expect(isValidTrackingId(id)).toBe(true);
    });

    it("accepts 32-char hex and standard UUIDs", () => {
      expect(isValidTrackingId("12345678-1234-4234-8234-1234567890ab")).toBe(true);
      expect(isValidTrackingId("0123456789abcdef0123456789abcdef")).toBe(true);
      expect(isValidTrackingId("invalid-id")).toBe(false);
      expect(isValidTrackingId("")).toBe(false);
    });
  });

  describe("Pixel Injection", () => {
    it("injects 1x1 pixel right before </body> tag", () => {
      const html = "<html><body><h1>Hello World</h1></body></html>";
      const trackingUrl = "https://sendlib.com/api/track/open/track-123";
      const result = injectTrackingPixel(html, trackingUrl);

      expect(result).toContain(
        '<img src="https://sendlib.com/api/track/open/track-123" width="1" height="1"'
      );
      const pixelIndex = result.indexOf('src="https://sendlib.com/api/track/open/track-123"');
      const bodyCloseIndex = result.indexOf('</body>');
      expect(pixelIndex).toBeGreaterThan(0);
      expect(pixelIndex).toBeLessThan(bodyCloseIndex);
    });

    it("appends pixel if no </body> tag exists", () => {
      const html = "<div>Fragment without body</div>";
      const trackingUrl = "https://sendlib.com/api/track/open/track-456";
      const result = injectTrackingPixel(html, trackingUrl);

      expect(result).toContain("<div>Fragment without body</div>");
      expect(result).toContain("<img src=");
    });

    it("handles empty or non-string input safely", () => {
      const trackingUrl = "https://sendlib.com/api/track/open/track-789";
      const result = injectTrackingPixel("", trackingUrl);
      expect(result).toContain('<img src="https://sendlib.com/api/track/open/track-789"');
    });
  });

  describe("Privacy & IP Hashing", () => {
    it("consistently hashes IP addresses with HMAC-SHA256", () => {
      const ip = "192.168.1.100";
      const salt = "super-secret-salt";
      const hash1 = hashIpAddress(ip, salt);
      const hash2 = hashIpAddress(ip, salt);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("produces different hashes for different IPs or salts", () => {
      const hashA = hashIpAddress("1.1.1.1", "salt-1");
      const hashB = hashIpAddress("1.1.1.2", "salt-1");
      const hashC = hashIpAddress("1.1.1.1", "salt-2");

      expect(hashA).not.toBe(hashB);
      expect(hashA).not.toBe(hashC);
    });
  });
});
