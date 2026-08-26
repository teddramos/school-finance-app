'use client';

import { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import ReciboModal from './modals/ReciboModal';
import Skeleton from './skeletons/Skeleton';
import Paginator from './Paginator';

interface Padre { id: number; nombre: string; cedula: string; telefono: string; email: string; direccion: string; hijos: { nombre: string; grado: string }[]; descuentos?: { nombre: string; tipo: string; valor: number; activo: boolean }[] }
interface FacturaCubierta { id: number; periodo: string; monto: number; pagado: number; abono: number; estado: 'pagado' | 'parcial' | 'pendiente' }
interface PagoRaw { id: number; padreId: number; monto: number; fecha: string; forma: string; numRecibo: string; ref?: string; cardDigits?: string; obs?: string; usuario?: string; montoBase: number; descuentoPerfil: number; facturasCubiertas: FacturaCubierta[]; cargos: { nombre: string; monto: number }[]; descuentosAdicionales: { nombre: string; tipo: string; valor: number }[] }
interface Config { nombre: string; rif: string; direccion: string; telefono: string; email: string; director: string; tarifa: number; logo_url?: string }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const formatMoney = (v: number) => `RD$${v.toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const mesNombre = (p: string) => { const parts = p.trim().split('-'); return `${MESES[parseInt(parts[1],10)-1]} ${parts[0]}`; };
const authH = (): Record<string,string> => { const t=typeof window!=='undefined'?localStorage.getItem('token'):null; return t?{Authorization:`Bearer ${t}`}:{}; };
const FORMA_LABELS: Record<string,string> = { efectivo:'💵 Efectivo', transferencia:'🏦 Transferencia', tarjeta:'💳 Tarjeta', otro:'📋 Otro' };
const FORMA_COLORS: Record<string,{bg:string;color:string}> = { efectivo:{bg:'#e8f5ee',color:'#1b5e20'}, transferencia:{bg:'#e3f2fd',color:'#0d47a1'}, tarjeta:{bg:'#fff3e0',color:'#e65100'}, otro:{bg:'#f3e5f5',color:'#6a1b9a'} };

interface Props { refreshTrigger?: number }

export default function PagosView({ refreshTrigger = 0 }: Props) {
  const [pagos, setPagos] = useState<PagoRaw[]>([]);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [mesesDisponibles, setMesesDisponibles] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterForma, setFilterForma] = useState('todos');
  const [filterPadre, setFilterPadre] = useState('todos');
  const [filterMes, setFilterMes] = useState('todos');
  const [pagoSel, setPagoSel] = useState<(PagoRaw & { padre?: Padre; config?: Config }) | null>(null);
  const [expandedPago, setExpandedPago] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const h = authH();
    Promise.all([
      fetch('/api/padres', { credentials: 'same-origin', headers: h }).then(r => r.json()),
      fetch('/api/config', { credentials: 'same-origin', headers: h }).then(r => r.json()),
    ]).then(([p, c]) => { setPadres(p); setConfig(c); }).catch(() => {});
  }, []);

  const loadPagos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (filterForma !== 'todos') params.set('forma', filterForma);
      if (filterPadre !== 'todos') params.set('padreId', filterPadre);
      if (filterMes !== 'todos') params.set('mes', filterMes);
      const r = await fetch(`/api/pagos?${params}`, { credentials: 'same-origin', headers: authH() });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setPagos(data.data || []);
      setTotal(data.total || 0);
      setMesesDisponibles(data.meses || []);
    } catch { console.error('Error cargando pagos'); }
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch, filterForma, filterPadre, filterMes]);

  useEffect(() => { loadPagos(); }, [loadPagos, refreshTrigger]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterForma, filterPadre, filterMes, limit]);

  const padreMap = Object.fromEntries(padres.map(p => [p.id, p]));

  const totalMonto = pagos.reduce((s,p) => s+p.monto, 0);
  const totalFacturas = pagos.reduce((s,p) => s+p.facturasCubiertas.reduce((a,f) => a+f.abono, 0), 0);

  const printTable = () => {
    const win = window.open('','_blank','width=900,height=700');
    if(!win) return;
    const rows = pagos.map(p => {
      const pad = padreMap[p.padreId];
      const fc = p.facturasCubiertas?.map(f => `${mesNombre(f.periodo)}: ${f.abono>=f.monto-f.pagado?'Paga':'Abono '+formatMoney(f.abono)}`).join(', ') || 'N/A';
      return `<tr><td>${p.fecha}</td><td>${p.numRecibo}</td><td>${pad?.nombre||String(p.padreId)}</td><td>${FORMA_LABELS[p.forma]||p.forma}</td><td>${formatMoney(p.monto)}</td><td style="font-size:10px">${fc}</td><td>${p.usuario||'—'}</td></tr>`;
    }).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pagos</title>
    <style>body{font-family:Arial,sans-serif;margin:18px;font-size:11px}
    .h{text-align:center;border-bottom:2px solid #2e7d32;padding-bottom:10px;margin-bottom:12px}
    .h h2{color:#2e7d32;margin:0;font-size:18px}table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#e8f5ee;padding:6px 8px;text-align:left;border:1px solid #ccc;font-size:10px}
    td{padding:5px 8px;border:1px solid #ddd}tr.tot td{font-weight:bold;background:#f5f5f5}
    @media print{@page{size:landscape;margin:10mm}}</style></head><body>
    <div class="h"><div style="margin-bottom:5px">${config?.logo_url ? `<img src="${config.logo_url}" alt="Logo" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />` : '<span style="font-size:20px">🌿</span>'}</div><h2>${config?.nombre||''}</h2><div style="font-size:10px;color:#666">RIF: ${config?.rif||''} · ${config?.direccion||''} · ${config?.telefono||''}</div>
    <div style="margin-top:6px;font-weight:bold;color:#2e7d32">HISTORIAL DE PAGOS</div></div>
    <table><thead><tr><th>Fecha</th><th>N° Recibo</th><th>Padre / Tutor</th><th>Forma</th><th>Monto</th><th>Facturas afectadas</th><th>Registrado por</th></tr></thead><tbody>${rows}
    <tr class="tot"><td colspan="4">TOTAL — ${pagos.length} pago(s)</td><td>${formatMoney(totalMonto)}</td><td></td><td></td></tr>
    </tbody></table><div style="text-align:right;font-size:10px;color:#888;margin-top:8px">Generado: ${new Date().toLocaleDateString('es-DO')}</div>
    <script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    win.document.close();
  };

  const toExcel = () => {
    if(!config) return;
    const ws: any[][] = [
      [config.nombre], [`RIF: ${config.rif}`], [config.direccion], [config.telefono, config.email], [],
      ['HISTORIAL DE PAGOS'], [],
      ['FECHA','N° RECIBO','PADRE','CEDULA','FORMA','MONTO','FACTURAS AFECTADAS','DETALLE','REGISTRADO POR'],
    ];
    pagos.forEach(p => {
      const pad=padreMap[p.padreId];
      const fDesc = (p.facturasCubiertas||[]).map(f => {
        const label = f.abono >= Number(f.monto)-Number(f.pagado) ? 'PAGA' : 'Abono '+f.abono;
        return mesNombre(f.periodo)+': '+label;
      }).join('; ');
      const fResumen = (p.facturasCubiertas||[]).map(f => {
        const label = f.abono >= Number(f.monto)-Number(f.pagado) ? '(Pagada)' : '(Abono)';
        return mesNombre(f.periodo)+' '+label;
      }).join(', ');
      ws.push([p.fecha, p.numRecibo, pad?.nombre||String(p.padreId), pad?.cedula||'', FORMA_LABELS[p.forma]||p.forma, p.monto, fResumen, fDesc, p.usuario||'']);
    });
    ws.push([], [`Mostrando ${pagos.length} de ${total} pagos`]);
    ws.push([], [`Generado: ${new Date().toLocaleDateString('es-DO')}`]);
    const sheet = XLSX.utils.aoa_to_sheet(ws);
    sheet['!cols'] = [{wch:12},{wch:14},{wch:28},{wch:14},{wch:16},{wch:14},{wch:30},{wch:40},{wch:16}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Pagos');
    XLSX.writeFile(wb, `Pagos_${config.nombre.replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const openRecibo = (p: PagoRaw) => {
    const padre = padreMap[p.padreId];
    setPagoSel({ ...p, padre, config: config || undefined });
  };

  const toggleExpand = (id: number) => setExpandedPago(prev => prev === id ? null : id);

  const getFacturaStatusLabel = (fc: FacturaCubierta): { text: string; bg: string; fg: string } => {
    const totalPagado = Number(fc.pagado);
    const monto = Number(fc.monto);
    if (totalPagado >= monto) return { text: '✅ Factura pagada', bg: '#e8f5ee', fg: '#1b5e20' };
    if (totalPagado > 0) return { text: '⏳ Pago parcial', bg: '#fff3e0', fg: '#e65100' };
    return { text: '🔴 Pendiente', bg: '#ffebee', fg: '#c62828' };
  };

  if(loading && pagos.length === 0) return <div style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4].map(i=><div key={i} className="card"><Skeleton width="100%" height={36}/></div>)}</div>;

  return (
    <div>
      <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap',alignItems:'center'}}>
        <input className="inp" placeholder="Buscar padre, cédula o recibo..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:'240px'}}/>
        <select className="inp" value={filterForma} onChange={e=>setFilterForma(e.target.value)} style={{width:'auto'}}>
          <option value="todos">Todas las formas</option><option value="efectivo">💵 Efectivo</option><option value="transferencia">🏦 Transferencia</option><option value="tarjeta">💳 Tarjeta</option><option value="otro">📋 Otro</option>
        </select>
        <select className="inp" value={filterPadre} onChange={e=>setFilterPadre(e.target.value)} style={{width:'auto',maxWidth:'200px'}}>
          <option value="todos">Todos los padres</option>{padres.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className="inp" value={filterMes} onChange={e=>setFilterMes(e.target.value)} style={{width:'auto'}}>
          <option value="todos">Todos los meses</option>{mesesDisponibles.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
          <button className="btn btn-outline btn-sm" onClick={printTable} title="Imprimir listado">🖨️ Imprimir</button>
          <button className="btn btn-green btn-sm" onClick={toExcel} title="Exportar a Excel">📊 Excel</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'14px'}}>
        <div className="card" style={{padding:'10px 14px'}}><div style={{fontSize:'9px',fontWeight:700,color:'var(--hc-gray)',textTransform:'uppercase',marginBottom:'3px'}}>Total Cobrado</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:'16px',fontWeight:700,color:'var(--hc-green)'}}>{formatMoney(totalMonto)}</div></div>
        <div className="card" style={{padding:'10px 14px'}}><div style={{fontSize:'9px',fontWeight:700,color:'var(--hc-gray)',textTransform:'uppercase',marginBottom:'3px'}}>Aplicado a Facturas</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:'16px',fontWeight:700}}>{formatMoney(totalFacturas)}</div></div>
        <div className="card" style={{padding:'10px 14px'}}><div style={{fontSize:'9px',fontWeight:700,color:'var(--hc-gray)',textTransform:'uppercase',marginBottom:'3px'}}>Pagos Registrados</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:'16px',fontWeight:700}}>{total}</div></div>
      </div>

      <Paginator page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }} />

      <div className="card" style={{overflowX:'auto'}}>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th></th><th>Fecha</th><th>N° Recibo</th><th>Padre</th><th>Forma</th><th>Monto</th><th>Facturas cubiertas</th><th>Reg. por</th><th>Acc.</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} style={{textAlign:'center',color:'var(--hc-gray)',padding:'10px'}}>Cargando...</td></tr>}
              {!loading && pagos.length===0 && <tr><td colSpan={9} style={{textAlign:'center',color:'var(--hc-gray)',padding:'20px'}}>Sin pagos con los filtros seleccionados</td></tr>}
              {!loading && pagos.map(p => {
                const pad = padreMap[p.padreId];
                const fc = FORMA_COLORS[p.forma] || FORMA_COLORS.otro;
                const abonos = p.facturasCubiertas?.reduce((a,f) => a+f.abono, 0) || 0;
                const pagadas = p.facturasCubiertas?.filter(f => f.estado === 'pagado').length || 0;
                const parciales = p.facturasCubiertas?.filter(f => f.estado === 'parcial').length || 0;
                const isExpanded = expandedPago === p.id;
                return (
                  <>
                    <tr key={p.id} style={{cursor:'pointer'}} onClick={() => toggleExpand(p.id)}>
                      <td style={{width:'28px',textAlign:'center',color:'var(--hc-gray)',fontSize:'12px'}}>{isExpanded ? '▼' : '▶'}</td>
                      <td style={{whiteSpace:'nowrap'}}>{p.fecha}</td>
                      <td style={{fontFamily:'monospace',fontWeight:600}}>{p.numRecibo}</td>
                      <td style={{fontWeight:600}}>{pad?.nombre||`#${p.padreId}`}<br/><span style={{fontSize:'10px',color:'var(--hc-gray)'}}>{pad?.cedula}</span></td>
                      <td><span style={{background:fc.bg,color:fc.color,padding:'3px 10px',borderRadius:'10px',fontSize:'11px',fontWeight:600}}>{FORMA_LABELS[p.forma]||p.forma}</span></td>
                      <td style={{fontWeight:700,color:'var(--hc-green)'}}>{formatMoney(p.monto)}</td>
                      <td style={{fontSize:'11px'}}>
                        <strong>{p.facturasCubiertas?.length||0}</strong> período(s) · {formatMoney(abonos)}<br/>
                        {pagadas > 0 && <span style={{color:'var(--hc-green)',fontWeight:600}}>✅ {pagadas} pagada(s)</span>}
                        {pagadas > 0 && parciales > 0 && <span> · </span>}
                        {parciales > 0 && <span style={{color:'var(--hc-orange)',fontWeight:600}}>⏳ {parciales} parcial(es)</span>}
                      </td>
                      <td style={{fontSize:'12px'}}>{p.usuario||'—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-outline btn-sm" title="Ver recibo (copia)" onClick={(e) => { e.stopPropagation(); openRecibo(p); }}>👁️</button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${p.id}-detail`}>
                        <td colSpan={9} style={{padding:'0 12px 12px 12px',background:'#f9fdf7'}}>
                          <div style={{padding:'10px 0',borderTop:'1px solid #e8f5ee'}}>
                            <div style={{fontSize:'11px',fontWeight:700,color:'var(--hc-green)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.04em'}}>
                              📋 Detalle de distribución del pago — {formatMoney(p.monto)}
                            </div>
                            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                              <thead>
                                <tr>
                                  <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Período</th>
                                  <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Monto Factura</th>
                                  <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Ya pagado</th>
                                  <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Abono de este pago</th>
                                  <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Saldo después</th>
                                  <th style={{textAlign:'center',padding:'6px 8px',borderBottom:'2px solid #c5e5ce',fontSize:'10px',color:'var(--hc-gray)',fontWeight:700}}>Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(p.facturasCubiertas||[]).map(fc => {
                                  const monto = Number(fc.monto);
                                  const pagado = Number(fc.pagado);
                                  const abono = Number(fc.abono);
                                  const saldoDespues = pagado - abono;
                                  const wasAlreadyPaid = (pagado - abono) >= monto;
                                  const status = getFacturaStatusLabel({ ...fc, pagado: pagado - abono });
                                  return (
                                    <tr key={fc.id} style={{background: wasAlreadyPaid ? '#f5f5f5' : '#fff'}}>
                                      <td style={{padding:'6px 8px',fontWeight:600}}>{mesNombre(fc.periodo)}</td>
                                      <td style={{padding:'6px 8px',textAlign:'right'}}>{formatMoney(monto)}</td>
                                      <td style={{padding:'6px 8px',textAlign:'right',color:'var(--hc-gray)'}}>{formatMoney(pagado - abono)}</td>
                                      <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:'var(--hc-green)',fontSize:'13px'}}>
                                        {formatMoney(abono)}
                                      </td>
                                      <td style={{padding:'6px 8px',textAlign:'right',fontWeight:600}}>
                                        {formatMoney(Math.max(0, saldoDespues))}
                                      </td>
                                      <td style={{padding:'6px 8px',textAlign:'center'}}>
                                        <span style={{background:status.bg,color:status.fg,padding:'3px 10px',borderRadius:'10px',fontSize:'11px',fontWeight:700,whiteSpace:'nowrap'}}>
                                          {status.text}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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

      <ReciboModal isOpen={!!pagoSel} pago={pagoSel as any} copia={true} onClose={()=>setPagoSel(null)} />
    </div>
  );
}
