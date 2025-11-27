import { Router, Request, Response } from "express";
import { ragGuardrailsService } from "../services/rag-guardrails.js";
import { ragAdversarialMonitor } from "../services/rag-adversarial-monitor.js";
import { ragVersionControlService } from "../services/rag-version-control.js";
import { killswitchManager } from "../services/killswitch-manager.js";
import { enhancedAuditLogger } from "../services/enhanced-audit-logger.js";
import { adversarialBenchmarkTester } from "../services/adversarial-benchmark-tester.js";
import { ragTamperingDetector } from "../services/rag-tampering-detector.js";
import { ragAnomalyDetector } from "../services/rag-anomaly-detector.js";

const router = Router();

// ===================================
// 가드레일 API
// ===================================

/**
 * 입력 프롬프트 검증
 */
router.post("/guardrails/input/validate", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "prompt는 필수입니다",
      });
    }

    const context = {
      userId: (req as any).user?.id,
      username: (req as any).user?.username,
      userIp: req.ip || req.headers["x-forwarded-for"] as string || req.socket.remoteAddress,
      sessionId: (req as any).session?.id,
    };

    const result = await ragGuardrailsService.validateInputPrompt(prompt, context);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "입력 프롬프트 검증 실패",
    });
  }
});

/**
 * 출력 프롬프트 검증
 */
router.post("/guardrails/output/validate", async (req: Request, res: Response) => {
  try {
    const { output, originalPrompt } = req.body;
    
    if (!output) {
      return res.status(400).json({
        success: false,
        error: "output은 필수입니다",
      });
    }

    const context = {
      userId: (req as any).user?.id,
      username: (req as any).user?.username,
      userIp: req.ip || req.headers["x-forwarded-for"] as string || req.socket.remoteAddress,
      sessionId: (req as any).session?.id,
      originalPrompt,
    };

    const result = await ragGuardrailsService.validateOutputPrompt(output, context);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "출력 프롬프트 검증 실패",
    });
  }
});

// ===================================
// 적대적 공격 모니터링 API
// ===================================

/**
 * 공격 이벤트 조회
 */
router.get("/adversarial/events", async (req: Request, res: Response) => {
  try {
    const {
      attackType,
      attackSeverity,
      userId,
      startDate,
      endDate,
      limit,
    } = req.query;

    const events = await ragAdversarialMonitor.getAttackEvents({
      attackType: attackType as string,
      attackSeverity: attackSeverity as any,
      userId: userId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, events });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "공격 이벤트 조회 실패",
    });
  }
});

/**
 * 공격 통계 조회
 */
router.get("/adversarial/statistics", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const statistics = await ragAdversarialMonitor.getAttackStatistics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({ success: true, ...statistics });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "공격 통계 조회 실패",
    });
  }
});

/**
 * 공격 패턴 분석
 */
router.get("/adversarial/patterns", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const patterns = await ragAdversarialMonitor.analyzeAttackPatterns({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({ success: true, ...patterns });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "공격 패턴 분석 실패",
    });
  }
});

// ===================================
// 형상관리 API
// ===================================

/**
 * 버전 이력 조회
 */
router.get("/version-control/history", async (req: Request, res: Response) => {
  try {
    const { documentId, limit } = req.query;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "documentId는 필수입니다",
      });
    }

    const history = await ragVersionControlService.getVersionHistory(
      documentId as string,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "버전 이력 조회 실패",
    });
  }
});

/**
 * 위변조 탐지 목록 조회
 */
router.get("/tampering-detection/list", async (req: Request, res: Response) => {
  try {
    const {
      documentId,
      schemaId,
      detectionType,
      mitigationStatus,
      limit,
    } = req.query;

    const detections = await ragVersionControlService.getTamperingDetections({
      documentId: documentId as string,
      schemaId: schemaId as string,
      detectionType: detectionType as string,
      mitigationStatus: mitigationStatus as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, detections });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "위변조 탐지 목록 조회 실패",
    });
  }
});

/**
 * 이상치 탐지 목록 조회
 */
router.get("/anomaly-detection/list", async (req: Request, res: Response) => {
  try {
    const {
      documentId,
      schemaId,
      anomalyType,
      verified,
      minScore,
      limit,
    } = req.query;

    const detections = await ragVersionControlService.getAnomalyDetections({
      documentId: documentId as string,
      schemaId: schemaId as string,
      anomalyType: anomalyType as string,
      verified: verified === "true" ? true : verified === "false" ? false : undefined,
      minScore: minScore ? parseFloat(minScore as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, detections });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "이상치 탐지 목록 조회 실패",
    });
  }
});

/**
 * 데이터 가공 처리 로그 기록
 */
router.post("/data-processing/log", async (req: Request, res: Response) => {
  try {
    const {
      schemaId,
      documentId,
      processingType,
      processingStep,
      inputData,
      outputData,
      processingResult,
      errorMessage,
    } = req.body;

    if (!processingType) {
      return res.status(400).json({
        success: false,
        error: "processingType은 필수입니다",
      });
    }

    const log = await ragVersionControlService.logDataProcessing(
      schemaId,
      documentId,
      processingType,
      {
        processingStep,
        inputData,
        outputData,
        processingResult,
        errorMessage,
        processedBy: (req as any).user?.username || "SYSTEM",
      }
    );

    res.json({ success: true, log });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "데이터 가공 처리 로그 기록 실패",
    });
  }
});

/**
 * 데이터 가공 처리 로그 조회
 */
router.get("/data-processing/logs", async (req: Request, res: Response) => {
  try {
    const {
      schemaId,
      documentId,
      processingType,
      processingStatus,
      limit,
    } = req.query;

    const logs = await ragVersionControlService.getDataProcessingLogs({
      schemaId: schemaId as string,
      documentId: documentId as string,
      processingType: processingType as string,
      processingStatus: processingStatus as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "데이터 가공 처리 로그 조회 실패",
    });
  }
});

// ===================================
// 킬스위치 API
// ===================================

/**
 * 킬스위치 상태 조회
 */
router.get("/killswitch/status", async (req: Request, res: Response) => {
  try {
    const status = await killswitchManager.getStatus();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "킬스위치 상태 조회 실패",
    });
  }
});

/**
 * 킬스위치 활성화
 */
router.post("/killswitch/activate", async (req: Request, res: Response) => {
  try {
    const { reason, affectedServices, affectedEndpoints, details } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: "reason은 필수입니다",
      });
    }

    const killswitch = await killswitchManager.activate(reason, {
      activatedBy: (req as any).user?.id,
      activatedByUsername: (req as any).user?.username,
      affectedServices,
      affectedEndpoints,
      details,
    });

    res.json({
      success: true,
      killswitch,
      message: "킬스위치가 활성화되었습니다",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "킬스위치 활성화 실패",
    });
  }
});

/**
 * 킬스위치 비활성화
 */
router.post("/killswitch/deactivate", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: "reason은 필수입니다",
      });
    }

    const killswitch = await killswitchManager.deactivate(reason, {
      deactivatedBy: (req as any).user?.id,
      deactivatedByUsername: (req as any).user?.username,
    });

    res.json({
      success: true,
      killswitch,
      message: "킬스위치가 비활성화되었습니다",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "킬스위치 비활성화 실패",
    });
  }
});

/**
 * 킬스위치 이력 조회
 */
router.get("/killswitch/history", async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    const history = await killswitchManager.getHistory(
      limit ? parseInt(limit as string) : undefined
    );

    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "킬스위치 이력 조회 실패",
    });
  }
});

// ===================================
// 감사 로그 API
// ===================================

/**
 * 사용자별 로그 조회
 */
router.get("/audit-logs/user/:userIdentifier", async (req: Request, res: Response) => {
  try {
    const { userIdentifier } = req.params;
    const {
      eventType,
      guardrailDetected,
      startDate,
      endDate,
      limit,
    } = req.query;

    const logs = await enhancedAuditLogger.getLogsByUser(userIdentifier, {
      eventType: eventType as string,
      guardrailDetected: guardrailDetected === "true" ? true : guardrailDetected === "false" ? false : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "사용자별 로그 조회 실패",
    });
  }
});

/**
 * 가드레일 탐지 로그 조회
 */
router.get("/audit-logs/guardrail", async (req: Request, res: Response) => {
  try {
    const {
      guardrailType,
      severity,
      startDate,
      endDate,
      limit,
    } = req.query;

    const logs = await enhancedAuditLogger.getGuardrailLogs({
      guardrailType: guardrailType as string,
      severity: severity as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "가드레일 탐지 로그 조회 실패",
    });
  }
});

/**
 * 로그 통계 조회
 */
router.get("/audit-logs/statistics", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const statistics = await enhancedAuditLogger.getLogStatistics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({ success: true, ...statistics });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "로그 통계 조회 실패",
    });
  }
});

/**
 * 로그 아카이브 실행
 */
router.post("/audit-logs/archive", async (req: Request, res: Response) => {
  try {
    const archivedCount = await enhancedAuditLogger.archiveOldLogs();

    res.json({
      success: true,
      archivedCount,
      message: `${archivedCount}개의 로그가 아카이브되었습니다`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "로그 아카이브 실패",
    });
  }
});

/**
 * 아카이브된 로그 조회
 */
router.get("/audit-logs/archive", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userIdentifier,
      eventType,
      startDate,
      endDate,
      limit,
    } = req.query;

    const logs = await enhancedAuditLogger.getArchivedLogs({
      userId: userId as string,
      userIdentifier: userIdentifier as string,
      eventType: eventType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "아카이브된 로그 조회 실패",
    });
  }
});

// ===================================
// 벤치마크 테스트 API
// ===================================

/**
 * 벤치마크 테스트 실행
 */
router.post("/benchmark/run", async (req: Request, res: Response) => {
  try {
    const { testName, testType, testDescription, testCases } = req.body;

    if (!testName || !testType || !testCases) {
      return res.status(400).json({
        success: false,
        error: "testName, testType, testCases는 필수입니다",
      });
    }

    const startTime = Date.now();
    const results: any[] = [];
    let passedTests = 0;
    let failedTests = 0;

    // 테스트 케이스 실행
    for (const testCase of testCases) {
      try {
        // 프롬프트 검증
        const validationResult = await ragGuardrailsService.validateInputPrompt(
          testCase.prompt,
          {
            userId: (req as any).user?.id,
            username: (req as any).user?.username,
          }
        );

        // 공격 분석
        const attackAnalysis = await ragAdversarialMonitor.analyzePrompt(
          testCase.prompt,
          {
            userId: (req as any).user?.id,
            username: (req as any).user?.username,
          }
        );

        const passed = validationResult.isValid && !attackAnalysis.isAttack;
        if (passed) {
          passedTests++;
        } else {
          failedTests++;
        }

        results.push({
          testCase: testCase.name || testCase.prompt.substring(0, 50),
          passed,
          validationResult,
          attackAnalysis,
        });
      } catch (error: any) {
        failedTests++;
        results.push({
          testCase: testCase.name || testCase.prompt.substring(0, 50),
          passed: false,
          error: error.message,
        });
      }
    }

    const executionTime = Date.now() - startTime;
    const passRate = testCases.length > 0 ? passedTests / testCases.length : 0;

    // 결과 저장
    const { db } = await import("../db.js");
    const { benchmarkTestResults } = await import("@shared/schema");
    
    const [savedResult] = await db
      .insert(benchmarkTestResults)
      .values({
        testName,
        testType,
        testDescription,
        testResults: {
          results,
          summary: {
            totalTests: testCases.length,
            passedTests,
            failedTests,
            passRate,
          },
        },
        totalTests: testCases.length,
        passedTests,
        failedTests,
        passRate,
        executedBy: (req as any).user?.id,
        executionTime,
      })
      .returning();

    res.json({
      success: true,
      result: savedResult,
      message: `벤치마크 테스트 완료: ${passedTests}/${testCases.length} 통과`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "벤치마크 테스트 실행 실패",
    });
  }
});

/**
 * 벤치마크 테스트 결과 조회
 */
router.get("/benchmark/results", async (req: Request, res: Response) => {
  try {
    const { testName, testType, limit } = req.query;

    const { db } = await import("../db.js");
    const { benchmarkTestResults } = await import("@shared/schema");
    const { eq, and, desc } = await import("drizzle-orm");

    let query = db.select().from(benchmarkTestResults);

    const conditions = [];
    if (testName) {
      conditions.push(eq(benchmarkTestResults.testName, testName as string));
    }
    if (testType) {
      conditions.push(eq(benchmarkTestResults.testType, testType as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(benchmarkTestResults.executedAt));

    const limitedResults = limit ? results.slice(0, parseInt(limit as string)) : results;

    res.json({ success: true, results: limitedResults });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "벤치마크 테스트 결과 조회 실패",
    });
  }
});

/**
 * 벤치마크 테스트 결과 내보내기 (JSON)
 */
router.get("/benchmark/export", async (req: Request, res: Response) => {
  try {
    const { testId } = req.query;

    if (!testId) {
      return res.status(400).json({
        success: false,
        error: "testId는 필수입니다",
      });
    }

    const { db } = await import("../db.js");
    const { benchmarkTestResults } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [result] = await db
      .select()
      .from(benchmarkTestResults)
      .where(eq(benchmarkTestResults.id, testId as string));

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "테스트 결과를 찾을 수 없습니다",
      });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=benchmark-${testId}.json`);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "벤치마크 테스트 결과 내보내기 실패",
    });
  }
});

// ===================================
// 적대적 벤치마크 테스트 API
// ===================================

/**
 * 적대적 벤치마크 테스트 실행
 */
router.post("/benchmark/run", async (req: Request, res: Response) => {
  try {
    const { suite } = req.body;

    const context = {
      userId: (req as any).user?.id,
      username: (req as any).user?.username,
      userIp: req.ip || req.headers["x-forwarded-for"] as string || req.socket.remoteAddress,
    };

    const results = await adversarialBenchmarkTester.runBenchmarkTest(suite, context);

    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "벤치마크 테스트 실행 실패",
    });
  }
});

/**
 * 벤치마크 테스트 결과를 JSON으로 내보내기
 */
router.post("/benchmark/export/json", async (req: Request, res: Response) => {
  try {
    const { testResults, outputPath } = req.body;

    if (!testResults) {
      return res.status(400).json({
        success: false,
        error: "testResults는 필수입니다",
      });
    }

    const filePath = await adversarialBenchmarkTester.exportResultsToJson(testResults, outputPath);

    res.json({
      success: true,
      filePath,
      message: "JSON 파일로 내보내기 완료",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "JSON 내보내기 실패",
    });
  }
});

/**
 * 벤치마크 테스트 결과를 CSV로 내보내기
 */
router.post("/benchmark/export/csv", async (req: Request, res: Response) => {
  try {
    const { testResults, outputPath } = req.body;

    if (!testResults) {
      return res.status(400).json({
        success: false,
        error: "testResults는 필수입니다",
      });
    }

    const filePath = await adversarialBenchmarkTester.exportResultsToCsv(testResults, outputPath);

    res.json({
      success: true,
      filePath,
      message: "CSV 파일로 내보내기 완료",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "CSV 내보내기 실패",
    });
  }
});

/**
 * 벤치마크 테스트 결과 조회
 */
router.get("/benchmark/results", async (req: Request, res: Response) => {
  try {
    const {
      testSuite,
      testCategory,
      startDate,
      endDate,
      limit,
    } = req.query;

    const results = await adversarialBenchmarkTester.getTestResults({
      testSuite: testSuite as string,
      testCategory: testCategory as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "벤치마크 테스트 결과 조회 실패",
    });
  }
});

// ===================================
// RAG 데이터 위변조 탐지 API
// ===================================

/**
 * 데이터 해시 검증
 */
router.post("/tampering/verify", async (req: Request, res: Response) => {
  try {
    const { documentId, data } = req.body;

    if (!documentId || !data) {
      return res.status(400).json({
        success: false,
        error: "documentId와 data는 필수입니다",
      });
    }

    const result = await ragTamperingDetector.verifyDataHash(documentId, data);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "데이터 해시 검증 실패",
    });
  }
});

/**
 * 예상치 못한 변경 탐지
 */
router.post("/tampering/detect-unexpected", async (req: Request, res: Response) => {
  try {
    const { documentId, data, expectedFields } = req.body;

    if (!documentId || !data) {
      return res.status(400).json({
        success: false,
        error: "documentId와 data는 필수입니다",
      });
    }

    const result = await ragTamperingDetector.detectUnexpectedChange(
      documentId,
      data,
      expectedFields
    );

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "예상치 못한 변경 탐지 실패",
    });
  }
});

/**
 * 위변조 탐지 목록 조회
 */
router.get("/tampering/detections", async (req: Request, res: Response) => {
  try {
    const {
      documentId,
      schemaId,
      detectionType,
      severity,
      startDate,
      endDate,
      limit,
    } = req.query;

    const detections = await ragTamperingDetector.getTamperingDetections({
      documentId: documentId as string,
      schemaId: schemaId as string,
      detectionType: detectionType as string,
      severity: severity as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      detections,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "위변조 탐지 목록 조회 실패",
    });
  }
});

/**
 * 위변조 대응 조치
 */
router.post("/tampering/mitigate/:detectionId", async (req: Request, res: Response) => {
  try {
    const { detectionId } = req.params;
    const { action } = req.body;

    if (!action || !["ROLLBACK", "ALERT", "BLOCK", "INVESTIGATE"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "유효한 action이 필요합니다 (ROLLBACK, ALERT, BLOCK, INVESTIGATE)",
      });
    }

    const userId = (req as any).user?.id;

    await ragTamperingDetector.mitigateTampering(detectionId, action, userId);

    res.json({
      success: true,
      message: "위변조 대응 조치가 시작되었습니다",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "위변조 대응 조치 실패",
    });
  }
});

// ===================================
// RAG 데이터 이상치 탐지 API
// ===================================

/**
 * 통계적 이상치 탐지
 */
router.post("/anomaly/detect-statistical", async (req: Request, res: Response) => {
  try {
    const { documentId, data, schemaId } = req.body;

    if (!documentId || !data) {
      return res.status(400).json({
        success: false,
        error: "documentId와 data는 필수입니다",
      });
    }

    const result = await ragAnomalyDetector.detectStatisticalAnomaly(
      documentId,
      data,
      schemaId
    );

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "통계적 이상치 탐지 실패",
    });
  }
});

/**
 * 패턴 기반 이상치 탐지
 */
router.post("/anomaly/detect-pattern", async (req: Request, res: Response) => {
  try {
    const { documentId, data, schemaId } = req.body;

    if (!documentId || !data) {
      return res.status(400).json({
        success: false,
        error: "documentId와 data는 필수입니다",
      });
    }

    const result = await ragAnomalyDetector.detectPatternAnomaly(
      documentId,
      data,
      schemaId
    );

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "패턴 기반 이상치 탐지 실패",
    });
  }
});

/**
 * 이상치 탐지 목록 조회
 */
router.get("/anomaly/detections", async (req: Request, res: Response) => {
  try {
    const {
      documentId,
      schemaId,
      anomalyType,
      severity,
      startDate,
      endDate,
      limit,
    } = req.query;

    const detections = await ragAnomalyDetector.getAnomalyDetections({
      documentId: documentId as string,
      schemaId: schemaId as string,
      anomalyType: anomalyType as string,
      severity: severity as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      detections,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "이상치 탐지 목록 조회 실패",
    });
  }
});

/**
 * 이상치 검증
 */
router.post("/anomaly/verify/:detectionId", async (req: Request, res: Response) => {
  try {
    const { detectionId } = req.params;
    const { isAnomaly, verificationNotes } = req.body;

    if (typeof isAnomaly !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "isAnomaly는 boolean이어야 합니다",
      });
    }

    const userId = (req as any).user?.id;

    await ragAnomalyDetector.verifyAnomaly(
      detectionId,
      isAnomaly,
      userId,
      verificationNotes
    );

    res.json({
      success: true,
      message: "이상치 검증이 완료되었습니다",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "이상치 검증 실패",
    });
  }
});

export default router;

