'use client';

import Skeleton from './Skeleton';

export default function SkeletonDashboard() {
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <Skeleton variant="title" width={160} height={24} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width={220} height={14} />
        </div>
      </div>

      <div className="page-wrap">
        {/* 4 Stat Cards */}
        <div className="stats-row" style={{ marginBottom: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="stat-ri" style={{ marginBottom: 8 }}>
                <Skeleton variant="text" width={110} height={12} />
                <Skeleton width={32} height={32} borderRadius={8} />
              </div>
              <Skeleton variant="title" width={130} height={24} />
            </div>
          ))}
        </div>

        {/* Two Columns: Chart + Top Cuentas */}
        <div className="two-col" style={{ marginBottom: 14 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Skeleton variant="title" width={200} height={18} />
            <div style={{ height: 220, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '10px 0' }}>
              {[60, 85, 45, 90, 70, 95].map((h, idx) => (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Skeleton width="80%" height={`${h}%`} borderRadius={4} />
                  <Skeleton width={30} height={10} borderRadius={3} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Skeleton variant="title" width={160} height={18} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Skeleton width={20} height={20} borderRadius={4} />
                    <Skeleton width={130} height={14} borderRadius={4} />
                  </div>
                  <Skeleton width={80} height={14} borderRadius={4} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Balance Banner */}
        <div
          className="card"
          style={{
            marginTop: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '20px 24px',
          }}
        >
          <div>
            <Skeleton variant="text" width={90} height={12} style={{ marginBottom: 6 }} />
            <Skeleton variant="title" width={180} height={32} />
          </div>
          <Skeleton variant="btn" width={120} height={38} />
        </div>
      </div>
    </div>
  );
}
