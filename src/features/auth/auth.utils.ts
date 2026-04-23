export const extractBearerToken = (authHeader: string | undefined): string | undefined => {
  if (!authHeader) return undefined;
  const parts: string[] = authHeader.split(/\s+/);
  if (parts.length !== 2) return undefined;
  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
};
