import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEFAULT_ADMIN_EMAIL = "admin@example.com";
export const DEFAULT_SURVEY_CONTACT = "support@example.com";

interface SupportContactInfoProps {
  adminEmail?: string;
  adminLabel?: string;
  surveyContact?: string;
  surveyLabel?: string;
  description?: string;
  className?: string;
}

const sanitizePhone = (value: string) => value.replace(/[^0-9+]/g, "");

const SupportContactInfo = ({
  adminEmail = DEFAULT_ADMIN_EMAIL,
  adminLabel = "시스템 관리자",
  surveyContact = DEFAULT_SURVEY_CONTACT,
  surveyLabel = "설문 담당자",
  description = "문제가 계속될 경우 아래 연락처로 문의해 주세요.",
  className,
}: SupportContactInfoProps) => {
  const surveyIsEmail = surveyContact.includes("@");
  const SurveyIcon = surveyIsEmail ? Mail : Phone;
  const surveyHref = surveyIsEmail
    ? `mailto:${surveyContact}`
    : `tel:${sanitizePhone(surveyContact)}`;

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4",
        className
      )}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">문의 안내</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-3">
        <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background p-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{adminLabel}</p>
            <a
              href={`mailto:${adminEmail}`}
              className="text-sm font-medium text-primary hover:underline break-all"
            >
              {adminEmail}
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background p-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <SurveyIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{surveyLabel}</p>
            <a
              href={surveyHref}
              className="text-sm font-medium text-primary hover:underline break-all"
            >
              {surveyContact}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportContactInfo;
