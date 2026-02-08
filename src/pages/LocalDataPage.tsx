/**
 * Local Data 页面
 * 管理本地存储数据的导入导出
 */

import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores';
import styles from './LocalDataPage.module.scss';

// LocalStorage 数据导出/导入
const LOCAL_STORAGE_KEYS = [
  'cpamc-theme',
  'cpamc-language',
  'cpamc-api-key-aliases',
  'cli-proxy-model-prices-v2',
  'cpamc-disabled-models',
];

const STORAGE_KEY_DESCRIPTIONS: Record<string, string> = {
  'cpamc-theme': 'Theme settings (light/dark/auto)',
  'cpamc-language': 'Language preference',
  'cpamc-api-key-aliases': 'API Key friendly names',
  'cli-proxy-model-prices-v2': 'Model pricing configuration',
  'cpamc-disabled-models': 'Disabled models list',
};

export function LocalDataPage() {
  const { t } = useTranslation();
  const { showNotification, showConfirmation } = useNotificationStore();

  const handleExportLocalData = () => {
    const data: Record<string, any> = {
      exported_at: new Date().toISOString(),
      version: '1.0',
    };

    LOCAL_STORAGE_KEYS.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = JSON.parse(value);
        }
      } catch {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = value;
        }
      }
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cpamc-local-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    showNotification(t('notification.exported', { defaultValue: 'Data exported successfully' }), 'success');
  };

  const handleImportLocalData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        let importedCount = 0;
        LOCAL_STORAGE_KEYS.forEach((key) => {
          if (data[key] !== undefined) {
            const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
            localStorage.setItem(key, value);
            importedCount++;
          }
        });

        showNotification(
          t('notification.imported_count', {
            defaultValue: 'Imported {{count}} items. Please refresh the page.',
            count: importedCount
          }),
          'success'
        );
      } catch {
        showNotification(t('notification.import_failed', { defaultValue: 'Import failed' }), 'error');
      }
    };
    input.click();
  };

  const handleClearLocalData = () => {
    showConfirmation({
      title: t('local_data.clear_title', { defaultValue: 'Clear Local Data' }),
      message: t('local_data.clear_confirm', { defaultValue: 'This will clear all locally stored settings (theme, language, aliases, prices, etc.). Login information will not be affected. Continue?' }),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: () => {
        LOCAL_STORAGE_KEYS.forEach((key) => {
          localStorage.removeItem(key);
        });
        showNotification(t('notification.cleared', { defaultValue: 'Data cleared. Please refresh the page.' }), 'success');
      },
    });
  };

  const handleClearSingleKey = (key: string) => {
    showConfirmation({
      title: t('local_data.clear_single_title', { defaultValue: 'Clear Data' }),
      message: t('local_data.clear_single_confirm', { defaultValue: 'Are you sure you want to clear "{{key}}"?', key }),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: () => {
        localStorage.removeItem(key);
        showNotification(t('notification.cleared', { defaultValue: 'Data cleared. Please refresh the page.' }), 'success');
      },
    });
  };

  const getStoredValue = (key: string): string => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return '-';
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object') {
        const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
        return `${count} items`;
      }
      return String(parsed);
    } catch {
      return localStorage.getItem(key) || '-';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{t('local_data.title', { defaultValue: 'Local Data Management' })}</h1>

      <div className={styles.content}>
        {/* Actions Card */}
        <Card
          title={t('local_data.actions_title', { defaultValue: 'Data Actions' })}
        >
          <p className={styles.sectionDescription}>
            {t('local_data.actions_desc', { defaultValue: 'Export, import, or clear all locally stored data. This includes theme, language, API key aliases, model prices, and disabled models.' })}
          </p>
          <div className={styles.dataActions}>
            <Button variant="primary" onClick={handleExportLocalData}>
              {t('local_data.export', { defaultValue: 'Export All Data' })}
            </Button>
            <Button variant="secondary" onClick={handleImportLocalData}>
              {t('local_data.import', { defaultValue: 'Import Data' })}
            </Button>
            <Button variant="danger" onClick={handleClearLocalData}>
              {t('local_data.clear_all', { defaultValue: 'Clear All Data' })}
            </Button>
          </div>
        </Card>

        {/* Data Overview Card */}
        <Card
          title={t('local_data.overview_title', { defaultValue: 'Stored Data Overview' })}
        >
          <p className={styles.sectionDescription}>
            {t('local_data.overview_desc', { defaultValue: 'View and manage individual data items stored in your browser.' })}
          </p>
          <div className={styles.dataList}>
            {LOCAL_STORAGE_KEYS.map((key) => (
              <div key={key} className={styles.dataItem}>
                <div className={styles.dataInfo}>
                  <span className={styles.dataKey}>{key}</span>
                  <span className={styles.dataDesc}>{STORAGE_KEY_DESCRIPTIONS[key] || ''}</span>
                </div>
                <div className={styles.dataValue}>
                  <span className={styles.dataValueText}>{getStoredValue(key)}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleClearSingleKey(key)}
                    disabled={!localStorage.getItem(key)}
                  >
                    {t('common.clear')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Info Card */}
        <Card
          title={t('local_data.info_title', { defaultValue: 'About Local Storage' })}
        >
          <div className={styles.infoContent}>
            <p>{t('local_data.info_1', { defaultValue: 'Local data is stored in your browser and is not synced across devices.' })}</p>
            <p>{t('local_data.info_2', { defaultValue: 'Clearing browser data or using private/incognito mode will remove this data.' })}</p>
            <p>{t('local_data.info_3', { defaultValue: 'Use the Export function to backup your settings before clearing browser data.' })}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
