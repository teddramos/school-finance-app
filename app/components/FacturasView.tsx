'use client';

import { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Skeleton from './skeletons/Skeleton';
import Paginator from './Paginator';

interface Padre { id: number; nombre: string; cedula: string; hijos: { nombre: string; grado: string }[] }
interface Factura { id: number; padreId: number; periodo: string; monto: number; pagado: number; estado: 'pendiente' | 'parcial' | 'pagado' }
interface Config { nombre: string; rif: string; direccion: string; telefono: string; email: string; tarifa: number }
interface PagoResumen { pagoId: number; numRecibo: string; fecha: string; abono: number; forma: string; usuario?: string }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const formatMoney = (v: number) => `RD$${v.toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const authH = (): Record<string,string> => { const t=typeof window!=='undefined'?localStorage.getItem('token'):null; return t?{Authorization:`Bearer ${t}`}:{}; };
const mesNombre = (p: string) => `${MESES[parseInt(p.split('-')[1],10)-1]} ${p.split('-')[0]}`;
const ESTADO_COLORS: Record<string,{bg:string;color:string}> = { pagado:{bg:'#e8f5ee',color:'#1b5e20'}, parcial:{bg:'#fff3e0',color:'#e65100'}, pendiente:{bg:'#ffebee',color:'#c62828'} };
const FORMA_LABELS: Record<string,string> = { efectivo:'💵', transferencia:'🏦', tarjeta:'💳', otro:'📋' };

interface Props { refreshTrigger?: number }

export default function FacturasView({ refreshTrigger = 0 }: Props) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterPeriodo, setFilterPeriodo] = useState('todos');
  const [filterPadre, setFilterPadre] = useState('todos');
  const [previewFactura, setPreviewFactura] = useState<{ factura: Factura; padre: Padre } | null>(null);
  const [expandedFactura, setExpandedFactura] = useState<number | null>(null);
  const [pagosExpandido, setPagosExpandido] = useState<PagoResumen[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load padres + config once
  useEffect(() => {
    const h = authH();
    Promise.all([
      fetch('/api/padres', { credentials: 'same-origin', headers: h }).then(r => r.json()),
      fetch('/api/config', { credentials: 'same-origin', headers: h }).then(r => r.json()),
    ]).then(([p, c]) => { setPadres(p); setConfig(c); }).catch(() => {});
  }, []);

  const loadFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (filterEstado !== 'todos') params.set('estado', filterEstado === 'pendiente' ? 'pending' : filterEstado);
      if (filterPeriodo !== 'todos') params.set('padreId', '0');
      if (filterPadre !== 'todos') params.set('padreId', filterPadre);
      const r = await fetch(`/api/facturas?${params}`, { credentials: 'same-origin', headers: authH() });
      if (!r.ok) throw new Error();
      const data = await r.json();
      let items: Factura[] = data.data || [];
      // Client-side filter for periodo (API doesn't support it yet)
      if (filterPeriodo !== 'todos') items = items.filter((f: Factura) => f.periodo === filterPeriodo);
      setFacturas(items);
      setTotal(data.total || 0);
      setPeriodos(data.periodos || []);
    } catch { console.error('Error cargando facturas'); }
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch, filterEstado, filterPeriodo, filterPadre]);

  useEffect(() => { loadFacturas(); }, [loadFacturas, refreshTrigger]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterEstado, filterPeriodo, filterPadre, limit]);

  const padreMap = Object.fromEntries(padres.map(p => [p.id, p]));

  // Load pagos for expanded factura
  const loadPagosFactura = async (facturaId: number) => {
    if (expandedFactura === facturaId) { setExpandedFactura(null); return; }
    setExpandedFactura(facturaId);
    setCargandoPagos(true);
    try {
      const r = await fetch(`/api/pagos?facturaId=${facturaId}&limit=9999`, { credentials: 'same-origin', headers: authH() });
      if (!r.ok) return;
      const data = await r.json();
      const pagosData = data.data || [];
      const list: PagoResumen[] = [];
      for (const pago of pagosData) {
        const fc = (pago.facturasCubiertas || []).find((f: any) => f.id === facturaId);
        if (fc) list.push({ pagoId: pago.id, numRecibo: pago.numRecibo, fecha: pago.fecha, abono: Number(fc.abono), forma: pago.forma, usuario: pago.usuario });
      }
      list.sort((a, b) => a.fecha.localeCompare(b.fecha));
      setPagosExpandido(list);
    } catch { setPagosExpandido([]); }
    finally { setCargandoPagos(false); }
  };

  const printFactura = (f: Factura, padre: Padre, pagosFactura: PagoResumen[]) => {
    const win = window.open('','_blank','width=700,height=700');
    if(!win){ alert('Permite ventanas emergentes para imprimir.'); return; }
    const pend = f.monto - f.pagado;
    const estLabel = f.estado==='pagado'?'Pagado':f.estado==='parcial'?'Parcial':'Pendiente';
    const pr = pagosFactura.length > 0
      ? pagosFactura.map(pf => `<tr><td>${pf.fecha}</td><td>${pf.numRecibo}</td><td style="text-align:right">${formatMoney(pf.abono)}</td><td>${FORMA_LABELS[pf.forma]||pf.forma}</td></tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:#888">Sin pagos registrados</td></tr>';

    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Factura ${mesNombre(f.periodo)}</title>
    <style>body{font-family:Arial,sans-serif;color:#222;margin:24px;max-width:680px;margin:0 auto}
    .enc{text-align:center;border-bottom:3px solid #2e7d32;padding-bottom:12px;margin-bottom:16px}
    .enc-n{font-size:20px;font-weight:bold;color:#2e7d32}.enc-d{font-size:10px;color:#666}
    .badge{display:inline-block;padding:4px 14px;border-radius:4px;font-size:11px;font-weight:700;color:white;margin-top:6px}
    .badge.pago{background:#2e7d32}.badge.parc{background:#e65100}.badge.pend{background:#c62828}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}
    th{background:#e8f5ee;text-align:left;padding:8px;border:1px solid #ccc;font-size:11px}
    td{padding:8px;border:1px solid #ddd}
    .row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:14px 0}
    .box{background:#f7f7f2;border-radius:8px;padding:12px;font-size:12px}
    .tot{background:#2e7d32;color:white;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;margin:16px 0}
    .tot span{font-size:22px;font-weight:bold;color:#c9a84c}
    .firma{text-align:center;border-top:1px solid #333;padding-top:8px;font-size:10px;color:#666}
    .footer{text-align:center;font-size:10px;color:#666;border-top:1px solid #eee;padding-top:10px;margin-top:18px}
    @media print{body{margin:12px}@page{margin:12mm}}</style></head><body>
    <div class="enc"><div style="font-size:28px">🌿</div><div class="enc-n">${config?.nombre||'Colegio'}</div>
    <div class="enc-d">${config?.rif||''} · ${config?.direccion||''}</div><div class="enc-d">${config?.telefono||''} · ${config?.email||''}</div>
    <div class="badge ${f.estado==='pagado'?'pago':f.estado==='parcial'?'parc':'pend'}">FACTURA — ${estLabel.toUpperCase()}</div></div>
    <div class="row2"><div class="box"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px">Período</div><div style="font-size:16px;font-weight:700">${mesNombre(f.periodo)}</div></div>
    <div class="box"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px">Fecha de Emisión</div><div style="font-size:16px;font-weight:700">${new Date().toLocaleDateString('es-DO')}</div></div></div>
    <div class="box" style="margin-bottom:14px"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px">Padre / Tutor</div>
    <table style="width:100%;border:none;font-size:12px;margin:0"><tr><td style="border:none;padding:2px 0;width:35%;color:#888">Nombre:</td><td style="border:none;padding:2px 0;font-weight:700">${padre.nombre}</td></tr>
    <tr><td style="border:none;padding:2px 0;color:#888">Cédula:</td><td style="border:none;padding:2px 0;font-weight:700">${padre.cedula||'—'}</td></tr>
    <tr><td style="border:none;padding:2px 0;color:#888">Hijos:</td><td style="border:none;padding:2px 0;font-weight:700">${padre.hijos.map(h=>h.nombre).join(', ')||'—'}</td></tr></table></div>
    <table><thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead><tbody>
    <tr><td>Mensualidad escolar — ${mesNombre(f.periodo)}<br><span style="font-size:10px;color:#888">${padre.hijos.length} alumno(s) × ${formatMoney(config?.tarifa||1500)}/mes</span></td><td style="text-align:right;font-weight:700">${formatMoney(f.monto)}</td></tr>
    <tr><td>Ya pagado</td><td style="text-align:right;font-weight:700;color:#2e7d32">-${formatMoney(f.pagado)}</td></tr>
    </tbody></table>
    <div class="tot"><span style="font-size:14px">PENDIENTE</span><span>${formatMoney(pend)}</span></div>
    ${pagosFactura.length > 0 ? `<div style="margin-top:16px;border-top:2px solid #e8f5ee;padding-top:12px">
      <div style="font-size:13px;font-weight:700;color:#2e7d32;margin-bottom:8px">📋 Pagos recibidos en esta factura</div>
      <table><thead><tr><th>Fecha</th><th>N° Recibo</th><th style="text-align:right">Abono</th><th>Forma</th></tr></thead><tbody>${pr}</tbody></table></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:20px"><div class="firma">Firma del Director</div><div class="firma">Firma del Padre / Tutor</div></div>
    <div class="footer"><strong style="color:#2e7d32">${config?.nombre||''}</strong> · ${config?.direccion||''}<br>Tel: ${config?.telefono||''}<br><em>Esta factura detalla la mensualidad escolar del período indicado.</em></div>
    <script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    win.document.close();
  };

  const toExcel = () => {
    if(!config) return;
    const ws: any[][] = [
      [config.nombre], [`RIF: ${config.rif}`], [config.direccion], [config.telefono, config.email], [],
      ['LISTADO DE FACTURAS'], [],
      ['PERÍODO','PADRE','CEDULA','HIJOS','FACTURA','PAGADO','PENDIENTE','ESTADO'],
    ];
    facturas.forEach(f => { const p=padreMap[f.padreId]; const est=f.estado==='pagado'?'Pagado':f.estado==='parcial'?'Parcial':'Pendiente';
      ws.push([f.periodo, p?.nombre||String(f.padreId), p?.cedula||'', p?.hijos.length||0, f.monto, f.pagado, f.monto-f.pagado, est]); });
    ws.push([], [`Mostrando ${facturas.length} de ${total} facturas`]);
    ws.push([], [`Generado: ${new Date().toLocaleDateString('es-DO')}`]);
    const sheet = XLSX.utils.aoa_to_sheet(ws);
    sheet['!cols'] = [{wch:12},{wch:28},{wch:14},{wch:7},{wch:14},{wch:14},{wch:14},{wch:10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Facturas');
    XLSX.writeFile(wb, `Facturas_${config.nombre.replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if(loading && facturas.length === 0) return <div style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4].map(i=><div key={i} className="card"><Skeleton width="100%" height={36}/></div>)}</div>;

  return (
    <div>
      <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap',alignItems:'center'}}>
        <input className="inp" placeholder="Buscar padre..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:'220px'}}/>
        <select className="inp" value={filterEstado} onChange={e=>setFilterEstado(e.target.value)} style={{width:'auto'}}>
          <option value="todos">Todos los estados</option><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="pagado">Pagado</option>
        </select>
        <select className="inp" value={filterPeriodo} onChange={e=>setFilterPeriodo(e.target.value)} style={{width:'auto'}}>
          <option value="todos">Todos los períodos</option>{periodos.map(p=><option key={p} value={p}>{mesNombre(p)}</option>)}
        </select>
        <select className="inp" value={filterPadre} onChange={e=>setFilterPadre(e.target.value)} style={{width:'auto',maxWidth:'200px'}}>
          <option value="todos">Todos los padres</option>{padres.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
          <button className="btn btn-green btn-sm" onClick={toExcel} title="Exportar a Excel">📊 Excel</button>
        </div>
      </div>

      <Paginator page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }} />

      <div className="card" style={{overflowX:'auto'}}>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th style={{width:'28px'}}></th><th>Período</th><th>Padre</th><th>Hijos</th><th>Factura</th><th>Pagado</th><th>Pendiente</th><th>Estado</th><th>Acc.</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} style={{textAlign:'center',color:'var(--hc-gray)',padding:'10px'}}>Cargando...</td></tr>}
              {!loading && facturas.length===0 && <tr><td colSpan={9} style={{textAlign:'center',color:'var(--hc-gray)',padding:'20px'}}>Sin facturas con los filtros seleccionados</td></tr>}
              {!loading && facturas.map(f => {
                const p = padreMap[f.padreId]; const pend=f.monto-f.pagado;
                const est=f.estado==='pagado'?'Pagado':f.estado==='parcial'?'Parcial':'Pendiente';
                const ec=ESTADO_COLORS[f.estado]||ESTADO_COLORS.pendiente;
                const isExpanded = expandedFactura === f.id;
                return (
                  <>
                    <tr key={f.id} style={{cursor:'pointer'}} onClick={() => loadPagosFactura(f.id)}>
                      <td style={{textAlign:'center',color:'var(--hc-gray)',fontSize:'12px'}}>{isExpanded ? '▼' : '▶'}</td>
                      <td style={{fontWeight:600}}>{mesNombre(f.periodo)}</td>
                      <td>{p?.nombre||`#${f.padreId}`}<br/><span style={{fontSize:'10px',color:'var(--hc-gray)'}}>{p?.cedula}</span></td>
                      <td style={{textAlign:'center'}}>{p?.hijos.length||'—'}</td>
                      <td>{formatMoney(f.monto)}</td>
                      <td style={{color:'var(--hc-green)'}}>{formatMoney(f.pagado)}</td>
                      <td style={{color:pend>0?'var(--hc-red)':'var(--hc-green)',fontWeight:600}}>{formatMoney(pend)}</td>
                      <td><span style={{background:ec.bg,color:ec.color,padding:'3px 10px',borderRadius:'10px',fontSize:'11px',fontWeight:700}}>{est}</span></td>
                      <td onClick={e=>e.stopPropagation()}>
                        <button className="btn btn-outline btn-sm" title="Imprimir factura" onClick={() => { setPagosExpandido([]); loadPagosFactura(f.id).then(() => p && setPreviewFactura({factura:f,padre:p})); }}>🖨️</button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${f.id}-pagos`}>
                        <td colSpan={9} style={{padding:'0 12px 12px 12px',background:'#f9fdf7'}}>
                          <div style={{padding:'10px 0',borderTop:'1px solid #e8f5ee'}}>
                            {cargandoPagos ? (
                              <div style={{textAlign:'center',color:'var(--hc-gray)',fontSize:'12px',padding:'8px'}}>Cargando pagos...</div>
                            ) : pagosExpandido.length === 0 ? (
                              <div style={{fontSize:'12px',color:'var(--hc-gray)',fontStyle:'italic',padding:'8px'}}>Sin pagos registrados para esta factura</div>
                            ) : (
                              <>
                                <div style={{fontSize:'11px',fontWeight:700,color:'var(--hc-green)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.04em'}}>
                                  📋 Pagos recibidos — Total abonado: {formatMoney(pagosExpandido.reduce((s,pf)=>s+pf.abono,0))} de {formatMoney(f.monto)}
                                </div>
                                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                                  <thead><tr>
                                    <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Fecha</th>
                                    <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>N° Recibo</th>
                                    <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Abono</th>
                                    <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Forma</th>
                                    <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Registrado por</th>
                                    <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Acumulado</th>
                                  </tr></thead>
                                  <tbody>
                                    {pagosExpandido.map((pf, idx) => {
                                      const acumulado = pagosExpandido.slice(0, idx+1).reduce((s, x) => s + x.abono, 0);
                                      return (
                                        <tr key={pf.pagoId} style={{background: idx === pagosExpandido.length - 1 ? '#e8f5ee' : 'transparent'}}>
                                          <td style={{padding:'6px 8px'}}>{pf.fecha}</td>
                                          <td style={{padding:'6px 8px',fontFamily:'monospace',fontWeight:600}}>{pf.numRecibo}</td>
                                          <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:'var(--hc-green)'}}>{formatMoney(pf.abono)}</td>
                                          <td style={{padding:'6px 8px'}}>{FORMA_LABELS[pf.forma]||pf.forma}</td>
                                          <td style={{padding:'6px 8px',fontSize:'11px',color:'var(--hc-gray)'}}>{pf.usuario||'—'}</td>
                                          <td style={{padding:'6px 8px',textAlign:'right',fontWeight:600,color:acumulado>=f.monto?'var(--hc-green)':'var(--hc-orange)'}}>{formatMoney(acumulado)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Paginator page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }} />

      {previewFactura && (
        <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setPreviewFactura(null)}}>
          <div className="modal modal-lg">
            <div className="modal-head">
              <h3>🧾 Factura — {mesNombre(previewFactura.factura.periodo)}</h3>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <button className="btn btn-green btn-sm" onClick={() => printFactura(previewFactura.factura, previewFactura.padre, pagosExpandido)}>🖨️ Imprimir</button>
                <button className="modal-close" onClick={()=>setPreviewFactura(null)} title="Cerrar">×</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'14px'}}>
              <div className="card" style={{padding:'10px'}}><div style={{fontSize:'9px',fontWeight:700,color:'var(--hc-gray)',textTransform:'uppercase'}}>Factura</div><div style={{fontWeight:700,fontSize:'15px'}}>{formatMoney(previewFactura.factura.monto)}</div></div>
              <div className="card" style={{padding:'10px'}}><div style={{fontSize:'9px',fontWeight:700,color:'var(--hc-gray)',textTransform:'uppercase'}}>Pagado</div><div style={{fontWeight:700,fontSize:'15px',color:'var(--hc-green)'}}>{formatMoney(previewFactura.factura.pagado)}</div></div>
              <div className="card" style={{padding:'10px'}}><div style={{fontSize:'9px',fontWeight:700,color:'var(--hc-gray)',textTransform:'uppercase'}}>Pendiente</div><div style={{fontWeight:700,fontSize:'15px',color:previewFactura.factura.monto-previewFactura.factura.pagado>0?'var(--hc-red)':'var(--hc-green)'}}>{formatMoney(previewFactura.factura.monto-previewFactura.factura.pagado)}</div></div>
            </div>
            <div style={{background:'var(--hc-cream)',borderRadius:'8px',padding:'12px',fontSize:'12px',marginBottom:'12px'}}>
              <strong>Padre:</strong> {previewFactura.padre.nombre} · {previewFactura.padre.cedula}<br/>
              <strong>Hijos:</strong> {previewFactura.padre.hijos.map(h=>h.nombre).join(', ')||'—'}
            </div>
            {pagosExpandido.length > 0 && (
              <div style={{marginBottom:'12px'}}>
                <div style={{fontSize:'11px',fontWeight:700,color:'var(--hc-green)',marginBottom:'6px'}}>📋 Pagos recibidos:</div>
                <div className="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Recibo</th><th>Abono</th><th>Forma</th></tr></thead><tbody>
                  {pagosExpandido.map(pf => (<tr key={pf.pagoId}><td>{pf.fecha}</td><td style={{fontFamily:'monospace',fontWeight:600}}>{pf.numRecibo}</td><td style={{fontWeight:700,color:'var(--hc-green)'}}>{formatMoney(pf.abono)}</td><td>{FORMA_LABELS[pf.forma]||pf.forma}</td></tr>))}
                </tbody></table></div>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'flex-end',gap:'8px'}}>
              <button className="btn btn-outline" onClick={()=>setPreviewFactura(null)}>Cerrar</button>
              <button className="btn btn-green" onClick={() => printFactura(previewFactura.factura, previewFactura.padre, pagosExpandido)}>🖨️ Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
