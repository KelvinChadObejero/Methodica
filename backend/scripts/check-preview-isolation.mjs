// Preview builds must use both URLs from the isolated preview resource.
// Compare database endpoint and database name without logging any credentials.
if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
  const {
    PREVIEW_DATABASE_URL: runtime,
    PREVIEW_DATABASE_URL_UNPOOLED: migration,
    DATABASE_URL: production,
  } = process.env;
  function databaseIdentity(value) {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname === "/"
    )
      throw new Error();
    return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
  }
  try {
    if (!runtime || !migration || !production) throw new Error();
    const previewId = databaseIdentity(runtime);
    if (previewId !== databaseIdentity(migration) || previewId === databaseIdentity(production))
      throw new Error();
  } catch {
    console.error(
      "Preview database URLs are missing, inconsistent, or match production; refusing hosted migrations. See docs/DEPLOYMENT.md."
    );
    process.exit(1);
  }
}
