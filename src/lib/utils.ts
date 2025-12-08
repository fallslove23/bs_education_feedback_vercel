import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function getBaseUrl(): string {
  // 항상 실제 프로덕션 도메인 사용
  return 'https://sseducationfeedback.info';
}

export function getSurveyUrl(surveyId: string): string {
  return `${getBaseUrl()}/survey/${surveyId}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
