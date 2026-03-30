import { nanoid } from './nanoid';

export function generateSlug(): string {
  return nanoid(8);
}

export function generateShortCode(): string {
  return nanoid(6);
}
