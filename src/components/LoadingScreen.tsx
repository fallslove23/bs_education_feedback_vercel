import logo from '@/assets/logo.png';

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
        <div className="relative">
          <img
            src={logo}
            alt="BS 피드백 로고"
            width={96}
            height={96}
            className="w-24 h-24 mx-auto animate-pulse drop-shadow-xl"
            fetchPriority="high"
          />
          <div className="absolute inset-0 rounded-full bg-primary-foreground/20 animate-ping" aria-hidden="true"></div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">BS 피드백</h1>
          <p className="text-primary-foreground/80">교육과정 피드백 시스템</p>
        </div>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-foreground/30 border-t-primary-foreground"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;