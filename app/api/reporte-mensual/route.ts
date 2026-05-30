// app/api/reporte-mensual/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import {
  getConfig,
  getMovimientos,
  getCuentas,
} from '@/lib/db';

// Helper para obtener usuario autenticado
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = await verifyJWT(token);
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
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

    const periodo = `${year}-${String(month).padStart(2, '0')}`;
    const movimientos = getMovimientos().filter(m => m.periodo === periodo);
    const cuentas = getCuentas();
    const config = getConfig();

    // Enriquecer movimientos con nombre de cuenta
    const movsConCuenta = movimientos.map(m => ({
      ...m,
      cuentaNombre: cuentas.find(c => c.id === m.cuentaId)?.nombre || 'Cuenta eliminada',
    }));

    const ingresos = movsConCuenta.filter(m => m.tipo === 'ingreso');
    const gastos = movsConCuenta.filter(m => m.tipo === 'gasto');

    const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0);
    const totalGastos = gastos.reduce((sum, m) => sum + m.monto, 0);
    const balance = totalIngresos - totalGastos;

    return NextResponse.json({
      config: {
        nombre: config.nombre || 'Colegio Las Palmas',
        rif: config.rif || '',
        direccion: config.direccion || '',
        telefono: config.telefono || '',
        email: config.email || '',
        director: config.director || '',
        tarifa: config.tarifa || 1500,
      },
      periodo,
      ingresos,
      gastos,
      totalIngresos,
      totalGastos,
      balance,
    });
  } catch (error) {
    console.error('Error en /api/reporte-mensual:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}