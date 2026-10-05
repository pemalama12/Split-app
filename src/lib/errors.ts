export function errorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.replace(/^.*Uncaught Error:\s*/, "").split("\n")[0].trim();
    if (message && !/^\[CONVEX|Server Error|Network Error|Failed to fetch/i.test(message)) return message;
  }
  return "Something went wrong. Check your connection and try again.";
}
