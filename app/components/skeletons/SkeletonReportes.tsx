'use client';

import Skeleton from './Skeleton';

export default function SkeletonReportes() {
  return (
    <div className="page active">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton variant="title" width={150} height={24} style={{ marginBottom: 6 }} />
          <Skeleton variant="text" width={180} height={14} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton variant="btn" width={90} height={36} />
          <Skeleton variant="btn" width={90} height={36} />
        </div>
      </div>

      <div className="page-wrap">
        {/* Year + Month Bar Skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Skeleton width={80} height={36} borderRadius={8} />
          <div className="month-bar" style={{ display: 'flex', gap: '4px' }}>
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, idx) => (
              <Skeleton key={idx} width={42} height={30} borderRadius={6} />
            ))}
          </div>
        </div>

        {/* Report Card */}
        <div className="card">
          {/* Institutional Header */}
          <div style={{ textAlign: 'center', paddingBottom: '18px', marginBottom: '18px', borderBottom: '3px solid var(--hc-gray-l)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Skeleton width={32} height={32} borderRadius="50%" />
            <Skeleton variant="title" width={240} height={24} />
            <Skeleton width={180} height={12} />
            <Skeleton width={150} height={12} />
            <Skeleton width={220} height={26} borderRadius={4} style={{ marginTop: 6 }} />
          </div>

          {/* Ingresos Section */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Skeleton width={20} height={16} borderRadius={3} />
              <Skeleton width={90} height={14} />
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th><Skeleton width={100} height={12} /></th>
                    <th><Skeleton width={150} height={12} /></th>
                    <th><Skeleton width={70} height={12} /></th>
                    <th style={{ textAlign: 'right' }}><Skeleton width={70} height={12} /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((row) => (
                    <tr key={row}>
                      <td><Skeleton width={110} height={14} /></td>
                      <td><Skeleton width={160} height={12} /></td>
                      <td><Skeleton width={65} height={12} /></td>
                      <td style={{ textAlign: 'right' }}><Skeleton width={80} height={14} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#e8f5ee', borderRadius: '0 0 7px 7px', marginTop: '1px' }}>
              <Skeleton width={120} height={14} />
              <Skeleton width={90} height={16} />
            </div>
          </div>

          {/* Gastos Section */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Skeleton width={20} height={16} borderRadius={3} />
              <Skeleton width={90} height={14} />
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th><Skeleton width={100} height={12} /></th>
                    <th><Skeleton width={150} height={12} /></th>
                    <th><Skeleton width={70} height={12} /></th>
                    <th style={{ textAlign: 'right' }}><Skeleton width={70} height={12} /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2].map((row) => (
                    <tr key={row}>
                      <td><Skeleton width={110} height={14} /></td>
                      <td><Skeleton width={160} height={12} /></td>
                      <td><Skeleton width={65} height={12} /></td>
                      <td style={{ textAlign: 'right' }}><Skeleton width={80} height={14} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--hc-red-l)', borderRadius: '0 0 7px 7px', marginTop: '1px' }}>
              <Skeleton width={120} height={14} />
              <Skeleton width={90} height={16} />
            </div>
          </div>

          {/* Balance Neto Banner */}
          <div style={{ background: '#e8f5ee', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width={130} height={18} />
            <Skeleton width={110} height={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
