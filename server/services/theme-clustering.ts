import { db } from "../db.js";
import { infoStockThemes } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { generateEmbedding } from "./openai.js";
import { llmSecureWrapper } from "./llm-secure-wrapper.js";

/**
 * Theme Clustering Service
 * 
 * 인포스탁 테마들을 클러스터링하여 유사한 테마들을 그룹화하고 대표 테마를 선별
 */

export interface ThemeCluster {
  id: string;
  representativeTheme: {
    themeCode: string;
    themeName: string;
    totalScore: number;
  };
  similarThemes: Array<{
    themeCode: string;
    themeName: string;
    totalScore: number;
    similarity: number;
  }>;
  clusterSize: number;
  averageScore: number;
}

export interface ClusteringResult {
  clusters: ThemeCluster[];
  totalThemes: number;
  clusteredThemes: number;
  unclusteredThemes: number;
}

export class ThemeClusteringService {
  /**
   * 테마 클러스터링 실행
   */
  async clusterThemes(options?: {
    similarityThreshold?: number; // 유사도 임계값 (0-1)
    minClusterSize?: number; // 최소 클러스터 크기
    maxClusters?: number; // 최대 클러스터 수
  }): Promise<ClusteringResult> {
    const similarityThreshold = options?.similarityThreshold || 0.7;
    const minClusterSize = options?.minClusterSize || 2;
    const maxClusters = options?.maxClusters || 20;

    try {
      // 1. 모든 인포스탁 테마 조회
      const allThemes = await db
        .select()
        .from(infoStockThemes)
        .orderBy(desc(infoStockThemes.totalScore));

      if (allThemes.length === 0) {
        return {
          clusters: [],
          totalThemes: 0,
          clusteredThemes: 0,
          unclusteredThemes: 0,
        };
      }

      // 2. 테마 이름을 벡터로 변환
      const themeEmbeddings = await Promise.all(
        allThemes.map(async (theme) => {
          const embedding = await generateEmbedding(theme.themeName);
          return {
            theme,
            embedding,
          };
        })
      );

      // 3. 유사도 기반 클러스터링
      const clusters: ThemeCluster[] = [];
      const processed = new Set<string>();

      for (let i = 0; i < themeEmbeddings.length && clusters.length < maxClusters; i++) {
        if (processed.has(themeEmbeddings[i].theme.themeCode)) {
          continue;
        }

        const currentTheme = themeEmbeddings[i];
        const similarThemes: Array<{
          themeCode: string;
          themeName: string;
          totalScore: number;
          similarity: number;
        }> = [];

        // 유사한 테마 찾기
        for (let j = i + 1; j < themeEmbeddings.length; j++) {
          if (processed.has(themeEmbeddings[j].theme.themeCode)) {
            continue;
          }

          const similarity = this.cosineSimilarity(
            currentTheme.embedding,
            themeEmbeddings[j].embedding
          );

          if (similarity >= similarityThreshold) {
            similarThemes.push({
              themeCode: themeEmbeddings[j].theme.themeCode,
              themeName: themeEmbeddings[j].theme.themeName,
              totalScore: Number(themeEmbeddings[j].theme.totalScore || 0),
              similarity,
            });
            processed.add(themeEmbeddings[j].theme.themeCode);
          }
        }

        // 클러스터 크기가 최소값 이상이면 클러스터 생성
        if (similarThemes.length >= minClusterSize - 1) {
          const clusterThemes = [
            {
              themeCode: currentTheme.theme.themeCode,
              themeName: currentTheme.theme.themeName,
              totalScore: Number(currentTheme.theme.totalScore || 0),
              similarity: 1.0,
            },
            ...similarThemes,
          ];

          // 점수가 가장 높은 테마를 대표 테마로 선택
          clusterThemes.sort((a, b) => b.totalScore - a.totalScore);
          const representativeTheme = clusterThemes[0];

          const averageScore =
            clusterThemes.reduce((sum, t) => sum + t.totalScore, 0) / clusterThemes.length;

          clusters.push({
            id: `cluster-${clusters.length + 1}`,
            representativeTheme: {
              themeCode: representativeTheme.themeCode,
              themeName: representativeTheme.themeName,
              totalScore: representativeTheme.totalScore,
            },
            similarThemes: clusterThemes.slice(1).map((t) => ({
              themeCode: t.themeCode,
              themeName: t.themeName,
              totalScore: t.totalScore,
              similarity: t.similarity,
            })),
            clusterSize: clusterThemes.length,
            averageScore,
          });

          processed.add(currentTheme.theme.themeCode);
        }
      }

      const clusteredThemes = processed.size;
      const unclusteredThemes = allThemes.length - clusteredThemes;

      return {
        clusters,
        totalThemes: allThemes.length,
        clusteredThemes,
        unclusteredThemes,
      };
    } catch (error: any) {
      console.error("테마 클러스터링 실패:", error);
      throw new Error(`테마 클러스터링 실패: ${error.message}`);
    }
  }

  /**
   * 코사인 유사도 계산
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * LLM을 사용한 테마 클러스터링 (더 정확한 클러스터링)
   */
  async clusterThemesWithLLM(options?: {
    similarityThreshold?: number;
    minClusterSize?: number;
    maxClusters?: number;
    context?: {
      userId?: string;
      username?: string;
      userIp?: string;
      sessionId?: string;
    };
  }): Promise<ClusteringResult> {
    try {
      // 모든 테마 조회
      const allThemes = await db
        .select()
        .from(infoStockThemes)
        .orderBy(desc(infoStockThemes.totalScore));

      if (allThemes.length === 0) {
        return {
          clusters: [],
          totalThemes: 0,
          clusteredThemes: 0,
          unclusteredThemes: 0,
        };
      }

      // LLM을 사용하여 테마들을 분석하고 클러스터링
      const themeList = allThemes.map((t) => ({
        code: t.themeCode,
        name: t.themeName,
        score: Number(t.totalScore || 0),
      }));

      const prompt = `다음 인포스탁 테마 목록을 분석하여 유사한 테마들을 그룹화해주세요. 
각 그룹에서 가장 점수가 높은 테마를 대표 테마로 선정해주세요.

테마 목록:
${JSON.stringify(themeList, null, 2)}

다음 JSON 형식으로 응답해주세요:
{
  "clusters": [
    {
      "representativeTheme": {
        "themeCode": "대표 테마 코드",
        "themeName": "대표 테마명",
        "totalScore": 점수
      },
      "similarThemes": [
        {
          "themeCode": "유사 테마 코드",
          "themeName": "유사 테마명",
          "totalScore": 점수,
          "similarity": 유사도(0-1)
        }
      ],
      "clusterSize": 클러스터크기,
      "averageScore": 평균점수
    }
  ]
}`;

      const response = await llmSecureWrapper.callSecureLLM({
        messages: [
          {
            role: "system",
            content:
              "당신은 금융 테마 분석 전문가입니다. 유사한 테마들을 정확하게 그룹화하고 대표 테마를 선정합니다.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        responseFormat: "json",
        context: options?.context,
        systemPromptSecurity: {
          role: "금융 테마 분석 전문가",
          constraints: [
            "유사한 테마만 그룹화합니다",
            "대표 테마는 점수가 가장 높은 테마로 선정합니다",
            "정확한 JSON 형식으로 응답합니다",
          ],
        },
      });

      const result = JSON.parse(response.sanitizedContent);
      const clusters: ThemeCluster[] = (result.clusters || []).map((c: any, idx: number) => ({
        id: `cluster-${idx + 1}`,
        representativeTheme: c.representativeTheme,
        similarThemes: c.similarThemes || [],
        clusterSize: c.clusterSize || 0,
        averageScore: c.averageScore || 0,
      }));

      const clusteredThemes = clusters.reduce((sum, c) => sum + c.clusterSize, 0);
      const unclusteredThemes = allThemes.length - clusteredThemes;

      return {
        clusters,
        totalThemes: allThemes.length,
        clusteredThemes,
        unclusteredThemes,
      };
    } catch (error: any) {
      console.error("LLM 기반 테마 클러스터링 실패:", error);
      // LLM 실패 시 기본 클러스터링으로 폴백
      return this.clusterThemes(options);
    }
  }
}

export const themeClusteringService = new ThemeClusteringService();

