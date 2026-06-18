import type { Request, Response, NextFunction } from "express";

export function swaggerApiKeyGuard(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env["SWAGGER_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "Swagger docs are disabled (SWAGGER_API_KEY not set)" });
    return;
  }

  const provided =
    (req.query["apiKey"] as string | undefined) ??
    req.headers["x-docs-api-key"];

  if (provided !== apiKey) {
    res.status(401).send(`
      <html><body style="font-family:sans-serif;padding:2rem">
        <h2>API Docs — Authentication Required</h2>
        <p>Append <code>?apiKey=YOUR_KEY</code> to the URL or set the <code>X-Docs-Api-Key</code> header.</p>
      </body></html>
    `);
    return;
  }

  next();
}
