import { Request } from 'express';

export function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function extractHeaders(req: Request) {
  const h = (name: string) => {
    const val = req.headers[name];
    const str = Array.isArray(val) ? val[0] : val;
    return str?.slice(0, 500) || null;
  };
  return {
    acceptLang: h('accept-language'),
    acceptEncoding: h('accept-encoding'),
    dnt: h('dnt') === '1' ? true : h('dnt') === '0' ? false : null,
    secChUa: h('sec-ch-ua'),
    secChMobile: h('sec-ch-ua-mobile'),
    secChPlatform: h('sec-ch-ua-platform'),
    secFetchSite: h('sec-fetch-site'),
    secFetchMode: h('sec-fetch-mode'),
    secFetchDest: h('sec-fetch-dest'),
    xForwardedProto: h('x-forwarded-proto'),
    via: h('via'),
  };
}

export function extractIP(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (
    forwardedStr?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    (req.headers['cf-connecting-ip'] as string) ||
    null
  );
}
