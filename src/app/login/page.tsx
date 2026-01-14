import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = Array.isArray(searchParams?.callbackUrl)
    ? searchParams?.callbackUrl[0]
    : searchParams?.callbackUrl;
  const signup = Array.isArray(searchParams?.signup)
    ? searchParams?.signup[0]
    : searchParams?.signup;

  const params = new URLSearchParams({ tab: "signin" });
  if (callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  }
  if (signup) {
    params.set("signup", signup);
  }

  redirect(`/?${params.toString()}`);
}
