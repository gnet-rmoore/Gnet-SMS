export function isRegistrationEmailConfirmationRequired(
  configured: boolean | null | undefined,
  environmentValue: string | undefined = process.env.REQUIRE_REGISTRATION_EMAIL_CONFIRM
): boolean {
  if (configured !== null && configured !== undefined) return configured;
  return environmentValue !== "false";
}
