'use client';

import Skeleton from './Skeleton';

export default function SkeletonMovimientos() {
  return (
    <div className="page active">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton variant="title" width={160} height={24} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width={220} height={14} />
        </div>
        <Skeleton variant="btn" width={100} height={36} />
      </div>

      <div className="page-wrap">
        {/* Year + Month Bar Skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <Skeleton width={80} height={36} borderRadius={8} />
          <div className="month-bar" style={{ display: 'flex', gap: '4px' }}>
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, idx) => (
              <Skeleton key={idx} width={42} height={30} borderRadius={6} />
            ))}
          </div>
        </div>

        {/* 3 Stats Row Skeleton */}
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card">
              <div className="stat-ri" style={{ marginBottom: 6 }}>
                <Skeleton variant="text" width={80} height={12} />
              </div>
              <Skeleton variant="title" width={120} height={22} />
            </div>
          ))}
        </div>

        {/* Table Card Skeleton */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="tabs" style={{ margin: 0 }}>
              <Skeleton width={60} height={32} borderRadius={6} style={{ marginRight: 6 }} />
              <Skeleton width={75} height={32} borderRadius={6} style={{ marginRight: 6 }} />
              <Skeleton width={65} height={32} borderRadius={6} />
            </div>
            <Skeleton width={80} height={14} />
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th><Skeleton width={60} height={12} /></th>
                  <th><Skeleton width={100} height={12} /></th>
                  <th><Skeleton width={140} height={12} /></th>
                  <th><Skeleton width={50} height={12} /></th>
                  <th><Skeleton width={80} height={12} /></th>
                  <th><Skeleton width={40} height={12} /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                  <tr key={row}>
                    <td><Skeleton width={70} height={12} /></td>
                    <td><Skeleton width={110} height={14} /></td>
                    <td><Skeleton width={`${60 + (row % 4) * 15}%`} height={12} /></td>
                    <td><Skeleton width={55} height={18} borderRadius={10} /></td>
                    <td><Skeleton width={85} height={14} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Skeleton width={26} height={26} borderRadius={4} />
                        <Skeleton width={26} height={26} borderRadius={4} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
