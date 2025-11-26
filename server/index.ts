import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { schedulerService } from "./services/scheduler";

// Azure 환경에서는 환경변수를 직접 사용
// .env 파일 로드는 제거 - Azure App Service는 Application Settings에서 환경변수 제공

// Environment variable validation
function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`Missing required environment variables: ${missingVars.join(', ')}`);
    log('Application may not function correctly without these variables.');
  } else {
    log('All required environment variables are set.');
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate environment variables
  validateEnvironment();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", async () => {
    log(`serving on port ${port}`);
    
    // 샘플 데이터 초기화 (환경변수로 제어)
    // Azure App Service에서는 INIT_SAMPLE_DATA=true로 설정하여 활성화
    if (process.env.INIT_SAMPLE_DATA === 'true') {
      // 비동기로 실행하여 애플리케이션 시작을 블록하지 않음
      setTimeout(async () => {
        try {
          const { createEssentialSampleData } = await import('../scripts/init-sample-data.js');
          await createEssentialSampleData();
          log('Sample data initialization completed');
        } catch (error) {
          log(`Sample data initialization failed (non-critical): ${error}`);
          // 에러가 있어도 애플리케이션은 계속 실행
        }
      }, 2000); // 서버 시작 후 2초 뒤 실행
    }
    
    // Start the data ingestion scheduler
    try {
      await schedulerService.startScheduler();
      log('Data ingestion scheduler started successfully');
    } catch (error) {
      log(`Failed to start scheduler: ${error}`);
    }
  });
})();
