import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useThemeStore, useModelsStore } from '@/stores';
import {
  StatCards,
  UsageChart,
  ChartLineSelector,
  ApiDetailsCard,
  ModelStatsCard,
  useUsageData,
  useSparklines,
  useChartData
} from '@/components/usage';
import { KpiCards } from '@/components/monitor/KpiCards';
import { ModelDistributionChart } from '@/components/monitor/ModelDistributionChart';
import { DailyTrendChart } from '@/components/monitor/DailyTrendChart';
import { HourlyModelChart } from '@/components/monitor/HourlyModelChart';
import { HourlyTokenChart } from '@/components/monitor/HourlyTokenChart';
import { SourceStats } from '@/components/monitor/ChannelStats';
import { ApiStats } from '@/components/monitor/ApiStats';
import { FailureAnalysis } from '@/components/monitor/FailureAnalysis';
import { getModelNamesFromUsage, getApiStats, getModelStats, resolveModelPrices } from '@/utils/usage';
import { providersApi, authFilesApi } from '@/services/api';
import type { UsageData, UsageDetail } from '@/types/usage';
import styles from './UsagePage.module.scss';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 时间范围选项
type TimeRange = 1 | 7 | 14 | 30;

export function UsagePage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const isDark = resolvedTheme === 'dark';

  // Data hook
  const {
    usage,
    loading,
    error,
    modelPrices,
    loadUsage,
    handleExport,
    handleImport,
    handleImportChange,
    importInputRef,
    exporting,
    importing
  } = useUsageData();

  // 从 models store 构建 alias → name 映射，用于价格解析
  const models = useModelsStore((state) => state.models);
  const resolvedPrices = useMemo(() => {
    const aliasMap: Record<string, string> = {};
    models.forEach((m) => {
      if (m.alias && m.name && m.alias !== m.name) {
        aliasMap[m.alias] = m.name;
      }
    });
    return resolveModelPrices(modelPrices, aliasMap);
  }, [modelPrices, models]);

  useHeaderRefresh(loadUsage);

  // Chart lines state
  const [chartLines, setChartLines] = useState<string[]>(['all']);
  const MAX_CHART_LINES = 9;

  // Monitor data state
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [providerMap, setProviderMap] = useState<Record<string, string>>({});
  const [providerModels, setProviderModels] = useState<Record<string, Set<string>>>({});
  const [providerTypeMap, setProviderTypeMap] = useState<Record<string, string>>({});
  const [authIndexMap, setAuthIndexMap] = useState<Record<string, { name: string; type: string; fileName: string }>>({});

  // 加载渠道名称映射
  const loadProviderMap = useCallback(async () => {
    try {
      const map: Record<string, string> = {};
      const modelsMap: Record<string, Set<string>> = {};
      const typeMap: Record<string, string> = {};
      const authIdxMap: Record<string, { name: string; type: string; fileName: string }> = {};

      const [openaiProviders, geminiKeys, claudeConfigs, codexConfigs, vertexConfigs, authFilesResponse] = await Promise.all([
        providersApi.getOpenAIProviders().catch(() => []),
        providersApi.getGeminiKeys().catch(() => []),
        providersApi.getClaudeConfigs().catch(() => []),
        providersApi.getCodexConfigs().catch(() => []),
        providersApi.getVertexConfigs().catch(() => []),
        authFilesApi.list().catch(() => ({ files: [] })),
      ]);

      // 处理 OpenAI 兼容提供商
      openaiProviders.forEach((provider) => {
        const providerName = provider.headers?.['X-Provider'] || provider.name || 'unknown';
        const modelSet = new Set<string>();
        (provider.models || []).forEach((m) => {
          if (m.alias) modelSet.add(m.alias);
          if (m.name) modelSet.add(m.name);
        });
        const apiKeyEntries = provider.apiKeyEntries || [];
        apiKeyEntries.forEach((entry) => {
          const apiKey = entry.apiKey;
          if (apiKey) {
            map[apiKey] = providerName;
            modelsMap[apiKey] = modelSet;
            typeMap[apiKey] = 'OpenAI';
          }
        });
        if (provider.name) {
          map[provider.name] = providerName;
          modelsMap[provider.name] = modelSet;
          typeMap[provider.name] = 'OpenAI';
        }
      });

      // 处理 Gemini 提供商
      geminiKeys.forEach((config) => {
        const apiKey = config.apiKey;
        if (apiKey) {
          const providerName = config.prefix?.trim() || 'Gemini';
          map[apiKey] = providerName;
          typeMap[apiKey] = 'Gemini';
        }
      });

      // 处理 Claude 提供商
      claudeConfigs.forEach((config) => {
        const apiKey = config.apiKey;
        if (apiKey) {
          const providerName = config.prefix?.trim() || 'Claude';
          map[apiKey] = providerName;
          typeMap[apiKey] = 'Claude';
          if (config.models && config.models.length > 0) {
            const modelSet = new Set<string>();
            config.models.forEach((m) => {
              if (m.alias) modelSet.add(m.alias);
              if (m.name) modelSet.add(m.name);
            });
            modelsMap[apiKey] = modelSet;
          }
        }
      });

      // 处理 Codex 提供商
      codexConfigs.forEach((config) => {
        const apiKey = config.apiKey;
        if (apiKey) {
          const providerName = config.prefix?.trim() || 'Codex';
          map[apiKey] = providerName;
          typeMap[apiKey] = 'Codex';
          if (config.models && config.models.length > 0) {
            const modelSet = new Set<string>();
            config.models.forEach((m) => {
              if (m.alias) modelSet.add(m.alias);
              if (m.name) modelSet.add(m.name);
            });
            modelsMap[apiKey] = modelSet;
          }
        }
      });

      // 处理 Vertex 提供商
      vertexConfigs.forEach((config) => {
        const apiKey = config.apiKey;
        if (apiKey) {
          const providerName = config.prefix?.trim() || 'Vertex';
          map[apiKey] = providerName;
          typeMap[apiKey] = 'Vertex';
          if (config.models && config.models.length > 0) {
            const modelSet = new Set<string>();
            config.models.forEach((m) => {
              if (m.alias) modelSet.add(m.alias);
              if (m.name) modelSet.add(m.name);
            });
            modelsMap[apiKey] = modelSet;
          }
        }
      });

      // 处理认证文件
      const authFiles = authFilesResponse?.files || [];
      authFiles.forEach((file) => {
        const rawAuthIndex = file['auth_index'] ?? file.authIndex;
        let authIndexKey: string | null = null;
        if (typeof rawAuthIndex === 'number' && Number.isFinite(rawAuthIndex)) {
          authIndexKey = rawAuthIndex.toString();
        } else if (typeof rawAuthIndex === 'string') {
          const trimmed = rawAuthIndex.trim();
          authIndexKey = trimmed || null;
        }

        if (authIndexKey) {
          const fileType = (file.type || 'unknown').toString();
          const fileName = file.name?.replace(/\.json$/i, '') || '';
          const displayName = file.provider?.trim() || fileName || fileType;

          authIdxMap[authIndexKey] = {
            name: displayName,
            type: fileType,
            fileName: fileName,
          };

          if (file.name) {
            map[file.name] = displayName;
            typeMap[file.name] = fileType;
            const nameWithoutExt = file.name.replace(/\.json$/i, '');
            if (nameWithoutExt !== file.name) {
              map[nameWithoutExt] = displayName;
              typeMap[nameWithoutExt] = fileType;
            }
          }
        }
      });

      setProviderMap(map);
      setProviderModels(modelsMap);
      setProviderTypeMap(typeMap);
      setAuthIndexMap(authIdxMap);
    } catch (err) {
      console.warn('Usage: Failed to load provider map:', err);
    }
  }, []);

  // 初始加载 provider map
  useEffect(() => {
    loadProviderMap();
  }, [loadProviderMap]);

  // Sparklines hook
  const {
    requestsSparkline,
    tokensSparkline,
    rpmSparkline,
    tpmSparkline,
    costSparkline
  } = useSparklines({ usage, loading });

  // Chart data hook
  const {
    requestsPeriod,
    setRequestsPeriod,
    tokensPeriod,
    setTokensPeriod,
    requestsChartData,
    tokensChartData,
    requestsChartOptions,
    tokensChartOptions
  } = useChartData({ usage, chartLines, isDark, isMobile });

  // Derived data
  const modelNames = useMemo(() => getModelNamesFromUsage(usage), [usage]);
  const apiStats = useMemo(() => getApiStats(usage, resolvedPrices), [usage, resolvedPrices]);
  const modelStats = useMemo(() => getModelStats(usage, resolvedPrices), [usage, resolvedPrices]);
  const hasPrices = Object.keys(resolvedPrices).length > 0;

  // 根据时间范围过滤数据（用于 Monitor 组件）
  const filteredData = useMemo(() => {
    if (!usage?.apis) {
      return null;
    }

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeRange * 24 * 60 * 60 * 1000);

    const filtered: UsageData = { apis: {} };

    Object.entries(usage.apis as Record<string, any>).forEach(([apiKey, apiData]) => {
      if (!apiData?.models) {
        return;
      }

      const filteredModels: Record<string, { details: UsageDetail[] }> = {};

      Object.entries(apiData.models as Record<string, any>).forEach(([modelName, modelData]) => {
        if (!modelData?.details || !Array.isArray(modelData.details)) {
          return;
        }

        const filteredDetails = modelData.details.filter((detail: UsageDetail) => {
          const timestamp = new Date(detail.timestamp);
          return timestamp >= cutoffTime;
        });

        if (filteredDetails.length > 0) {
          filteredModels[modelName] = { details: filteredDetails };
        }
      });

      if (Object.keys(filteredModels).length > 0) {
        filtered.apis[apiKey] = { models: filteredModels };
      }
    });

    return filtered;
  }, [usage, timeRange]);

  // 处理时间范围变化
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  return (
    <div className={styles.container}>
      {loading && !usage && (
        <div className={styles.loadingOverlay} aria-busy="true">
          <div className={styles.loadingOverlayContent}>
            <LoadingSpinner size={28} className={styles.loadingOverlaySpinner} />
            <span className={styles.loadingOverlayText}>{t('common.loading')}</span>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t('usage_stats.title')}</h1>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            loading={exporting}
            disabled={loading || importing}
          >
            {t('usage_stats.export')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleImport}
            loading={importing}
            disabled={loading || exporting}
          >
            {t('usage_stats.import')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadUsage}
            disabled={loading || exporting || importing}
          >
            {loading ? t('common.loading') : t('usage_stats.refresh')}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportChange}
          />
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {/* 时间范围选择 */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('monitor.time_range', { defaultValue: 'Time Range' })}</span>
          <div className={styles.timeButtons}>
            {([1, 7, 14, 30] as TimeRange[]).map((range) => (
              <button
                key={range}
                className={`${styles.timeButton} ${timeRange === range ? styles.active : ''}`}
                onClick={() => handleTimeRangeChange(range)}
              >
                {t(range === 1 ? 'monitor.last_n_days' : 'monitor.last_n_days_plural', { n: range, defaultValue: `${range}d` })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards from Monitor */}
      <KpiCards data={filteredData} loading={loading} timeRange={timeRange} />

      {/* Stats Overview Cards */}
      <StatCards
        usage={usage}
        loading={loading}
        modelPrices={resolvedPrices}
        sparklines={{
          requests: requestsSparkline,
          tokens: tokensSparkline,
          rpm: rpmSparkline,
          tpm: tpmSparkline,
          cost: costSparkline
        }}
      />

      {/* 图表区域 */}
      <div className={styles.chartsGrid}>
        <ModelDistributionChart data={filteredData} loading={loading} isDark={isDark} timeRange={timeRange} />
        <DailyTrendChart data={filteredData} loading={loading} isDark={isDark} timeRange={timeRange} />
      </div>

      {/* 小时级图表 */}
      <HourlyModelChart data={filteredData} loading={loading} isDark={isDark} />
      <HourlyTokenChart data={filteredData} loading={loading} isDark={isDark} />

      {/* Chart Line Selection */}
      <ChartLineSelector
        chartLines={chartLines}
        modelNames={modelNames}
        maxLines={MAX_CHART_LINES}
        onChange={setChartLines}
      />

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        <UsageChart
          title={t('usage_stats.requests_trend')}
          period={requestsPeriod}
          onPeriodChange={setRequestsPeriod}
          chartData={requestsChartData}
          chartOptions={requestsChartOptions}
          loading={loading}
          isMobile={isMobile}
          emptyText={t('usage_stats.no_data')}
        />
        <UsageChart
          title={t('usage_stats.tokens_trend')}
          period={tokensPeriod}
          onPeriodChange={setTokensPeriod}
          chartData={tokensChartData}
          chartOptions={tokensChartOptions}
          loading={loading}
          isMobile={isMobile}
          emptyText={t('usage_stats.no_data')}
        />
      </div>

      {/* Source Statistics - 单独一行 */}
      <SourceStats
        data={filteredData}
        loading={loading}
        providerMap={providerMap}
        providerModels={providerModels}
        providerTypeMap={providerTypeMap}
        authIndexMap={authIndexMap}
      />

      {/* API Statistics - 单独一行 */}
      <ApiStats data={filteredData} loading={loading} />

      {/* 失败分析 */}
      <FailureAnalysis
        data={filteredData}
        loading={loading}
        providerMap={providerMap}
        providerModels={providerModels}
        providerTypeMap={providerTypeMap}
        authIndexMap={authIndexMap}
      />

      {/* Details Grid */}
      <div className={styles.detailsGrid}>
        <ApiDetailsCard apiStats={apiStats} loading={loading} hasPrices={hasPrices} />
        <ModelStatsCard modelStats={modelStats} loading={loading} hasPrices={hasPrices} />
      </div>
    </div>
  );
}
