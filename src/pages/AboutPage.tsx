/**
 * About 页面
 * 显示系统信息、快速链接和清除登录存储
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconGithub, IconBookOpen, IconExternalLink, IconCode } from '@/components/ui/icons';
import { useAuthStore, useConfigStore, useNotificationStore } from '@/stores';
import { STORAGE_KEY_AUTH } from '@/utils/constants';
import styles from './AboutPage.module.scss';

// LocalStorage 数据导出/导入
const LOCAL_STORAGE_KEYS = [
  'cpamc-theme',
  'cpamc-language',
  'cpamc-api-key-aliases',
  'cpamc-model-prices',
  'cpamc-disabled-models',
];

export function AboutPage() {
  const { t } = useTranslation();
  const { showNotification, showConfirmation } = useNotificationStore();
  const auth = useAuthStore();
  const fetchConfig = useConfigStore((state) => state.fetchConfig);

  const handleClearLoginStorage = () => {
    showConfirmation({
      title: t('system_info.clear_login_title', { defaultValue: 'Clear Login Storage' }),
      message: t('system_info.clear_login_confirm'),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: () => {
        auth.logout();
        if (typeof localStorage === 'undefined') return;
        const keysToRemove = [STORAGE_KEY_AUTH, 'isLoggedIn', 'apiBase', 'apiUrl', 'managementKey'];
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        showNotification(t('notification.login_storage_cleared'), 'success');
      },
    });
  };

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
        // 如果不是 JSON，直接存储字符串
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
      title: t('about.clear_local_title', { defaultValue: 'Clear Local Data' }),
      message: t('about.clear_local_confirm', { defaultValue: 'This will clear all locally stored settings (theme, language, aliases, prices, etc.). Login information will not be affected. Continue?' }),
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

  useEffect(() => {
    fetchConfig().catch(() => {
      // ignore
    });
  }, [fetchConfig]);

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{t('about.title', { defaultValue: 'About' })}</h1>
      <div className={styles.content}>
        {/* Connection Status */}
        <Card
          title={t('system_info.connection_status_title')}
          extra={
            <Button variant="secondary" size="sm" onClick={() => fetchConfig(undefined, true)}>
              {t('common.refresh')}
            </Button>
          }
        >
          <div className="grid cols-2">
            <div className="stat-card">
              <div className="stat-label">{t('connection.server_address')}</div>
              <div className="stat-value">{auth.apiBase || '-'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('footer.api_version')}</div>
              <div className="stat-value">{auth.serverVersion || t('system_info.version_unknown')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('footer.build_date')}</div>
              <div className="stat-value">
                {auth.serverBuildDate
                  ? new Date(auth.serverBuildDate).toLocaleString()
                  : t('system_info.version_unknown')}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('connection.status')}</div>
              <div className="stat-value">{t(`common.${auth.connectionStatus}_status` as any)}</div>
            </div>
          </div>
        </Card>

        {/* Quick Links */}
        <Card title={t('system_info.quick_links_title')}>
          <p className={styles.sectionDescription}>{t('system_info.quick_links_desc')}</p>
          <div className={styles.quickLinks}>
            <a
              href="https://github.com/router-for-me/CLIProxyAPI"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkCard}
            >
              <div className={`${styles.linkIcon} ${styles.github}`}>
                <IconGithub size={22} />
              </div>
              <div className={styles.linkContent}>
                <div className={styles.linkTitle}>
                  {t('system_info.link_main_repo')}
                  <IconExternalLink size={14} />
                </div>
                <div className={styles.linkDesc}>{t('system_info.link_main_repo_desc')}</div>
              </div>
            </a>

            <a
              href="https://github.com/k0ngk0ng/Cli-Proxy-API-Management-Center"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkCard}
            >
              <div className={`${styles.linkIcon} ${styles.github}`}>
                <IconCode size={22} />
              </div>
              <div className={styles.linkContent}>
                <div className={styles.linkTitle}>
                  {t('system_info.link_webui_repo')}
                  <IconExternalLink size={14} />
                </div>
                <div className={styles.linkDesc}>{t('system_info.link_webui_repo_desc')}</div>
              </div>
            </a>

            <a
              href="https://help.router-for.me/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkCard}
            >
              <div className={`${styles.linkIcon} ${styles.docs}`}>
                <IconBookOpen size={22} />
              </div>
              <div className={styles.linkContent}>
                <div className={styles.linkTitle}>
                  {t('system_info.link_docs')}
                  <IconExternalLink size={14} />
                </div>
                <div className={styles.linkDesc}>{t('system_info.link_docs_desc')}</div>
              </div>
            </a>
          </div>
        </Card>

        {/* Local Data Management */}
        <Card title={t('about.local_data_title', { defaultValue: 'Local Data Management' })}>
          <p className={styles.sectionDescription}>
            {t('about.local_data_desc', { defaultValue: 'Export, import, or clear locally stored data including theme, language, API key aliases, and model prices.' })}
          </p>
          <div className={styles.dataActions}>
            <Button variant="secondary" onClick={handleExportLocalData}>
              {t('about.export_local', { defaultValue: 'Export Local Data' })}
            </Button>
            <Button variant="secondary" onClick={handleImportLocalData}>
              {t('about.import_local', { defaultValue: 'Import Local Data' })}
            </Button>
            <Button variant="danger" onClick={handleClearLocalData}>
              {t('about.clear_local', { defaultValue: 'Clear Local Data' })}
            </Button>
          </div>
          <div className={styles.dataHint}>
            {t('about.local_data_hint', { defaultValue: 'Includes: Theme, Language, API Key Aliases, Model Prices, Disabled Models' })}
          </div>
        </Card>

        {/* Clear Login Storage */}
        <Card title={t('system_info.clear_login_title')}>
          <p className={styles.sectionDescription}>{t('system_info.clear_login_desc')}</p>
          <div className={styles.clearLoginActions}>
            <Button variant="danger" onClick={handleClearLoginStorage}>
              {t('system_info.clear_login_button')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
