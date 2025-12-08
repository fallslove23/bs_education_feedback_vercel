// Supabase 인증 에러 메시지를 한글로 번역하는 유틸리티

export const translateAuthError = (errorMessage: string): string => {
  const errorTranslations: Record<string, string> = {
    // 로그인 관련 에러
    'Invalid login credentials': '잘못된 이메일 또는 비밀번호입니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.',
    'Invalid email or password': '잘못된 이메일 또는 비밀번호입니다.',
    'Too many requests': '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
    'User not found': '사용자를 찾을 수 없습니다.',
    
    // 비밀번호 관련 에러
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'Password is too weak': '비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.',
    'New password should be different from the old password': '새 비밀번호는 이전 비밀번호와 달라야 합니다.',
    
    // 이메일 관련 에러
    'Unable to validate email address: invalid format': '잘못된 이메일 형식입니다.',
    'Email address not authorized': '허가되지 않은 이메일 주소입니다.',
    'Invalid email': '유효하지 않은 이메일입니다.',
    
    // 계정 관련 에러
    'User already registered': '이미 등록된 사용자입니다.',
    'Signup disabled': '회원가입이 비활성화되어 있습니다.',
    'Account not found': '계정을 찾을 수 없습니다.',
    
    // 세션 관련 에러
    'Session expired': '세션이 만료되었습니다. 다시 로그인해주세요.',
    'Invalid session': '유효하지 않은 세션입니다.',
    'Refresh token expired': '인증 토큰이 만료되었습니다. 다시 로그인해주세요.',
    
    // 네트워크 관련 에러
    'Failed to fetch': '네트워크 연결을 확인해주세요.',
    'Network request failed': '네트워크 요청이 실패했습니다.',
    'Unable to connect': '서버에 연결할 수 없습니다.',
    
    // 권한 관련 에러
    'Access denied': '접근이 거부되었습니다.',
    'Insufficient permissions': '권한이 부족합니다.',
    'Unauthorized': '인증되지 않은 사용자입니다.',
    
    // 일반적인 에러
    'Something went wrong': '오류가 발생했습니다. 다시 시도해주세요.',
    'Internal server error': '서버 내부 오류가 발생했습니다.',
    'Service unavailable': '서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
    
    // 비밀번호 재설정 관련
    'Unable to process request': '요청을 처리할 수 없습니다.',
    'Email rate limit exceeded': '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    'Invalid reset token': '유효하지 않은 재설정 토큰입니다.',
    
    // 기타 에러
    'Database error': '데이터베이스 오류가 발생했습니다.',
    'Connection timeout': '연결 시간이 초과되었습니다.',
    'Bad request': '잘못된 요청입니다.',
  };

  // 에러 메시지에서 가장 일치하는 번역을 찾기
  const lowerErrorMessage = errorMessage.toLowerCase();
  
  for (const [englishError, koreanError] of Object.entries(errorTranslations)) {
    if (lowerErrorMessage.includes(englishError.toLowerCase())) {
      return koreanError;
    }
  }
  
  // 번역을 찾지 못한 경우, 일반적인 에러 메시지 반환
  if (errorMessage.includes('email') || errorMessage.includes('Email')) {
    return '이메일 관련 오류가 발생했습니다. 입력하신 정보를 확인해주세요.';
  }
  
  if (errorMessage.includes('password') || errorMessage.includes('Password')) {
    return '비밀번호 관련 오류가 발생했습니다. 입력하신 정보를 확인해주세요.';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
    return '네트워크 연결을 확인해주세요.';
  }
  
  // 기본 메시지
  return '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
};

// 특정 에러 코드별 메시지 (Supabase가 제공하는 에러 코드)
export const translateAuthErrorByCode = (errorCode?: string): string => {
  const codeTranslations: Record<string, string> = {
    'invalid_credentials': '잘못된 이메일 또는 비밀번호입니다.',
    'email_not_confirmed': '이메일 인증이 완료되지 않았습니다.',
    'too_many_requests': '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
    'user_not_found': '사용자를 찾을 수 없습니다.',
    'weak_password': '비밀번호가 너무 약합니다.',
    'email_address_invalid': '유효하지 않은 이메일 주소입니다.',
    'signup_disabled': '회원가입이 비활성화되어 있습니다.',
    'session_expired': '세션이 만료되었습니다.',
    'unauthorized': '인증되지 않은 사용자입니다.',
  };
  
  return errorCode ? (codeTranslations[errorCode] || '알 수 없는 오류가 발생했습니다.') : '알 수 없는 오류가 발생했습니다.';
};