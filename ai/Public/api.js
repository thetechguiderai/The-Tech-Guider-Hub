/* Shared browser API transport.
 * Live Server only serves files, so its /api routes return HTML or nothing.
 * When a page is opened on port 5500, API requests use the deployed API.
 * Inside The Tech Guider Hub this app is mounted under `/ai`, so same-origin
 * production requests are prefixed with that base path.
 */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const isLiveServer = /^(127\.0\.0\.1|localhost)$/i.test(location.hostname) && location.port === "5500";
  const configuredBase = window.TG_API_BASE_URL || localStorage.getItem("tg_api_base_url");
  const deployedApiBase = "https://theguiderai.dpdns.org";
  const apiBase = configuredBase || (isLiveServer ? deployedApiBase : "/ai");

  window.TG_API_BASE_URL = apiBase;
  window.tgApiUrl = (url) => {
    if (typeof url !== "string" || !url.startsWith("/api/")) return url;
    return `${apiBase}${url}`;
  };

  window.fetch = async (url, options = {}) => {
    const isApi = typeof url === "string" && url.startsWith("/api/");
    const response = await nativeFetch(isApi ? window.tgApiUrl(url) : url, {
      credentials: isApi ? "include" : options.credentials,
      ...options,
    });
    if (!isApi) return response;

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response;

    await response.text();
    const hint = isLiveServer
      ? "The deployed API at https://theguiderai.dpdns.org is not reachable."
      : "The API returned a non-JSON response. Check server routing and deployment logs.";
    return new Response(JSON.stringify({ error: `${hint} HTTP ${response.status}.` }), {
      status: response.status || 502,
      headers: { "content-type": "application/json" },
    });
  };

  // OAuth is browser navigation rather than fetch(), so route it as well when
  // a page is opened from Live Server.
  addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('a[href^="/api/"]').forEach((link) => {
      link.href = window.tgApiUrl(link.getAttribute("href"));
    });
  });
})();
