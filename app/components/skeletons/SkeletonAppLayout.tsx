'use client';

import Skeleton from './Skeleton';

export default function SkeletonAppLayout() {
  return (
    <div className="app-wrap">
      {/* Sidebar Skeleton */}
      <aside className="sidebar" style={{ pointerEvents: 'none' }}>
        <div className="sb-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Skeleton variant="dark" width={38} height={38} borderRadius={10} />
          <div style={{ flex: 1 }}>
            <Skeleton variant="dark" width="70%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton variant="dark" width="50%" height={10} borderRadius={3} />
          </div>
        </div>
        <div className="sb-nav" style={{ marginTop: 20 }}>
          <div style={{ padding: '0 12px 8px' }}>
            <Skeleton variant="dark" width={60} height={10} borderRadius={3} />
          </div>
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 4,
              }}
            >
              <Skeleton variant="dark" width={22} height={22} borderRadius={6} />
              <Skeleton variant="dark" width={`${45 + (item % 3) * 15}%`} height={14} borderRadius={4} />
            </div>
          ))}
        </div>
      </aside>

      {/* Main Area Skeleton */}
      <div className="main-area">
        {/* Topbar Skeleton */}
        <header className="topbar topbar-desk" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width={32} height={32} borderRadius={8} />
            <Skeleton width={140} height={20} borderRadius={6} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Skeleton width={30} height={30} borderRadius="50%" />
            <Skeleton width={90} height={14} borderRadius={4} />
            <Skeleton width={60} height={24} borderRadius={12} />
          </div>
        </header>

        {/* Content Skeleton */}
        <div style={{ flex: 1 }}>
          <div className="page active">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Skeleton variant="title" width={180} height={24} style={{ marginBottom: 6 }} />
                <Skeleton variant="text" width={240} height={14} />
              </div>
              <Skeleton variant="btn" width={100} height={36} />
            </div>

            <div className="page-wrap">
              {/* Stat Cards Skeleton */}
              <div className="stats-row" style={{ marginBottom: 16 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-ri" style={{ marginBottom: 8 }}>
                      <Skeleton variant="text" width={100} height={12} />
                      <Skeleton width={32} height={32} borderRadius={8} />
                    </div>
                    <Skeleton variant="title" width={120} height={24} />
                  </div>
                ))}
              </div>

              {/* Main content cards skeleton */}
              <div className="two-col" style={{ marginBottom: 16 }}>
                <div className="card" style={{ height: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton variant="title" width={160} height={18} />
                  <Skeleton width="100%" height="100%" borderRadius={8} />
                </div>
                <div className="card" style={{ height: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton variant="title" width={140} height={18} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Skeleton width={120} height={16} />
                        <Skeleton width={70} height={16} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
