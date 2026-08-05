import { createServer } from "node:http";
import { ottawaDemoDirectory } from "../web/demo-data.js";
import {
  renderCompanyDirectory,
  renderDirectoryCompanyProfile,
  type DirectoryFilters,
} from "../web/directory.js";

const portValue = Number(process.env.PORT ?? "43127");
if (!Number.isSafeInteger(portValue) || portValue < 1 || portValue > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  let html: string;
  let status = 200;
  if (url.pathname === "/") {
    const filters: DirectoryFilters = {
      query: url.searchParams.get("q") ?? undefined,
      sector: url.searchParams.get("sector") ?? undefined,
      employeeBand: url.searchParams.get("employeeBand") ?? undefined,
      governmentContract: url.searchParams.get("governmentContract") === "1",
      activeHiring: url.searchParams.get("activeHiring") === "1",
    };
    html = renderCompanyDirectory(ottawaDemoDirectory, filters);
  } else if (url.pathname.startsWith("/companies/")) {
    const slug = decodeURIComponent(url.pathname.slice("/companies/".length));
    const company = ottawaDemoDirectory.find((candidate) => candidate.slug === slug) ?? null;
    status = company ? 200 : 404;
    html = renderDirectoryCompanyProfile(company);
  } else {
    status = 404;
    html = renderDirectoryCompanyProfile(null);
  }
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  });
  response.end(html);
});

server.listen(portValue, "127.0.0.1", () => {
  console.log(`Ottawa Tech Intelligence is running at http://127.0.0.1:${portValue}/`);
});
