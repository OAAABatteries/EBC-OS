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
 * Props:
 *   readOnly       {boolean}  — hides Refresh / Download actions (default false)
 *   projectFilter  {string}   — project UUID used to query drawings
 *   onDrawingSelect {function} — optional callback when user opens a drawing
 *   t              {function}  — translation function
 */
export function DrawingsTab({ readOnly = false, projectFilter, onDrawingSelect, t = (k) => k }) {
  // ── Drawings list state ──
  const [cloudDrawings, setCloudDrawings] = useState([]);
  const [drawingsLoading, setDrawingsLoading] = useState(false);

  // ── Offline cache state (metadata only — actual blob lives in Cache API) ──
  const [downloadedDrawings, setDownloadedDrawings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ebc_downloadedDrawings') || '{}');
    } catch {
      return {};
    }
  });

  // ── Active PDF viewer state ──
  const [activeDrawingId, setActiveDrawingId] = useState(null);
  const [activeDrawingPath, setActiveDrawingPath] = useState(null);
  const [activeDrawingData, setActiveDrawingData] = useState(null);
  const [activeDrawingName, setActiveDrawingName] = useState('');

  const { getCachedDrawing, cacheDrawing, removeCachedDrawing } = useDrawingCache();

  // ── Load drawings from Supabase ──
  const loadCloudDrawings = useCallback(async () => {
    if (!projectFilter) return;
    setDrawingsLoading(true);
    try {
      // Primary: project_drawings table (has revision metadata)
      const dbDrawings = await getDrawingsByProject(projectFilter);
      if (dbDrawings && dbDrawings.length > 0) {
        const cachedMeta = JSON.parse(localStorage.getItem('ebc_downloadedDrawings') || '{}');
        const drawings = dbDrawings.map((d) => {
          const path = d.storagePath || `drawings/project-${projectFilter}/${d.fileName}`;
          const meta = cachedMeta[path];
          const cachedAt = meta?.cachedAt ? new Date(meta.cachedAt) : null;
          const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
          const isStale = cachedAt && updatedAt && updatedAt > cachedAt;
          return {
            id: d.id,
            name: (d.fileName || '').replace('.pdf', '').replace(/_/g, ' '),
            fileName: d.fileName,
            path,
            size: d.fileSize || 0,
            uploadedAt: d.createdAt || '',
            updatedAt: d.updatedAt || '',
            cached: !!meta,
            isStale,
            revision: d.revision || 1,
            revisionLabel: d.revisionLabel || '',
            isCurrent: d.isCurrent !== false,
            discipline: d.discipline || 'general',
            notes: d.notes || '',
          };
        });
        setCloudDrawings(drawings);
        setDrawingsLoading(false);
        return;
      }

      // Fallback: raw storage listing
      const folder = `drawings/project-${projectFilter}`;
      const files = await listFiles(folder);
      const cachedMeta = JSON.parse(localStorage.getItem('ebc_downloadedDrawings') || '{}');
      const drawings = (files || [])
        .filter((f) => f.name?.endsWith('.pdf'))
        .map((f) => ({
          id: f.id || f.name,
          name: f.name.replace('.pdf', '').replace(/_/g, ' '),
          fileName: f.name,
          path: `${folder}/${f.name}`,
          size: f.metadata?.size || 0,
          uploadedAt: f.created_at || f.updated_at || '',
          cached: !!cachedMeta[`${folder}/${f.name}`],
          revision: null,
          revisionLabel: '',
          isCurrent: true,
          discipline: 'general',
          isStale: false,
          notes: '',
        }));
      setCloudDrawings(drawings);
    } catch {
      setCloudDrawings([]);
    }
    setDrawingsLoading(false);
  }, [projectFilter]);

  // Load on mount and when project changes
  useEffect(() => {
    if (projectFilter) loadCloudDrawings();
  }, [projectFilter, loadCloudDrawings]);

  // ── View a drawing (cache-first) ──
  const handleViewDrawing = async (drawing) => {
    try {
      if (drawing.isStale) {
        await removeCachedDrawing(drawing.path);
      }
      const cached = !drawing.isStale ? await getCachedDrawing(drawing.path) : null;
      if (cached) {
        setActiveDrawingData(cached);
        setActiveDrawingName(drawing.name);
        setActiveDrawingId(drawing.id);
        setActiveDrawingPath(drawing.path);
        onDrawingSelect?.(drawing);
        return;
      }
      const blob = await downloadFile(drawing.path);
      const arrayBuffer = await blob.arrayBuffer();
      setActiveDrawingData(arrayBuffer);
      setActiveDrawingName(drawing.name);
      setActiveDrawingId(drawing.id);
      setActiveDrawingPath(drawing.path);
      onDrawingSelect?.(drawing);
      // Auto-cache for offline
      cacheDrawing(drawing.path, blob)
        .then(() => {
          const updated = {
            ...downloadedDrawings,
            [drawing.path]: { cachedAt: new Date().toISOString(), size: blob.size },
          };
          setDownloadedDrawings(updated);
          localStorage.setItem('ebc_downloadedDrawings', JSON.stringify(updated));
        })
        .catch(() => {});
    } catch {
      // silently fail — caller can add toast via onDrawingSelect error pattern
    }
  };

  // ── Download a drawing for offline ──
  const handleDownloadDrawing = async (drawing) => {
    try {
      const blob = await downloadFile(drawing.path);
      await cacheDrawing(drawing.path, blob);
      const updated = {
        ...downloadedDrawings,
        [drawing.path]: { cachedAt: new Date().toISOString(), size: blob.size },
      };
      setDownloadedDrawings(updated);
      localStorage.setItem('ebc_downloadedDrawings', JSON.stringify(updated));
    } catch {
      // silently fail
    }
  };

  const handleCloseViewer = () => {
    setActiveDrawingData(null);
    setActiveDrawingId(null);
    setActiveDrawingPath(null);
    setActiveDrawingName('');
  };

  // ── Render ──
  return (
    <div className="drawings-tab">
      {/* Header row */}
      <div className="drawings-tab-header">
        <span className="drawings-tab-title">{t('Project Drawings')}</span>
        {!readOnly && (
          <FieldButton
            size="sm"
            loading={drawingsLoading}
            onClick={loadCloudDrawings}
            t={t}
          >
            <RefreshCw size={14} />
            {t('Refresh')}
          </FieldButton>
        )}
      </div>

      {/* Loading state */}
      {drawingsLoading && <LoadingSpinner />}

      {/* Empty state */}
      {!drawingsLoading && cloudDrawings.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t('No drawings for this project')}
          body={t('Ask your PM to upload drawing sets.')}
          action={
            !readOnly && (
              <FieldButton onClick={loadCloudDrawings} t={t}>
                {t('Refresh')}
              </FieldButton>
            )
          }
        />
      )}

      {/* Drawing list */}
      {!drawingsLoading && cloudDrawings.length > 0 && (
        <div className="drawings-tab-list">
          {cloudDrawings.map((d) => (
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
                    style={{ color: d.isStale ? 'var(--orange)' : 'var(--text2)' }}
                  />
                </div>

                <div className="drawings-tab-item-info">
                  <div className="drawings-tab-item-name">{d.name}</div>
                  <div className="drawings-tab-item-meta">
                    {d.size > 0 ? `${(d.size / 1048576).toFixed(1)} MB` : ''}
                    {d.uploadedAt ? ` · ${d.uploadedAt.slice(0, 10)}` : ''}
                  </div>
                  {d.cached && !d.isStale && (
                    <div className="drawings-tab-item-cached">{t('Saved offline')}</div>
                  )}
                  {d.cached && d.isStale && (
                    <div className="drawings-tab-item-stale">
                      {t('Cached copy is outdated — re-download')}
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
                      {d.isStale ? t('Re-download') : t('Save')}
                    </FieldButton>
                  )}
                </div>
              </div>
            </FieldCard>
          ))}
        </div>
      )}

      {/* Downloaded cache section */}
      {Object.keys(downloadedDrawings).length > 0 && (
        <div className="drawings-tab-offline">
          <div className="drawings-tab-offline-title">{t('Downloaded for Offline')}</div>
          <div className="drawings-tab-offline-list">
            {Object.entries(downloadedDrawings).map(([path, info]) => (
              <div key={path} className="drawings-tab-offline-row">
                <div>
                  <div className="drawings-tab-item-name">
                    {path.split('/').pop().replace('.pdf', '').replace(/_/g, ' ')}
                  </div>
                  <div className="drawings-tab-item-meta">
                    {t('Cached')} {new Date(info.cachedAt).toLocaleDateString()}
                    {info.size ? ` · ${(info.size / 1048576).toFixed(1)} MB` : ''}
                  </div>
                </div>
                <FieldButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const updated = { ...downloadedDrawings };
                    delete updated[path];
                    setDownloadedDrawings(updated);
                    localStorage.setItem('ebc_downloadedDrawings', JSON.stringify(updated));
                  }}
                  t={t}
                >
                  {t('Remove')}
                </FieldButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="drawings-tab-footer">
        <div className="drawings-tab-footer-text">{t('Drawings are stored in the cloud')}</div>
        <div className="drawings-tab-footer-sub">
          {t('Download files for offline use on the jobsite. Ask the PM to upload new drawing sets.')}
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
                isCachedOffline={!!activeDrawingPath && !!downloadedDrawings[activeDrawingPath]}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
