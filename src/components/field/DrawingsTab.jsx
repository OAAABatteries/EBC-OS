import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { FileText, RefreshCw, X } from 'lucide-react';
import { getDrawingsByProject, listFiles, downloadFile } from '../../lib/supabase';
import { useDrawingCache } from '../../hooks/useDrawingCache';
import { FieldCard } from './FieldCard';
import { FieldButton } from './FieldButton';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

const PdfViewer = lazy(() =>
  import('../PdfViewer').then((m) => ({ default: m.PdfViewer }))
);

/**
 * DrawingsTab — self-contained drawings list + PDF viewer
 *
 * LOCAL-FIRST architecture:
 *  1. On mount: show cached drawings from IndexedDB immediately
 *  2. Background: fetch cloud metadata, merge with local state
 *  3. Auto-cache every drawing blob on first view
 *  4. Stale detection: compare local cachedAt vs cloud updatedAt
 *
 * Props:
 *   readOnly       {boolean}  — hides Refresh / Download actions (default false)
 *   projectFilter  {string}   — project UUID used to query drawings
 *   onDrawingSelect {function} — optional callback when user opens a drawing
 *   t              {function}  — translation function
 */
export function DrawingsTab({ readOnly = false, projectFilter, onDrawingSelect, t = (k) => k }) {
  const [drawings, setDrawings] = useState([]);
  const [drawingsLoading, setDrawingsLoading] = useState(false);
  const [bgSyncing, setBgSyncing] = useState(false);

  // ── Active PDF viewer state ──
  const [activeDrawingData, setActiveDrawingData] = useState(null);
  const [activeDrawingName, setActiveDrawingName] = useState('');
  const [activeIsCached, setActiveIsCached] = useState(false);

  const {
    cacheDrawing,
    getCachedDrawing,
    checkCached,
    removeCachedDrawing,
    listCachedDrawings,
    requestPersistence,
  } = useDrawingCache();

  // ── Request persistent storage once ──
  useEffect(() => {
    requestPersistence();
  }, []);

  // ── STEP 1: Load cached drawings from IndexedDB instantly ──
  const loadLocalDrawings = useCallback(async () => {
    if (!projectFilter) return;
    try {
      const cached = await listCachedDrawings(projectFilter);
      if (cached.length > 0) {
        setDrawings((prev) => {
          // Merge: keep cloud entries, add any local-only entries
          const byFile = new Map(prev.map((d) => [d.fileName, d]));
          for (const c of cached) {
            const existing = byFile.get(c.fileName);
            if (existing) {
              existing.cached = true;
              existing.localCachedAt = c.cachedAt;
            } else {
              // Local-only (offline fallback)
              byFile.set(c.fileName, {
                id: c.fileName,
                name: c.fileName.replace('.pdf', '').replace(/_/g, ' '),
                fileName: c.fileName,
                path: c.storagePath || `drawings/project-${projectFilter}/${c.fileName}`,
                size: c.size || 0,
                uploadedAt: '',
                updatedAt: c.updatedAt || '',
                cached: true,
                localCachedAt: c.cachedAt,
                isStale: false,
                revision: c.revision,
                revisionLabel: '',
                isCurrent: true,
                discipline: 'general',
                notes: '',
              });
            }
          }
          return Array.from(byFile.values());
        });
      }
    } catch {}
  }, [projectFilter, listCachedDrawings]);

  // ── STEP 2: Background sync with cloud metadata ──
  const syncCloudDrawings = useCallback(async () => {
    if (!projectFilter) return;
    setBgSyncing(true);
    try {
      // Primary: project_drawings table
      const dbDrawings = await getDrawingsByProject(projectFilter);
      let cloudList = [];

      if (dbDrawings && dbDrawings.length > 0) {
        // Check each drawing's cache status against IndexedDB
        const checks = await Promise.all(
          dbDrawings.map(async (d) => {
            const fileName = d.fileName;
            const status = await checkCached(projectFilter, fileName, d.updatedAt);
            const path = d.storagePath || `drawings/project-${projectFilter}/${fileName}`;
            return {
              id: d.id,
              name: (fileName || '').replace('.pdf', '').replace(/_/g, ' '),
              fileName,
              path,
              size: d.fileSize || 0,
              uploadedAt: d.createdAt || '',
              updatedAt: d.updatedAt || '',
              cached: status.cached,
              localCachedAt: status.cachedAt,
              isStale: status.isStale,
              revision: d.revision || 1,
              revisionLabel: d.revisionLabel || '',
              isCurrent: d.isCurrent !== false,
              discipline: d.discipline || 'general',
              notes: d.notes || '',
            };
          })
        );
        cloudList = checks;
      } else {
        // Fallback: raw storage listing
        const folder = `drawings/project-${projectFilter}`;
        const files = await listFiles(folder);
        cloudList = await Promise.all(
          (files || [])
            .filter((f) => f.name?.endsWith('.pdf'))
            .map(async (f) => {
              const fileName = f.name;
              const status = await checkCached(projectFilter, fileName, f.updated_at);
              return {
                id: f.id || f.name,
                name: fileName.replace('.pdf', '').replace(/_/g, ' '),
                fileName,
                path: `${folder}/${fileName}`,
                size: f.metadata?.size || 0,
                uploadedAt: f.created_at || f.updated_at || '',
                updatedAt: f.updated_at || '',
                cached: status.cached,
                localCachedAt: status.cachedAt,
                isStale: status.isStale,
                revision: null,
                revisionLabel: '',
                isCurrent: true,
                discipline: 'general',
                notes: '',
              };
            })
        );
      }

      if (cloudList.length > 0) {
        setDrawings(cloudList);
      }
    } catch {
      // Cloud unreachable — local cache still works
    }
    setBgSyncing(false);
  }, [projectFilter, checkCached]);

  // ── Full load: local first, then cloud ──
  const loadDrawings = useCallback(async () => {
    setDrawingsLoading(true);
    await loadLocalDrawings();
    await syncCloudDrawings();
    setDrawingsLoading(false);
  }, [loadLocalDrawings, syncCloudDrawings]);

  useEffect(() => {
    if (projectFilter) loadDrawings();
  }, [projectFilter, loadDrawings]);

  // ── View a drawing (IndexedDB-first) ──
  const handleViewDrawing = async (drawing) => {
    try {
      // If stale, remove old cache first
      if (drawing.isStale) {
        await removeCachedDrawing(projectFilter, drawing.fileName);
      }

      // Try IndexedDB first
      if (drawing.cached && !drawing.isStale) {
        const result = await getCachedDrawing(projectFilter, drawing.fileName);
        if (result?.arrayBuffer) {
          setActiveDrawingData(result.arrayBuffer);
          setActiveDrawingName(drawing.name);
          setActiveIsCached(true);
          onDrawingSelect?.(drawing);
          return;
        }
      }

      // Miss — fetch from cloud
      const blob = await downloadFile(drawing.path);
      const arrayBuffer = await blob.arrayBuffer();
      setActiveDrawingData(arrayBuffer);
      setActiveDrawingName(drawing.name);
      setActiveIsCached(false);
      onDrawingSelect?.(drawing);

      // Auto-cache in background
      cacheDrawing(projectFilter, drawing.fileName, blob, {
        storagePath: drawing.path,
        revision: drawing.revision,
        updatedAt: drawing.updatedAt,
        size: blob.size,
      }).then(() => {
        // Update UI to show cached status
        setDrawings((prev) =>
          prev.map((d) =>
            d.fileName === drawing.fileName
              ? { ...d, cached: true, isStale: false, localCachedAt: new Date().toISOString() }
              : d
          )
        );
        setActiveIsCached(true);
      }).catch(() => {});
    } catch {
      // Download failed — could be offline with no cache
    }
  };

  // ── Download a drawing for offline (explicit) ──
  const handleDownloadDrawing = async (drawing) => {
    try {
      const blob = await downloadFile(drawing.path);
      await cacheDrawing(projectFilter, drawing.fileName, blob, {
        storagePath: drawing.path,
        revision: drawing.revision,
        updatedAt: drawing.updatedAt,
        size: blob.size,
      });
      setDrawings((prev) =>
        prev.map((d) =>
          d.fileName === drawing.fileName
            ? { ...d, cached: true, isStale: false, localCachedAt: new Date().toISOString() }
            : d
        )
      );
    } catch {}
  };

  const handleCloseViewer = () => {
    setActiveDrawingData(null);
    setActiveDrawingName('');
    setActiveIsCached(false);
  };

  // ── Render ──
  return (
    <div className="drawings-tab">
      {/* Header row */}
      <div className="drawings-tab-header">
        <span className="drawings-tab-title">{t('Project Drawings')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {bgSyncing && (
            <span style={{ fontSize: 'var(--text-tab)', color: 'var(--text3)' }}>
              {t('Syncing...')}
            </span>
          )}
          {!readOnly && (
            <FieldButton
              size="sm"
              loading={drawingsLoading}
              onClick={loadDrawings}
              t={t}
            >
              <RefreshCw size={14} />
              {t('Refresh')}
            </FieldButton>
          )}
        </div>
      </div>

      {/* Loading state */}
      {drawingsLoading && drawings.length === 0 && <LoadingSpinner />}

      {/* Empty state */}
      {!drawingsLoading && drawings.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t('No drawings for this project')}
          body={t('Ask your PM to upload drawing sets.')}
          action={
            !readOnly && (
              <FieldButton onClick={loadDrawings} t={t}>
                {t('Refresh')}
              </FieldButton>
            )
          }
        />
      )}

      {/* Drawing list */}
      {drawings.length > 0 && (
        <div className="drawings-tab-list">
          {drawings.map((d) => (
            <FieldCard key={d.id} className="drawings-tab-item">
              {/* Revision badge row */}
              <div className="drawings-tab-badges">
                {d.revisionLabel ? (
                  <span
                    className="drawings-tab-badge"
                    style={{
                      background: d.isCurrent
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(255,255,255,0.08)',
                      color: d.isCurrent ? 'var(--green)' : 'var(--text3)',
                    }}
                  >
                    {d.revisionLabel}
                  </span>
                ) : d.revision ? (
                  <span
                    className="drawings-tab-badge"
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      color: 'var(--green)',
                    }}
                  >
                    Rev {d.revision}
                  </span>
                ) : null}

                {d.isCurrent && (
                  <span
                    className="drawings-tab-badge"
                    style={{
                      background: 'rgba(34,197,94,0.2)',
                      color: 'var(--green)',
                    }}
                  >
                    {t('CURRENT')}
                  </span>
                )}

                {d.isCurrent === false && (
                  <span
                    className="drawings-tab-badge"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text3)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {t('SUPERSEDED')}
                  </span>
                )}

                {d.isStale && (
                  <span
                    className="drawings-tab-badge"
                    style={{
                      background: 'rgba(245,158,11,0.2)',
                      color: 'var(--orange)',
                    }}
                  >
                    {t('UPDATE AVAILABLE')}
                  </span>
                )}

                {d.discipline && d.discipline !== 'general' && (
                  <span
                    className="drawings-tab-badge"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text3)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t(d.discipline)}
                  </span>
                )}
              </div>

              {/* Drawing info + action buttons */}
              <div className="drawings-tab-item-row">
                <div className="drawings-tab-item-icon">
                  <FileText
                    size={28}
                    style={{ color: d.isStale ? 'var(--orange)' : d.cached ? 'var(--green)' : 'var(--text2)' }}
                  />
                </div>

                <div className="drawings-tab-item-info">
                  <div className="drawings-tab-item-name">{d.name}</div>
                  <div className="drawings-tab-item-meta">
                    {d.size > 0 ? `${(d.size / 1048576).toFixed(1)} MB` : ''}
                    {d.uploadedAt ? ` · ${d.uploadedAt.slice(0, 10)}` : ''}
                  </div>
                  {d.cached && !d.isStale && (
                    <div className="drawings-tab-item-cached">{t('Saved locally')}</div>
                  )}
                  {d.cached && d.isStale && (
                    <div className="drawings-tab-item-stale">
                      {t('Local copy is outdated — tap to update')}
                    </div>
                  )}
                </div>

                <div className="drawings-tab-item-actions">
                  <FieldButton size="sm" onClick={() => handleViewDrawing(d)} t={t}>
                    {t('View')}
                  </FieldButton>
                  {!readOnly && (!d.cached || d.isStale) && (
                    <FieldButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadDrawing(d)}
                      t={t}
                    >
                      {d.isStale ? t('Update') : t('Save')}
                    </FieldButton>
                  )}
                </div>
              </div>
            </FieldCard>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="drawings-tab-footer">
        <div className="drawings-tab-footer-text">{t('Drawings are stored locally on your device')}</div>
        <div className="drawings-tab-footer-sub">
          {t('Viewed drawings are automatically saved for offline use. Cloud syncs in the background.')}
        </div>
      </div>

      {/* PDF Viewer overlay */}
      {activeDrawingData && (
        <div className="drawings-tab-overlay">
          <div className="drawings-tab-overlay-header">
            <span className="drawings-tab-overlay-title">{activeDrawingName}</span>
            <button className="drawings-tab-overlay-close" onClick={handleCloseViewer} aria-label={t('Close')}>
              <X size={20} />
            </button>
          </div>
          <div className="drawings-tab-overlay-body">
            <Suspense fallback={<LoadingSpinner />}>
              <PdfViewer
                pdfData={activeDrawingData}
                fileName={activeDrawingName}
                onClose={handleCloseViewer}
                isCachedOffline={activeIsCached}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
