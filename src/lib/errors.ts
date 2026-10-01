export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.replace(/^.*Uncaught Error:\s*/, "").split("\n")[0];
  return "Something went wrong. Check your connection and try again.";
}
