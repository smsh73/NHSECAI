import logoUrl from '@assets/logo.png';

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn, Shield, TrendingUp, BarChart3, Sparkles } from 'lucide-react';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: '입력 오류',
        description: '이메일과 비밀번호를 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const success = await login(email, password);
    
    if (success) {
      toast({
        title: '로그인 성공',
        description: 'NHQV AI 시황생성 플랫폼에 오신 것을 환영합니다.',
      });
      setLocation('/');
    } else {
      toast({
        title: '로그인 실패',
        description: '이메일 또는 비밀번호가 올바르지 않습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-navy-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-navy-950/50 dark:to-emerald-950/30">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600/5 via-emerald-500/3 to-navy-800/5 dark:from-navy-400/10 dark:via-emerald-400/5 dark:to-navy-600/10" />
        
        {/* Floating Geometric Elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-r from-navy-500/10 to-emerald-500/10 rounded-full blur-3xl animate-pulse motion-reduce:animate-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-l from-emerald-500/8 to-navy-500/8 rounded-full blur-3xl animate-pulse delay-1000 motion-reduce:animate-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-navy-400/5 to-emerald-400/5 rounded-full blur-2xl animate-pulse delay-500 motion-reduce:animate-none" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.15) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Login Card Container */}
        <div className="w-full max-w-md transform transition-all duration-700 ease-out animate-in fade-in slide-in-from-bottom-4 motion-reduce:transition-none motion-reduce:animate-none">
          {/* Glassmorphism Card */}
          <Card className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-white/20 dark:border-slate-800/30 shadow-2xl overflow-hidden">
            {/* Card Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-emerald-500/5 pointer-events-none" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-navy-500/20 via-emerald-500/20 to-navy-500/20 blur opacity-20 group-hover:opacity-30 transition duration-1000" />
            
            {/* Card Header */}
            <CardHeader className="relative space-y-6 text-center pb-6">
              {/* Logo Section */}
              <div className="flex justify-center relative">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-navy-500/20 to-emerald-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-lg">
                    <img 
                      src={logoUrl}
                      alt="NHQV Logo"
                      className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>
              </div>
              
              {/* Brand Hierarchy */}
              <div className="space-y-3">
                <CardTitle className="text-3xl font-display font-bold bg-gradient-to-br from-navy-800 to-navy-600 dark:from-navy-200 dark:to-navy-400 bg-clip-text text-transparent tracking-tight">
                  NHQV AI Platform
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-base leading-relaxed max-w-xs mx-auto">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    AI 기반 금융 시황 생성
                  </span>
                </CardDescription>
              </div>

              {/* Feature Highlights */}
              <div className="flex justify-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse motion-reduce:animate-none" />
                  <Shield className="w-3 h-3" />
                  보안
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <div className="w-2 h-2 bg-navy-500 rounded-full animate-pulse delay-200 motion-reduce:animate-none" />
                  <TrendingUp className="w-3 h-3" />
                  실시간
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse delay-400 motion-reduce:animate-none" />
                  <BarChart3 className="w-3 h-3" />
                  분석
                </div>
              </div>
            </CardHeader>
            
            {/* Card Content */}
            <CardContent className="relative space-y-6 p-6 pt-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-3">
                  <Label 
                    htmlFor="email" 
                    className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide"
                  >
                    이메일 주소
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@nhqv.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      data-testid="input-email"
                      disabled={isLoading}
                      className={`
                        h-12 pl-4 pr-4 text-base
                        bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm
                        border-2 transition-all duration-300 ease-out
                        hover:bg-white/80 dark:hover:bg-slate-800/80
                        focus:bg-white dark:focus:bg-slate-800
                        focus:border-navy-500 dark:focus:border-navy-400
                        focus:shadow-lg
                        placeholder:text-slate-400 dark:placeholder:text-slate-500
                        ${focusedField === 'email' ? 'scale-[1.02]' : ''}
                      `}
                    />
                    <div className={`absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-navy-500/20 to-emerald-500/20 blur transition-opacity duration-300 ${focusedField === 'email' ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
                
                {/* Password Field */}
                <div className="space-y-3">
                  <Label 
                    htmlFor="password" 
                    className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide"
                  >
                    비밀번호
                  </Label>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="보안 비밀번호를 입력하세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      data-testid="input-password"
                      disabled={isLoading}
                      className={`
                        h-12 pl-4 pr-12 text-base
                        bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm
                        border-2 transition-all duration-300 ease-out
                        hover:bg-white/80 dark:hover:bg-slate-800/80
                        focus:bg-white dark:focus:bg-slate-800
                        focus:border-navy-500 dark:focus:border-navy-400
                        focus:shadow-lg
                        placeholder:text-slate-400 dark:placeholder:text-slate-500
                        ${focusedField === 'password' ? 'scale-[1.02]' : ''}
                      `}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 backdrop-blur-sm transition-all duration-200"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      data-testid="button-toggle-password"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500 dark:text-slate-400 hover:text-navy-600 dark:hover:text-navy-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400 hover:text-navy-600 dark:hover:text-navy-400" />
                      )}
                    </Button>
                    <div className={`absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-navy-500/20 to-emerald-500/20 blur transition-opacity duration-300 ${focusedField === 'password' ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>

                {/* Premium Login Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-login"
                  className={`
                    w-full h-12 text-base font-semibold
                    bg-gradient-to-r from-navy-600 to-navy-700 hover:from-navy-700 hover:to-navy-800
                    dark:from-navy-500 dark:to-navy-600 dark:hover:from-navy-600 dark:hover:to-navy-700
                    text-white shadow-lg
                    transition-all duration-300 ease-out
                    hover:shadow-xl
                    hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                  `}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none" />
                      <span>인증 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <LogIn className="w-5 h-5" />
                      <span>플랫폼 접속</span>
                    </div>
                  )}
                </Button>
                
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}