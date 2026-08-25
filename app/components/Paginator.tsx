'use client';

interface Props {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMITS = [10, 20, 30, 50];

export default function Paginator({ page, total, limit, onChange, onLimitChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',padding:'10px 0',fontSize:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',color:'var(--hc-gray)'}}>
        <span>Mostrando</span>
        <select className="inp" value={limit} onChange={e => onLimitChange(parseInt(e.target.value))} style={{width:'auto',padding:'3px 6px',fontSize:'12px'}}>
          {LIMITS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span>de <strong style={{color:'var(--hc-green)'}}>{total}</strong> registros</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(1)} title="Primera" style={{minWidth:'32px',padding:'4px 6px'}}>«</button>
        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} title="Anterior" style={{minWidth:'32px',padding:'4px 6px'}}>‹</button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} style={{padding:'0 4px',color:'var(--hc-gray)'}}>…</span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? 'btn-green' : 'btn-outline'}`}
              onClick={() => onChange(p)}
              style={{minWidth:'32px',padding:'4px 6px',fontWeight: p === page ? 700 : 400}}
            >{p}</button>
          )
        )}
        <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} title="Siguiente" style={{minWidth:'32px',padding:'4px 6px'}}>›</button>
        <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => onChange(totalPages)} title="Última" style={{minWidth:'32px',padding:'4px 6px'}}>»</button>
      </div>
    </div>
  );
}
