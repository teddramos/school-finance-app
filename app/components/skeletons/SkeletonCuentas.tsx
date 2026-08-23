'use client';

import Skeleton from './Skeleton';

export default function SkeletonCuentas() {
  return (
    <div className="page active">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton variant="title" width={140} height={24} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width={180} height={14} />
        </div>
        <Skeleton variant="btn" width={90} height={36} />
      </div>

      <div className="page-wrap">
        <div className="tabs" style={{ marginBottom: '12px' }}>
          <Skeleton width={70} height={32} borderRadius={6} style={{ marginRight: 6 }} />
          <Skeleton width={80} height={32} borderRadius={6} style={{ marginRight: 6 }} />
          <Skeleton width={75} height={32} borderRadius={6} />
        </div>

        <div className="three-col" style={{ marginTop: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 110 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
                  <Skeleton width={70} height={18} borderRadius={10} />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Skeleton width={28} height={26} borderRadius={4} />
                  <Skeleton width={28} height={26} borderRadius={4} />
                </div>
              </div>
              <Skeleton width="90%" height={12} style={{ marginTop: 4 }} />
              <Skeleton width="60%" height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
