import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore, useConfigStore, useNotificationStore, useApiKeyAliasStore } from '@/stores';
import { apiKeysApi } from '@/services/api';
import { maskApiKey } from '@/utils/format';
import { isValidApiKeyCharset } from '@/utils/validation';
import styles from './ApiKeysPage.module.scss';

export function ApiKeysPage() {
  const { t } = useTranslation();
  const { showNotification, showConfirmation } = useNotificationStore();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const updateConfigValue = useConfigStore((state) => state.updateConfigValue);
  const clearCache = useConfigStore((state) => state.clearCache);

  // API Key Alias Store
  const aliases = useApiKeyAliasStore((state) => state.aliases);
  const setAlias = useApiKeyAliasStore((state) => state.setAlias);
  const removeAlias = useApiKeyAliasStore((state) => state.removeAlias);

  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [aliasValue, setAliasValue] = useState('');
  const [saving, setSaving] = useState(false);

  const disableControls = useMemo(() => connectionStatus !== 'connected', [connectionStatus]);

  const loadApiKeys = useCallback(
    async (force = false) => {
      setLoading(true);
      setError('');
      try {
        const result = (await fetchConfig('api-keys', force)) as string[] | undefined;
        const list = Array.isArray(result) ? result : [];
        setApiKeys(list);
      } catch (err: any) {
        setError(err?.message || t('notification.refresh_failed'));
      } finally {
        setLoading(false);
      }
    },
    [fetchConfig, t]
  );

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  useEffect(() => {
    if (Array.isArray(config?.apiKeys)) {
      setApiKeys(config.apiKeys);
    }
  }, [config?.apiKeys]);

  const openAddModal = () => {
    setEditingIndex(null);
    setInputValue('');
    setAliasValue('');
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    const key = apiKeys[index] ?? '';
    setEditingIndex(index);
    setInputValue(key);
    setAliasValue(aliases[key] || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setInputValue('');
    setAliasValue('');
    setEditingIndex(null);
  };

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    const trimmedAlias = aliasValue.trim();

    if (!trimmed) {
      showNotification(`${t('notification.please_enter')} ${t('notification.api_key')}`, 'error');
      return;
    }
    if (!isValidApiKeyCharset(trimmed)) {
      showNotification(t('notification.api_key_invalid_chars'), 'error');
      return;
    }

    const isEdit = editingIndex !== null;
    const oldKey = isEdit ? apiKeys[editingIndex!] : null;
    const nextKeys = isEdit
      ? apiKeys.map((key, idx) => (idx === editingIndex ? trimmed : key))
      : [...apiKeys, trimmed];

    setSaving(true);
    try {
      if (isEdit && editingIndex !== null) {
        await apiKeysApi.update(editingIndex, trimmed);
        showNotification(t('notification.api_key_updated'), 'success');

        // Update alias if key changed
        if (oldKey && oldKey !== trimmed && aliases[oldKey]) {
          removeAlias(oldKey);
        }
      } else {
        await apiKeysApi.replace(nextKeys);
        showNotification(t('notification.api_key_added'), 'success');
      }

      // Save alias (stored in localStorage, not API)
      if (trimmedAlias) {
        setAlias(trimmed, trimmedAlias);
      } else if (aliases[trimmed]) {
        removeAlias(trimmed);
      }

      setApiKeys(nextKeys);
      updateConfigValue('api-keys', nextKeys);
      clearCache('api-keys');
      closeModal();
    } catch (err: any) {
      showNotification(`${t('notification.update_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (index: number) => {
    const apiKeyToDelete = apiKeys[index];
    if (!apiKeyToDelete) {
      showNotification(t('notification.delete_failed'), 'error');
      return;
    }

    showConfirmation({
      title: t('common.delete'),
      message: t('api_keys.delete_confirm'),
      variant: 'danger',
      onConfirm: async () => {
        const latestKeys = useConfigStore.getState().config?.apiKeys;
        const currentKeys = Array.isArray(latestKeys) ? latestKeys : [];
        const deleteIndex =
          currentKeys[index] === apiKeyToDelete
            ? index
            : currentKeys.findIndex((key) => key === apiKeyToDelete);

        if (deleteIndex < 0) {
          showNotification(t('notification.delete_failed'), 'error');
          return;
        }

        try {
          await apiKeysApi.delete(deleteIndex);
          const nextKeys = currentKeys.filter((_, idx) => idx !== deleteIndex);
          setApiKeys(nextKeys);
          updateConfigValue('api-keys', nextKeys);
          clearCache('api-keys');

          // Also remove alias
          if (aliases[apiKeyToDelete]) {
            removeAlias(apiKeyToDelete);
          }

          showNotification(t('notification.api_key_deleted'), 'success');
        } catch (err: any) {
          showNotification(`${t('notification.delete_failed')}: ${err?.message || ''}`, 'error');
        }
      }
    });
  };

  // Export/Import aliases
  const handleExportAliases = () => {
    const data = {
      exported_at: new Date().toISOString(),
      aliases
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-key-aliases-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    showNotification(t('notification.exported'), 'success');
  };

  const handleImportAliases = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const importedAliases = data.aliases || data;
        if (typeof importedAliases === 'object' && importedAliases !== null) {
          Object.entries(importedAliases).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim()) {
              setAlias(key, value.trim());
            }
          });
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

  const actionButtons = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button variant="secondary" size="sm" onClick={handleExportAliases} title={t('api_keys.export_aliases', { defaultValue: 'Export Aliases' })}>
        {t('common.export')}
      </Button>
      <Button variant="secondary" size="sm" onClick={handleImportAliases} title={t('api_keys.import_aliases', { defaultValue: 'Import Aliases' })}>
        {t('common.import')}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => loadApiKeys(true)} disabled={loading}>
        {t('common.refresh')}
      </Button>
      <Button size="sm" onClick={openAddModal} disabled={disableControls}>
        {t('api_keys.add_button')}
      </Button>
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{t('api_keys.title')}</h1>

      <div className={styles.content}>
        {/* API Keys Card */}
        <Card title={t('api_keys.proxy_auth_title')} extra={actionButtons}>
          {error && <div className="error-box">{error}</div>}

          {loading ? (
            <div className="flex-center" style={{ padding: '24px 0' }}>
              <LoadingSpinner size={28} />
            </div>
          ) : apiKeys.length === 0 ? (
            <EmptyState
              title={t('api_keys.empty_title')}
              description={t('api_keys.empty_desc')}
              action={
                <Button onClick={openAddModal} disabled={disableControls}>
                  {t('api_keys.add_button')}
                </Button>
              }
            />
          ) : (
            <div className="item-list">
              {apiKeys.map((key, index) => (
                <div key={index} className="item-row">
                  <div className="item-meta">
                    <div className="pill">#{index + 1}</div>
                    <div className="item-title">
                      {aliases[key] ? (
                        <>
                          <span>{aliases[key]}</span>
                          <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: '0.85em' }}>
                            ({maskApiKey(String(key || ''))})
                          </span>
                        </>
                      ) : (
                        maskApiKey(String(key || ''))
                      )}
                    </div>
                  </div>
                  <div className="item-actions">
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(index)} disabled={disableControls}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      disabled={disableControls}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Modal
            open={modalOpen}
            onClose={closeModal}
            title={editingIndex !== null ? t('api_keys.edit_modal_title') : t('api_keys.add_modal_title')}
            footer={
              <>
                <Button variant="secondary" onClick={closeModal} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} loading={saving}>
                  {editingIndex !== null ? t('common.update') : t('common.add')}
                </Button>
              </>
            }
          >
            <div className={styles.modalForm}>
              <Input
                label={
                  editingIndex !== null ? t('api_keys.edit_modal_key_label') : t('api_keys.add_modal_key_label')
                }
                placeholder={
                  editingIndex !== null
                    ? t('api_keys.edit_modal_key_label')
                    : t('api_keys.add_modal_key_placeholder')
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={saving}
              />
              <Input
                label={t('api_keys.alias_label', { defaultValue: 'Alias (Optional)' })}
                placeholder={t('api_keys.alias_placeholder', { defaultValue: 'Enter a friendly name for this key' })}
                hint={t('api_keys.alias_hint', { defaultValue: 'Alias is stored locally and helps identify keys' })}
                value={aliasValue}
                onChange={(e) => setAliasValue(e.target.value)}
                disabled={saving}
              />
            </div>
          </Modal>
        </Card>
      </div>
    </div>
  );
}
