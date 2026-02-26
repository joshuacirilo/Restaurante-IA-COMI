import { randomUUID } from "node:crypto";

export function createPublicId(): string {
  return randomUUID();
}