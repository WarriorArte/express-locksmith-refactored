import React, { useState } from 'react';
import { Download, Share2, Printer, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Utilidad para cargar scripts dinámicamente (html-to-image y jspdf)
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Fallo al cargar el script: ${src}`));
    document.body.appendChild(script);
  });
};

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const ticketData = {
    empresa: "MI TIENDA APP",
    direccion: "Av. Principal #123\nCiudad, País",
    fecha: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    folio: "TKT-000456",
    articulos: [
      { cant: 1, desc: "Café Americano", precio: 25.00 },
      { cant: 2, desc: "Pan de Elote", precio: 30.00 },
      { cant: 1, desc: "Botella de Agua", precio: 15.00 },
      { cant: 1, desc: "Galleta Choco", precio: 10.00 }
    ],
    total: 110.00,
  };

  const showMessage = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Generar y manejar el PDF usando html-to-image (Alternativa moderna y nativa soportada por el entorno)
  const handlePdfAction = async (action) => {
    setIsProcessing(true);
    try {
      if (!window.htmlToImage) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js');
      }
      if (!window.jspdf) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }

      const ticketElement = document.getElementById('ticket-content');
      
      // html-to-image usa el motor nativo del navegador para tomar una captura vectorial
      const imgData = await window.htmlToImage.toPng(ticketElement, { 
        pixelRatio: 4, // Multiplicador para alta resolución
        backgroundColor: '#ffffff',
        style: {
          margin: '0', 
        }
      });
      
      const { jsPDF } = window.jspdf;
      
      const rect = ticketElement.getBoundingClientRect();
      const pdfWidth = 58; 
      const pdfHeight = (rect.height * pdfWidth) / rect.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `ticket-${ticketData.folio}.pdf`;

      if (action === 'download') {
        pdf.save(fileName);
        showMessage("Ticket descargado exitosamente.");
      } 
      else if (action === 'share') {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Ticket de Compra',
            text: 'Aquí tienes el comprobante de tu compra.',
          });
          showMessage("Compartido exitosamente.");
        } else {
          showMessage("Tu navegador no soporta compartir archivos PDF de forma nativa. Descárgalo en su lugar.", "error");
        }
      }
    } catch (error) {
      console.error("Error al procesar PDF:", error);
      showMessage("Ocurrió un error al generar el PDF.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 font-sans relative">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #ticket-wrapper, #ticket-wrapper * { visibility: visible; }
            #ticket-wrapper { position: absolute; left: 0; top: 0; width: 58mm; margin: 0; padding: 0; }
            @page { size: 58mm auto; margin: 0; }
          }
        `}
      </style>

      {toastMessage && (
        <div className={`fixed top-5 right-5 flex items-center gap-2 px-4 py-3 rounded shadow-lg z-50 text-white transition-opacity duration-300 ${toastMessage.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
          {toastMessage.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-6 print:hidden">Módulo de Ticket de Alta Precisión</h1>

      {/* Vista previa en DOM */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 print:border-none print:shadow-none print:p-0">
        <div id="ticket-wrapper" className="flex justify-center">
          <div 
            id="ticket-content"
            style={{ 
              width: '260px', 
              backgroundColor: '#ffffff', color: '#000000',
              fontFamily: 'monospace, "Courier New", Courier', fontSize: '12px', lineHeight: '1.4',
              padding: '20px', boxSizing: 'border-box'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <h2 style={{ fontWeight: 'bold', fontSize: '14px', margin: '0' }}>{ticketData.empresa}</h2>
              <p style={{ whiteSpace: 'pre-line', margin: '4px 0 0 0' }}>{ticketData.direccion}</p>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', marginBottom: '8px' }}></div>
            
            <div style={{ marginBottom: '8px', textAlign: 'left' }}>
              <p style={{ margin: '0' }}>Fecha: {ticketData.fecha}</p>
              <p style={{ margin: '0' }}>Folio: {ticketData.folio}</p>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', marginBottom: '8px' }}></div>

            <div style={{ width: '100%', marginBottom: '8px' }}>
              <div style={{ display: 'flex', borderBottom: '1px dashed #000000', paddingBottom: '4px', marginBottom: '6px' }}>
                <div style={{ width: '35px', fontWeight: 'bold', textAlign: 'left' }}>CANT</div>
                <div style={{ flex: 1, paddingLeft: '5px', fontWeight: 'bold', textAlign: 'left' }}>DESC</div>
                <div style={{ width: '55px', fontWeight: 'bold', textAlign: 'right' }}>IMP</div>
              </div>
              
              {ticketData.articulos.map((item, index) => (
                <div key={index} style={{ display: 'flex', marginBottom: '4px' }}>
                  <div style={{ width: '35px' }}>{item.cant}</div>
                  <div style={{ flex: 1, paddingLeft: '5px', paddingRight: '5px', wordBreak: 'break-word' }}>{item.desc}</div>
                  <div style={{ width: '55px', textAlign: 'right' }}>${(item.cant * item.precio).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px dashed #000000', marginBottom: '8px' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>
              <span>TOTAL:</span>
              <span>${ticketData.total.toFixed(2)}</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0' }}>¡Gracias por su compra!</p>
              <p style={{ margin: '4px 0 0 0' }}>Vuelva pronto</p>
            </div>
            <div style={{ height: '10px' }}></div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg shadow transition-colors"
        >
          <Printer size={18} />
          Imprimir 58mm
        </button>

        <button
          onClick={() => handlePdfAction('download')}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-lg shadow transition-colors"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Descargar PDF
        </button>

        <button
          onClick={() => handlePdfAction('share')}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-2.5 rounded-lg shadow transition-colors"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
          Compartir
        </button>
      </div>

    </div>
  );
}