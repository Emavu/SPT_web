import React, { useEffect, useRef, useState } from 'react';
import { Type as TypeIcon, Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon, Link as LinkIcon, Palette, List as ListIcon, X, UploadCloud, File, Eraser } from 'lucide-react';

interface RichTextEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  language: 'lt' | 'en' | 'de' | 'uk';
}

const LOCAL_TRANS = {
  title: {
    lt: 'Įterpti nuorodą arba PDF',
    en: 'Insert Link or PDF',
    de: 'Link oder PDF einfügen',
    uk: 'Вставити посилання або PDF'
  },
  urlLabel: {
    lt: 'Interneto adresas (URL)',
    en: 'Web Address (URL)',
    de: 'Webadresse (URL)',
    uk: 'Веб-адреса (URL)'
  },
  textLabel: {
    lt: 'Nuorodos tekstas',
    en: 'Link Text',
    de: 'Link-Text',
    uk: 'Текст посилання'
  },
  pdfLabel: {
    lt: 'Arba įkelkite PDF failą',
    en: 'Or Upload PDF File',
    de: 'Oder PDF-Datei hochladen',
    uk: 'Або завантажте PDF-файл'
  },
  placeholderPdf: {
    lt: 'Paspauskite arba įtempkite PDF failą čia',
    en: 'Click or drop PDF here',
    de: 'Klicken oder PDF hierher ziehen',
    uk: 'Натисніть або перетягніть PDF сюди'
  },
  insertBtn: {
    lt: 'Įterpti',
    en: 'Insert',
    de: 'Einfügen',
    uk: 'Вставити'
  },
  cancelBtn: {
    lt: 'Atšaukti',
    en: 'Cancel',
    de: 'Abbrechen',
    uk: 'Скасувати'
  },
  pdfSuccess: {
    lt: 'PDF įkeltas sėkmingai!',
    en: 'PDF successfully uploaded!',
    de: 'PDF erfolgreich hochgeladen!',
    uk: 'PDF успішно завантажено!'
  },
  pdfUploadingStatus: {
    lt: 'Failas įkeliamas į serverį...',
    en: 'Uploading file to server...',
    de: 'Datei wird auf den Server hochgeladen...',
    uk: 'Файл завантажується на сервер...'
  }
};

export function RichTextEditor({ id, value, onChange, placeholder, language }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isLocalChange = useRef(false);

  // Link Dialog states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [pdfUploading, setPdfUploading] = useState(false);

  // Keep editor content sync'd with remote value, but avoid resetting raw input cursor on every stroke
  useEffect(() => {
    if (editorRef.current && !isLocalChange.current) {
      editorRef.current.innerHTML = value || '';
    }
    isLocalChange.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isLocalChange.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const executeCommand = (command: string, arg: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  const applyColor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.color = '#C42727';
      span.appendChild(range.extractContents());
      range.insertNode(span);
      handleInput();
    }
  };

  const applyOriginalColor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.color = '#111827';
      span.appendChild(range.extractContents());
      range.insertNode(span);
      handleInput();
    }
  };

  const clearFormatting = () => {
    executeCommand('removeFormat');
  };

  const openLinkModal = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setSelectedRange(range.cloneRange());
      setLinkText(range.toString());
    } else {
      setSelectedRange(null);
      setLinkText('');
    }
    setLinkUrl('https://');
    setPdfName('');
    setIsLinkModalOpen(true);
  };

  const insertLinkNode = () => {
    // Restore selection
    const selection = window.getSelection();
    if (selection && selectedRange) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }

    const targetUrl = linkUrl.trim();
    if (!targetUrl) return;

    const escapedUrl = targetUrl.replace(/"/g, '&quot;');
    const textToInsert = linkText.trim() || targetUrl;
    const escapedText = textToInsert.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // HTML link that opens in a new tab with standard styles
    const htmlToInsert = `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-red-600 underline font-semibold hover:text-red-700 transition-colors">${escapedText}</a>`;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const el = document.createElement('div');
      el.innerHTML = htmlToInsert;
      const frag = document.createDocumentFragment();
      let node;
      while ((node = el.firstChild)) {
        frag.appendChild(node);
      }
      range.insertNode(frag);
    } else {
      // Fallback
      if (editorRef.current) {
        editorRef.current.innerHTML += ' ' + htmlToInsert;
      }
    }
    
    handleInput();
    setIsLinkModalOpen(false);
    setSelectedRange(null);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert(language === 'lt' ? 'Pasirinkite PDF failą!' : 'Please select a PDF file!');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const base64Data = uploadEvent.target?.result as string;
        setPdfUploading(true);
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename: file.name,
              base64: base64Data
            })
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const responseData = await response.json();
          // Update the URL to the relative server path /uploads/...
          setLinkUrl(responseData.url);
          setPdfName(file.name);
          if (!linkText) {
            setLinkText(file.name.replace(/\.pdf$/i, ''));
          }
        } catch (err) {
          console.error('Failed to upload file to backend:', err);
          alert(language === 'lt' 
            ? 'Klaida: nepavyko įkelti failo į serverį.' 
            : 'Error: failed to upload file to the server.'
          );
        } finally {
          setPdfUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const tools = [
    { icon: <TypeIcon className="w-3.5 h-3.5 text-gray-400" />, label: 'H1', action: () => executeCommand('formatBlock', '<h1>') },
    { icon: <TypeIcon className="w-3.5 h-3.5 text-gray-400" />, label: 'H2', action: () => executeCommand('formatBlock', '<h2>') },
    { icon: <TypeIcon className="w-3.5 h-3.5 text-gray-400" />, label: 'H3', action: () => executeCommand('formatBlock', '<h3>') },
    { icon: <TypeIcon className="w-3.5 h-3.5 text-gray-405" />, label: 'H4', action: () => executeCommand('formatBlock', '<p>') },
    { icon: <BoldIcon className="w-3.5 h-3.5 text-gray-500" />, label: 'Bold', action: () => executeCommand('bold') },
    { icon: <ItalicIcon className="w-3.5 h-3.5 text-gray-500" />, label: 'Italic', action: () => executeCommand('italic') },
    { icon: <UnderlineIcon className="w-3.5 h-3.5 text-gray-505" />, label: 'Underline', action: () => executeCommand('underline') },
    { icon: <LinkIcon className="w-3.5 h-3.5 text-gray-505" />, label: 'Link / PDF', action: openLinkModal },
    { icon: <Palette className="w-3.5 h-3.5 text-red-600" />, label: 'Raudonas', action: applyColor },
    { icon: <Palette className="w-3.5 h-3.5 text-black" />, label: language === 'lt' ? 'Juodas' : 'Black', action: applyOriginalColor },
    { icon: <Eraser className="w-3.5 h-3.5 text-gray-505" />, label: language === 'lt' ? 'Valyti' : 'Eraser', action: clearFormatting },
    { icon: <ListIcon className="w-3.5 h-3.5 text-gray-400" />, label: 'List', action: () => executeCommand('insertUnorderedList') },
  ];

  return (
    <div className="flex flex-col border border-gray-200 rounded-2xl bg-white shadow-lg overflow-hidden w-full relative">
      {/* Floating Header Label */}
      <div className="absolute top-3 right-4 z-10 text-[8px] font-mono text-gray-300 pointer-events-none uppercase tracking-widest">
        {language === 'lt' ? 'Dokumentas' : 'Document'}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-3 bg-gray-50 border-b border-gray-200/80 shrink-0 select-none">
        {tools.map((tool, i) => (
          <button
            key={i}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={tool.action}
            className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:text-red-600 rounded-xl shadow-sm border border-transparent hover:border-gray-200 transition-all active:scale-95"
            title={tool.label}
          >
            {tool.icon}
            <span className="font-sans font-bold">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Live WYSIWYG Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        id={id}
        {...({ placeholder } as any)}
        className="w-full h-full flex-grow min-h-[460px] p-10 focus:outline-none prose prose-sm prose-red max-w-none text-gray-800 bg-white overflow-y-auto select-text text-left transition-all leading-relaxed"
        style={{ outline: 'none' }}
      />

      {/* Modern custom modal for entering address or uploading a PDF file */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl p-8 w-full max-w-md relative overflow-hidden text-left">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 font-sans">
                {LOCAL_TRANS.title[language]}
              </h3>
              <button 
                onClick={() => setIsLinkModalOpen(false)} 
                className="text-gray-400 hover:text-black transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 font-sans">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  {LOCAL_TRANS.textLabel[language]}
                </label>
                <input 
                  type="text"
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  placeholder="pvz: Techninė specifikacija"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-xs rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none font-bold text-gray-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  {LOCAL_TRANS.urlLabel[language]}
                </label>
                <input 
                  type="text"
                  value={linkUrl.startsWith('data:') ? '' : linkUrl}
                  disabled={linkUrl.startsWith('data:')}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://spt.lt/dokumentas"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-xs rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none font-medium text-gray-800 transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  {LOCAL_TRANS.pdfLabel[language]}
                </label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-red-400 transition-colors bg-gray-50/50 cursor-pointer">
                  <input 
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={pdfUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <UploadCloud className={`w-8 h-8 ${pdfUploading ? 'text-red-500 animate-bounce' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold text-gray-700">
                      {pdfUploading ? (
                        <span className="text-red-600 block bg-red-50/50 px-2.5 py-1 rounded animate-pulse font-bold">
                          {LOCAL_TRANS.pdfUploadingStatus[language]}
                        </span>
                      ) : pdfName ? (
                        <span className="text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                          <File className="w-3.5 h-3.5" /> {pdfName}
                        </span>
                      ) : (
                        LOCAL_TRANS.placeholderPdf[language]
                      )}
                    </span>
                    {pdfName && !pdfUploading && (
                      <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider block mt-1">
                        ✓ {LOCAL_TRANS.pdfSuccess[language]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6 font-sans">
              <button 
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="flex-1 py-3 border border-gray-200 font-bold text-xs uppercase text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {LOCAL_TRANS.cancelBtn[language]}
              </button>
              <button 
                type="button"
                onClick={insertLinkNode}
                disabled={pdfUploading}
                className="flex-1 py-3 bg-red-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {LOCAL_TRANS.insertBtn[language]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

