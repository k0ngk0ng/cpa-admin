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
              href="https://github.com/router-for-me/CLIProxyAPIPlus"
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
              href="https://github.com/k0ngk0ng/cpa-admin"
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
