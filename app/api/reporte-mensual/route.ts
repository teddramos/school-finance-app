// app/api/reporte-mensual/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getColegioById, getReporteMensual } from '@/lib/db';

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let year = parseInt(searchParams.get('year') || '');
    let month = parseInt(searchParams.get('month') || '');

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const config = await getColegioById(session.colegioId!);
    const reporte = await getReporteMensual(session.colegioId!, year, month);

    return NextResponse.json({
      config: {
        nombre: config?.nombre || 'Colegio',
        rif: config?.rif || '',
        direccion: config?.direccion || '',
        telefono: config?.telefono || '',
        email: config?.email || '',
        director: config?.director || '',
        tarifa: Number(config?.tarifa ?? 1500),
        logo_url: config?.logo_url || '',
      },
      periodo: reporte.periodo,
      ingresos: reporte.ingresos,
      gastos: reporte.gastos,
      totalIngresos: reporte.totalIngresos,
      totalGastos: reporte.totalGastos,
      balance: reporte.balance,
    });
  } catch (error) {
    console.error('Error en /api/reporte-mensual:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
