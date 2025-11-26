import { Router, Request, Response } from "express";
import { ragConnectionManager } from "../services/rag-connection-manager.js";
import { ragEmbeddingManager } from "../services/rag-embedding-manager.js";
import { ragEmbeddingWorker } from "../services/rag-embedding-worker.js";
import { ragSearchService } from "../services/rag-search-service.js";
import { ragChatService } from "../services/rag-chat-service.js";
import { ragMetadataExtractor } from "../services/rag-metadata-extractor.js";

const router = Router();

// ===================================
// 연결 관리 API
// ===================================

/**
 * 연결 상태 조회
 */
router.get("/connection/status", async (req: Request, res: Response) => {
  try {
    const status = await ragConnectionManager.getConnectionStatus();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "연결 상태 조회 실패",
    });
  }
});

/**
 * 연결 테스트
 */
router.get("/connection/test", async (req: Request, res: Response) => {
  try {
    const result = await ragConnectionManager.testConnection();
    res.json({ ...result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "연결 테스트 실패",
    });
  }
});

/**
 * 현재 설정 조회
 */
router.get("/connection/config", async (req: Request, res: Response) => {
  try {
    const config = ragConnectionManager.getConnectionConfig();
    const envVars = ragConnectionManager.getRequiredEnvironmentVariables();
    
    res.json({
      success: true,
      config,
      environmentVariables: envVars,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "설정 조회 실패",
    });
  }
});

/**
 * 인덱스 목록 조회
 */
router.get("/connection/indexes", async (req: Request, res: Response) => {
  try {
    const indexes = await ragConnectionManager.listIndexes();
    res.json({ success: true, indexes });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "인덱스 목록 조회 실패",
    });
  }
});

// ===================================
// 임베딩 스키마 관리 API
// ===================================

/**
 * 스키마 목록 조회
 */
router.get("/embedding/schemas", async (req: Request, res: Response) => {
  try {
    const isActive = req.query.isActive !== undefined 
      ? req.query.isActive === "true" 
      : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const schemas = await ragEmbeddingManager.getSchemas({ isActive, limit });
    res.json({ success: true, schemas });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "스키마 목록 조회 실패",
    });
  }
});

/**
 * 스키마 조회
 */
router.get("/embedding/schemas/:id", async (req: Request, res: Response) => {
  try {
    const schema = await ragEmbeddingManager.getSchema(req.params.id);
    
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: "스키마를 찾을 수 없습니다",
      });
    }

    // 상태 정보도 함께 조회
    const status = await ragEmbeddingManager.getSchemaStatus(req.params.id);

    res.json({ success: true, schema, status });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "스키마 조회 실패",
    });
  }
});

/**
 * 스키마 생성
 */
router.post("/embedding/schemas", async (req: Request, res: Response) => {
  try {
    const schema = await ragEmbeddingManager.createSchema({
      ...req.body,
      createdBy: (req as any).user?.id,
    });

    res.json({ success: true, schema });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "스키마 생성 실패",
    });
  }
});

/**
 * 스키마 수정
 */
router.put("/embedding/schemas/:id", async (req: Request, res: Response) => {
  try {
    const schema = await ragEmbeddingManager.updateSchema(req.params.id, req.body);
    res.json({ success: true, schema });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "스키마 수정 실패",
    });
  }
});

/**
 * 스키마 삭제
 */
router.delete("/embedding/schemas/:id", async (req: Request, res: Response) => {
  try {
    await ragEmbeddingManager.deleteSchema(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "스키마 삭제 실패",
    });
  }
});

/**
 * 스키마별 임베딩 상태 조회
 */
router.get("/embedding/schemas/:id/status", async (req: Request, res: Response) => {
  try {
    const status = await ragEmbeddingManager.getSchemaStatus(req.params.id);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: "상태를 찾을 수 없습니다",
      });
    }

    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "상태 조회 실패",
    });
  }
});

/**
 * 수동 임베딩 실행
 */
router.post("/embedding/schemas/:id/embed", async (req: Request, res: Response) => {
  try {
    const schema = await ragEmbeddingManager.getSchema(req.params.id);
    
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: "스키마를 찾을 수 없습니다",
      });
    }

    const jobType = req.body.jobType || "MANUAL";
    const batchSize = req.body.batchSize || 1000;
    const startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;

    // 작업 생성
    const job = await ragEmbeddingManager.createJob(schema.id, jobType, {
      batchSize,
      startDate,
      endDate,
      createdBy: (req as any).user?.id,
    });

    // 백그라운드에서 작업 실행 (비동기)
    ragEmbeddingWorker.executeJob(job, schema, {
      batchSize,
      onProgress: async (progress) => {
        // 진행률 업데이트는 워커 내부에서 처리
        console.log(`[Job ${job.id}] 진행률: ${progress.percentage}%`);
      },
    }).catch((error) => {
      console.error(`[Job ${job.id}] 작업 실패:`, error);
    });

    res.json({
      success: true,
      job,
      message: "임베딩 작업이 시작되었습니다",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "임베딩 작업 시작 실패",
    });
  }
});

// ===================================
// 임베딩 작업 관리 API
// ===================================

/**
 * 작업 목록 조회
 */
router.get("/embedding/jobs", async (req: Request, res: Response) => {
  try {
    const schemaId = req.query.schemaId as string | undefined;
    const jobStatus = req.query.jobStatus as any;
    const jobType = req.query.jobType as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const jobs = await ragEmbeddingManager.getJobs({
      schemaId,
      jobStatus,
      jobType,
      limit,
    });

    res.json({ success: true, jobs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "작업 목록 조회 실패",
    });
  }
});

/**
 * 작업 조회
 */
router.get("/embedding/jobs/:id", async (req: Request, res: Response) => {
  try {
    const job = await ragEmbeddingManager.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: "작업을 찾을 수 없습니다",
      });
    }

    res.json({ success: true, job });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "작업 조회 실패",
    });
  }
});

/**
 * 작업 취소
 */
router.post("/embedding/jobs/:id/cancel", async (req: Request, res: Response) => {
  try {
    await ragEmbeddingManager.cancelJob(req.params.id);
    res.json({ success: true, message: "작업이 취소되었습니다" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "작업 취소 실패",
    });
  }
});

// ===================================
// 메타데이터 관리 API
// ===================================

/**
 * 메타데이터 검색
 */
router.get("/metadata", async (req: Request, res: Response) => {
  try {
    const filters = {
      schemaId: req.query.schemaId as string | undefined,
      symbol: req.query.symbol as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      category: req.query.category as string | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(",") : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const results = await ragMetadataExtractor.searchMetadata(filters);
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "메타데이터 검색 실패",
    });
  }
});

// ===================================
// RAG 검색 API
// ===================================

/**
 * RAG 검색
 */
router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query, indexName, topK, filters, searchMode } = req.body;

    if (!query || !indexName) {
      return res.status(400).json({
        success: false,
        error: "query와 indexName은 필수입니다",
      });
    }

    const result = await ragSearchService.search({
      query,
      indexName,
      topK,
      filters,
      searchMode,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "RAG 검색 실패",
    });
  }
});

// ===================================
// RAG 챗봇 API
// ===================================

/**
 * 세션 생성
 */
router.post("/chat/sessions", async (req: Request, res: Response) => {
  try {
    const session = await ragChatService.createSession({
      userId: (req as any).user?.id,
      ...req.body,
    });

    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "세션 생성 실패",
    });
  }
});

/**
 * 세션 목록 조회
 */
router.get("/chat/sessions", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const sessions = await ragChatService.getSessions({ userId, limit });
    res.json({ success: true, sessions });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "세션 목록 조회 실패",
    });
  }
});

/**
 * 세션 조회
 */
router.get("/chat/sessions/:id", async (req: Request, res: Response) => {
  try {
    const session = await ragChatService.getSession(req.params.id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "세션을 찾을 수 없습니다",
      });
    }

    const messages = await ragChatService.getMessages(req.params.id);

    res.json({ success: true, session, messages });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "세션 조회 실패",
    });
  }
});

/**
 * 메시지 전송
 */
router.post("/chat/messages", async (req: Request, res: Response) => {
  try {
    const response = await ragChatService.sendMessage({
      ...req.body,
      userId: (req as any).user?.id,
      username: (req as any).user?.username,
      userIp: req.ip || req.headers["x-forwarded-for"] as string || req.socket.remoteAddress,
      sessionIdForLogging: (req as any).session?.id,
    });

    res.json({ success: true, ...response });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "메시지 전송 실패",
    });
  }
});

/**
 * 세션 삭제
 */
router.delete("/chat/sessions/:id", async (req: Request, res: Response) => {
  try {
    await ragChatService.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "세션 삭제 실패",
    });
  }
});

export default router;

