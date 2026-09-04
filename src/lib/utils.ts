import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeStoredPassword(password: string | undefined | null): string {
  return password?.startsWith('enc:v1:') ? '' : (password ?? '')
}
