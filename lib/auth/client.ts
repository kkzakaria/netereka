import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, emailOTPClient, adminClient } from "better-auth/client/plugins";
import type { Auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>(), emailOTPClient(), adminClient()],
});
