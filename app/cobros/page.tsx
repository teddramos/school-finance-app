// app/cobros/page.tsx
'use client';

import { useState } from 'react';
import CobrosCaja from '@/components/CobrosCaja';
import CobrosPadres from '@/components/CobrosPadres';
import RepCobros from '@/components/RepCobros';
import CobroModal from '@/components/modals/CobroModal';
import ReciboModal from '@/components/modals/ReciboModal'; // asegúrate de la ruta correcta

export default function CobrosPage() {
  const [activeTab, setActiveTab] = useState<'caja' | 'padres' | 'rep-cobros'>('caja');
  const [cobroModalOpen, setCobroModalOpen] = useState(false);
  const [selectedPadreId, setSelectedPadreId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reciboData, setReciboData] = useState<any>(null);
  const [showReciboModal, setShowReciboModal] = useState(false);

  const handleOpenCobroModal = (padreId: number) => {
    setSelectedPadreId(padreId);
    setCobroModalOpen(true);
  };

  const handleCobroSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setCobroModalOpen(false);
  };

  const handlePaymentSuccess = (pagoData: any) => {
    setReciboData(pagoData);
    setShowReciboModal(true);
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2>💳 Cobros / Caja</h2>
          <p>Mensualidades, padres y pagos</p>
        </div>
      </div>
      <div className="page-wrap">
        <div className="tabs" style={{ marginBottom: '16px' }}>
          <button className={`tab ${activeTab === 'caja' ? 'active' : ''}`} onClick={() => setActiveTab('caja')}>🏧 Caja</button>
          <button className={`tab ${activeTab === 'padres' ? 'active' : ''}`} onClick={() => setActiveTab('padres')}>👨‍👧‍👦 Padres / Hijos</button>
          <button className={`tab ${activeTab === 'rep-cobros' ? 'active' : ''}`} onClick={() => setActiveTab('rep-cobros')}>📊 Reporte Cobros</button>
        </div>

        {activeTab === 'caja' && <CobrosCaja key={refreshKey} onOpenCobroModal={handleOpenCobroModal} />}
        {activeTab === 'padres' && <CobrosPadres key={refreshKey} onOpenCobroModal={handleOpenCobroModal} />}
        {activeTab === 'rep-cobros' && <RepCobros key={refreshKey} />}
      </div>

      {/* Modal de cobro */}
      <CobroModal
        isOpen={cobroModalOpen}
        padreId={selectedPadreId}
        onClose={() => setCobroModalOpen(false)}
        onSuccess={handleCobroSuccess}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Modal de recibo */}
      <ReciboModal
        isOpen={showReciboModal}
        pago={reciboData}
        onClose={() => setShowReciboModal(false)}
      />
    </div>
  );
}