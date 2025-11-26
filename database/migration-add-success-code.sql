-- ============================================
-- 마이그레이션: application_logs 테이블에 success_code 컬럼 추가
-- 날짜: 2025-11-03
-- 설명: 로그 분석 개선을 위해 success_code 필드 추가
-- ============================================

-- application_logs 테이블에 success_code 컬럼 추가
ALTER TABLE application_logs 
ADD COLUMN IF NOT EXISTS success_code VARCHAR(50);

-- success_code에 대한 인덱스 추가 (선택사항, 필요시 활성화)
-- CREATE INDEX IF NOT EXISTS app_logs_success_code_idx ON application_logs(success_code);

-- 기존 데이터에 대한 마이그레이션 (필요시)
-- UPDATE application_logs 
-- SET success_code = (response_data->>'successCode')::VARCHAR(50)
-- WHERE response_data IS NOT NULL 
--   AND response_data->>'successCode' IS NOT NULL
--   AND success_code IS NULL;

-- 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: success_code column added to application_logs table';
END $$;

