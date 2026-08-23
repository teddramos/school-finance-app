'use client';

import Skeleton from './Skeleton';

export default function SkeletonUsuarios() {
  return (
    <div className="page active">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton variant="title" width={140} height={24} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width={180} height={14} />
        </div>
        <Skeleton variant="btn" width={95} height={36} />
      </div>

      <div className="page-wrap">
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th><Skeleton width={80} height={12} /></th>
                  <th><Skeleton width={120} height={12} /></th>
                  <th><Skeleton width={80} height={12} /></th>
                  <th><Skeleton width={140} height={12} /></th>
                  <th><Skeleton width={40} height={12} /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    <td><Skeleton width={70} height={20} borderRadius={4} /></td>
                    <td><Skeleton width={130} height={14} /></td>
                    <td><Skeleton width={90} height={20} borderRadius={10} /></td>
                    <td><Skeleton width={150} height={12} /></td>
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

        {/* Roles information card skeleton */}
        <div className="card" style={{ marginTop: '16px' }}>
          <Skeleton variant="title" width={160} height={18} style={{ marginBottom: 14 }} />
          <div className="three-col">
            {[1, 2, 3].map((col) => (
              <div key={col} style={{ background: 'var(--hc-cream)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width={110} height={16} />
                <Skeleton width="85%" height={12} />
                <Skeleton width="75%" height={12} />
                <Skeleton width="65%" height={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
