export function runtimeDatabaseUrl(env: NodeJS.ProcessEnv): string | undefined {
  return env.VERCEL && env.VERCEL_ENV !== "production"
    ? env.PREVIEW_DATABASE_URL
    : env.DATABASE_URL;
}
