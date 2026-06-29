import { describe, expect, it } from "vitest";
import { buildApprovalEmail } from "./email-template";

describe("buildApprovalEmail", () => {
	it("includes name and exact magicUrl in the html", () => {
		const result = buildApprovalEmail({
			name: "Juan",
			magicUrl: "https://hackia.com/magic?token=123",
		});
		expect(result.html).toContain("Juan");
		expect(result.html).toContain('href="https://hackia.com/magic?token=123"');
	});

	it("mentions HACK IA in the non-empty subject", () => {
		const result = buildApprovalEmail({
			name: "Ana",
			magicUrl: "https://x.com",
		});
		expect(result.subject).toContain("HACK IA");
		expect(result.subject.length).toBeGreaterThan(0);
	});

	it("rejects non-http(s) magicUrl schemes (XSS hardening)", () => {
		expect(() =>
			buildApprovalEmail({ name: "Ana", magicUrl: "javascript:alert(1)" }),
		).toThrow();
	});

	it("escapes malicious characters in the name", () => {
		const result = buildApprovalEmail({
			name: '<script>alert("XSS")</script>&',
			magicUrl: "https://x.com",
		});
		expect(result.html).not.toContain("<script>");
		expect(result.html).not.toContain('alert("XSS")');
		expect(result.html).toContain(
			"&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;",
		);
	});
});
