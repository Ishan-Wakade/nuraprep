const allowedDestination = /^\/(?:practice|review)(?:\/[^?#]*)?(?:\?[^#]*)?$/;

export function sanitizeReturnTo(value: string | undefined): string {
  if (!value || !allowedDestination.test(value)) return "/practice";
  return value;
}
