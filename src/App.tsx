import React, { useState } from 'react';
import { Plus, Trash2, ArrowRight, Settings, Download, Printer, FileSpreadsheet, Upload, Camera, FileText, Undo2, Redo2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';

interface RCAData {
  id: string;
  text: string;
  description: string;
  precaution: string;
  targetDate: string;
  responsible: string;
  types: string[];
  children: RCAData[];
  isRootCause?: boolean;
  linkedNodeId?: string;
}

interface CauseType {
  id: string;
  label: string;
  color: string;
}

interface Metadata {
  date: string;
  type: string;
  location: string;
  incidentDetail: string;
}

const defaultCauseTypes: CauseType[] = [
  { id: 'IC', label: 'Anlık', color: 'bg-red-900 border-red-500' },
  { id: 'UC', label: 'Altta Yatan', color: 'bg-amber-900 border-amber-500' },
  { id: 'RC', label: 'Kök', color: 'bg-purple-900 border-purple-500' },
  { id: 'HF', label: 'İnsan', color: 'bg-blue-900 border-blue-500' },
  { id: 'TF', label: 'Teknik', color: 'bg-emerald-900 border-emerald-500' },
  { id: 'OF', label: 'Organizasyonel', color: 'bg-green-900 border-green-500' },
  { id: 'EF', label: 'Çevresel', color: 'bg-slate-700 border-slate-400' },
  { id: 'BF', label: 'Bariyer', color: 'bg-pink-900 border-pink-500' },
  { id: 'CF', label: 'Katkı', color: 'bg-gray-700 border-gray-400' },
];

const initialData: RCAData = {
  id: 'root',
  text: 'İmalat alanında yangın/reaksiyon oluştu',
  description: 'Ana Olay',
  precaution: '',
  targetDate: '',
  responsible: '',
  types: ['IC'],
  children: [],
  isRootCause: false
};

interface NodeCardProps {
  node: RCAData; 
  onAdd: (parentId: string) => void;
  onDelete: (id: string, parentId: string | null) => void;
  onUpdate: (id: string, updates: Partial<RCAData>) => void;
  onMove: (sourceId: string, targetId: string) => void;
  causeTypes: CauseType[];
  parentId: string | null;
  isVisible: (node: RCAData) => boolean;
  orientation: 'horizontal' | 'vertical';
  depth?: number;
  code?: string;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onAdd, onDelete, onUpdate, onMove, causeTypes, parentId, isVisible, orientation, depth = 0, code }) => {
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const descRef = React.useRef<HTMLTextAreaElement>(null);
  const precautionRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    if (textRef.current) {
        textRef.current.style.height = 'auto';
        textRef.current.style.height = textRef.current.scrollHeight + 'px';
    }
    if (descRef.current) {
        descRef.current.style.height = 'auto';
        descRef.current.style.height = descRef.current.scrollHeight + 'px';
    }
    if (precautionRef.current) {
        precautionRef.current.style.height = 'auto';
        precautionRef.current.style.height = precautionRef.current.scrollHeight + 'px';
    }
  }, [node.text, node.description, node.precaution]);

  const nodeVisible = isVisible(node);
  
  return (
    <div 
      className={`flex ${orientation === 'horizontal' ? 'flex-row items-start' : 'flex-col items-center'} gap-0`}
      draggable
      onDragStart={(e) => {
          e.dataTransfer.setData('sourceId', node.id);
          e.stopPropagation();
      }}
      onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
      }}
      onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const sourceId = e.dataTransfer.getData('sourceId');
          if (sourceId && sourceId !== node.id) {
              onMove(sourceId, node.id);
          }
      }}
    >
      <div className={`relative bg-slate-800 border p-4 rounded-lg shadow-md w-64 min-w-[256px] text-gray-100 flex-shrink-0 z-10 node-card-container ${node.isRootCause ? 'border-purple-500 shadow-purple-900/20 is-root-cause' : 'border-gray-700'} ${nodeVisible ? '' : 'opacity-0'}`}>
        <div className={`absolute -top-6 left-0 text-[10px] font-bold uppercase tracking-wider node-header-label ${node.isRootCause ? 'text-purple-500' : 'text-gray-500'}`}>
          {depth === 0 ? 'OLAY' : (node.isRootCause ? 'KÖK NEDEN' : `Neden ${depth}`)} <span className="opacity-50 ml-1">({code})</span>
        </div>
        <div className="flex justify-between items-start mb-2">
          <textarea 
            ref={textRef}
            className="text-sm font-semibold text-white bg-transparent w-full border-b border-transparent hover:border-gray-600 focus:border-emerald-500 outline-none resize-none overflow-hidden"
            value={node.text}
            onChange={(e) => onUpdate(node.id, { text: e.target.value })}
          />
          <div className="flex gap-0.5 bg-slate-900 rounded p-0.5 flex-shrink-0">
            <button onClick={() => {
              const rcType = causeTypes.find(t => t.id === 'RC');
              const newTypes = rcType 
                ? (node.types.includes(rcType.id) 
                    ? node.types.filter(type => type !== rcType.id)
                    : [...node.types, rcType.id])
                : node.types;
              onUpdate(node.id, { isRootCause: !node.isRootCause, types: newTypes });
            }} className={`transition-colors ${node.isRootCause ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`} title="Kök Neden Yap/Kaldır">
              <Settings size={14}/>
            </button>
            <button onClick={() => onUpdate(node.id, { precaution: node.precaution || ' ' })} className={`transition-colors ${node.precaution ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`} title="Önlem/Sorumlu Ekle/Düzenle">
              <FileText size={14}/>
            </button>
            <input 
              className="text-[10px] w-10 bg-slate-800 text-gray-400 rounded p-0.5"
              placeholder="Ref ID"
              value={node.linkedNodeId || ''}
              onChange={(e) => {
                const targetId = e.target.value;
                onUpdate(node.id, { linkedNodeId: targetId });
              }}
            />
            <button onClick={() => onAdd(node.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Plus size={14}/></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(node.id, parentId); }} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={14}/></button>
          </div>
        </div>
        <textarea 
          ref={descRef}
          className="text-sm text-gray-400 mb-3 bg-transparent w-full border border-transparent hover:border-gray-600 focus:border-emerald-500 outline-none rounded p-1 min-h-[60px] resize-none overflow-hidden"
          placeholder="Açıklama..."
          value={node.description}
          onChange={(e) => onUpdate(node.id, { description: e.target.value })}
          disabled={!!node.linkedNodeId}
        />
        <div className="flex gap-1 flex-wrap">
          {causeTypes.map(t => (
            <button 
              key={t.id} 
              className={`text-[10px] px-2 py-0.5 rounded border ${node.types.includes(t.id) ? t.color : 'bg-slate-700 border-slate-600 opacity-50'}`}
              onClick={() => {
                const newTypes = node.types.includes(t.id) 
                  ? node.types.filter(type => type !== t.id)
                  : [...node.types, t.id];
                onUpdate(node.id, { types: newTypes });
              }}
            >
              {t.id}
            </button>
          ))}
        </div>
      </div>
      
      {node.precaution && (
        <div className={`precaution-container ${orientation === 'horizontal' ? 'ml-4' : 'mt-4'} relative bg-slate-800 border border-emerald-500 p-4 rounded-lg shadow-lg shadow-emerald-900/20 w-64 min-w-[256px] text-gray-100 flex-shrink-0 z-10 is-precaution ${nodeVisible ? '' : 'opacity-0'}`}>
          <div className="absolute -top-6 left-0 text-[10px] text-emerald-500 font-bold uppercase tracking-wider node-header-label">
            ÖNLEM / SORUMLU
          </div>
          <div className="space-y-2">
            <textarea 
                ref={precautionRef}
                className="text-xs text-gray-300 bg-slate-950 border border-emerald-700 rounded p-1 w-full resize-none overflow-hidden min-h-[60px]"
                placeholder="Önlem"
                value={node.precaution}
                onChange={(e) => onUpdate(node.id, { precaution: e.target.value })}
            />
            <input 
                className="text-xs text-gray-300 bg-slate-950 border border-emerald-700 rounded p-1 w-full"
                type="date"
                value={node.targetDate}
                onChange={(e) => onUpdate(node.id, { targetDate: e.target.value })}
            />
            <input 
                className="text-xs text-gray-300 bg-slate-950 border border-emerald-700 rounded p-1 w-full"
                placeholder="Sorumlu"
                value={node.responsible}
                onChange={(e) => onUpdate(node.id, { responsible: e.target.value })}
            />
          </div>
        </div>
      )}
      
      {(node.children.length === 0 && !node.precaution) && (
        <div className={`${orientation === 'horizontal' ? 'w-8 h-full flex items-start' : 'h-8 w-full flex flex-col items-center'} justify-center flex-shrink-0`}>
           <ArrowRight 
             size={16} 
             className={`text-gray-500 flex-shrink-0 ${orientation === 'horizontal' ? '-ml-1' : '-mt-1 rotate-90'} connector-arrow`}
           />
        </div>
      )}
      
      {node.children.length > 0 && (
        <div className={`flex ${orientation === 'horizontal' ? 'flex-row' : 'flex-col items-center'} flex-shrink-0`}>
          <div className={`${orientation === 'horizontal' ? 'w-8 h-full flex items-center' : 'h-8 w-full flex flex-col items-center'} justify-center flex-shrink-0`}>
             <div className={`${orientation === 'horizontal' ? 'w-full border-b' : 'h-full border-l'} border-gray-500 connector-line`}></div>
             <ArrowRight 
               size={16} 
               className={`text-gray-500 flex-shrink-0 ${orientation === 'horizontal' ? '-ml-1' : '-mt-1 rotate-90'} connector-arrow`}
             />
          </div>

          <div className={`flex ${orientation === 'horizontal' ? 'flex-col' : 'flex-row'} ${orientation === 'vertical' ? 'justify-center' : ''} gap-12 ${node.children.length > 1 ? 'p-8' : 'p-0'} ${node.children.length > 1 ? (orientation === 'horizontal' ? 'border-l' : 'border-t') : ''} border-gray-700 vertical-connector`}>
            {node.children.map((child, index) => (
              <NodeCard 
                key={child.id} 
                node={child} 
                onAdd={onAdd} 
                onDelete={onDelete} 
                onUpdate={onUpdate} 
                onMove={onMove}
                causeTypes={causeTypes} 
                parentId={node.id} 
                isVisible={isVisible} 
                orientation={orientation}
                depth={depth + 1} 
                code={`${code}.${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const STORAGE_KEY = 'rca_analiz_v1';

  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_orientation`);
    return (saved as 'horizontal' | 'vertical') || 'horizontal';
  });

  const [showSettings, setShowSettings] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  const [causeTypes, setCauseTypes] = useState<CauseType[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_causes`);
    return saved ? JSON.parse(saved) : defaultCauseTypes;
  });
  
  const [history, setHistory] = useState<{ data: RCAData[], meta: Metadata }[]>(() => {
    const savedData = localStorage.getItem(`${STORAGE_KEY}_data`);
    const savedMeta = localStorage.getItem(`${STORAGE_KEY}_metadata`);
    const data = savedData ? JSON.parse(savedData) : [initialData];
    const meta = savedMeta ? JSON.parse(savedMeta) : {
      date: new Date().toISOString().split('T')[0],
      type: '',
      location: '',
      incidentDetail: ''
    };
    return [{ data, meta }];
  });
  const [pointer, setPointer] = useState(0);

  const dataArray = history[pointer].data;
  const metadata = history[pointer].meta;

  const setDataArray = (newData: RCAData[]) => {
    const newHistory = history.slice(0, pointer + 1);
    const updatedHistory = [...newHistory, { data: newData, meta: metadata }];
    setHistory(updatedHistory);
    setPointer(updatedHistory.length - 1);
  };

  const loadData = (data: RCAData[], meta: Metadata) => {
    const newHistory = [...history.slice(0, pointer + 1), { data, meta }];
    setHistory(newHistory);
    setPointer(newHistory.length - 1);
  };

  const setMetadata = (newMetadata: Metadata) => {
    loadData(dataArray, newMetadata);
  };

  const undo = () => {
    if (pointer > 0) setPointer(pointer - 1);
  };
  
  const redo = () => {
    if (pointer < history.length - 1) setPointer(pointer + 1);
  };

  // Persistent storage effects
  React.useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_data`, JSON.stringify(dataArray));
  }, [dataArray]);

  React.useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_metadata`, JSON.stringify(metadata));
  }, [metadata]);

  React.useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_causes`, JSON.stringify(causeTypes));
  }, [causeTypes]);

  React.useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_orientation`, orientation);
  }, [orientation]);

  const handleClear = () => {
    setDataArray([initialData]);
    setMetadata({
      date: new Date().toISOString().split('T')[0],
      type: '',
      location: '',
      incidentDetail: ''
    });
    localStorage.removeItem(`${STORAGE_KEY}_data`);
    localStorage.removeItem(`${STORAGE_KEY}_metadata`);
  };

  const toggleFilter = (typeId: string) => {
    setActiveFilters(prev => 
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  const isVisible = (node: RCAData): boolean => {
    if (activeFilters.length === 0) return true;
    return node.types.some(t => activeFilters.includes(t));
  };

  const addEvent = () => {
    const newEvent: RCAData = {
      id: Date.now().toString(),
      text: 'Yeni Olay',
      description: 'Açıklama...',
      types: [],
      children: []
    };
    setDataArray([...dataArray, newEvent]);
  };

  const addNode = (parentId: string) => {
    const newNode: RCAData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: 'Yeni Neden',
      description: 'Açıklama...',
      precaution: '',
      targetDate: '',
      responsible: '',
      types: [],
      children: [],
      isRootCause: false
    };

    const addRecursive = (node: RCAData): RCAData => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] };
      }
      return { ...node, children: node.children.map(addRecursive) };
    };

    setDataArray(dataArray.map(addRecursive));
  };

  const updateNode = (id: string, updates: Partial<RCAData>) => {
    const updateRecursive = (node: RCAData): RCAData => {
      if (node.id === id) {
        return { ...node, ...updates };
      }
      return { ...node, children: node.children.map(updateRecursive) };
    };
    
    setDataArray(dataArray.map(updateRecursive));
  };

  const deleteNode = (id: string, parentId: string | null) => {
    if (!parentId) {
      setDataArray(dataArray.filter(node => node.id !== id));
      return;
    }
    const deleteRecursive = (node: RCAData): RCAData => {
      if (node.id === parentId) {
        return { ...node, children: node.children.filter(c => c.id !== id) };
      }
      return { ...node, children: node.children.map(deleteRecursive) };
    };
    
    setDataArray(dataArray.map(deleteRecursive));
  };

  const moveNode = (sourceId: string, targetId: string) => {
    let sourceNode: RCAData | null = null;
    
    const findAndRemove = (node: RCAData): RCAData | null => {
        if (node.id === sourceId) {
            sourceNode = node;
            return null;
        }
        return { ...node, children: node.children.map(findAndRemove).filter(n => n !== null) as RCAData[] };
    };

    let newData = dataArray.map(findAndRemove).filter(n => n !== null) as RCAData[];
    if (!sourceNode) return;

    const addToTarget = (node: RCAData): RCAData => {
        if (node.id === targetId) {
            return { ...node, children: [...node.children, sourceNode!] };
        }
        return { ...node, children: node.children.map(addToTarget) };
    };

    setDataArray(newData.map(addToTarget));
  };

  const handleSave = () => {
    console.log('handleSave called');
    const filename = `${metadata.date.replace(/-/g, '')}_${metadata.type.replace(/\s+/g, '-') || 'Kaza'}_${metadata.location.replace(/\s+/g, '-') || 'Lokasyon'}.json`;
    const dataStr = JSON.stringify({ metadata, dataArray }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Ensure it's in the DOM
    a.click();
    document.body.removeChild(a); // Cleanup
    URL.revokeObjectURL(url);
    console.log('handleSave download initiated');
  };

  const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (content.dataArray || content.data) {
          loadData(content.dataArray || [content.data], content.metadata);
        } else {
          alert('Geçersiz dosya formatı.');
        }
      } catch (err) {
        alert('Dosya okunamadı: ' + err);
      }
    };
    reader.readAsText(file);
  };

  const handleExportExcel = () => {
    const rows: any[] = [['Kod', 'Tip', 'Metin', 'Açıklama', 'Tipler', 'Önlem', 'Hedef Tarih', 'Sorumlu']];
    
    const traverse = (node: RCAData, path: string[]) => {
      const code = path.join('.');
      
      rows.push([
        code,
        path.length === 1 ? 'OLAY' : `Neden ${path.length - 1}`,
        node.text,
        node.description,
        node.types.join(', '),
        node.precaution,
        node.targetDate,
        node.responsible
      ]);
      
      node.children.forEach((child, index) => {
        traverse(child, [...path, (index + 1).toString()]);
      });
    };
    
    dataArray.forEach((root, index) => {
      traverse(root, [(index + 1).toString()]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analiz');
    const filename = `${metadata.date.replace(/-/g, '')}_${metadata.type.replace(/\s+/g, '-') || 'Kaza'}_${metadata.location.replace(/\s+/g, '-') || 'Lokasyon'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const getCaptureData = async () => {
    const rootArea = document.getElementById('printable-area');
    const headerArea = document.querySelector('.sticky.top-0');
    if (!rootArea) return null;
    
    const width = rootArea.scrollWidth;
    const headerHeight = headerArea ? headerArea.scrollHeight : 0;
    const height = rootArea.scrollHeight + headerHeight;

    // Create a specialized capture container
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    // Match root container style but force white background
    wrapper.className = 'capture-mode';
    wrapper.style.width = width + 'px';
    wrapper.style.height = height + 'px';
    wrapper.style.backgroundColor = '#ffffff';
    
    const clone = rootArea.cloneNode(true) as HTMLElement;
    
    // Add header if found
    if (headerArea) {
      const headerClone = headerArea.cloneNode(true) as HTMLElement;
      // Remove no-print class from inner div if found
      const innerHeader = headerClone.querySelector('.no-print');
      if (innerHeader) innerHeader.classList.remove('no-print');
      
      // Adjust styles for the capture
      headerClone.style.position = 'static';
      headerClone.style.backgroundColor = '#ffffff';
      headerClone.style.color = '#000000';
      headerClone.style.border = 'none';
      headerClone.style.padding = '16px';
      
      // Ensure text is visible
      const textElements = headerClone.querySelectorAll('h1, button, div');
      textElements.forEach(el => {
        (el as HTMLElement).style.color = '#000000';
      });

      clone.insertBefore(headerClone, clone.firstChild);
    }

    // Ensure the clone itself doesn't limit its size
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.margin = '0';
    clone.style.padding = '32px'; // Standard padding from app
    
    // Sync input values (clone doesn't copy values of form elements)
    const originalInputs = document.querySelectorAll('input, textarea');
    const clonedInputs = clone.querySelectorAll('input, textarea');
    originalInputs.forEach((input, index) => {
      const clonedInput = clonedInputs[index] as HTMLInputElement | HTMLTextAreaElement;
      if (clonedInput && (clonedInput as HTMLInputElement).type !== 'file') {
        clonedInput.value = (input as HTMLInputElement | HTMLTextAreaElement).value;
      }
    });
    
    // Remove no-print elements in the clone (only if not already adjusted)
    const noPrintElements = clone.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.remove());
    
    const style = document.createElement('style');
    style.innerHTML = `
      .is-root-cause { border: 1.5px solid #a855f7 !important; }
      .is-precaution { border: 1.5px solid #10b981 !important; }
      .is-root-cause .node-header-label { background-color: #a855f7 !important; color: white !important; }
      .is-precaution .node-header-label { background-color: #10b981 !important; color: white !important; }
    `;
    wrapper.appendChild(style);
    
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Increase capture width/height slightly for safety margin
    const captureWidth = width + 64; 
    const captureHeight = height + 150;

    const dataUrl = await domtoimage.toJpeg(wrapper, {
      bgcolor: '#ffffff',
      width: captureWidth,
      height: captureHeight,
      quality: 0.95
    });
    
    document.body.removeChild(wrapper);
    return { dataUrl, width: captureWidth, height: captureHeight };
  };

  const handleDownloadImage = async () => {
    try {
      const capture = await getCaptureData();
      if (!capture) return;

      const filename = `${metadata.date.replace(/-/g, '')}_${metadata.type.replace(/\s+/g, '-') || 'Kaza'}_${metadata.location.replace(/\s+/g, '-') || 'Lokasyon'}.jpg`;
      const a = document.createElement('a');
      a.href = capture.dataUrl;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error('Görsel oluşturulurken bir hata oluştu:', err);
      alert('Görsel oluşturulurken bir hata oluştu: ' + err);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const capture = await getCaptureData();
      if (!capture) return;

      const pdf = new jsPDF('p', 'px', [capture.width, capture.height]);
      pdf.addImage(capture.dataUrl, 'JPEG', 0, 0, capture.width, capture.height);
      const filename = `${metadata.date.replace(/-/g, '')}_${metadata.type.replace(/\s+/g, '-') || 'Kaza'}_${metadata.location.replace(/\s+/g, '-') || 'Lokasyon'}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF oluşturulurken bir hata oluştu:', err);
      alert('PDF oluşturulurken bir hata oluştu: ' + err);
    }
  };



  const handlePrint = () => {
    // Add print styles dynamically
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: auto;
          margin: 1cm;
        }
        body { background: white !important; }
        body > * { display: none !important; }
        #printable-area, #printable-area * { 
          visibility: visible !important; 
          background-color: transparent !important;
          color: black !important;
          box-shadow: none !important;
          border-color: transparent !important;
        }
        #printable-area { 
          position: static !important; 
          width: 100% !important; 
          background: white !important;
        }
        .node-card-container {
          border: 1.5px solid black !important;
          background: white !important;
          padding: 1rem !important;
        }
        .is-root-cause {
          border: 1.5px solid #a855f7 !important;
        }
        .precaution-container {
          border: 1.5px solid black !important;
          background: white !important;
          padding: 1rem !important;
          display: block !important;
        }
        .is-precaution {
          border: 1.5px solid #10b981 !important;
        }
        .node-header-label {
          background-color: black !important;
          color: white !important;
          padding: 2px 8px !important;
          border-radius: 2px !important;
          display: inline-block !important;
        }
        .is-root-cause .node-header-label {
          background-color: #a855f7 !important;
          color: white !important;
        }
        .is-precaution .node-header-label {
          background-color: #10b981 !important;
          color: white !important;
        }
        .connector-line, .branch-line {
          border-bottom: 2px solid black !important;
        }
        .vertical-connector {
          border-left: none !important;
          border-top: none !important;
        }
        .vertical-connector.border-l {
          border-left: 2px solid black !important;
        }
        .vertical-connector.border-t {
          border-top: 2px solid black !important;
        }
        .connector-arrow, .branch-arrow {
          color: black !important;
        }
        textarea, input {
          border: none !important;
          border-bottom: 1px solid #ddd !important;
          background: white !important;
          color: black !important;
        }
        .no-print { display: none !important; }
        svg { color: black !important; }
        .connector-arrow { color: white !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <div id="app-root" className="bg-slate-950 h-screen text-gray-100 flex flex-col">
      <div className="sticky top-0 z-50 bg-slate-950 p-8 border-b border-gray-800">
        <div className="flex justify-between items-center no-print">
          <h1 className="text-2xl font-bold text-white">5 Neden (5 Why) Analizi</h1>
          <div className="flex gap-2 text-xs">
            {causeTypes.map(t => (
              <button 
                key={t.id} 
                onClick={() => toggleFilter(t.id)}
                className={`px-2 py-1 rounded border ${
                  activeFilters.includes(t.id) ? t.color : 'bg-slate-800 border-gray-700 opacity-50'
                }`}
              >
                {t.id}={t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex items-center bg-slate-900 rounded p-1 mr-2 border border-gray-800">
              <button 
                onClick={() => setOrientation('horizontal')}
                className={`p-1.5 rounded transition-all ${orientation === 'horizontal' ? 'bg-slate-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                title="Yatay Yerleşim"
              >
                <div className="flex flex-row gap-1">
                   <div className="w-4 h-3 border border-current rounded-sm"></div>
                   <ArrowRight size={12} className="self-center" />
                   <div className="w-4 h-3 border border-current rounded-sm"></div>
                </div>
              </button>
              <button 
                onClick={() => setOrientation('vertical')}
                className={`p-1.5 rounded transition-all ${orientation === 'vertical' ? 'bg-slate-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                title="Dikey Yerleşim"
              >
                <div className="flex flex-col gap-1">
                   <div className="w-4 h-3 border border-current rounded-sm"></div>
                   <ArrowRight size={12} className="self-center rotate-90" />
                   <div className="w-4 h-3 border border-current rounded-sm"></div>
                </div>
              </button>
            </div>
            <button onClick={undo} disabled={pointer === 0} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-gray-400 disabled:opacity-30" title="Geri Al">
              <Undo2 size={20} />
            </button>
            <button onClick={redo} disabled={pointer === history.length - 1} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-gray-400 disabled:opacity-30" title="İleri Al">
              <Redo2 size={20} />
            </button>
            <button onClick={addEvent} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-sky-400" title="Yeni Olay Ekle">
              <Plus size={20} />
            </button>
            <input type="file" id="file-upload" className="hidden" accept=".json" onChange={handleLoadFile} />
            <label htmlFor="file-upload" className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-amber-400 cursor-pointer" title="JSON Yükle">
              <Upload size={20} />
            </label>
            <button onClick={handleSave} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-emerald-400" title="Dışa Aktar (JSON)">
              <Download size={20} />
            </button>
            <button onClick={handleClear} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-red-500" title="Tümünü Temizle">
              <Trash2 size={20} />
            </button>
            <button onClick={handleExportExcel} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-emerald-400" title="Excel/CSV Kaydet">
              <FileSpreadsheet size={20} />
            </button>
            <button onClick={handleDownloadImage} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-amber-400" title="Görsel Olarak Kaydet">
              <Camera size={20} />
            </button>
            <button onClick={handleDownloadPDF} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-red-400" title="PDF Olarak Kaydet">
              <FileText size={20} />
            </button>
            <button onClick={handlePrint} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700 text-sky-400" title="Yazdır">
              <Printer size={20} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-slate-800 rounded hover:bg-slate-700 border border-gray-700">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      <div id="printable-area" className="p-8 flex-grow overflow-auto">
        {showSettings && (
          <div className="mb-8 p-4 bg-slate-900 rounded border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-white">Neden Tipi Ayarları</h2>
            <div className="mb-4">
              <button onClick={() => setCauseTypes([...causeTypes, { id: 'NEW_' + Date.now(), label: 'Yeni Tip', color: 'bg-gray-700 border-gray-400' }])} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-500">
                Yeni Tipi Ekle
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {causeTypes.map((t, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input className="w-16 p-1 bg-slate-800 rounded border border-gray-700" placeholder="ID" value={t.id} onChange={(e) => {
                    const newTypes = [...causeTypes];
                    newTypes[idx].id = e.target.value;
                    setCauseTypes(newTypes);
                  }} />
                  <input className="flex-grow p-1 bg-slate-800 rounded border border-gray-700" placeholder="Label" value={t.label} onChange={(e) => {
                    const newTypes = [...causeTypes];
                    newTypes[idx].label = e.target.value;
                    setCauseTypes(newTypes);
                  }} />
                  <button onClick={() => setCauseTypes(causeTypes.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 p-4 bg-slate-900 rounded border border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-300">Tarih</label>
            <input type="date" className="p-2 bg-slate-800 rounded border border-gray-700" value={metadata.date} onChange={(e) => setMetadata({...metadata, date: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-300">Kaza Tipi</label>
            <input placeholder="Kaza Tipi" className="p-2 bg-slate-800 rounded border border-gray-700" value={metadata.type} onChange={(e) => setMetadata({...metadata, type: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-300">Lokasyon</label>
            <input placeholder="Lokasyon" className="p-2 bg-slate-800 rounded border border-gray-700" value={metadata.location} onChange={(e) => setMetadata({...metadata, location: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1 col-span-full">
            <label className="text-xs font-bold text-gray-300">Kaza Detayları</label>
            <textarea placeholder="Kaza Detayları..." className="p-2 bg-slate-800 rounded border border-gray-700 h-40 resize-y text-sm" value={metadata.incidentDetail} onChange={(e) => setMetadata({...metadata, incidentDetail: e.target.value})} />
          </div>
        </div>
        
        {dataArray.map((rootNode, index) => (
          <div key={rootNode.id} className="mb-8">
            <NodeCard 
              node={rootNode} 
              onAdd={addNode} 
              onDelete={deleteNode} 
              onUpdate={updateNode} 
              onMove={moveNode}
              causeTypes={causeTypes} 
              parentId={null} 
              isVisible={isVisible}
              orientation={orientation}
              code={(index + 1).toString()}
            />
          </div>
        ))}
      </div>
    </div>
  );
}