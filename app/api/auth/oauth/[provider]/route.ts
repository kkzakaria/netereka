import { redirect } from "next/navigation";
import { getGoogleAuthUrl, getFacebookAuthUrl, getAppleAuthUrl } from "@/lib/auth/oauth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  let url: string;
  switch (provider) {
    case "google":
      url = await getGoogleAuthUrl();
      break;
    case "facebook":
      url = await getFacebookAuthUrl();
      break;
    case "apple":
      url = await getAppleAuthUrl();
      break;
    default:
      redirect("/auth/login");
  }

  redirect(url);
}
