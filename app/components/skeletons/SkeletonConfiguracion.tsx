'use client';

import Skeleton from './Skeleton';

export default function SkeletonConfiguracion() {
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <Skeleton variant="title" width={160} height={24} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width={180} height={14} />
        </div>
      </div>

      <div className="page-wrap" style={{ maxWidth: '680px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton variant="title" width={200} height={18} />

          <div className="cfg-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="fgroup" style={{ margin: 0 }}>
                <Skeleton width={110} height={12} style={{ marginBottom: 6 }} />
                <Skeleton variant="input" height={38} />
              </div>
            ))}
          </div>

          <div className="fgroup" style={{ margin: 0 }}>
            <Skeleton width={80} height={12} style={{ marginBottom: 6 }} />
            <Skeleton variant="input" height={38} />
          </div>

          <div className="fgroup" style={{ margin: 0 }}>
            <Skeleton width={90} height={12} style={{ marginBottom: 6 }} />
            <Skeleton variant="input" height={38} />
          </div>

          <div className="fgroup" style={{ margin: 0 }}>
            <Skeleton width={180} height={12} style={{ marginBottom: 6 }} />
            <Skeleton variant="input" height={38} />
          </div>

          <Skeleton variant="btn" width="100%" height={44} style={{ marginTop: 10 }} />
        </div>
      </div>
    </div>
  );
}
