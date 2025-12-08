import { Loader2 } from "lucide-react";

const LoadingScreen = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-primary text-primary-foreground overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/40 via-primary/30 to-primary/40 opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/40 blur-3xl opacity-30"
        aria-hidden="true"
      />
      <div className="relative z-10 text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 text-white"
            >
              <path d="M22 10v6M2 10v6" />
              <path d="M2 10l10-5 10 5-10 5z" />
              <path d="M12 12v9" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-white/5 animate-ping" aria-hidden="true"></div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">BS 피드백</h1>
          <p className="text-primary-foreground/80">교육과정 피드백 시스템</p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-foreground/80" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;