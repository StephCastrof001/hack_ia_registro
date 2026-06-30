import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
	let response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	});

	const env = getEnv();

	const supabase = createServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get(name: string) {
					return request.cookies.get(name)?.value;
				},
				set(name: string, value: string, options: CookieOptions) {
					request.cookies.set({
						name,
						value,
						...options,
					});
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					});
					response.cookies.set({
						name,
						value,
						...options,
					});
				},
				remove(name: string, options: CookieOptions) {
					request.cookies.set({
						name,
						value: "",
						...options,
					});
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					});
					response.cookies.set({
						name,
						value: "",
						...options,
					});
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Proteger admin routes
	if (
		request.nextUrl.pathname.startsWith("/admin") &&
		!request.nextUrl.pathname.startsWith("/admin/login")
	) {
		if (!user) {
			const url = request.nextUrl.clone();
			url.pathname = "/admin/login";
			return NextResponse.redirect(url);
		}
	}

	return response;
}
