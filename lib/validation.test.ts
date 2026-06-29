import { describe, expect, it } from "vitest";
import { registerSchema } from "./validation";

const base = { name: "Ana", email: "ana@example.com" };

describe("registerSchema", () => {
	it("accepts minimal valid input (name + email)", () => {
		expect(registerSchema.parse(base)).toMatchObject(base);
	});

	it("rejects missing email", () => {
		expect(() => registerSchema.parse({ name: "Ana" })).toThrow();
	});

	it("rejects invalid email", () => {
		expect(() => registerSchema.parse({ ...base, email: "nope" })).toThrow();
	});

	it("rejects DNI that is not 8 digits", () => {
		expect(() => registerSchema.parse({ ...base, dni: "123" })).toThrow();
		expect(() => registerSchema.parse({ ...base, dni: "abcdefgh" })).toThrow();
	});

	it("rejects RUC that is not 11 digits", () => {
		expect(() => registerSchema.parse({ ...base, ruc: "123" })).toThrow();
	});

	it("accepts valid dni/ruc", () => {
		const ok = registerSchema.parse({
			...base,
			dni: "12345678",
			ruc: "12345678901",
		});
		expect(ok.dni).toBe("12345678");
		expect(ok.ruc).toBe("12345678901");
	});
});
