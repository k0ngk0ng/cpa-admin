/**
 * API Models 页面
 * 整合 Available Models 和 Model Pricing Settings
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore, useConfigStore, useNotificationStore, useModelsStore } from '@/stores';
import { apiKeysApi } from '@/services/api/apiKeys';
import { classifyModels } from '@/utils/models';
import { loadModelPrices, saveModelPrices, type ModelPrice } from '@/utils/usage';
import styles from './ModelsPage.module.scss';

// 预设的常用模型价格 ($/1M tokens)
const DEFAULT_MODEL_PRICES: Record<string, { prompt: number; completion: number; cache: number }> = {
  // Claude 模型
  'claude-opus-4-20250514': { prompt: 15.0, completion: 75.0, cache: 1.50 },
  'claude-sonnet-4-20250514': { prompt: 3.0, completion: 15.0, cache: 0.30 },
  'claude-3-7-sonnet-20250219': { prompt: 3.0, completion: 15.0, cache: 0.30 },
  'claude-3-5-sonnet-20241022': { prompt: 3.0, completion: 15.0, cache: 0.30 },
  'claude-3-5-sonnet-20240620': { prompt: 3.0, completion: 15.0, cache: 0.30 },
  'claude-3-5-haiku-20241022': { prompt: 0.80, completion: 4.0, cache: 0.08 },
  'claude-3-opus-20240229': { prompt: 15.0, completion: 75.0, cache: 1.50 },
  'claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25, cache: 0.03 },
  // Claude Opus 4.5
  'claude-opus-4.5': { prompt: 5.0, completion: 25.0, cache: 0.50 },
  'claude-3-5-opus': { prompt: 5.0, completion: 25.0, cache: 0.50 },
  // GPT 模型
  'gpt-4o': { prompt: 2.50, completion: 10.0, cache: 1.25 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.60, cache: 0.075 },
  'gpt-4-turbo': { prompt: 10.0, completion: 30.0, cache: 5.0 },
  'gpt-4': { prompt: 30.0, completion: 60.0, cache: 15.0 },
  'gpt-3.5-turbo': { prompt: 0.50, completion: 1.50, cache: 0.25 },
  'o1': { prompt: 15.0, completion: 60.0, cache: 7.50 },
  'o1-mini': { prompt: 3.0, completion: 12.0, cache: 1.50 },
  'o1-pro': { prompt: 150.0, completion: 600.0, cache: 75.0 },
  'o3-mini': { prompt: 1.10, completion: 4.40, cache: 0.55 },
  // Gemini 模型
  'gemini-2.5-pro': { prompt: 1.25, completion: 10.0, cache: 0.3125 },
  'gemini-2.5-flash': { prompt: 0.15, completion: 0.60, cache: 0.0375 },
  'gemini-2.0-flash': { prompt: 0.10, completion: 0.40, cache: 0.025 },
  'gemini-1.5-pro': { prompt: 1.25, completion: 5.0, cache: 0.3125 },
  'gemini-1.5-flash': { prompt: 0.075, completion: 0.30, cache: 0.01875 },
  // DeepSeek 模型
  'deepseek-chat': { prompt: 0.14, completion: 0.28, cache: 0.014 },
  'deepseek-reasoner': { prompt: 0.55, completion: 2.19, cache: 0.14 },
  // Qwen 模型
  'qwen-max': { prompt: 1.60, completion: 6.40, cache: 0.40 },
  'qwen-plus': { prompt: 0.40, completion: 1.20, cache: 0.10 },
  'qwen-turbo': { prompt: 0.30, completion: 0.60, cache: 0.075 },
};

export function ModelsPage() {
  const { t, i18n } = useTranslation();
  const { showNotification, showConfirmation } = useNotificationStore();
  const auth = useAuthStore();
  const config = useConfigStore((state) => state.config);

  const models = useModelsStore((state) => state.models);
  const modelsLoading = useModelsStore((state) => state.loading);
  const modelsError = useModelsStore((state) => state.error);
  const fetchModelsFromStore = useModelsStore((state) => state.fetchModels);

  const [modelStatus, setModelStatus] = useState<{ type: 'success' | 'warning' | 'error' | 'muted'; message: string }>();
  const [modelPrices, setModelPrices] = useState<Record<string, ModelPrice>>({});
  const [selectedModel, setSelectedModel] = useState('');
  const [promptPrice, setPromptPrice] = useState('');
  const [completionPrice, setCompletionPrice] = useState('');
  const [cachePrice, setCachePrice] = useState('');

  const apiKeysCache = useRef<string[]>([]);

  const otherLabel = useMemo(
    () => (i18n.language?.toLowerCase().startsWith('zh') ? '其他' : 'Other'),
    [i18n.language]
  );
  const groupedModels = useMemo(() => classifyModels(models, { otherLabel }), [models, otherLabel]);

  // 构建 alias ↔ name 双向映射
  const { aliasToName, nameToAlias } = useMemo(() => {
    const a2n: Record<string, string> = {};
    const n2a: Record<string, string> = {};
    models.forEach((m) => {
      if (m.alias && m.name && m.alias !== m.name) {
        a2n[m.alias] = m.name;
        n2a[m.name] = m.alias;
      }
    });
    return { aliasToName: a2n, nameToAlias: n2a };
  }, [models]);

  // 获取所有模型名称（用于价格设置）
  const allModelNames = useMemo(() => {
    const names = new Set<string>();
    models.forEach((m) => {
      if (m.name) names.add(m.name);
      if (m.alias) names.add(m.alias);
    });
    // 添加预设价格中的模型
    Object.keys(DEFAULT_MODEL_PRICES).forEach((name) => names.add(name));
    // 添加已保存价格中的模型
    Object.keys(modelPrices).forEach((name) => names.add(name));
    return Array.from(names).sort();
  }, [models, modelPrices]);

  // 为下拉框生成显示标签：如果是别称则标注原始名称，如果是原始名称则标注别称
  const getModelDisplayLabel = useCallback((name: string): string => {
    const originalName = aliasToName[name];
    if (originalName) {
      // 这是一个别称，显示对应的原始名称
      return `${name}  ← ${originalName}`;
    }
    const alias = nameToAlias[name];
    if (alias) {
      // 这是一个原始名称，显示对应的别称
      return `${name}  → ${alias}`;
    }
    return name;
  }, [aliasToName, nameToAlias]);

  const normalizeApiKeyList = (input: any): string[] => {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    const keys: string[] = [];

    input.forEach((item) => {
      const value = typeof item === 'string' ? item : item?.['api-key'] ?? item?.apiKey ?? '';
      const trimmed = String(value || '').trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      keys.push(trimmed);
    });

    return keys;
  };

  const resolveApiKeysForModels = useCallback(async () => {
    if (apiKeysCache.current.length) {
      return apiKeysCache.current;
    }

    const configKeys = normalizeApiKeyList(config?.apiKeys);
    if (configKeys.length) {
      apiKeysCache.current = configKeys;
      return configKeys;
    }

    try {
      const list = await apiKeysApi.list();
      const normalized = normalizeApiKeyList(list);
      if (normalized.length) {
        apiKeysCache.current = normalized;
      }
      return normalized;
    } catch (err) {
      console.warn('Auto loading API keys for models failed:', err);
      return [];
    }
  }, [config?.apiKeys]);

  const fetchModels = async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
    if (auth.connectionStatus !== 'connected') {
      setModelStatus({
        type: 'warning',
        message: t('notification.connection_required')
      });
      return;
    }

    if (!auth.apiBase) {
      showNotification(t('notification.connection_required'), 'warning');
      return;
    }

    if (forceRefresh) {
      apiKeysCache.current = [];
    }

    setModelStatus({ type: 'muted', message: t('system_info.models_loading') });
    try {
      const apiKeys = await resolveApiKeysForModels();
      const primaryKey = apiKeys[0];
      const list = await fetchModelsFromStore(auth.apiBase, primaryKey, forceRefresh);
      const hasModels = list.length > 0;
      setModelStatus({
        type: hasModels ? 'success' : 'warning',
        message: hasModels ? t('system_info.models_count', { count: list.length }) : t('system_info.models_empty')
      });
    } catch (err: any) {
      const message = `${t('system_info.models_error')}: ${err?.message || ''}`;
      setModelStatus({ type: 'error', message });
    }
  };

  useEffect(() => {
    setModelPrices(loadModelPrices());
  }, []);

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.connectionStatus, auth.apiBase]);

  const handleSavePrice = () => {
    if (!selectedModel) return;
    const prompt = parseFloat(promptPrice) || 0;
    const completion = parseFloat(completionPrice) || 0;
    const cache = cachePrice.trim() === '' ? prompt : parseFloat(cachePrice) || 0;
    const newPrices = { ...modelPrices, [selectedModel]: { prompt, completion, cache } };
    setModelPrices(newPrices);
    saveModelPrices(newPrices);
    showNotification(t('notification.saved'), 'success');
    setSelectedModel('');
    setPromptPrice('');
    setCompletionPrice('');
    setCachePrice('');
  };

  const handleDeletePrice = (model: string) => {
    const newPrices = { ...modelPrices };
    delete newPrices[model];
    setModelPrices(newPrices);
    saveModelPrices(newPrices);
    showNotification(t('notification.deleted'), 'success');
  };

  const handleEditPrice = (model: string) => {
    const price = modelPrices[model];
    setSelectedModel(model);
    setPromptPrice(price?.prompt?.toString() || '');
    setCompletionPrice(price?.completion?.toString() || '');
    setCachePrice(price?.cache?.toString() || '');
  };

  const handleModelSelect = (value: string) => {
    setSelectedModel(value);
    // 优先使用已保存的价格，其次使用预设价格
    const price = modelPrices[value] || DEFAULT_MODEL_PRICES[value];
    if (price) {
      setPromptPrice(price.prompt.toString());
      setCompletionPrice(price.completion.toString());
      setCachePrice(price.cache.toString());
    } else {
      setPromptPrice('');
      setCompletionPrice('');
      setCachePrice('');
    }
  };

  const handleLoadDefaults = () => {
    showConfirmation({
      title: t('models.load_defaults_title', { defaultValue: 'Load Default Prices' }),
      message: t('models.load_defaults_confirm', { defaultValue: 'This will add default prices for common models. Existing prices will not be overwritten. Continue?' }),
      onConfirm: () => {
        const newPrices = { ...DEFAULT_MODEL_PRICES, ...modelPrices };
        setModelPrices(newPrices);
        saveModelPrices(newPrices);
        showNotification(t('notification.saved'), 'success');
      }
    });
  };

  const handleExportPrices = () => {
    const data = {
      exported_at: new Date().toISOString(),
      model_prices: modelPrices
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `model-prices-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    showNotification(t('notification.exported'), 'success');
  };

  const handleImportPrices = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const prices = data.model_prices || data;
        if (typeof prices === 'object' && prices !== null) {
          const newPrices = { ...modelPrices, ...prices };
          setModelPrices(newPrices);
          saveModelPrices(newPrices);
          showNotification(t('notification.imported'), 'success');
        } else {
          showNotification(t('notification.import_invalid'), 'error');
        }
      } catch {
        showNotification(t('notification.import_failed'), 'error');
      }
    };
    input.click();
  };

  const handleClearPrices = () => {
    showConfirmation({
      title: t('models.clear_prices_title', { defaultValue: 'Clear All Prices' }),
      message: t('models.clear_prices_confirm', { defaultValue: 'Are you sure you want to clear all saved model prices?' }),
      variant: 'danger',
      onConfirm: () => {
        setModelPrices({});
        saveModelPrices({});
        showNotification(t('notification.cleared'), 'success');
      }
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{t('models.title', { defaultValue: 'API Models' })}</h1>

      <div className={styles.content}>
        {/* Available Models */}
        <Card
          title={t('system_info.models_title')}
          extra={
            <Button variant="secondary" size="sm" onClick={() => fetchModels({ forceRefresh: true })} loading={modelsLoading}>
              {t('common.refresh')}
            </Button>
          }
        >
          <p className={styles.sectionDescription}>{t('system_info.models_desc')}</p>
          {modelStatus && <div className={`status-badge ${modelStatus.type}`}>{modelStatus.message}</div>}
          {modelsError && <div className="error-box">{modelsError}</div>}
          {modelsLoading ? (
            <div className="hint">{t('common.loading')}</div>
          ) : models.length === 0 ? (
            <div className="hint">{t('system_info.models_empty')}</div>
          ) : (
            <div className="item-list">
              {groupedModels.map((group) => (
                <div key={group.id} className="item-row">
                  <div className="item-meta">
                    <div className="item-title">{group.label}</div>
                    <div className="item-subtitle">{t('system_info.models_count', { count: group.items.length })}</div>
                  </div>
                  <div className={styles.modelTags}>
                    {group.items.map((model) => (
                      <span
                        key={`${model.name}-${model.alias ?? 'default'}`}
                        className={styles.modelTag}
                        title={model.description || ''}
                      >
                        <span className={styles.modelName}>{model.name}</span>
                        {model.alias && <span className={styles.modelAlias}>{model.alias}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Model Pricing Settings */}
        <Card
          title={t('usage_stats.model_price_settings')}
          extra={
            <div className={styles.priceActions}>
              <Button variant="secondary" size="sm" onClick={handleLoadDefaults}>
                {t('models.load_defaults', { defaultValue: 'Load Defaults' })}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportPrices}>
                {t('common.export')}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImportPrices}>
                {t('common.import')}
              </Button>
              <Button variant="danger" size="sm" onClick={handleClearPrices}>
                {t('common.clear')}
              </Button>
            </div>
          }
        >
          <p className={styles.sectionDescription}>
            {t('models.price_desc', { defaultValue: 'Set model prices for cost calculation. Prices are stored locally.' })}
          </p>

          {/* Price Form */}
          <div className={styles.priceForm}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>{t('usage_stats.model_name')}</label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelSelect(e.target.value)}
                  className={styles.select}
                >
                  <option value="">{t('usage_stats.model_price_select_placeholder')}</option>
                  {allModelNames.map((name) => (
                    <option key={name} value={name}>
                      {getModelDisplayLabel(name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label>{t('usage_stats.model_price_prompt')} ($/1M)</label>
                <Input
                  type="number"
                  value={promptPrice}
                  onChange={(e) => setPromptPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.0001"
                />
              </div>
              <div className={styles.formField}>
                <label>{t('usage_stats.model_price_completion')} ($/1M)</label>
                <Input
                  type="number"
                  value={completionPrice}
                  onChange={(e) => setCompletionPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.0001"
                />
              </div>
              <div className={styles.formField}>
                <label>{t('usage_stats.model_price_cache')} ($/1M)</label>
                <Input
                  type="number"
                  value={cachePrice}
                  onChange={(e) => setCachePrice(e.target.value)}
                  placeholder="0.00"
                  step="0.0001"
                />
              </div>
              <Button variant="primary" onClick={handleSavePrice} disabled={!selectedModel}>
                {t('common.save')}
              </Button>
            </div>
          </div>

          {/* Saved Prices List */}
          <div className={styles.pricesList}>
            <h4 className={styles.pricesTitle}>{t('usage_stats.saved_prices')}</h4>
            {Object.keys(modelPrices).length > 0 ? (
              <div className={styles.pricesGrid}>
                {Object.entries(modelPrices).map(([model, price]) => (
                  <div key={model} className={styles.priceItem}>
                    <div className={styles.priceInfo}>
                      <span className={styles.priceModel}>
                        {model}
                        {aliasToName[model] && (
                          <span className={styles.priceModelHint}> ← {aliasToName[model]}</span>
                        )}
                        {nameToAlias[model] && (
                          <span className={styles.priceModelHint}> → {nameToAlias[model]}</span>
                        )}
                      </span>
                      <div className={styles.priceMeta}>
                        <span>
                          {t('usage_stats.model_price_prompt')}: ${price.prompt.toFixed(4)}/1M
                        </span>
                        <span>
                          {t('usage_stats.model_price_completion')}: ${price.completion.toFixed(4)}/1M
                        </span>
                        <span>
                          {t('usage_stats.model_price_cache')}: ${price.cache.toFixed(4)}/1M
                        </span>
                      </div>
                    </div>
                    <div className={styles.priceItemActions}>
                      <Button variant="secondary" size="sm" onClick={() => handleEditPrice(model)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeletePrice(model)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="hint">{t('usage_stats.model_price_empty')}</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
