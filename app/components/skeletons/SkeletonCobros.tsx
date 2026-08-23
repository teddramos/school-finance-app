'use client';

import Skeleton from './Skeleton';

export function SkeletonPadresGrid() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <Skeleton variant="input" width={280} height={38} />
        <Skeleton variant="btn" width={130} height={38} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="padre-card" style={{ border: '1px solid var(--hc-gray-l)', background: 'white' }}>
            <div className="padre-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Skeleton width={36} height={36} borderRadius="50%" />
                <div>
                  <Skeleton width={120} height={14} style={{ marginBottom: 4 }} />
                  <Skeleton width={80} height={10} />
                </div>
              </div>
              <Skeleton width={60} height={20} borderRadius={10} />
            </div>

            <div className="padre-card-body" style={{ padding: '12px 14px' }}>
              <div style={{ marginBottom: '8px' }}>
                <Skeleton width={60} height={10} style={{ marginBottom: 6 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <Skeleton width={75} height={20} borderRadius={12} />
                  <Skeleton width={65} height={20} borderRadius={12} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <Skeleton width={65} height={10} style={{ marginBottom: 4 }} />
                  <Skeleton width={90} height={16} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Skeleton width={45} height={10} style={{ marginBottom: 4 }} />
                  <Skeleton width={80} height={16} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                <Skeleton variant="btn" style={{ flex: 1 }} height={30} />
                <Skeleton variant="btn" width={32} height={30} />
                <Skeleton variant="btn" width={32} height={30} />
                <Skeleton variant="btn" width={32} height={30} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCobrosCaja() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card">
        <Skeleton variant="title" width={160} height={18} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton variant="input" style={{ flex: 1 }} height={40} />
          <Skeleton variant="btn" width={100} height={40} />
        </div>
      </div>
    </div>
  );
}

export default function SkeletonCobros() {
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <Skeleton variant="title" width={180} height={24} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width={220} height={14} />
        </div>
      </div>
      <div className="page-wrap">
        <div className="tabs" style={{ marginBottom: '16px' }}>
          <Skeleton width={80} height={34} borderRadius={6} style={{ marginRight: 6 }} />
          <Skeleton width={120} height={34} borderRadius={6} style={{ marginRight: 6 }} />
          <Skeleton width={130} height={34} borderRadius={6} />
        </div>

        <SkeletonPadresGrid />
      </div>
    </div>
  );
}
