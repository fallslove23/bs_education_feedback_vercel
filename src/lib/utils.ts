import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR or non-browser environments
  return 'https://sseducationfeedback.info';
}

export function getSurveyUrl(surveyId: string): string {
  return `${getBaseUrl()}/survey/${surveyId}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
