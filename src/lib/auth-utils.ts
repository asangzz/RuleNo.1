import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export async function getUserId() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") {
      return "mock-user-123";
    }
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken.uid;
  } catch (error) {
    console.error("Error verifying session cookie:", error);
    return null;
  }
}
