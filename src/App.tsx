
import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  useNavigate, 
  useLocation,
  Navigate
} from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  where,
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { cn } from './lib/utils';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  LogOut, 
  LogIn, 
  Shield, 
  Newspaper, 
  Image as ImageIcon,
  Check,
  X,
  ChevronRight,
  Menu,
  Clock,
  ArrowUp,
  ArrowDown,
  Settings,
  Folder,
  FolderPlus,
  Upload,
  FileImage,
  ChevronLeft,
  Languages,
  Globe,
  Search,
  ArrowLeft,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as ListIcon,
  Type as TypeIcon,
  Mail,
  Phone,
  MapPin,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Palette
} from 'lucide-react';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";

// Error Handling Types
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix: string) => void;
}

function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const tools = [
    { icon: <TypeIcon className="w-3 h-3" />, label: 'H1', action: () => onInsert('# ', '') },
    { icon: <TypeIcon className="w-3 h-3" />, label: 'H2', action: () => onInsert('## ', '') },
    { icon: <TypeIcon className="w-3 h-3" />, label: 'H3', action: () => onInsert('### ', '') },
    { icon: <BoldIcon className="w-3 h-3" />, label: 'Bold', action: () => onInsert('**', '**') },
    { icon: <ItalicIcon className="w-3 h-3" />, label: 'Italic', action: () => onInsert('*', '*') },
    { icon: <UnderlineIcon className="w-3 h-3" />, label: 'Underline', action: () => onInsert('<u>', '</u>') },
    { icon: <LinkIcon className="w-3 h-3" />, label: 'Link', action: () => onInsert('[', '](https://)') },
    { icon: <Palette className="w-3 h-3 text-red-600" />, label: 'Raudonas', action: () => onInsert('<span style="color: #C42727">', '</span>') },
    { icon: <ListIcon className="w-3 h-3" />, label: 'List', action: () => onInsert('- ', '') },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-1 bg-gray-100/50 rounded-xl mb-3 border border-gray-100">
      {tools.map((tool, i) => (
        <button
          key={i}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={tool.action}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:text-red-600 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
        >
          {tool.icon}
          {tool.label}
        </button>
      ))}
    </div>
  );
}

function stripMarkdown(text: string): string {
  if (!text) return "";
  let result = text;
  
  // Replace code blocks first so their contents are cleaned up properly
  result = result.replace(/```[\s\S]*?```/g, "");
  
  // Replace html tags
  result = result.replace(/<[^>]*>/g, "");
  
  // Replace images
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  
  // Replace links
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  
  // Replace bullet points or list syntax from the beginnings of lines
  result = result.replace(/^\s*[-*+]\s+/gm, "");
  result = result.replace(/^\s*\d+\.\s+/gm, "");
  
  // Replace blockquotes at beginnings of lines
  result = result.replace(/^\s*>\s+/gm, "");
  
  // Replace headings symbols
  result = result.replace(/^\s*#{1,6}\s+/gm, "");
  
  // Strip bold/italic/strikethrough markers globally
  result = result.replace(/\*\*\*/g, ""); // Bold & Italic
  result = result.replace(/\*\*/g, "");  // Bold
  result = result.replace(/\*/g, "");   // Italic
  result = result.replace(/___/g, "");  // Bold & Italic
  result = result.replace(/__/g, "");   // Bold
  result = result.replace(/_/g, "");    // Italic
  result = result.replace(/~~/g, "");   // Strikethrough
  result = result.replace(/`/g, "");    // Inline code backticks

  // Remove lines that are just dividers like --- or ***
  result = result.replace(/^\s*[-*_]{3,}\s*$/gm, "");

  // Replace any leftover single symbol characters that were part of markdown syntax if any remain
  result = result.replace(/[*#~`_]/g, "");

  // Normalize spaces and strip leading/trailing whitespace
  return result.replace(/\s+/g, " ").trim();
}

const ASPECT_RATIOS = ["1:1", "4:3", "3:4", "4:5", "16:9", "2:3"];

function BentoCard({ 
  id, 
  title, 
  content, 
  imageUrl, 
  t, 
  onClick, 
  isExpanded, 
  aspectRatio = "4/3",
  isAdmin = false,
  onEdit,
  onDelete,
  onNavigate
}: { 
  id: string, 
  title: string, 
  content: string, 
  imageUrl?: string, 
  t: (key: string) => string,
  onClick: () => void,
  isExpanded: boolean,
  aspectRatio?: string,
  isAdmin?: boolean,
  onEdit?: () => void,
  onDelete?: () => void,
  onNavigate?: (id: string) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const ratioClass = {
    "1:1": "aspect-square",
    "4:3": "aspect-[4/3]",
    "3:4": "aspect-[3/4]",
    "4:5": "aspect-[4/5]",
    "16:9": "aspect-video",
    "2:3": "aspect-[2/3]"
  }[aspectRatio] || "aspect-[4/3]";

  useEffect(() => {
    if (isExpanded && cardRef.current) {
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden group bg-white border border-gray-100 rounded-2xl transition-all duration-[400ms] ease-in-out shrink-0",
        isExpanded ? "col-span-full shadow-2xl z-20 max-h-[3000px]" : "h-full hover:shadow-xl shadow-gray-200/50 max-h-[600px] cursor-pointer"
      )}
      onClick={() => {
        if (!isExpanded && onNavigate) {
          onNavigate(id);
        } else {
          onClick();
        }
      }}
    >
      {showDeleteConfirm && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[30] flex flex-col justify-center items-center p-6 text-center animate-fade-in"
        >
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-wider mb-2 text-gray-900 font-sans">
            {t('confirmDeleteCard')}
          </h4>
          <p className="text-[10px] text-gray-500 mb-6 font-sans">
            {t('actionCannotBeUndone')}
          </p>
          <div className="flex gap-3 w-full max-w-[240px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
                setShowDeleteConfirm(false);
              }}
              className="flex-1 py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-700 transition-colors font-sans"
            >
              {t('yes')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(false);
              }}
              className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-colors font-sans"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <div className={cn("flex flex-col h-full transition-all duration-500", isExpanded ? "md:flex-row md:items-stretch" : "")}>
        {imageUrl && (
          <div className={cn(
            "relative bg-transparent overflow-hidden shrink-0 transition-all duration-500 flex justify-start items-center",
            isExpanded ? "w-full md:w-auto md:max-w-[50%] h-[300px] md:h-[500px]" : ratioClass
          )}>
            <img 
              src={imageUrl} 
              alt={title} 
              className={cn(
                "transition-all duration-500 ease-in-out",
                isExpanded 
                  ? "h-full w-auto object-contain object-left grayscale-0 scale-100" 
                  : "w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110"
              )}
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className={cn("p-4 md:p-5 flex flex-col justify-between transition-all duration-500 flex-1", isExpanded ? "p-8 lg:p-12" : "")}>
          <div className="space-y-2">
            <h1 className={cn("font-black leading-tight transition-colors group-hover:text-red-600", isExpanded ? "text-2xl md:text-3xl" : "text-xs")}>
              {title}
            </h1>
            {isExpanded ? (
              <div className="text-gray-500 leading-relaxed transition-all prose prose-sm prose-red prose-headings:font-black prose-headings:tracking-tighter max-w-none opacity-100">
                <Markdown rehypePlugins={[rehypeRaw]}>{content}</Markdown>
              </div>
            ) : (
              <p className="text-gray-500 leading-relaxed transition-all line-clamp-3 overflow-hidden opacity-80 text-sm">
                {stripMarkdown(content)}
              </p>
            )}
          </div>
          
          <div className="mt-6 flex items-center justify-between">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (onNavigate) {
                  onNavigate(id);
                } else {
                  onClick();
                }
              }}
              className="px-4 py-2 bg-gray-50 hover:bg-red-600 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white rounded-lg transition-all flex items-center gap-1.5 group/btn"
            >
              {isExpanded ? (
                <>{t('showLess')} <X className="w-2.5 h-2.5 translate-y-[-0.5px]" /></>
              ) : (
                <>{t('learnMore')} <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" /></>
              )}
            </button>

            {isAdmin && (
              <div className="flex gap-1.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  title="Edit CardContent"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  title="Delete Card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function shouldCardNavigate(cardId: string, pagesContent: Record<string, PageContent>): boolean {
  // Direct children/subcategories of 'products' (Level 2 categories)
  const productsSub = [
    'flow_meters', 'level_meters', 'industrial_pumps', 'tanker_equipment', 
    'pipeline_fittings', 'tank_fittings', 'loading_arms', 'terminal_equipment', 'dry_disconnect'
  ];

  // If cardId is directly products, or one of its level 2 categories, we navigate to its category page
  if (cardId === 'products' || productsSub.includes(cardId)) {
    return true;
  }

  // Under 'flow_meters' we have level 3 subcategories
  const flowMetersSubs = [
    'flow_meters_volumetric', 'flow_meters_gear', 'flow_meters_turbine', 'flow_meters_coriolis'
  ];
  if (flowMetersSubs.includes(cardId)) {
    return true;
  }

  // Trace if this card belongs anywhere under the 'products' category tree.
  let belongsToProductsTree = false;
  let currentId: string | undefined = cardId;
  let depth = 0;

  while (currentId && depth < 5) {
    const page = pagesContent[currentId];
    if (page?.parentId === 'products' || productsSub.includes(currentId)) {
      belongsToProductsTree = true;
      break;
    }
    // Check if the currentId starts with any of the productsSub prefixes as fallback
    for (const prefix of productsSub) {
      if (currentId.startsWith(prefix)) {
        belongsToProductsTree = true;
        break;
      }
    }
    if (belongsToProductsTree) break;
    currentId = page?.parentId;
    depth++;
  }

  // If it's a card in the products tree, but is NOT one of the category pages,
  // then it's a product or model card. We want to EXPAND instead of navigate!
  if (belongsToProductsTree) {
    return false;
  }

  // Default: navigate for anything else (solutions, services, etc.)
  return true;
}

function BentoGrid({ 
  items, 
  pagesContent, 
  language, 
  t, 
  isAdmin = false,
  onEditPage,
  onDeletePage,
  onAddPage,
  onNavigate
}: { 
  items: string[], 
  pagesContent: Record<string, PageContent>, 
  language: Language,
  t: (key: string) => string,
  isAdmin?: boolean,
  onEditPage?: (id: string) => void,
  onDeletePage?: (id: string) => void,
  onAddPage?: () => void,
  onNavigate?: (id: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 py-8">
      {items.map((subId) => {
        const pageData = pagesContent[subId];
        const title = pageData?.title?.[language] || t(subId);
        const content = pageData?.content?.[language] || t('heroSub');
        const imageUrl = pageData?.imageUrls?.[0] || `https://picsum.photos/seed/${subId}/800/600`;
        const aspectRatio = pageData?.aspectRatio || "4/3";

        return (
          <BentoCard 
            key={subId}
            id={subId}
            title={title}
            content={content}
            imageUrl={imageUrl}
            t={t}
            isExpanded={expandedId === subId}
            onClick={() => setExpandedId(expandedId === subId ? null : subId)}
            aspectRatio={aspectRatio}
            isAdmin={isAdmin}
            onEdit={() => onEditPage?.(subId)}
            onDelete={() => onDeletePage?.(subId)}
            onNavigate={onNavigate && shouldCardNavigate(subId, pagesContent) ? onNavigate : undefined}
          />
        );
      })}
      
      {isAdmin && (
        <button 
          onClick={onAddPage}
          className="relative min-h-[200px] border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-red-600 hover:bg-red-50/10 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all text-gray-300">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 group-hover:text-red-600">Pridėti naują kortelę</span>
        </button>
      )}
    </div>
  );
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      let details = "";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error?.includes("insufficient permissions")) {
          message = "You don't have permission to perform this action.";
          if (parsed.authInfo?.email && !parsed.authInfo?.emailVerified) {
            details = `Your email (${parsed.authInfo.email}) is not verified. Some administrative actions require a verified email address. Please check your inbox for a verification link.`;
          } else {
            details = "Please make sure you are logged in as an administrator with the correct permissions.";
          }
        }
      } catch (e) {
        // Not a JSON error
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            {details && <p className="text-sm text-gray-500 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">{details}</p>}
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Multi-Image Uploader Component
interface FileUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
}

function FileUploader({ images, onChange }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const validImages = images.filter(url => url && url.trim() !== '');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newUrls: string[] = [...images];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `news-images/${Date.now()}-${file.name}`);
      try {
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        if (url) newUrls.push(url);
      } catch (error) {
        console.error("Upload failed", error);
      }
    }

    onChange(newUrls);
    setIsUploading(false);
  };

  const removeImage = (urlToRemove: string) => {
    const newUrls = images.filter(url => url !== urlToRemove);
    onChange(newUrls);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {validImages.map((url, index) => (
          <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm">
            <img 
              src={url} 
              alt={`Upload ${index}`} 
              className="w-full h-full object-cover animate-fade-in" 
              referrerPolicy="no-referrer"
            />
            <button 
              type="button"
              onClick={() => removeImage(url)}
              className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red-650 transition-all shadow-md z-10 scale-100 hover:scale-110 flex items-center justify-center cursor-pointer"
              title="Pašalinti nuotrauką"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <label className={cn(
          "aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-red-600 hover:bg-red-50 transition-all",
          isUploading && "opacity-50 cursor-wait"
        )}>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pridėti nuotraukų</span>
            </>
          )}
        </label>
      </div>
    </div>
  );
}

// Image Gallery Component for News Cards
function ImageGallery({ images, className }: { images: string[], className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const validImages = (images || []).filter(url => url && url.trim() !== '');

  useEffect(() => {
    if (validImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
    }, 4000); // Auto loop every 4 seconds
    return () => clearInterval(interval);
  }, [validImages.length]);

  if (validImages.length === 0) return null;

  return (
    <div className={cn("w-full h-full overflow-hidden relative group/gallery", className)}>
      <AnimatePresence mode="wait">
        <motion.img 
          key={validImages[currentIndex]}
          src={validImages[currentIndex]} 
          alt={`Gallery ${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('unsplash.com')) {
              target.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&h=800&q=80";
            }
          }}
        />
      </AnimatePresence>
      
      {validImages.length > 1 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/gallery:opacity-100 transition-opacity" />
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {validImages.map((_, i) => (
              <button 
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === currentIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white"
                )}
              />
            ))}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev > 0 ? prev - 1 : validImages.length - 1)); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 text-white rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-black/50 backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev < validImages.length - 1 ? prev + 1 : 0)); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 text-white rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-black/50 backdrop-blur-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

// Types
type Language = 'lt' | 'en' | 'de' | 'uk';

interface TranslationDict {
  [key: string]: {
    [lang in Language]: string;
  };
}

const TRANSLATIONS: TranslationDict = {
  home: { lt: 'Pradžia', en: 'Home', de: 'Startseite', uk: 'Головна' },
  solutions: { lt: 'Sprendimai', en: 'Solutions', de: 'Lösungen', uk: 'Рішення' },
  services: { lt: 'Paslaugos', en: 'Services', de: 'Dienstleistungen', uk: 'Послуги' },
  products: { lt: 'Produktai', en: 'Products', de: 'Produkte', uk: 'Продукція' },
  about: { lt: 'Apie mus', en: 'About', de: 'Über uns', uk: 'Про нас' },
  contact: { lt: 'Kontaktai', en: 'Contact', de: 'Kontakt', uk: 'Контакти' },
  
  // Solutions sub-items
  aviation: { lt: 'Aviacija', en: 'Aviation', de: 'Luftfahrt', uk: 'Авіація' },
  chemical_terminals: { lt: 'Chemijos terminalai', en: 'Chemical terminals', de: 'Chemikalienterminals', uk: 'Хімічні термінали' },
  lpg_terminals: { lt: 'SND terminalai', en: 'LPG terminals', de: 'Flüssiggasterminals (LPG)', uk: 'ЗВГ термінали' },
  oil_terminals: { lt: 'Naftos produktų terminalai', en: 'Oil product terminals', de: 'Erdölproduktterminals', uk: 'Термінали нафтопродуктів' },
  oil_production: { lt: 'Alyvų ir tepalų gamyba', en: 'Oil and lubricant production', de: 'Öl- und Schmierstoffproduktion', uk: 'Виробництво масел та мастил' },
  product_blending: { lt: 'Produktų maišymas', en: 'Product blending', de: 'Produktmischung', uk: 'Змішування продуктів' },
  railway: { lt: 'Geležinkelis', en: 'Railway', de: 'Eisenbahn', uk: 'Залізниця' },
  pipeline_cleaning: { lt: 'Vamzdynų išvalymo sistemos', en: 'Pipeline cleaning systems', de: 'Rohrreinigungs-Systeme', uk: 'Системи очищення трубопроводів' },
  
  // Services sub-items
  design: { lt: 'Projektavimas', en: 'Design', de: 'Planung', uk: 'Проєктування' },
  engineering_consulting: { lt: 'Inžinerinės konsultacijos', en: 'Engineering consulting', de: 'Ingenieurberatung', uk: 'Інженерні консультації' },
  technical_service: { lt: 'Techninis aptarnavimas', en: 'Technical service', de: 'Technischer Service', uk: 'Технічне обслуговування' },
  training: { lt: 'Apmokymai', en: 'Training', de: 'Schulungen', uk: 'Навчання' },
  spare_parts: { lt: 'Atsarginių dalių tiekimas', en: 'Spare parts supply', de: 'Ersatzteilversorgung', uk: 'Постачання запасних частин' },
  
  // Products sub-items
  flow_meters: { lt: 'Srauto matuokliai', en: 'Flow meters', de: 'Durchflussmesser', uk: 'Витратоміри' },
  flow_meters_accessories: { lt: 'Srauto matuoklių priedai', en: 'Flow meter accessories', de: 'Durchflussmesser-Zubehör', uk: 'Аксесуари для витратомірів' },
  level_meters: { lt: 'Lygio matuokliai', en: 'Level meters', de: 'Füllstandsmesser', uk: 'Рівнеміри' },
  industrial_pumps: { lt: 'Pramoniniai siurbliai', en: 'Industrial pumps', de: 'Industriepumpen', uk: 'Промислові насоси' },
  tanker_equipment: { lt: 'Autocisternų įranga', en: 'Tanker equipment', de: 'Tankwagenausrüstung', uk: 'Обладнання для автоцистерн' },
  pipeline_fittings: { lt: 'Vamzdynų armatūra', en: 'Pipeline fittings', de: 'Rohrleitungsarmaturen', uk: 'Трубопровідна арматура' },
  tank_fittings: { lt: 'Rezervuarų armatūra', en: 'Tank fittings', de: 'Behälterarmaturen', uk: 'Резервуарна арматура' },
  loading_arms: { lt: 'Užpylimo rankovės', en: 'Loading arms', de: 'Verladearme', uk: 'Наливні рукави' },
  terminal_equipment: { lt: 'Terminalų įranga', en: 'Terminal equipment', de: 'Terminalausrüstung', uk: 'Термінальне обладнання' },
  dry_disconnect: { lt: 'Sauso atjungimo movos', en: 'Dry disconnect couplings', de: 'Trockenkupplungen', uk: 'Сухі роз’ємні муфти' },
  
  // flow_meters subcategories
  flow_meters_volumetric: { lt: 'Tūriniai', en: 'Volumetric', de: 'Volumetrisch', uk: 'Об’ємні' },
  flow_meters_gear: { lt: 'Krumpliaratiniai', en: 'Gear', de: 'Zahnrad', uk: 'Шестерінчасті' },
  flow_meters_turbine: { lt: 'Turbininiai', en: 'Turbine', de: 'Turbine', uk: 'Турбінні' },
  flow_meters_coriolis: { lt: 'Koriolio masės', en: 'Coriolis Mass', de: 'Coriolis-Masse', uk: 'Коріолісові масові' },

  // tanker_equipment subcategories
  tanker_meters: { lt: 'Skaitikliai', en: 'Meters', de: 'Zähler', uk: 'Лічильники' },
  tanker_bottom_loading: { lt: 'Apatinio užpylimo įranga', en: 'Bottom loading equipment', de: 'Untenverladeausrüstung', uk: 'Обладнання для нижнього наливу' },
  tanker_pumps: { lt: 'Siurbliai', en: 'Pumps', de: 'Pumpen', uk: 'Насоси' },
  tanker_flow_computers: { lt: 'Srauto kompiuteriai', en: 'Flow computers', de: 'Durchflussrechner', uk: 'Потокові комп’ютери' },

  // pipeline_fittings subcategories
  pipeline_shutoff_valves: { lt: 'Uždaromoji armatūra', en: 'Shut-off valves', de: 'Absperrarmaturen', uk: 'Запірна armatūra' },
  pipeline_control_valves: { lt: 'Reguliuojamoji armatūra', en: 'Control valves', de: 'Regelarmaturen', uk: 'Регулююча арматура' },
  pipeline_safety_valves: { lt: 'Apsauginė armatūra (apsauginiai ir slėgio ribojimo vožtuvai)', en: 'Safety and pressure relief valves', de: 'Sicherheits- und Druckbegrenzungsventile', uk: 'Запобіжна та скидна арматура (запобіжні та перепускні клапани)' },
  pipeline_gate_valves: { lt: 'Pleištinės sklendės', en: 'Gate valves', de: 'Keilschieber', uk: 'Клинові засувки' },
  pipeline_ball_valves: { lt: 'Rutulinės sklendės', en: 'Ball valves', de: 'Kugelhähne', uk: 'Кульові крани' },
  pipeline_butterfly_valves: { lt: 'Peteliškės tipo sklendės', en: 'Butterfly valves', de: 'Absperrklappen', uk: 'Дискові затвори' },
  pipeline_dbb_valves: { lt: 'Kaištinės dvipusio sandarinimo sklendės (DBB – double block & bleed)', en: 'Plug DBB valves', de: 'Doppelblock- und Entleerungsschieber', uk: 'Клапани подвійного блокування та дренажу (DBB)' },
  pipeline_globe_valves: { lt: 'Ventiliai', en: 'Globe valves', de: 'Ventile', uk: 'Вентилі' },
  pipeline_check_valves: { lt: 'Atbuliniai vožtuvai', en: 'Check valves', de: 'Rückschlagventile', uk: 'Зворотні клапани' },
  pipeline_expansion_joints: { lt: 'Kompensatoriai', en: 'Expansion joints', de: 'Kompensatoren', uk: 'Компенсатори' },
  pipeline_strainers: { lt: 'Filtrai / purvo gaudytuvai', en: 'Strainers / dirt traps', de: 'Schmutzfänger / Filter', uk: 'Фільтри / грязовловлювачі' },
  pipeline_fittings_misc: { lt: 'Įvairūs fitingai', en: 'Various fittings', de: 'Verschiedene Fittings', uk: 'Різні фітинги' },
  pipeline_actuators: { lt: 'Pavaros (elektrinės, pneumatinės, hidraulinės, krumpliaratinės)', en: 'Actuators (electric, pneumatic, hydraulic, gear)', de: 'Stellantriebe (elektrisch, pneumatisch, hydraulisch, Getriebe)', uk: 'Приводи (електричні, pneumatyчні, hidravlični, regulyatorni)' },
  pipeline_coaxial_solenoid_valves: { lt: 'Koaksialiniai solenoidiniai (elektromagnetiniai) vožtuvai', en: 'Koaksialiniai solenoidiniai (elektromagnetiniai) vožtuvai', de: 'Koaxial-Magnetventile', uk: 'Коаксіальні електромагнітні клапани' },
  pipeline_air_release_valves: { lt: 'Nuorintojai (oro išleidimo vožtuvai)', en: 'Air release valves', de: 'Entlüftungsventile', uk: 'Повітровідвідники (клапани випуску повітря)' },
  pipeline_sight_glasses: { lt: 'Stebėjimo stiklai ir srauto indikatoriai', en: 'Sight glasses and flow indicators', de: 'Schaugläser und Durchflussanzeiger', uk: 'Оглядові стекла та індикатори потоку' },

  // tank_fittings subcategories
  tank_breather_valves: { lt: 'Kvėpavimo vožtuvai', en: 'Breather valves', de: 'Be- und Entlüftungsventile', uk: 'Дихальні клапани' },
  tank_emergency_vents: { lt: 'Avariniai vožtuvai', en: 'Emergency vents', de: 'Notbelüftungsventile', uk: 'Аварійні дихальні клапани' },
  tank_manholes: { lt: 'Liukai', en: 'Manholes', de: 'Mannlöcher / Luken', uk: 'Люки' },
  tank_flame_arresters: { lt: 'Ugnies užtvaros', en: 'Flame arresters', de: 'Deflagrationssicherungen', uk: 'Вогнезагороджувачі' },
  tank_sleeves: { lt: 'Rankovės', en: 'Hoses / Sleeves', de: 'Schläuche / Manschetten', uk: 'Рукави / Муфти' },
  tank_blanket_valves: { lt: 'Blanketo vožtuvai', en: 'Blanketing valves', de: 'Tankbegasungsventile', uk: 'Клапани азотного захисту (бланкування)' },

  // loading_arms subcategories
  loading_arms_bottom: { lt: 'Apatinio užpylimo', en: 'Bottom loading', de: 'Untenverladung', uk: 'Нижній налив' },
  loading_arms_top: { lt: 'Viršutinio užpylimo', en: 'Top loading', de: 'Obenverladung', uk: 'Верхній налив' },
  loading_arms_railway_unloading: { lt: 'Geležinkelio cisternų iškrovimo', en: 'Railway tanker unloading', de: 'Kesselwagen-Entladung', uk: 'Розвантаження залізничних цистерн' },

  // terminal_equipment subcategories
  terminal_flow_computers: { lt: 'Srauto kompiuterius', en: 'Flow computers', de: 'Durchflussrechner', uk: 'Потокові комп’ютери' },
  terminal_overfill_prevention: { lt: 'Apsaugos nuo cisternos perpylimo kontroleris', en: 'Overfill prevention controller', de: 'Überfüllsicherungskontroller', uk: 'Контролер захисту від переливу цистерни' },
  terminal_grounding_control: { lt: 'Įžeminimo kontrolės prietaisai', en: 'Grounding control devices', de: 'Erdungsprüfgeräte', uk: 'Пристрої контролю заземлення' },
  terminal_metering_systems: { lt: 'Apskaitos įrenginiai (matavimo sistemos)', en: 'Metering / measuring systems', de: 'Messsysteme', uk: 'Вузли обліку (вимірювальні системи)' },
  terminal_additive_injectors: { lt: 'Priedų dozatoriai', en: 'Additive injectors', de: 'Additivdosierer', uk: 'Дозатори присадок' },

  relatedSolutions: { lt: 'Susiję sprendimai', en: 'Related Solutions', de: 'Verwandte Lösungen', uk: 'Пов’язані рішення' },
  latestUpdates: { lt: 'Naujienos', en: 'Latest Updates', de: 'Aktuelle Updates', uk: 'Останні оновлення' },
  newPost: { lt: 'Naujas įrašas', en: 'New Post', de: 'Neuer Beitrag', uk: 'Новий пост' },
  login: { lt: 'Prisijungti', en: 'Login', de: 'Anmelden', uk: 'Увійти' },
  signOut: { lt: 'Atsijungti', en: 'Sign Out', de: 'Abmelden', uk: 'Вийти' },
  exploreTech: { lt: 'Mūsų sprendimai', en: 'Our Solutions', de: 'Unsere Lösungen', uk: 'Наші рішення' },
  ourMission: { lt: 'Mūsų misija', en: 'Our Mission', de: 'Unsere Mission', uk: 'Наша місія' },
  heroTitle: { 
    lt: 'MODERNŪS SPRENDIMAI NAFTOS IR CHEMIJOS PRAMONEI', 
    en: 'MODERN SOLUTIONS FOR THE OIL AND CHEMICAL INDUSTRY', 
    de: 'MODERNE LÖSUNGEN FÜR DIE ÖL- UND CHEMISCHE INDUSTRIE', 
    uk: 'СУЧАСНІ РІШЕННЯ ДЛЯ НАФТОВОЇ ТА ХІМІЧНОЇ ПРОМИСЛОВОСТІ' 
  },
heroSub: {
  lt: 'Projektuojame, diegiame ir automatizuojame skysčių perpylimo, maišymo ir apskaitos sistemas – nuo idėjos iki pilno įgyvendinimo.',
  en: 'We design, implement, and automate fluid transfer, blending, and metering systems – from concept to full implementation.',
  de: 'Wir planen, implementieren und automatisieren Systeme für Flüssigkeitsumschlag, Mischung und Messung – von der Idee bis zur vollständigen Umsetzung.',
  uk: 'Ми проєктуємо, впроваджуємо та автоматизуємо системи перекачування, змішування та обліку рідин — від ідеї до повної реалізації.'
},
  aboutTitle: { lt: 'Apie SPT', en: 'About SPT', de: 'Über SPT', uk: 'Про SPT' },
  aboutText1: { 
    lt: 'UAB „Skysčių perpylimo technologijos“ įkurta 2001 metais dviejų inžinierių su ankstesne patirtimi naftos produktų technologijų versle. Nuo pat pradžių įmonės tikslas buvo pramonei siūlyti modernius techninius sprendimus ir kokybišką įrangą. Įmonės veikla orientuota į naftos ir chemijos produktų pramonę.',
    en: 'UAB "Skysčių perpylimo technologijos" (Liquid Transfer Technologies) was founded in 2001 by two engineers with previous experience in the petroleum products technology business. From the very beginning, the company\'s goal has been to offer modern technical solutions and high-quality equipment to the industry. The company\'s activities are focused on the petroleum and chemical products industry.',
    de: 'UAB „Skysčių perpylimo technologijos“ wurde 2001 von zwei Ingenieuren mit langjähriger Erfahrung im Bereich der Mineralöltechnologie gegründet. Von Anfang an war es das Ziel des Unternehmens, der Industrie moderne technische Lösungen und hochwertige Ausrüstung anzubieten. Die Aktivitäten des Unternehmens konzentrieren sich auf die Mineralöl- und Chemieindustrie.',
    uk: 'ТОВ „Skysčių perpylimo technologijos“ засновано у 2001 році двома інженерами з досвідом роботи у сфері технологій нафтопродуктів. Від самого початку метою компанії було пропонувати промисловості сучасні технічні рішення та якісне обладнання. Діяльність компанії орієнтована на нафтову та хімічну промисловість.'
  },
  aboutText2: {
    lt: 'UAB „Skysčių perpylimo technologijos“ siekis yra teikti kompleksines paslaugas - inžinerines, projektavimo, tiekimo, surinkimo, instaliavimo, apmokymo ir aptarnavimo. Mes galime atlikti galimybių studijas, konsultuoti, projektuoti, montuoti ir programuoti.',
    en: 'UAB "Skysčių perpylimo technologijos" aims to provide comprehensive services - engineering, design, supply, assembly, installation, training, and service. We can perform feasibility studies, consult, design, install, and program.',
    de: 'UAB „Skysčių perpylimo technologijos“ ist bestrebt, umfassende Dienstleistungen anzubieten – Engineering, Design, Lieferung, Montage, Installation, Schulung und Service. Wir können Machbarkeitsstudien durchführen, beraten, entwerfen, installieren und programmieren.',
    uk: 'ТОВ „Skysčių perpylimo technologijos“ прагне надавати комплексні послуги – інжиніринг, проєктування, постачання, збірку, монтаж, навчання та обслуговування. Ми можемо проводити техніко-економічні обґрунтування, консультувати, проєктувати, монтувати та програмувати.'
  },
  translatePost: { lt: 'Išversti įrašą', en: 'Translate Post', de: 'Beitrag übersetzen', uk: 'Перекласти пост' },
  translating: { lt: 'Verčiama...', en: 'Translating...', de: 'Übersetzen...', uk: 'Переклад...' },
  search: { lt: 'Paieška', en: 'Search', de: 'Suche', uk: 'Пошук' },
  searchResults: { lt: 'Paieškos rezultatai', en: 'Search Results', de: 'Suchergebnisse', uk: 'Результати пошуку' },
  noResults: { lt: 'Rezultatų nerasta', en: 'No results found', de: 'Keine Ergebnisse gefunden', uk: 'Результатів не знайдено' },
  editPage: { lt: 'Redaguoti puslapį', en: 'Edit Page', de: 'Seite bearbeiten', uk: 'Редагувати сторінку' },
  savePage: { lt: 'Išsaugoti puslapį', en: 'Save Page', de: 'Seite speichern', uk: 'Зберегти сторінку' },
  backToNews: { lt: 'Atgal į naujienas', en: 'Back to News', de: 'Zurück zu den News', uk: 'Назад до новин' },
  back: { lt: 'Grįžti', en: 'Back', de: 'Zurück', uk: 'Назад' },
  relatedCategories: { lt: 'Kiti susiję skyriai', en: 'Other related sections', de: 'Andere verwandte Bereiche', uk: 'Інші пов’язані розділи' },
  learnMore: {
    lt: "Sužinoti daugiau",
    en: "Learn More",
    de: "Mehr erfahren",
    uk: "Дізнатися більше",
  },
  viewMore: { lt: 'Rodyti daugiau', en: 'View More', de: 'Mehr anzeigen', uk: 'Показати більше' },
  readMore: { lt: 'Skaityti toliau', en: 'Read More', de: 'Weiterlesen', uk: 'Читати далі' },
  quickLinks: { lt: 'Nuorodos', en: 'Quick Links', de: 'Schnelllinks', uk: 'Корисні посилання' },
  legal: { lt: 'Teisinė informacija', en: 'Legal', de: 'Rechtliches', uk: 'Юридична інформація' },
  allRightsReserved: { lt: 'Visos teisės saugomos', en: 'All rights reserved', de: 'Alle Rechte vorbehalten', uk: 'Усі права захищені' },
  footerDesc: { 
    lt: 'Mūsų specialistai projektuoja ir diegia modernias skysčių perpylimo bei apskaitos sistemas visame pasaulyje.', 
    en: 'Our specialists design and implement modern fluid transfer and metering systems worldwide.', 
    de: 'Unsere Spezialisten planen und implementieren weltweit moderne Systeme für den Flüssigkeitsumschlag und die Messung.', 
    uk: 'Наші фахівці проєктують та впроваджують сучасні системи перекачування та обліку рідин по всьоому світу.' 
  },
  privacyPolicy: { lt: 'Privatumo politika', en: 'Privacy Policy', de: 'Datenschutzerklärung', uk: 'Політика конфіденційності' },
  termsOfService: { lt: 'Paslaugų sąlygos', en: 'Terms of Service', de: 'Nutzungsbedingungen', uk: 'Умови використання' },
  showLess: { lt: 'Rodyti mažiau', en: 'Show Less', de: 'Weniger anzeigen', uk: 'Згорнути' },
  confirmDeleteCard: { lt: 'Ar tikrai norite ištrinti šią kortelę?', en: 'Are you sure you want to delete this card?', de: 'Möchten Sie diese Karte wirklich löschen?', uk: 'Ви дійсно хочете видалити цю картку?' },
  actionCannotBeUndone: { lt: 'Šis veiksmas negali būti atšauktas.', en: 'This action cannot be undone.', de: 'Diese Aktion kann nicht rückgängig gemacht werden.', uk: 'Цю дію не можна скасувати.' },
  yes: { lt: 'Taip', en: 'Yes', de: 'Ja', uk: 'Так' },
  cancel: { lt: 'Atšaukti', en: 'Cancel', de: 'Abbrechen', uk: 'Скасувати' },
  save: { lt: 'Išsaugoti', en: 'Save', de: 'Speichern', uk: 'Зберегти' },
  delete: { lt: 'Ištrinti', en: 'Delete', de: 'Löschen', uk: 'Видалити' },
  edit: { lt: 'Redaguoti', en: 'Edit', de: 'Bearbeiten', uk: 'Редагувати' },
  createPost: { lt: 'Sukurti naują įrašą', en: 'Create new post', de: 'Neuen Beitrag erstellen', uk: 'Створити новий пост' },
  editPostForm: { lt: 'Redaguoti įrašą', en: 'Edit post', de: 'Beitrag bearbeiten', uk: 'Редагувати пост' },
  titleLabel: { lt: 'Antraštė', en: 'Heading', de: 'Überschrift', uk: 'Заголовок' },
  titlePlaceholder: { lt: 'Įveskite įsimintiną antraštę...', en: 'Enter a memorable heading...', de: 'Geben Sie eine einprägsame Überschrift ein...', uk: 'Введіть заголовок...' },
  postImagesLabel: { lt: 'Įrašo nuotraukos', en: 'Post images', de: 'Beitragsbilder', uk: 'Фотографії поста' },
  aspectRatioLabel: { lt: 'Proporcija', en: 'Aspect Ratio', de: 'Seitenverhältnis', uk: 'Співвідношення сторін' },
  visibilityLabel: { lt: 'Matomumas', en: 'Visibility', de: 'Sichtbarkeit', uk: 'Видимість' },
  published: { lt: 'Paskelbta', en: 'Published', de: 'Veröffentlicht', uk: 'Опубліковано' },
  draft: { lt: 'Juodraštis', en: 'Draft', de: 'Entwurf', uk: 'Чернетка' },
  pinToTop: { lt: 'Prikabinti viršuje', en: 'Pin to top', de: 'Anpinnen', uk: 'Закріпити вгорі' },
  pinnedToTop: { lt: 'Prikabinta viršuje', en: 'Pinned to top', de: 'Angepinnt', uk: 'Закріплено вгорі' },
  contentLabel: { lt: 'Turinys', en: 'Content', de: 'Inhalt', uk: 'Вміст' },
  storyPlaceholder: { lt: 'Rašykite savo istoriją čia... formatavimui naudokite įrankių juostą.', en: 'Write your story here... use toolbar for formatting.', de: 'Schreiben Sie Ihre Geschichte hier... nutzen Sie die Symbolleiste zur Formatierung.', uk: 'Пишіть свою історію тут... використовуйте панель інструментів для форматування.' },
  livePreview: { lt: 'Momentinis atvaizdavimas (Live Preview)', en: 'Live Preview', de: 'Live-Vorschau', uk: 'Попередній перегляд' },
  wordStyle: { lt: 'Word stilius', en: 'Word style', de: 'Word-Stil', uk: 'Стиль Word' },
  documentPlaceholder: { lt: 'Pradėkite rašyti kad pamatytumėte peržiūrą...', en: 'Start writing to see preview...', de: 'Beginnen Sie zu schreiben, um eine Vorschau zu sehen...', uk: 'Почніть писати, щоб побачити попередній перегляд...' },
  documentHeader: { lt: 'UAB SPT Dokumentas', en: 'UAB SPT Document', de: 'UAB SPT Dokument', uk: 'Документ ТОВ SPT' },
  savePostButton: { lt: 'Išsaugoti įrašą', en: 'Save Post', de: 'Beitrag speichern', uk: 'Зберегти пост' },
  areYouSure: { lt: 'Ar esate visiškai tikri?', en: 'Are you absolutely sure?', de: 'Sind Sie absolut sicher?', uk: 'Ви абсолютно впевнені?' },
  permanentlyRemovePost: { lt: 'Šio veiksmo atšaukti negalima. Šis įrašas bus visam laikui pašalintas iš duomenų bazės.', en: 'This action cannot be undone. This post will be permanently removed from the database.', de: 'Diese Aktion kann nicht rückgängig gemacht werden. Dieser Beitrag wird dauerhaft aus der Datenbank gelöscht.', uk: 'Цю дію не можна скасувати. Цей пост буде остаточно видалено з бази даних.' },
  yesDeletePermanently: { lt: 'Taip, ištrinti visam laikui', en: 'Yes, delete permanently', de: 'Ja, dauerhaft löschen', uk: 'Так, видалити назавжди' },
  yesDelete: { lt: 'Taip, ištrinti', en: 'Yes, delete', de: 'Ja, löschen', uk: 'Так, видалити' },
  postNotFound: { lt: 'Įrašas nerastas', en: 'Post not found', de: 'Beitrag nicht gefunden', uk: 'Пост не знайдено' },
  recently: { lt: 'Neseniai', en: 'Recently', de: 'Vor kurzem', uk: 'Нещодавно' },
  fullNamePlaceholder: { lt: 'Vardas, Pavardė', en: 'Full Name', de: 'Name, Vorname', uk: 'Ім’я, Прізвище' },
  emailPlaceholder: { lt: 'El. pašto adresas', en: 'Email Address', de: 'E-Mail-Adresse', uk: 'Електронна адреса' },
  messagePlaceholder: { lt: 'Jūsų žinutė', en: 'Your Message', de: 'Ihre Nachricht', uk: 'Ваше повідомлення' },
  sendMessage: { lt: 'Siųsti žinutę', en: 'Send Message', de: 'Nachricht senden', uk: 'Надіслати повідомлення' },
  pageTitleLabel: { lt: 'Puslapio pavadinimas', en: 'Page Title', de: 'Seitentitel', uk: 'Назва сторінки' },
  pageImagesLabel: { lt: 'Puslapio nuotraukos', en: 'Page images', de: 'Seitenbilder', uk: 'Фотографії сторінки' },
  pageContentPlaceholder: { lt: 'Parašykite puslapio turinį čia... formatavimui naudokite įrankių juostą.', en: 'Write the page content here... use toolbar for formatting.', de: 'Schreiben Sie den Seiteninhalt hier... nutzen Sie die Symbolleiste zur Formatierung.', uk: 'Напишіть вміст сторінки тут... використовуйте панель інструментів для форматування.' },
  addStatButton: { lt: '+ Pridėti statistiką', en: '+ Add Stat', de: '+ Statistik hinzufügen', uk: '+ Додати статистику' },
  companyStatsLabel: { lt: 'Įmonės statistika', en: 'Company Stats', de: 'Unternehmensstatistik', uk: 'Статистика компанії' },
  statValuePlaceholder: { lt: 'Reikšmė (pvz., 20+)', en: 'Value (e.g., 20+)', de: 'Wert (z.B. 20+)', uk: 'Значення (наприклад, 20+)' },
  statLabelPlaceholder: { lt: 'Aprašymas (pvz., Metų patirtis)', en: 'Description (e.g., Years of experience)', de: 'Beschreibung (z.B. Jahre der Erfahrung)', uk: 'Опис (наприклад, років досвіду)' },
  previewPrompt: { lt: 'Pradėkite rašyti kad pamatytumėte peržiūrą...', en: 'Start writing to see preview...', de: 'Beginnen Sie zu schreiben, um eine Vorschau zu sehen...', uk: 'Почніть писати, щоб побачити попередній перегляд...' },
  contactSuccess: { lt: 'Žinutė sėkmingai išsiųsta! Taip pat galite atidaryti el. pašto programą norėdami išsiųsti kopiją.', en: 'Message sent successfully! You can also open your email client to send a copy.', de: 'Nachricht erfolgreich gesendet! Sie können auch Ihr E-Mail-Programm öffnen, um eine Kopie zu senden.', uk: 'Повідомлення успішно надіслано! Ви також можете відкрити поштовий клієнт, щоб надіслати копію.' },
  contactError: { lt: 'Klaida siunčiant žinutę. Bandykite dar kartą.', en: 'Error sending message. Please try again.', de: 'Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.', uk: 'Помилка надсилання повідомлення. Будь ласка, спробуйте ще раз.' },
  contactValidationAllFields: { lt: 'Prašome užpildyti visus laukus.', en: 'Please fill in all fields.', de: 'Bitte füllen Sie alle Felder aus.', uk: 'Будь ласка, заповніть усі поля.' },
  contactValidationEmail: { lt: 'Prašome įvesti teisingą el. pašto adresą.', en: 'Please enter a valid email address.', de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.', uk: 'Будь ласка, введіть коректну adresu електронної пошти.' },
  contactSending: { lt: 'Siunčiama...', en: 'Sending...', de: 'Wird gesendet...', uk: 'Надсилання...' },
  directMailOption: { lt: 'Arba parašykite mums el. paštu tiesiogiai:', en: 'Or email us directly:', de: 'Oder schreiben Sie uns direkt per E-Mail:', uk: 'Або напишіть нам на електронну пошту безпосередньо:' },
  captchaLabel: { lt: 'Saugos kodas (CAPTCHA)', en: 'Security Code (CAPTCHA)', de: 'Sicherheitscode (CAPTCHA)', uk: 'Код bezpečnosti (CAPTCHA)' },
  captchaPlaceholder: { lt: 'Įveskite saugos kodą', en: 'Enter security code', de: 'Sicherheitscode eingeben', uk: 'Введіть код безпеки' },
  captchaValidationError: { lt: 'Neteisingas saugos kodas. Bandykite dar kartą.', en: 'Incorrect security code. Please try again.', de: 'Falscher Sicherheitscode. Bitte versuchen Sie es erneut.', uk: 'Невірний код безпеки. Будь ласка, спробуйте ще раз.' },
  captchaRegenerate: { lt: 'Atnaujinti kodą', en: 'Refresh code', de: 'Code aktualisieren', uk: 'Оновити код' }
};

interface NewsPost {
  id: string;
  title: { [lang in Language]: string } | string;
  content: { [lang in Language]: string } | string;
  imageUrls: string[];
  createdAt: any;
  updatedAt?: any;
  isPublished: boolean;
  isPinned?: boolean;
  aspectRatio?: string;
}

interface PageContent {
  id: string;
  title: { [lang in Language]: string };
  content: { [lang in Language]: string };
  imageUrls: string[];
  updatedAt: any;
  aspectRatio?: string;
  parentId?: string;
  stats?: { value: { [lang in Language]: string }; label: { [lang in Language]: string } }[];
  isDeleted?: boolean;
}

interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  displayName: string;
}

type Page = 'home' | 'solutions' | 'services' | 'products' | 'about' | 'contact' | 'search' |
  'aviation' | 'chemical_terminals' | 'lpg_terminals' | 'oil_terminals' | 'oil_production' | 'product_blending' | 'railway' | 'pipeline_cleaning' |
  'design' | 'engineering_consulting' | 'technical_service' | 'training' | 'spare_parts' |
  'flow_meters' | 'level_meters' | 'industrial_pumps' | 'tanker_equipment' | 'pipeline_fittings' | 'tank_fittings' | 'loading_arms' | 'terminal_equipment' | 'dry_disconnect' | string;

// Constants
const ADMIN_EMAILS = ["ema.uleckaite@gmail.com", "dgarmus@spt.lt", "dgarmus@spt.com"];
const PRIMARY_RED = "#C42727";

const MENU_STRUCTURE = [
  { id: 'home' },
  { 
    id: 'solutions', 
    sub: ['aviation', 'chemical_terminals', 'lpg_terminals', 'oil_terminals', 'oil_production', 'product_blending', 'railway', 'pipeline_cleaning'] 
  },
  { 
    id: 'services', 
    sub: ['design', 'engineering_consulting', 'technical_service', 'training', 'spare_parts'] 
  },
  { 
    id: 'products', 
    sub: ['flow_meters', 'level_meters', 'industrial_pumps', 'tanker_equipment', 'pipeline_fittings', 'tank_fittings', 'loading_arms', 'terminal_equipment', 'dry_disconnect'] 
  },
  { id: 'about' },
  { id: 'contact' }
];

const NESTED_STRUCTURES: Record<string, string[]> = {
  'flow_meters': ['flow_meters_volumetric', 'flow_meters_gear', 'flow_meters_turbine', 'flow_meters_coriolis', 'flow_meters_accessories'],
  'tanker_equipment': ['tanker_meters', 'tanker_bottom_loading', 'tanker_pumps', 'tanker_flow_computers'],
  'pipeline_fittings': [
    'pipeline_shutoff_valves',
    'pipeline_control_valves',
    'pipeline_safety_valves',
    'pipeline_gate_valves',
    'pipeline_ball_valves',
    'pipeline_butterfly_valves',
    'pipeline_dbb_valves',
    'pipeline_globe_valves',
    'pipeline_check_valves',
    'pipeline_expansion_joints',
    'pipeline_strainers',
    'pipeline_fittings_misc',
    'pipeline_actuators',
    'pipeline_coaxial_solenoid_valves',
    'pipeline_air_release_valves',
    'pipeline_sight_glasses'
  ],
  'tank_fittings': [
    'tank_breather_valves',
    'tank_emergency_vents',
    'tank_manholes',
    'tank_flame_arresters',
    'tank_sleeves',
    'tank_blanket_valves'
  ],
  'loading_arms': [
    'loading_arms_bottom',
    'loading_arms_top',
    'loading_arms_railway_unloading'
  ],
  'terminal_equipment': [
    'terminal_flow_computers',
    'terminal_overfill_prevention',
    'terminal_grounding_control',
    'terminal_metering_systems',
    'terminal_additive_injectors'
  ]
};

const isStaticPage = (id: string) => {
  const staticKeys = [
    'home', 'solutions', 'services', 'products', 'about', 'contact',
    'aviation', 'chemical_terminals', 'lpg_terminals', 'oil_terminals', 'oil_production', 'product_blending', 'railway', 'pipeline_cleaning',
    'design', 'engineering_consulting', 'technical_service', 'training', 'spare_parts',
    'flow_meters', 'level_meters', 'industrial_pumps', 'tanker_equipment', 'pipeline_fittings', 'tank_fittings', 'loading_arms', 'terminal_equipment', 'dry_disconnect',
    'flow_meters_volumetric', 'flow_meters_gear', 'flow_meters_turbine', 'flow_meters_coriolis', 'flow_meters_accessories',
    'tanker_meters', 'tanker_bottom_loading', 'tanker_pumps', 'tanker_flow_computers',
    'pipeline_shutoff_valves', 'pipeline_control_valves', 'pipeline_safety_valves', 'pipeline_gate_valves', 'pipeline_ball_valves', 'pipeline_butterfly_valves', 'pipeline_dbb_valves', 'pipeline_globe_valves', 'pipeline_check_valves', 'pipeline_expansion_joints', 'pipeline_strainers', 'pipeline_fittings_misc', 'pipeline_actuators', 'pipeline_coaxial_solenoid_valves', 'pipeline_air_release_valves', 'pipeline_sight_glasses',
    'tank_breather_valves', 'tank_emergency_vents', 'tank_manholes', 'tank_flame_arresters', 'tank_sleeves', 'tank_blanket_valves',
    'loading_arms_bottom', 'loading_arms_top', 'loading_arms_railway_unloading',
    'terminal_flow_computers', 'terminal_overfill_prevention', 'terminal_grounding_control', 'terminal_metering_systems', 'terminal_additive_injectors'
  ];
  return staticKeys.includes(id);
};

function NavDropdown({ 
  item, 
  pagesContent,
  currentPage, 
  setCurrentPage, 
  t 
}: { 
  item: { id: string; sub?: string[] }; 
  pagesContent?: Record<string, PageContent>;
  currentPage: string; 
  setCurrentPage: (p: any) => void;
  t: (key: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleSubs = item.sub?.filter(subId => pagesContent?.[subId]?.isDeleted !== true) || [];
  const isActive = currentPage === item.id || (visibleSubs.includes(currentPage as any));

  if (visibleSubs.length === 0) {
    return (
      <button 
        onClick={() => setCurrentPage(item.id as any)}
        className={cn(
          "text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
          currentPage === item.id ? "text-red-600" : "text-gray-500 hover:text-black"
        )}
        style={{ borderStyle: 'none' }}
      >
        {t(item.id)}
      </button>
    );
  }

  return (
    <div 
      className="relative group h-full flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button 
        onClick={() => {
          setCurrentPage(item.id as any);
          setIsOpen(false);
        }}
        className={cn(
          "text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-1 whitespace-nowrap",
          isActive ? "text-red-600" : "text-gray-500 hover:text-black"
        )}
        style={{ borderStyle: 'none' }}
      >
        {t(item.id)}
        <ChevronRight className={cn("w-3 h-3 transition-transform rotate-90", isOpen && "rotate-[-90deg]")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 top-[calc(100%-10px)] w-64 bg-white shadow-xl border border-gray-100 py-2 rounded-lg z-50"
          >
            {visibleSubs.map(subId => (
              <button
                key={subId}
                onClick={() => {
                  setCurrentPage(subId as any);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors",
                  currentPage === subId ? "bg-red-50 text-red-600" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                {t(subId)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/SPT_web">
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function AdminPage({ 
  user, 
  profile, 
  isAdmin, 
  handleLogin, 
  handleLogout, 
  t 
}: { 
  user: FirebaseUser | null; 
  profile: UserProfile | null; 
  isAdmin: boolean; 
  handleLogin: () => void; 
  handleLogout: () => void; 
  t: (key: string) => string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setSuccess('Account created! A verification email has been sent to your inbox.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        setSuccess('Verification email resent! Please check your inbox.');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  if (user && isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Administratoriaus prieiga suteikta</h2>
          <p className="text-gray-600 mb-4">Esate prisijungęs kaip {user.email}</p>
          
          {user.email && !user.emailVerified && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-left">
              <div className="flex items-center gap-2 text-yellow-700 font-bold text-sm mb-2">
                <Clock className="w-4 h-4" />
                El. pašto adresas nepatvirtintas
              </div>
              <p className="text-xs text-yellow-600 mb-4">
                Jūsų el. pašto adresas nepatvirtintas. Kai kurios funkcijos gali būti ribojamos, kol nepatvirtinsite el. pašto adreso.
              </p>
              <button 
                onClick={handleResendVerification}
                className="text-[10px] font-black uppercase tracking-widest text-yellow-700 hover:text-yellow-800 underline"
              >
                Persiųsti patvirtinimo laišką
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <button 
              onClick={() => navigate('/')}
              className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
            >
              Eiti į svetainę
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Atsijungti
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Prieiga nesuteikta</h2>
          <p className="text-gray-600 mb-8">Esate prisijungęs kaip {user.email}, tačiau neturite administratoriaus teisių.</p>
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/')}
              className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
            >
              Eiti į svetainę
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Atsijungti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="text-center mb-8">
          <img src="./logotipas_spt.png" alt="SPT" className="h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">Admin portalas</h2>
          <p className="text-gray-500 text-sm">Prisijunkite prie svetainės valdymo</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100">
            {success}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">El. pašto adresas</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-red-600 transition-all"
              placeholder="dgarmus@spt.lt"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Slaptažodis</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-red-600 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
          >
            {isRegistering ? 'Sukurti paskyrą' : 'Prisijungti su el. paštu'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
            <span className="bg-white px-4 text-gray-300">Arba</span>
          </div>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full py-4 border-2 border-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          Prisijungti su Google
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-bold text-gray-400 hover:text-red-600 transition-colors uppercase tracking-widest"
          >
            {isRegistering ? 'Jau turite paskyrą? Prisijunkite' : 'Reikia paskyros? Registruokitės'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-3 h-3" /> Grįžti į pradžią
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [language, setLanguage] = useState<Language>('lt');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
  const [editForm, setEditForm] = useState<Partial<NewsPost>>({
    title: { lt: '', en: '', de: '', uk: '' },
    content: { lt: '', en: '', de: '', uk: '' },
    imageUrls: [],
    isPublished: true,
    isPinned: false,
    aspectRatio: '16:9'
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState<NewsPost[]>([]); 
  const [pagesContent, setPagesContent] = useState<Record<string, PageContent>>({});
  const [isEditingPage, setIsEditingPage] = useState<string | null>(null);
  const [pageEditForm, setPageEditForm] = useState<Partial<PageContent>>({});
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [expandedMobileCategories, setExpandedMobileCategories] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<{ parentId: string, itemId: string } | null>(null);
  const [visiblePosts, setVisiblePosts] = useState(6);
  const [menuStructureState, setMenuStructureState] = useState(MENU_STRUCTURE);
  const [nestedStructuresState, setNestedStructuresState] = useState(NESTED_STRUCTURES);
  const [isOpenTOCEditor, setIsOpenTOCEditor] = useState(false);

  // TOC Form states
  const [newSubParentId, setNewSubParentId] = useState('');
  const [newSubId, setNewSubId] = useState('');
  const [newSubTitleLt, setNewSubTitleLt] = useState('');
  const [newSubTitleEn, setNewSubTitleEn] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [tocError, setTocError] = useState<string | null>(null);

  useEffect(() => {
    if (!showAddForm) {
      setTocError(null);
    }
  }, [showAddForm]);

  // Contact Form states, CAPTCHA, & submit handler
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactStatus, setContactStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Captcha configuration
  const [captchaText, setCaptchaText] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excluding ambiguous 0, O, I, 1
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
    setUserCaptchaInput('');
  };

  useEffect(() => {
    if (currentPage === 'contact') {
      generateCaptcha();
    }
  }, [currentPage]);

  useEffect(() => {
    if (canvasRef.current && captchaText) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Soft linear background gradient
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#f9fafb');
        grad.addColorStop(1, '#f3f4f6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Noise dots
        ctx.fillStyle = '#cbd5e1';
        for (let i = 0; i < 35; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * canvas.width, 
            Math.random() * canvas.height, 
            1 + Math.random() * 1.5, 
            0, 
            Math.PI * 2
          );
          ctx.fill();
        }
        
        // Random visual interference lines
        ctx.strokeStyle = '#94a3b8';
        for (let i = 0; i < 4; i++) {
          ctx.lineWidth = 1 + Math.random();
          ctx.beginPath();
          ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
          ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
          ctx.stroke();
        }
        
        // Render stylized alphanumeric characters with random rotation, color, and size
        ctx.textBaseline = 'middle';
        const colors = ['#dc2626', '#1f2937', '#2563eb', '#059669', '#7c3aed'];
        
        for (let i = 0; i < captchaText.length; i++) {
          const letter = captchaText[i];
          ctx.font = `bold ${22 + Math.random() * 4}px monospace`;
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          
          ctx.save();
          const xPos = 18 + i * 24 + Math.random() * 4;
          const yPos = canvas.height / 2 + (Math.random() * 6 - 3);
          ctx.translate(xPos, yPos);
          
          const angle = (Math.random() * 30 - 15) * Math.PI / 180;
          ctx.rotate(angle);
          
          ctx.fillText(letter, -8, 0);
          ctx.restore();
        }
      }
    }
  }, [captchaText]);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus(null);

    // Initial basic validation
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactStatus({ type: 'error', text: t('contactValidationAllFields') });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail.trim())) {
      setContactStatus({ type: 'error', text: t('contactValidationEmail') });
      return;
    }

    // CAPTCHA verification (case-insensitive)
    if (userCaptchaInput.trim().toUpperCase() !== captchaText) {
      setContactStatus({ type: 'error', text: t('captchaValidationError') });
      generateCaptcha(); // regenerate for next attempt
      return;
    }

    setIsSendingContact(true);
    try {
      // Build native mailto link as requested to avoid database storage while guaranteeing message sending
      const subject = `Užklausa iš SPT svetainės nuo: ${contactName.trim()}`;
      const body = `Vardas: ${contactName.trim()}\nEl. paštas: ${contactEmail.trim()}\n\nŽinutė:\n${contactMessage.trim()}`;
      
      const mailtoUrl = `mailto:dgarmus@spt.lt?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Open native mail app draft
      window.location.href = mailtoUrl;

      setContactStatus({ type: 'success', text: t('contactSuccess') });
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setUserCaptchaInput('');
    } catch (err) {
      console.error("Failed to construct email:", err);
      setContactStatus({ type: 'error', text: t('contactError') });
    } finally {
      setIsSendingContact(false);
    }
  };

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitleLt, setEditItemTitleLt] = useState('');
  const [editItemTitleEn, setEditItemTitleEn] = useState('');
  const [editItemTitleDe, setEditItemTitleDe] = useState('');
  const [editItemTitleUk, setEditItemTitleUk] = useState('');

  // Test Connection
  useEffect(() => {
    if (!db) return;
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Navigation Configuration Listener
  useEffect(() => {
    if (!isAuthReady || !db) return;
    const unsub = onSnapshot(doc(db, 'config', 'navigation'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.menuStructure) {
          setMenuStructureState(data.menuStructure);
        }
        if (data.nestedStructures) {
          setNestedStructuresState(data.nestedStructures);
        }
      }
    }, (error) => {
      console.info("Navigation config: using default structures.", error.message);
    });
    return () => unsub();
  }, [isAuthReady]);

  const handleSaveNavigationStructure = async (updatedMenu: typeof MENU_STRUCTURE, updatedNested: typeof NESTED_STRUCTURES) => {
    if (!db || !isAdmin) return;
    try {
      await setDoc(doc(db, 'config', 'navigation'), {
        menuStructure: updatedMenu,
        nestedStructures: updatedNested,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Failed to save navigation structure:", error);
      alert("Nepavyko išsaugoti struktūros: " + (error instanceof Error ? error.message : "Žr. konsolę"));
    }
  };

  const swapArrayElements = <T,>(arr: T[], i: number, j: number): T[] => {
    if (i < 0 || i >= arr.length || j < 0 || j >= arr.length) return arr;
    const copy = [...arr];
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
    return copy;
  };

  const handleMoveItem = async (parentId: string, itemId: string, direction: 'up' | 'down') => {
    const inNested = nestedStructuresState[parentId];
    if (inNested) {
      const index = inNested.indexOf(itemId);
      if (index === -1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= inNested.length) return;
      const updatedArray = swapArrayElements(inNested, index, targetIndex);
      const updatedNested = {
        ...nestedStructuresState,
        [parentId]: updatedArray
      };
      setNestedStructuresState(updatedNested);
      await handleSaveNavigationStructure(menuStructureState, updatedNested);
    } else {
      const menuIdx = menuStructureState.findIndex(m => m.id === parentId);
      if (menuIdx !== -1) {
        const subs = menuStructureState[menuIdx].sub || [];
        const index = subs.indexOf(itemId);
        if (index === -1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= subs.length) return;
        const updatedSubs = swapArrayElements(subs, index, targetIndex);
        const updatedMenu = [...menuStructureState];
        updatedMenu[menuIdx] = {
          ...updatedMenu[menuIdx],
          sub: updatedSubs
        };
        setMenuStructureState(updatedMenu);
        await handleSaveNavigationStructure(updatedMenu, nestedStructuresState);
      }
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocError(null);
    if (!newSubId || !newSubTitleLt || !newSubTitleEn) {
      setTocError("Prašome užpildyti visus laukus.");
      return;
    }

    const cleanedId = newSubId.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    
    // Check static or active identifier
    if (isStaticPage(cleanedId)) {
      setTocError("Šis ID yra rezervuotas sistemos puslapis. Nurodykite kitą ID.");
      return;
    }
    
    const existingPage = pagesContent[cleanedId];
    if (existingPage && existingPage.isDeleted !== true) {
      setTocError(`Šis ID (${cleanedId}) jau naudojamas aktyviam puslapiui: "${existingPage.title?.lt || cleanedId}". Prašome nurodyti unikalų ID.`);
      return;
    }

    const isRestoring = existingPage && existingPage.isDeleted === true;

    try {
      if (isRestoring) {
        // Undelete the page and update its properties
        await setDoc(doc(db, 'pages', cleanedId), {
          ...existingPage,
          title: { lt: newSubTitleLt, en: newSubTitleEn, de: newSubTitleEn, uk: newSubTitleEn },
          parentId: newSubParentId,
          isDeleted: false,
          updatedAt: Timestamp.now()
        });
      } else {
        // Create new page
        await setDoc(doc(db, 'pages', cleanedId), {
          id: cleanedId,
          title: { lt: newSubTitleLt, en: newSubTitleEn, de: newSubTitleEn, uk: newSubTitleEn },
          content: { lt: '', en: '', de: '', uk: '' },
          imageUrls: [],
          parentId: newSubParentId,
          isDeleted: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      let updatedMenu = [...menuStructureState];
      let updatedNested = { ...nestedStructuresState };

      if (updatedNested[newSubParentId]) {
        if (!updatedNested[newSubParentId].includes(cleanedId)) {
          updatedNested[newSubParentId] = [...updatedNested[newSubParentId], cleanedId];
        }
      } else {
        const menuIdx = updatedMenu.findIndex(m => m.id === newSubParentId);
        if (menuIdx !== -1) {
          const currentSubs = updatedMenu[menuIdx].sub || [];
          if (!currentSubs.includes(cleanedId)) {
            updatedMenu[menuIdx] = {
              ...updatedMenu[menuIdx],
              sub: [...currentSubs, cleanedId]
            };
          }
        } else {
          updatedNested[newSubParentId] = [cleanedId];
        }
      }

      setMenuStructureState(updatedMenu);
      setNestedStructuresState(updatedNested);
      await handleSaveNavigationStructure(updatedMenu, updatedNested);

      setNewSubId('');
      setNewSubTitleLt('');
      setNewSubTitleEn('');
      setShowAddForm(false);
      
      if (isRestoring) {
        alert(`Puslapis "${newSubTitleLt}" su ID "${cleanedId}" buvo sėkmingai atkurtas!`);
      }
    } catch (err) {
      console.error("Failed to add subcategory:", err);
      setTocError("Nepavyko sukurti: " + (err instanceof Error ? err.message : "Nežinoma klaida"));
    }
  };

  const handleSaveTitleEdit = async (itemId: string) => {
    try {
      await setDoc(doc(db, 'pages', itemId), {
        title: {
          lt: editItemTitleLt,
          en: editItemTitleEn,
          de: editItemTitleDe || editItemTitleEn,
          uk: editItemTitleUk || editItemTitleEn
        },
        id: itemId,
        updatedAt: Timestamp.now()
      }, { merge: true });

      setEditingItemId(null);
    } catch (err) {
      console.error("Failed to update item title:", err);
      alert("Nepavyko atnaujinti pavadinimo.");
    }
  };

  const cleanseItemFromStructure = async (id: string) => {
    setMenuStructureState(prevMenu => {
      const updatedMenu = prevMenu.map(m => {
        const sub = m.sub || [];
        return {
          ...m,
          sub: sub.filter(subId => subId !== id)
        };
      });

      setNestedStructuresState(prevNested => {
        const updatedNested = { ...prevNested };
        for (const [pId, subs] of Object.entries(updatedNested)) {
          if (Array.isArray(subs)) {
            updatedNested[pId] = subs.filter(subId => subId !== id);
          }
        }
        if (updatedNested[id]) {
          delete updatedNested[id];
        }

        handleSaveNavigationStructure(updatedMenu, updatedNested).catch(console.error);
        return updatedNested;
      });

      return updatedMenu;
    });
  };

  const handleDeletePage = async (id: string) => {
    if (!profile || profile.role !== 'admin' || !db) return;
    try {
      await setDoc(doc(db, 'pages', id), {
        isDeleted: true,
        updatedAt: Timestamp.now()
      }, { merge: true });

      await cleanseItemFromStructure(id);
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `pages/${id}`);
    }
  };

  const handleDeleteCategoryItem = async (parentId: string, itemId: string) => {
    setDeleteConfirmCategory({ parentId, itemId });
  };

  // Auth Listener
  useEffect(() => {
    if (!auth) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Set a temporary profile immediately based on email
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email)) ? 'admin' : 'user',
          displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest' : 'User')
        };
        setProfile(initialProfile);

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            // If the database has a different role, update it (unless it's the admin email)
            if (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email) && data.role !== 'admin') {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
              setProfile({ uid: firebaseUser.uid, ...data, role: 'admin' } as UserProfile);
            } else {
              setProfile({ uid: firebaseUser.uid, ...data } as UserProfile);
            }
          } else if (!firebaseUser.isAnonymous) {
            // Create the doc if it doesn't exist and not anonymous
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              email: initialProfile.email,
              role: initialProfile.role,
              displayName: initialProfile.displayName
            });
          }
        } catch (error) {
          console.error("Error fetching/setting profile:", error);
        }
      } else {
        setProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // News Listener & Seeding
  useEffect(() => {
    if (!isAuthReady || !db) return;

    const newsRef = collection(db, 'news');
    let q;
    
    if (profile?.role === 'admin') {
      q = query(newsRef, orderBy('createdAt', 'desc'));
    } else {
      // Use a simpler query for guests to avoid composite index requirements
      q = query(newsRef, where('isPublished', '==', true));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let newsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NewsPost[];
      
      // Sort in memory if not sorted by Firestore
      if (profile?.role !== 'admin') {
        newsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      }
      
      setNews(newsData);

      // Seed a fake post if empty AND user is admin
      if (newsData.length === 0 && profile?.role === 'admin') {
        try {
          await addDoc(collection(db, 'news'), {
            title: {
              lt: "Sveiki atvykę į SPT administracinių technologijų fiziką",
              en: "Welcome to SPT Administrative Technology Physics",
              de: "Willkommen bei SPT Administrative Technology Physics",
              uk: "Ласкаво просимо до SPT Administrative Technology Physics"
            },
            content: {
              lt: "Tai pavyzdinis įrašas, demonstruojantis mūsų naują TVS. Šį įrašą galite redaguoti arba ištrinti naudodami administratoriaus įrankius. Mes diegiame naujos kartos administracinius sprendimus fizinių tyrimų objektams visame pasaulyje.\n\n### Pagrindinės savybės:\n- Atnaujinimai realiuoju laiku\n- Markdown palaikymas\n- Profesionalus vaizdų integravimas",
              en: "This is a sample post demonstrating our new CMS. You can edit or delete this post using the admin tools. We are pioneering the next generation of administrative solutions for physical research facilities worldwide.\n\n### Key Features:\n- Real-time updates\n- Markdown support\n- Professional image integration",
              de: "Dies ist ein Beispielbeitrag, der unser neues CMS demonstriert. Sie können diesen Beitrag mit den Admin-Tools bearbeiten oder löschen. Wir leisten Pionierarbeit bei der nächsten Generation administrativer Lösungen für physikalische Forschungseinrichtungen weltweit.\n\n### Hauptmerkmale:\n- Echtzeit-Updates\n- Markdown-Unterstützung\n- Professionelle Bildintegration",
              uk: "Це приклад повідомлення, що демонструє нашу нову CMS. Ви можете редагувати або видаляти це повідомлення за допомогою інструментів адміністратора. Ми впроваджуємо адміністративні рішення наступного покоління для фізичних дослідницьких центрів по всьому світу.\n\n### Ключові особливості:\n- Оновлення в реальному часі\n- Підтримка Markdown\n- Професійна інтеграція зображень"
            },
            imageUrls: ["https://picsum.photos/seed/physics/1200/800"],
            createdAt: Timestamp.now(),
            isPublished: true
          });
        } catch (e) {
          console.error("Seeding failed:", e);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'news');
    });

    return () => unsubscribe();
  }, [isAuthReady, profile, user]);

  // Pages Listener
  useEffect(() => {
    if (!isAuthReady || !db) return;

    const unsubscribe = onSnapshot(collection(db, 'pages'), (snapshot) => {
      const data: Record<string, PageContent> = {};
      snapshot.docs.forEach(docSnap => {
        data[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as PageContent;
      });
      setPagesContent(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pages');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleLogin = async () => {
    if (!auth) {
      alert("Firebase is not configured. Please check your environment variables.");
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setCurrentPage('home');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleSavePost = async () => {
    if (!user || !profile || profile.role !== 'admin' || !db) return;

    const postData = {
      ...editForm,
      updatedAt: Timestamp.now(),
    };

    try {
      if (isEditing === 'new') {
        await addDoc(collection(db, 'news'), {
          ...postData,
          createdAt: Timestamp.now(),
        });
      } else if (isEditing) {
        await updateDoc(doc(db, 'news', isEditing), postData);
      }
      setIsEditing(null);
      setEditForm({ 
        title: { lt: '', en: '', de: '', uk: '' }, 
        content: { lt: '', en: '', de: '', uk: '' }, 
        imageUrls: [], 
        isPublished: true,
        isPinned: false,
        aspectRatio: '16:9'
      });
    } catch (error) {
      handleFirestoreError(error, isEditing === 'new' ? OperationType.CREATE : OperationType.UPDATE, isEditing === 'new' ? 'news' : `news/${isEditing}`);
    }
  };

  const handleSavePage = async () => {
    if (!user || !profile || profile.role !== 'admin' || !isEditingPage || !db) return;

    try {
      const isCore = isStaticPage(isEditingPage);

      const payload = {
        ...pageEditForm,
        isDeleted: false,
        updatedAt: Timestamp.now(),
      };

      if (!isCore && !payload.parentId) {
        payload.parentId = currentPage;
      }

      await setDoc(doc(db, 'pages', isEditingPage), payload);
      setIsEditingPage(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pages/${isEditingPage}`);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!profile || profile.role !== 'admin' || !db) return;
    try {
      await deleteDoc(doc(db, 'news', id));
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `news/${id}`);
    }
  };



  const startEdit = (post: NewsPost) => {
    setIsEditing(post.id);
    setEditForm({
      title: typeof post.title === 'string' ? { lt: post.title, en: '', de: '', uk: '' } : { ...post.title },
      content: typeof post.content === 'string' ? { lt: post.content, en: '', de: '', uk: '' } : { ...post.content },
      imageUrls: post.imageUrls || [],
      isPublished: post.isPublished,
      aspectRatio: post.aspectRatio || '16:9'
    });
  };

  const isAdmin = profile?.role === 'admin';

  const t = (key: string) => TRANSLATIONS[key]?.[language] || key;

  const [translatingPostId, setTranslatingPostId] = useState<string | null>(null);
  const [tempTranslations, setTempTranslations] = useState<Record<string, Partial<Record<Language, { title: string, content: string }>>>>({});

  const getPostTitle = (post: NewsPost, lang: Language) => {
    if (tempTranslations[post.id]?.[lang]) return tempTranslations[post.id][lang].title;
    if (typeof post.title === 'string') return post.title;
    return post.title?.[lang] || post.title?.['en'] || post.title?.['lt'] || '';
  };

  const getPostContent = (post: NewsPost, lang: Language) => {
    if (tempTranslations[post.id]?.[lang]) return tempTranslations[post.id][lang].content;
    if (typeof post.content === 'string') return post.content;
    return post.content?.[lang] || post.content?.['en'] || post.content?.['lt'] || '';
  };

  const translatePost = async (post: NewsPost) => {
    setTranslatingPostId(post.id);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const sourceTitle = getPostTitle(post, 'lt') || getPostTitle(post, 'en');
    const sourceContent = getPostContent(post, 'lt') || getPostContent(post, 'en');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following news post into ${
          language === 'lt' ? 'Lithuanian' : language === 'en' ? 'English' : language === 'de' ? 'German' : 'Russian'
        }. 
        Keep the markdown formatting. 
        Return the result as a JSON object with "title" and "content" fields.
        
        Title: ${sourceTitle}
        Content: ${sourceContent}`,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text;
      if (text) {
        const translated = JSON.parse(text);
        
        const updatedTitle: { [lang in Language]: string } = {
          lt: typeof post.title === 'string' ? post.title : (post.title?.lt || ''),
          en: typeof post.title === 'string' ? '' : (post.title?.en || ''),
          de: typeof post.title === 'string' ? '' : (post.title?.de || ''),
          uk: typeof post.title === 'string' ? '' : (post.title?.uk || ''),
        };
        const updatedContent: { [lang in Language]: string } = {
          lt: typeof post.content === 'string' ? post.content : (post.content?.lt || ''),
          en: typeof post.content === 'string' ? '' : (post.content?.en || ''),
          de: typeof post.content === 'string' ? '' : (post.content?.de || ''),
          uk: typeof post.content === 'string' ? '' : (post.content?.uk || ''),
        };
        
        updatedTitle[language] = translated.title;
        updatedContent[language] = translated.content;

        // Optimistically update local state
        setTempTranslations(prev => ({
          ...prev,
          [post.id]: {
            ...(prev[post.id] || {}),
            [language]: { title: translated.title, content: translated.content }
          }
        }));

        if (db) {
          try {
            await updateDoc(doc(db, 'news', post.id), {
              title: updatedTitle,
              content: updatedContent,
              updatedAt: Timestamp.now()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `news/${post.id}`);
          }
        }
      }
    } catch (error) {
      console.error("Translation failed", error);
    } finally {
      setTranslatingPostId(null);
    }
  };

  const renderContent = () => {
    const renderSubcategoryPage = (subId: string) => {
      const pageData = pagesContent[subId];
      const hardcodedChildren = nestedStructuresState[subId] || menuStructureState.find(m => m.id === subId)?.sub || [];
      const dynamicChildren = Object.values(pagesContent).filter(p => p.parentId === subId && p.isDeleted !== true).map(p => p.id);
      const children = [...new Set([...hardcodedChildren, ...dynamicChildren])].filter(cId => pagesContent[cId]?.isDeleted !== true);
      const subPageAspectRatio = pageData?.aspectRatio || "16:9";

      const parentId = (() => {
        if (pageData?.parentId) return pageData.parentId;
        for (const [parent, subs] of Object.entries(nestedStructuresState)) {
          if (subs.includes(subId)) return parent;
        }
        for (const item of menuStructureState) {
          if (item.sub?.includes(subId)) return item.id;
        }
        return null;
      })();

      const siblingIds = parentId ? (() => {
        const hardcodedChildren = nestedStructuresState[parentId] || menuStructureState.find(m => m.id === parentId)?.sub || [];
        const dynamicChildren = Object.values(pagesContent).filter(p => p.parentId === parentId && p.isDeleted !== true).map(p => p.id);
        return [...new Set([...hardcodedChildren, ...dynamicChildren])].filter(sId => sId !== subId && pagesContent[sId]?.isDeleted !== true);
      })() : [];
      
      const subPageRatioClass = {
        "1:1": "aspect-square",
        "4:3": "aspect-[4/3]",
        "3:4": "aspect-[3/4]",
        "4:5": "aspect-[4/5]",
        "16:9": "aspect-video",
        "2:3": "aspect-[2/3]"
      }[subPageAspectRatio] || "aspect-video";

      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10">
          {parentId && (
            <div className="mb-8">
              <button 
                onClick={() => setCurrentPage(parentId as any)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 hover:border-red-600/30 hover:bg-red-50/20 text-gray-500 hover:text-red-600 font-bold uppercase text-[10px] tracking-widest rounded-full transition-all group shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                {t('back')} / {pagesContent[parentId]?.title?.[language] || t(parentId)}
              </button>
            </div>
          )}
          {(() => {
            const possessesContent = !!(pageData?.content?.[language] && pageData.content[language].trim() !== '');
            const isProductGalleryPage = (
              ['level_meters', 'industrial_pumps', 'tanker_equipment', 'pipeline_fittings', 'tank_fittings', 'loading_arms', 'terminal_equipment', 'dry_disconnect'].includes(subId) ||
              subId.includes('flow_meters')
            ) && children.length > 0;

            if (isProductGalleryPage && !possessesContent) {
              return (
                <div className="flex justify-between items-center mb-10 pb-4 border-b border-gray-100">
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">
                    {pageData?.title?.[language] || t(subId)}
                  </h2>
                  {isAdmin && (
                    <div className="flex justify-end shrink-0">
                      <button 
                        onClick={() => {
                          setIsEditingPage(subId);
                          setPageEditForm(pageData || {
                            id: subId,
                            title: { lt: t(subId), en: t(subId), de: t(subId), uk: t(subId) },
                            content: { lt: '', en: '', de: '', uk: '' },
                            imageUrls: []
                          });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-full text-xs uppercase tracking-widest hover:bg-red-700 transition-all font-sans"
                      >
                        <Edit2 className="w-3 h-3" />
                        {t('editPage')}
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="flex flex-col lg:flex-row justify-between lg:items-stretch gap-12">
                <div className="lg:w-[55.6%] space-y-8 flex flex-col">
                  <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{pageData?.title?.[language] || t(subId)}</h2>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setIsEditingPage(subId);
                          setPageEditForm(pageData || {
                            id: subId,
                            title: { lt: t(subId), en: t(subId), de: t(subId), uk: t(subId) },
                            content: { lt: '', en: '', de: '', uk: '' },
                            imageUrls: []
                          });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-full text-xs uppercase tracking-widest hover:bg-red-700 transition-all font-sans"
                      >
                        <Edit2 className="w-3 h-3" />
                        {t('editPage')}
                      </button>
                    )}
                  </div>

                  <div className={cn(
                    "prose prose-sm prose-red max-w-none text-gray-600 relative transition-all duration-700 overflow-hidden flex-grow",
                    !expandedPages[subId] && (pageData?.content?.[language]?.length > 1000) ? "max-h-[600px]" : "max-h-none"
                  )}>
                    {pageData?.content?.[language] ? (
                      <Markdown rehypePlugins={[rehypeRaw]}>{pageData.content[language]}</Markdown>
                    ) : (
                      <p>{t('heroSub')}</p>
                    )}
                    
                    {!expandedPages[subId] && (pageData?.content?.[language]?.length > 1000) && (
                      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </div>

                  {pageData?.content?.[language] && pageData.content[language].length > 1000 && (
                    <div className="pt-4 border-t border-gray-100 mt-auto">
                      <button 
                        onClick={() => setExpandedPages(prev => ({ ...prev, [subId]: !prev[subId] }))}
                        className="px-6 py-2.5 bg-gray-50 hover:bg-red-600 text-gray-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-full transition-all flex items-center gap-1.5"
                      >
                        {expandedPages[subId] ? (
                          <>{t('showLess')} <X className="w-2.5 h-2.5" /></>
                        ) : (
                          <>{t('readMore')} <ChevronRight className="w-3.5 h-3.5" /></>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="lg:w-[44.4%] space-y-8">
                  {pageData?.imageUrls && pageData.imageUrls.length > 0 ? (
                    <div className={cn("rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/50 border border-gray-50 bg-gray-50/50 relative", subPageRatioClass)}>
                      <ImageGallery images={pageData.imageUrls} className="absolute inset-0" />
                    </div>
                  ) : (
                    <div className={cn("rounded-3xl overflow-hidden shadow-2xl bg-gray-50/50 border border-gray-100 flex items-center justify-center relative", subPageRatioClass)}>
                      <Folder className="w-16 h-16 text-gray-200" />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {(children.length > 0 || isAdmin) && (
            <div className="mt-20">
              <BentoGrid 
                items={children}
                pagesContent={pagesContent}
                language={language}
                t={t}
                isAdmin={isAdmin}
                onNavigate={(id) => setCurrentPage(id as any)}
                onEditPage={(id) => {
                  const data = pagesContent[id];
                  setIsEditingPage(id);
                  setPageEditForm(data || {
                    id: id,
                    title: { lt: t(id), en: t(id), de: t(id), uk: t(id) },
                    content: { lt: '', en: '', de: '', uk: '' },
                    imageUrls: [],
                    parentId: subId
                  });
                }}
                onDeletePage={(id) => {
                  handleDeletePage(id);
                }}
                onAddPage={() => {
                  const newId = `new_page_${Date.now()}`;
                  setIsEditingPage(newId);
                  setPageEditForm({
                    id: newId,
                    title: { lt: 'Nauja kortelė', en: 'New Card', de: 'Neue Karte', uk: 'Нова картка' },
                    content: { lt: '', en: '', de: '', uk: '' },
                    imageUrls: [],
                    parentId: subId
                  });
                }}
              />
            </div>
          )}

          {siblingIds.length > 0 && (
            <div className="mt-20 border-t border-gray-100 pt-16">
              <h3 className="text-xl font-black uppercase tracking-tight mb-8 font-sans text-gray-900">
                {language === 'lt' ? 'Kiti susiję skyriai / produktai' : t('relatedCategories')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {siblingIds.map((sibId) => {
                  const sibData = pagesContent[sibId];
                  const sibTitle = sibData?.title?.[language] || t(sibId);
                  const sibImage = sibData?.imageUrls?.[0] || `https://picsum.photos/seed/${sibId}/600/400`;
                  
                  return (
                    <motion.div
                      key={sibId}
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        setCurrentPage(sibId);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-white rounded-2xl border border-gray-100 hover:border-red-600/20 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col group h-full"
                    >
                      <div className="aspect-video relative overflow-hidden bg-gray-50">
                        <img 
                          src={sibImage} 
                          alt={sibTitle}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 group-hover:text-red-600 transition-colors mb-2 font-sans">
                          {sibTitle}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 flex-grow font-sans">
                          {sibData?.content?.[language] || t('heroSub')}
                        </p>
                        <div className="mt-4 flex items-center gap-1.5 text-red-600 text-[9px] font-black uppercase tracking-widest font-sans">
                          {t('learnMore')} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      );
    };

    if (currentPage === 'search') {
      const results = searchQuery.length >= 2 ? (() => {
        const q = searchQuery.toLowerCase();
        const res: any[] = [];
        news.forEach(post => {
          const title = getPostTitle(post, language).toLowerCase();
          const content = getPostContent(post, language).toLowerCase();
          if (title.includes(q) || content.includes(q)) {
            res.push({ type: 'news', ...post });
          }
        });
        Object.values(pagesContent).forEach(page => {
          if (page.isDeleted === true) return;
          const title = page.title?.[language]?.toLowerCase() || '';
          const content = page.content?.[language]?.toLowerCase() || '';
          if (title.includes(q) || content.includes(q)) {
            res.push({ type: 'page', ...page });
          }
        });
        // Deduplicate and add missing menu items
        const seenIds = new Set(res.map(r => r.id));
        menuStructureState.forEach(item => {
          if (t(item.id).toLowerCase().includes(q) && !seenIds.has(item.id)) {
            res.push({ type: 'page', id: item.id, title: { [language]: t(item.id) } });
            seenIds.add(item.id);
          }
          item.sub?.forEach(subId => {
            if (pagesContent[subId]?.isDeleted === true) return;
            if (t(subId).toLowerCase().includes(q) && !seenIds.has(subId)) {
              res.push({ type: 'page', id: subId, title: { [language]: t(subId) } });
              seenIds.add(subId);
            }
          });
        });
        return res;
      })() : [];

      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10">
          <h2 className="text-4xl font-black mb-8 uppercase tracking-tighter">{t('searchResults')}</h2>
          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {results.map((result, i) => (
                <motion.div 
                  key={result.id + i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    if (result.type === 'page') setCurrentPage(result.id);
                    else setCurrentPage(`news_${result.id}`);
                  }}
                  className="p-6 border border-gray-100 rounded-2xl hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="text-red-600 font-black text-[10px] uppercase tracking-widest mb-2">{result.type}</div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-red-600 transition-colors">
                    {result.type === 'news' ? getPostTitle(result, language) : (result.title?.[language] || t(result.id))}
                  </h3>
                  <p className="text-gray-500 text-sm line-clamp-3">
                    {result.type === 'news' ? stripMarkdown(getPostContent(result, language)) : stripMarkdown(result.content?.[language] || t('heroSub'))}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest">
              {searchQuery.length < 2 ? t('search') + '...' : t('noResults')}
            </div>
          )}
        </motion.div>
      );
    }

    switch (currentPage) {
      case 'solutions':
      case 'services':
      case 'products':
      case 'about':
      case 'flow_meters':
      case 'level_meters':
      case 'industrial_pumps':
      case 'tanker_equipment':
      case 'pipeline_fittings':
      case 'tank_fittings':
      case 'loading_arms':
      case 'terminal_equipment':
      case 'dry_disconnect': {
        const mainPageData = pagesContent[currentPage];
        const hardcodedChildren = nestedStructuresState[currentPage] || menuStructureState.find(m => m.id === currentPage)?.sub || [];
        const dynamicChildren = Object.values(pagesContent).filter(p => p.parentId === currentPage && p.isDeleted !== true).map(p => p.id);
        const children = [...new Set([...hardcodedChildren, ...dynamicChildren])].filter(subId => pagesContent[subId]?.isDeleted !== true);
        const mainAspectRatio = mainPageData?.aspectRatio || "16:9";

        const mainParentId = (() => {
          if (mainPageData?.parentId) return mainPageData.parentId;
          for (const [parent, subs] of Object.entries(nestedStructuresState)) {
            if (subs.includes(currentPage)) return parent;
          }
          for (const item of menuStructureState) {
            if (item.sub?.includes(currentPage)) return item.id;
          }
          return null;
        })();

        const siblingIds = mainParentId ? (() => {
          const hardcodedChildren = nestedStructuresState[mainParentId] || menuStructureState.find(m => m.id === mainParentId)?.sub || [];
          const dynamicChildren = Object.values(pagesContent).filter(p => p.parentId === mainParentId && p.isDeleted !== true).map(p => p.id);
          return [...new Set([...hardcodedChildren, ...dynamicChildren])].filter(subId => subId !== currentPage && pagesContent[subId]?.isDeleted !== true);
        })() : [];
        const mainRatioClass = {
          "1:1": "aspect-square",
          "4:3": "aspect-[4/3]",
          "3:4": "aspect-[3/4]",
          "4:5": "aspect-[4/5]",
          "16:9": "aspect-video",
          "2:3": "aspect-[2/3]"
        }[mainAspectRatio] || "aspect-video";

        const getFallbackContent = () => {
          if (currentPage === 'about') {
            const stats = mainPageData?.stats || [
              { value: { lt: '2001', en: '2001', de: '2001', uk: '2001' }, label: { lt: 'Įkurta', en: 'Established', de: 'Gegründet', uk: 'Засновано' } },
              { value: { lt: '20+', en: '20+', de: '20+', uk: '20+' }, label: { lt: 'Metų patirties', en: 'Years of Experience', de: 'Jahre Erfahrung', uk: 'Років досвіду' } }
            ];
            return (
              <div className="space-y-6">
                {!mainPageData?.content?.[language] && (
                  <>
                    <p>{t('aboutText1')}</p>
                    <p>{t('aboutText2')}</p>
                  </>
                )}
                <div className="grid grid-cols-2 gap-8 py-8">
                  {stats.map((stat, idx) => (
                    <div key={idx} className={cn(isAdmin && "cursor-pointer hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-100")} 
                      onClick={() => {
                        if (isAdmin) {
                          setIsEditingPage(currentPage);
                          setPageEditForm(mainPageData || {
                            id: currentPage,
                            title: { lt: t(currentPage), en: t(currentPage), de: t(currentPage), uk: t(currentPage) },
                            content: { lt: '', en: '', de: '', uk: '' },
                            imageUrls: [],
                            stats: stats
                          });
                        }
                      }}>
                      <div className="text-2xl font-black text-red-600">{stat.value[language]}</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{stat.label[language]}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return <p>{t('heroSub')}</p>;
        };

        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10">
            {mainParentId && (
              <div className="mb-8">
                <button 
                  onClick={() => setCurrentPage(mainParentId as any)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 hover:border-red-600/30 hover:bg-red-50/20 text-gray-500 hover:text-red-600 font-bold uppercase text-[10px] tracking-widest rounded-full transition-all group shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  {t('back')} / {pagesContent[mainParentId]?.title?.[language] || t(mainParentId)}
                </button>
              </div>
            )}
            {(() => {
              const possessesContent = !!(mainPageData?.content?.[language] && mainPageData.content[language].trim() !== '');
              const isProductGalleryPage = (currentPage === 'products' || ['flow_meters', 'level_meters', 'industrial_pumps', 'tanker_equipment', 'pipeline_fittings', 'tank_fittings', 'loading_arms', 'terminal_equipment', 'dry_disconnect'].includes(currentPage)) && children.length > 0;
              
              if (isProductGalleryPage && !possessesContent) {
                return (
                  <div className="flex justify-between items-center mb-10 pb-4 border-b border-gray-100">
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                      {mainPageData?.title?.[language] || t(currentPage)}
                    </h2>
                    {isAdmin && (
                      <div className="flex justify-end shrink-0">
                        <button 
                          onClick={() => {
                            setIsEditingPage(currentPage);
                            setPageEditForm(mainPageData || {
                              id: currentPage,
                              title: { lt: t(currentPage), en: t(currentPage), de: t(currentPage), uk: t(currentPage) },
                              content: { lt: '', en: '', de: '', uk: '' },
                              imageUrls: []
                            });
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-black rounded-full text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200"
                        >
                          <Edit2 className="w-3 h-3" />
                          {t('editPage')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="flex flex-col lg:flex-row justify-between lg:items-stretch gap-12 mb-12 pt-0 mt-0">
                  <div className="lg:w-[55.6%] space-y-4 flex flex-col">
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{mainPageData?.title?.[language] || t(currentPage === 'about' ? 'aboutTitle' : currentPage)}</h2>
                    <div className={cn(
                      "prose prose-sm prose-red text-gray-500 font-medium max-w-none relative transition-all duration-700 overflow-hidden break-words flex-grow",
                      !expandedPages[currentPage] && (mainPageData?.content?.[language]?.length > 1000) ? "max-h-[600px]" : "max-h-none"
                    )}>
                      {mainPageData?.content?.[language] ? (
                        <Markdown rehypePlugins={[rehypeRaw]}>{mainPageData.content[language]}</Markdown>
                      ) : getFallbackContent()}
                      
                      {!expandedPages[currentPage] && (mainPageData?.content?.[language]?.length > 1000) && (
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                      )}
                    </div>

                    {!expandedPages[currentPage] && (mainPageData?.content?.[language]?.length > 1000) && (
                      <button 
                        onClick={() => setExpandedPages(prev => ({ ...prev, [currentPage]: true }))}
                        className="flex items-center gap-2 text-red-600 font-black uppercase text-[10px] tracking-widest hover:gap-4 transition-all"
                      >
                        {t('readMore')} <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="shrink-0 lg:w-[44.4%] flex flex-col">
                    {mainPageData?.imageUrls && mainPageData.imageUrls.filter(url => url && url.trim() !== '').length > 0 ? (
                      <div className={cn("w-full rounded-2xl overflow-hidden shadow-2xl shadow-gray-200/50 relative bg-gray-50 border border-gray-100", mainRatioClass)}>
                        <ImageGallery images={mainPageData.imageUrls.filter(url => url && url.trim() !== '')} className="absolute inset-0 w-full h-full" />
                      </div>
                    ) : (
                      <div className={cn("w-full bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden shadow-2xl shadow-gray-200/50 relative", mainRatioClass)}>
                        <img 
                          src={`https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&h=800&q=80`} 
                          alt={mainPageData?.title?.[language] || t(currentPage)} 
                          className="absolute inset-0 w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&h=800&q=80";
                          }}
                        />
                      </div>
                    )}
                    {isAdmin && (
                      <div className="mt-4 flex justify-end">
                        <button 
                          onClick={() => {
                            setIsEditingPage(currentPage);
                            setPageEditForm(mainPageData || {
                              id: currentPage,
                              title: { lt: t(currentPage), en: t(currentPage), de: t(currentPage), uk: t(currentPage) },
                              content: { lt: '', en: '', de: '', uk: '' },
                              imageUrls: []
                            });
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-black rounded-full text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200"
                        >
                          <Edit2 className="w-3 h-3" />
                          {t('editPage')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <BentoGrid 
              items={children}
              pagesContent={pagesContent}
              language={language}
              t={t}
              isAdmin={isAdmin}
              onNavigate={(id) => setCurrentPage(id as any)}
              onEditPage={(id) => {
                const data = pagesContent[id];
                setIsEditingPage(id);
                setPageEditForm(data || {
                  id: id,
                  title: { lt: t(id), en: t(id), de: t(id), uk: t(id) },
                  content: { lt: '', en: '', de: '', uk: '' },
                  imageUrls: [],
                  parentId: currentPage
                });
              }}
              onDeletePage={(id) => {
                handleDeletePage(id);
              }}
              onAddPage={() => {
                const newId = `new_page_${Date.now()}`;
                setIsEditingPage(newId);
                setPageEditForm({
                  id: newId,
                  title: { lt: 'Nauja kortelė', en: 'New Card', de: 'Neue Karte', uk: 'Нова картка' },
                  content: { lt: '', en: '', de: '', uk: '' },
                  imageUrls: [],
                  parentId: currentPage
                });
              }}
            />

            {siblingIds.length > 0 && (
              <div className="mt-20 border-t border-gray-100 pt-16">
                <h3 className="text-xl font-black uppercase tracking-tight mb-8 font-sans text-gray-900">
                  {language === 'lt' ? 'Kiti susiję skyriai' : t('relatedCategories')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {siblingIds.map((sibId) => {
                    const sibData = pagesContent[sibId];
                    const sibTitle = sibData?.title?.[language] || t(sibId);
                    const sibImage = sibData?.imageUrls?.[0] || `https://picsum.photos/seed/${sibId}/600/400`;
                    
                    return (
                      <motion.div
                        key={sibId}
                        whileHover={{ y: -4 }}
                        onClick={() => {
                          setCurrentPage(sibId);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-white rounded-2xl border border-gray-100 hover:border-red-600/20 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col group h-full"
                      >
                        <div className="aspect-video relative overflow-hidden bg-gray-50">
                          <img 
                            src={sibImage} 
                            alt={sibTitle}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="p-6 flex flex-col flex-grow">
                          <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 group-hover:text-red-600 transition-colors mb-2 font-sans">
                            {sibTitle}
                          </h4>
                          <p className="text-xs text-gray-500 line-clamp-2 flex-grow font-sans">
                            {sibData?.content?.[language] || t('heroSub')}
                          </p>
                          <div className="mt-4 flex items-center gap-1.5 text-red-600 text-[9px] font-black uppercase tracking-widest font-sans">
                            {t('learnMore')} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        );
      }

      case 'aviation':
      case 'chemical_terminals':
      case 'lpg_terminals':
      case 'oil_terminals':
      case 'oil_production':
      case 'product_blending':
      case 'railway':
      case 'pipeline_cleaning':
      case 'design':
      case 'engineering_consulting':
      case 'technical_service':
      case 'training':
      case 'spare_parts':
      case 'flow_meters_volumetric':
      case 'flow_meters_gear':
      case 'flow_meters_turbine':
      case 'flow_meters_coriolis':
      case 'level_meters':
      case 'industrial_pumps':
      case 'tanker_equipment':
      case 'pipeline_fittings':
      case 'tank_fittings':
      case 'loading_arms':
      case 'terminal_equipment':
      case 'dry_disconnect': {
        return renderSubcategoryPage(currentPage);
      }
      case 'contact':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter">{t('contact')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <p className="text-base font-medium">
T. Masiulio g. 18B, LT-52460 Kaunas </p>
                </div>
                <div>
                  <p className="text-base font-medium">
                    <a href="mailto:dgarmus@spt.lt" className="text-red-600 hover:underline">dgarmus@spt.lt</a>
                    <br />
                    +370 37 407277
                    <br />
                    +370 687 97000
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitContact} className="space-y-4 bg-gray-50 p-8 rounded-2xl relative">
                {contactStatus && contactStatus.type === 'success' ? (
                  <div className="space-y-4 py-4 text-center">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900">{t('contactSuccess')}</h4>
                      <p className="text-xs text-gray-500">
                        Nuoroda atverti el. pašto programą su sugeneruotu laišku sėkmingai sukurta. Gavėjas: dgarmus@spt.lt
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setContactStatus(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-all"
                      >
                        Parašyti kitą žinutę
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <input 
                        type="text" 
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        placeholder={t('fullNamePlaceholder')} 
                        disabled={isSendingContact}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 font-sans disabled:opacity-60" 
                      />
                    </div>
                    <div>
                      <input 
                        type="email" 
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')} 
                        disabled={isSendingContact}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 font-sans disabled:opacity-60" 
                      />
                    </div>
                    <div>
                      <textarea 
                        value={contactMessage}
                        onChange={e => setContactMessage(e.target.value)}
                        placeholder={t('messagePlaceholder')} 
                        rows={4} 
                        disabled={isSendingContact}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 font-sans disabled:opacity-60" 
                      />
                    </div>

                    {/* CAPTCHA section */}
                    <div className="space-y-2 p-4 bg-white/60 border border-gray-100 rounded-xl space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
                        {t('captchaLabel')}
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0 h-[46px] w-[150px]">
                          <canvas 
                            ref={canvasRef} 
                            width={150} 
                            height={46} 
                            className="block"
                          />
                        </div>
                        
                        <button
                          type="button"
                          onClick={generateCaptcha}
                          className="p-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 shadow-sm transition-all flex items-center justify-center hover:text-red-600"
                          title={t('captchaRegenerate')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                          </svg>
                        </button>
                      </div>
                      
                      <input 
                        type="text" 
                        value={userCaptchaInput}
                        onChange={e => setUserCaptchaInput(e.target.value)}
                        placeholder={t('captchaPlaceholder')} 
                        disabled={isSendingContact}
                        maxLength={5}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 font-mono tracking-widest text-center uppercase text-sm disabled:opacity-60 bg-white" 
                      />
                    </div>

                    {contactStatus && contactStatus.type === 'error' && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                        {contactStatus.text}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isSendingContact}
                      className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSendingContact ? t('contactSending') : t('sendMessage')}
                    </button>
                  </>
                )}
              </form>
            </div>
          </motion.div>
        );
      default:
        if (currentPage.startsWith('news_')) {
          const postId = currentPage.replace('news_', '');
          const post = news.find(p => p.id === postId);
          if (!post) return <div className="py-20 text-center text-gray-400 uppercase font-black tracking-widest font-sans">{t('postNotFound')}</div>;

          return (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="py-10 max-w-4xl mx-auto px-4">
              <div className="mb-12 flex justify-between items-center">
                <button 
                  onClick={() => setCurrentPage('home')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white/80 backdrop-blur-md border border-gray-100 shadow-xl text-gray-500 hover:text-red-600 font-black uppercase tracking-widest text-[10px] rounded-full transition-all hover:-translate-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t('backToNews')}
                </button>

                {isAdmin && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEdit(post)}
                      className="p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(post.id)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-1 gap-12">
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">
                    <Clock className="w-3.5 h-3.5" />
                    {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'yyyy-MM-dd') : t('recently')}
                    {!post.isPublished && (
                      <span className="bg-yellow-400 text-black px-2 py-0.5 rounded ml-2">{t('draft')}</span>
                    )}
                  </div>

                  <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] italic break-words">
                    {getPostTitle(post, language)}
                  </h1>

                  {post.imageUrls && post.imageUrls.length > 0 && (
                    <div className="w-full relative">
                      <div className={cn(
                        "rounded-[2rem] overflow-hidden shadow-2xl shadow-gray-200/50 relative bg-gray-50 border border-gray-100",
                        {
                          "aspect-square": post.aspectRatio === "1:1",
                          "aspect-[4/3]": post.aspectRatio === "4:3",
                          "aspect-[3/4]": post.aspectRatio === "3:4",
                          "aspect-video": post.aspectRatio === "16:9" || !post.aspectRatio,
                          "aspect-[2/3]": post.aspectRatio === "2:3",
                          "aspect-[4/5]": post.aspectRatio === "4:5"
                        }
                      )}>
                        <ImageGallery images={post.imageUrls} className="absolute inset-0" />
                      </div>
                    </div>
                  )}

                  <div className="prose prose-sm prose-red max-w-none text-gray-700 leading-relaxed font-medium selection:bg-red-100">
                    <Markdown rehypePlugins={[rehypeRaw]}>{getPostContent(post, language)}</Markdown>
                  </div>

                  {isAdmin && deleteConfirmId === post.id && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-20 p-8 border-2 border-red-100 bg-red-50 rounded-3xl"
                    >
                      <h3 className="text-xl font-bold uppercase tracking-tight mb-4">{t('areYouSure')}</h3>
                      <p className="text-sm text-red-700 mb-8">{t('permanentlyRemovePost')}</p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            handleDeletePost(post.id);
                            setCurrentPage('home');
                          }}
                          className="px-8 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-red-700 transition-all font-sans"
                        >
                          {t('yesDeletePermanently')}
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-8 py-4 bg-white text-gray-500 font-black uppercase tracking-widest text-xs rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-sans"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        }
        return (
          <>
            <div className="flex justify-between items-end mb-12">
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase">{t('latestUpdates')}</h3>
                <div className="w-12 h-1 bg-red-600 mt-2" />
              </div>
              
              {isAdmin && (
                <button 
                  onClick={() => {
                    setIsEditing('new');
                    setEditForm({ title: '', content: '', imageUrls: [], isPublished: true });
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                >
                  <Plus className="w-5 h-5" />
                  {t('newPost')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {news.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200"
                  >
                    <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">{language === 'lt' ? 'Naujienų kol kas nėra' : 'No news yet'}</p>
                  </motion.div>
                ) : (
                  [...news]
                    .filter(post => post.isPublished || isAdmin)
                    .sort((a, b) => {
                      if (a.isPinned && !b.isPinned) return -1;
                      if (!a.isPinned && b.isPinned) return 1;
                      const dateA = a.createdAt?.toMillis?.() || 0;
                      const dateB = b.createdAt?.toMillis?.() || 0;
                      return dateB - dateA;
                    })
                    .slice(0, visiblePosts)
                    .map((post, index) => (
                      <motion.article 
                        key={post.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="group flex flex-col bg-white border border-gray-100 hover:border-gray-200 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 rounded-xl overflow-hidden cursor-pointer h-full"
                        onClick={() => setCurrentPage(`news_${post.id}`)}
                      >
                        {post.imageUrls && post.imageUrls.length > 0 ? (
                          <div className={cn(
                            "relative",
                            {
                              "aspect-square": post.aspectRatio === "1:1",
                              "aspect-[4/3]": post.aspectRatio === "4:3",
                              "aspect-[3/4]": post.aspectRatio === "3:4",
                              "aspect-video": post.aspectRatio === "16:9" || !post.aspectRatio,
                              "aspect-[2/3]": post.aspectRatio === "2:3"
                            }
                          )}>
                            <ImageGallery images={post.imageUrls} className="absolute inset-0" />
                            <div className="absolute top-4 left-4 flex gap-2 z-20">
                              {!post.isPublished && (
                                <div className="bg-yellow-400 text-black text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg">
                                  {t('draft')}
                                </div>
                              )}
                              {isAdmin && post.isPinned && (
                                <div className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> {t('pinned')}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
                            <Newspaper className="w-12 h-12 text-gray-200" />
                            <div className="absolute top-4 left-4 flex gap-2 z-20">
                              {!post.isPublished && (
                                <div className="bg-yellow-400 text-black text-[10px] font-black uppercase px-2 py-1 rounded">
                                  {t('draft')}
                                </div>
                              )}
                              {isAdmin && post.isPinned && (
                                <div className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> {t('pinned')}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="p-8 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest mb-4">
                            <Clock className="w-3 h-3" />
                            {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'yyyy-MM-dd') : t('recently')}
                          </div>
                          
                          <h4 className="text-xl font-black uppercase tracking-tighter mb-4 leading-none group-hover:text-red-600 transition-colors line-clamp-2 italic">
                            {getPostTitle(post, language)}
                          </h4>
                          
                          <p className="text-gray-500 text-sm font-medium leading-relaxed flex-grow line-clamp-4 overflow-hidden">
                            {stripMarkdown(getPostContent(post, language))}
                          </p>

                          <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-600 transition-colors">
                              {t('learnMore')} <ChevronRight className="w-3 h-3" />
                            </div>
                            
                            {isAdmin && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); startEdit(post); }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <div className="relative">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(post.id); }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {deleteConfirmId === post.id && (
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="absolute bottom-full right-0 mb-4 bg-white border border-gray-200 shadow-2xl rounded-2xl p-6 z-50 min-w-[280px]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <p className="text-sm font-bold uppercase tracking-widest mb-4 text-gray-900 font-sans">Ar esate tikri?</p>
                                        <div className="flex gap-3">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeletePost(post.id);
                                            }}
                                            className="flex-1 py-3 bg-red-600 text-white text-xs font-black uppercase rounded-xl hover:bg-red-700 transition-colors font-sans"
                                          >
                                            Taip, ištrinti
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                            className="flex-1 py-3 bg-gray-100 text-gray-600 text-xs font-black uppercase rounded-xl hover:bg-gray-200 transition-colors font-sans"
                                          >
                                            Atšaukti
                                          </button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.article>
                    ))
                )}
              </AnimatePresence>
            </div>

            {news.filter(post => post.isPublished || isAdmin).length > visiblePosts && (
              <div className="flex justify-center mt-12 pb-20">
                <button 
                  onClick={() => setVisiblePosts(prev => prev + 6)}
                  className="px-12 py-5 border-2 border-black font-black uppercase tracking-[0.3em] text-[11px] rounded-full hover:bg-black hover:text-white transition-all shadow-xl shadow-gray-100 active:scale-95"
                >
                  {t('viewMore')}
                </button>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <Routes>
      <Route path="/admin" element={
        <AdminPage 
          user={user} 
          profile={profile} 
          isAdmin={isAdmin} 
          handleLogin={handleLogin} 
          handleLogout={handleLogout} 
          t={t} 
        />
      } />
      <Route path="*" element={
        <div className="min-h-screen bg-white text-black font-sans selection:bg-red-100 selection:text-red-900">
          {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center gap-4">
            <button onClick={() => setCurrentPage('home')} className="flex items-center gap-4 hover:opacity-80 transition-opacity shrink-0">
              <img src="./logotipas_spt.png" alt="SPT logotipas_spt" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              <div className="hidden xl:block text-left">
                <h1 
                  className="text-[10px] text-gray-500 font-medium tracking-[0.15em] uppercase max-w-[140px] leading-snug mt-[10px]"
                  style={{ marginTop: '10px' }}
                >
                  Skysčių perpylimo technologijos
                </h1>
              </div>
            </button>

            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder={t('search') + '...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length >= 2) setCurrentPage('search');
                    else if (currentPage === 'search') setCurrentPage('home');
                  }}
                  className="pl-10 pr-4 py-2 bg-gray-50 rounded-full text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all"
                  style={{ width: "122.5312px", borderStyle: "none" }}
                />
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6 h-full">
              {menuStructureState.map(item => (
                <NavDropdown 
                  key={item.id}
                  item={item}
                  pagesContent={pagesContent}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  t={t}
                />
              ))}
              
              {/* Language Switcher */}
              <div className="relative">
                <button 
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-black uppercase">{language}</span>
                </button>
                
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 p-2 bg-white rounded-xl shadow-xl border border-gray-100 min-w-[120px] z-[60]"
                    >
                      {(['lt', 'en', 'de', 'uk'] as Language[]).map(lang => (
                        <button
                          key={lang}
                          onClick={() => { setLanguage(lang); setIsLangMenuOpen(false); }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                            language === lang ? "bg-red-600 text-white" : "text-gray-400 hover:bg-gray-50 hover:text-black"
                          )}
                        >
                          {lang === 'lt' ? 'Lietuvių' : lang === 'en' ? 'English' : lang === 'de' ? 'Deutsch' : 'Українська'}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                {!isAuthReady ? (
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
                ) : user ? (
                  <>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                        <button 
                          onClick={() => setIsOpenTOCEditor(true)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-black transition-all shadow-md shadow-red-200/50"
                        >
                          <Settings className="w-3 h-3 text-white" />
                          TOC Valdymas
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-black transition-colors"
                      title={t('signOut')}
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <button className="lg:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[320px] z-[70] bg-white shadow-2xl lg:hidden flex flex-col h-[100dvh] h-screen"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <img src="./logotipas_spt.png" alt="SPT logotipas_spt" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
                  <span className="text-[10px] text-gray-500 font-medium tracking-[0.2em] uppercase" >Skysčių perpylimo technologijos</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 flex-1 space-y-4 overflow-y-auto">
                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder={t('search') + '...'}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.length >= 2) {
                          setCurrentPage('search');
                          setIsMenuOpen(false);
                        } else if (currentPage === 'search') {
                          setCurrentPage('home');
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all"
                    />
                  </div>

                  <button 
                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-gray-600 font-bold uppercase text-xs tracking-widest"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      {language === 'lt' ? 'Lietuvių' : language === 'en' ? 'English' : language === 'de' ? 'Deutsch' : 'Українська'}
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", isLangMenuOpen && "rotate-90")} />
                  </button>
                  
                  <AnimatePresence>
                    {isLangMenuOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50/50 rounded-b-xl mt-1"
                      >
                        <div className="p-2 grid grid-cols-2 gap-2">
                          {(['lt', 'en', 'de', 'uk'] as Language[]).map(lang => (
                            <button
                              key={lang}
                              onClick={() => { setLanguage(lang); setIsLangMenuOpen(false); }}
                              className={cn(
                                "text-[10px] font-black uppercase py-2 rounded-lg transition-all",
                                language === lang ? "bg-red-600 text-white shadow-md" : "text-gray-400 hover:text-black"
                              )}
                            >
                              {lang === 'lt' ? 'Lietuvių' : lang === 'en' ? 'English' : lang === 'de' ? 'Deutsch' : 'Українська'}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-1">
                  {menuStructureState.map(item => (
                    <div key={item.id} className="space-y-1">
                      <div 
                        className={cn(
                          "w-full rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex justify-between items-stretch overflow-hidden",
                          currentPage === item.id ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50 bg-white"
                        )}
                      >
                        <button 
                          onClick={() => {
                            setCurrentPage(item.id as any);
                            setIsMenuOpen(false);
                          }}
                          className="flex-1 text-left px-4 py-3 font-bold uppercase tracking-widest outline-none"
                        >
                          {t(item.id)}
                        </button>
                        
                        {item.sub && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMobileCategories(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id]
                              }));
                            }}
                            className="px-4 flex items-center justify-center border-l border-gray-100 hover:bg-gray-100/50 transition-colors"
                          >
                            <ChevronRight className={cn(
                              "w-4 h-4 transition-transform duration-200 text-gray-400", 
                              expandedMobileCategories[item.id] && "rotate-90 text-red-600"
                            )} />
                          </button>
                        )}
                      </div>
                      
                      <AnimatePresence initial={false}>
                        {item.sub && expandedMobileCategories[item.id] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="pl-4 space-y-1 border-l-2 border-gray-100 ml-4 overflow-hidden"
                          >
                            {item.sub.filter(subId => pagesContent[subId]?.isDeleted !== true).map(subId => {
                              const nestedSubs = nestedStructuresState[subId]?.filter(ss => pagesContent[ss]?.isDeleted !== true) || [];
                              const hasNested = nestedSubs.length > 0;
                              
                              return (
                                <div key={subId} className="space-y-1 mt-1">
                                  <div 
                                    className={cn(
                                      "w-full rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex justify-between items-stretch overflow-hidden",
                                      currentPage === subId ? "text-red-600 bg-red-50/50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                    )}
                                  >
                                    <button
                                      onClick={() => {
                                        setCurrentPage(subId as any);
                                        setIsMenuOpen(false);
                                      }}
                                      className="flex-1 text-left px-4 py-2 font-bold uppercase tracking-widest outline-none"
                                    >
                                      {t(subId)}
                                    </button>

                                    {hasNested && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedMobileCategories(prev => ({
                                            ...prev,
                                            [subId]: !prev[subId]
                                          }));
                                        }}
                                        className="px-3 flex items-center justify-center border-l border-gray-100/30 hover:bg-gray-100/30 transition-colors"
                                      >
                                        <ChevronRight className={cn(
                                          "w-3.5 h-3.5 transition-transform duration-200 text-gray-400", 
                                          expandedMobileCategories[subId] && "rotate-90 text-red-600"
                                        )} />
                                      </button>
                                    )}
                                  </div>

                                  <AnimatePresence initial={false}>
                                    {hasNested && expandedMobileCategories[subId] && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="pl-4 space-y-1 border-l border-gray-100/50 ml-3 overflow-hidden"
                                      >
                                        {nestedSubs.map(nestedId => (
                                          <button
                                            key={nestedId}
                                            onClick={() => {
                                              setCurrentPage(nestedId as any);
                                              setIsMenuOpen(false);
                                            }}
                                            className={cn(
                                              "w-full text-left px-4 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                                              currentPage === nestedId ? "text-red-500 bg-red-50/30" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                            )}
                                          >
                                            {t(nestedId)}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
                {!isAuthReady ? (
                  <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
                  </div>
                ) : user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                        {user.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[150px]">{user.displayName}</p>
                        {isAdmin && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Administrator</p>}
                      </div>
                    </div>
                    <button 
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                    >
                      <LogOut className="w-4 h-4" /> {t('signOut')}
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section (Only on Home) */}
      {currentPage === 'home' && (
        <header className="relative py-16 md:py-32 overflow-hidden bg-black text-white group/hero">
          <div className="absolute inset-0 z-0">
            <img 
              src="./cover-image.jpg" 
              alt="Cover" 
              className="w-full h-full object-cover grayscale brightness-50 group-hover/hero:grayscale-0 group-hover/hero:brightness-90 transition-all duration-1000"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if public/cover-image.jpg is missing
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/industrial/1920/1080?grayscale";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_var(--tw-gradient-stops))] from-red-600/20 via-transparent to-transparent" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <h2 className="font-black tracking-tighter mb-6 leading-tight">
                {t('heroTitle').split(' ').map((word, i) => {
                  const highlightWords = ['NAFTOS', 'CHEMIJOS', 'OIL', 'CHEMICAL', 'ÖL-', 'CHEMISCHE', 'НЕФТЯНОЙ', 'ХИМИЧЕСКОЙ'];
                  const shouldHighlight = highlightWords.some(hw => word.toUpperCase().includes(hw));
                  return (
                    <span 
                      key={i} 
                      className={cn(
                        shouldHighlight ? 'text-red-600 force-size-52' : 'force-size-45',
                        'mr-[0.25em]'
                      )}
                      style={{ 
                        display: 'inline-block'
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </h2>
              <p 
                className="mb-10 text-white font-normal mt-0 ml-0 pt-[7px]"
                style={{ fontSize: '12px', lineHeight: '21px', fontFamily: 'Inter', color: '#ffffff' }}
              >
                {t('heroSub')}
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <button onClick={() => setCurrentPage('solutions')} className="px-5 py-3 md:px-8 md:py-4 text-sm md:text-base bg-white text-black font-bold rounded-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
                  {t('exploreTech')} <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage('about')} className="px-5 py-3 md:px-8 md:py-4 text-sm md:text-base border border-white/20 font-bold rounded-sm hover:bg-white/10 transition-colors">
                  {t('ourMission')}
                </button>
              </div>
            </motion.div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[60vh]">
        {renderContent()}
      </main>

      {/* Page Editor Modal */}
      <AnimatePresence>
        {isOpenTOCEditor && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpenTOCEditor(false)}
              className="absolute inset-0 bg-black backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-0 bottom-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col z-[110]"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <div>
                  <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight">
                    Turinio ir struktūros valdymas (TOC)
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Table of Contents Category Tree Manager
                  </p>
                </div>
                <button 
                  onClick={() => setIsOpenTOCEditor(false)}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 bg-red-50/50 border border-red-100/50 rounded-xl space-y-1">
                  <div className="text-xs font-black uppercase tracking-wider text-red-700">Valdymo pulto instrukcija:</div>
                  <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                    Čia galite keisti mamiškųjų prekių, paslaugų bei sprendimų subkategorijų seką bei kurti naujas šakas. Pavadinimai keičiami inline (LT / EN), o visą Markdown tekstą ir galeriją užpildysite svetainėje tiesiogiai nuėję į tą puslapį ir spustelėję „Redaguoti“.
                  </p>
                </div>

                <div className="space-y-4">
                  {['solutions', 'services', 'products'].map(mainId => {
                    const menuObj = menuStructureState.find(m => m.id === mainId) || { id: mainId, sub: [] };
                    const hardcodedSubs = menuObj.sub || [];
                    const dynamicSubs = Object.values(pagesContent).filter(p => p.parentId === mainId && p.isDeleted !== true).map(p => p.id);
                    const subs = [...new Set([...hardcodedSubs, ...dynamicSubs])].filter(subId => pagesContent[subId]?.isDeleted !== true);
                    return (
                      <div key={mainId} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 shadow-sm">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <span className="text-xs font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
                            <Folder className="w-4 h-4 text-red-500" />
                            {t(mainId)}
                          </span>
                          <button 
                            onClick={() => {
                              setNewSubParentId(mainId);
                              setShowAddForm(true);
                            }}
                            className="flex items-center gap-1 text-[9px] font-black uppercase bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-all"
                          >
                            <Plus className="w-2.5 h-2.5" /> Pridėti kat.
                          </button>
                        </div>

                        <div className="space-y-2 mt-3">
                          {subs.map((subId, idx) => {
                            const childPage = pagesContent[subId];
                            const hardcodedGrandchildren = nestedStructuresState[subId] || [];
                            const dynamicGrandchildren = Object.values(pagesContent).filter(p => p.parentId === subId && p.isDeleted !== true).map(p => p.id);
                            const grandchildren = [...new Set([...hardcodedGrandchildren, ...dynamicGrandchildren])].filter(nestId => pagesContent[nestId]?.isDeleted !== true);
                            const hasChildren = grandchildren.length > 0;

                            return (
                              <div key={subId} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm select-none">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Folder className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    <span className="text-xs font-black uppercase text-gray-800">
                                      {childPage?.title?.[language] || t(subId)} 
                                      <span className="text-[9px] font-mono text-gray-400 normal-case font-normal ml-1">({subId})</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button 
                                      onClick={() => {
                                        setCurrentPage(subId as any);
                                        setIsOpenTOCEditor(false);
                                      }}
                                      type="button"
                                      className="p-1 hover:bg-gray-50 rounded text-red-600"
                                      title={language === 'lt' ? 'Eiti į puslapį' : 'Go to page'}
                                    >
                                      <Globe className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveItem(mainId, subId, 'up')}
                                      disabled={idx === 0}
                                      type="button"
                                      className="p-1 hover:bg-gray-50 rounded disabled:opacity-35"
                                    >
                                      <ArrowUp className="w-3 h-3 text-gray-500" />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveItem(mainId, subId, 'down')}
                                      disabled={idx === subs.length - 1}
                                      type="button"
                                      className="p-1 hover:bg-gray-50 rounded disabled:opacity-35"
                                    >
                                      <ArrowDown className="w-3 h-3 text-gray-500" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setEditingItemId(subId);
                                        setEditItemTitleLt(childPage?.title?.lt || t(subId));
                                        setEditItemTitleEn(childPage?.title?.en || t(subId));
                                        setEditItemTitleDe(childPage?.title?.de || t(subId));
                                        setEditItemTitleUk(childPage?.title?.uk || t(subId));
                                      }}
                                      type="button"
                                      className="p-1 hover:bg-gray-50 rounded text-blue-600"
                                      title="Redaguoti pavadinimą"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const data = pagesContent[subId];
                                        setIsEditingPage(subId);
                                        setPageEditForm(data || {
                                          id: subId,
                                          title: { lt: t(subId), en: t(subId), de: t(subId), uk: t(subId) },
                                          content: { lt: '', en: '', de: '', uk: '' },
                                          imageUrls: [],
                                          parentId: mainId
                                        });
                                      }}
                                      type="button"
                                      className="p-1 hover:bg-gray-50 rounded text-amber-500 font-bold"
                                      title={language === 'lt' ? "Redaguoti puslapio turinį (aprašymą, nuotraukas)" : "Edit page content"}
                                    >
                                      <Settings className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setNewSubParentId(subId);
                                        setShowAddForm(true);
                                      }}
                                      type="button"
                                      className="p-1 hover:bg-gray-50 rounded text-green-600"
                                      title="Pridėti sub-kategoriją"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteCategoryItem(mainId, subId)}
                                      type="button"
                                      className="p-1 hover:bg-gray-50 rounded text-red-500"
                                      title="Pašalinti iš navigacijos"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Inline Renamer form */}
                                {editingItemId === subId && (
                                  <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
                                    <div className="text-[10px] font-black uppercase text-gray-400">Keisti pavadinimą ({subId})</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <span className="text-[9px] font-bold text-gray-400 block mb-1">LT</span>
                                        <input 
                                          type="text" 
                                          value={editItemTitleLt} 
                                          onChange={e => setEditItemTitleLt(e.target.value)}
                                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-bold text-gray-400 block mb-1">EN</span>
                                        <input 
                                          type="text" 
                                          value={editItemTitleEn} 
                                          onChange={e => setEditItemTitleEn(e.target.value)}
                                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                      <button 
                                        onClick={() => setEditingItemId(null)}
                                        className="px-2 py-1 bg-white text-gray-500 border border-gray-200 text-[10px] font-bold rounded"
                                      >
                                        Atšaukti
                                      </button>
                                      <button 
                                        onClick={() => handleSaveTitleEdit(subId)}
                                        className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded"
                                      >
                                        Išsaugoti
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* LEVEL 3 Sub-subcategories */}
                                {(grandchildren.length > 0 || hasChildren) && (
                                  <div className="pl-4 mt-2 border-l-2 border-gray-100 space-y-1.5 pt-1">
                                    {grandchildren.length === 0 && (
                                      <div className="text-[10px] text-gray-400 italic">Ši šaka tuščia greitai pridėkite subkategorijas.</div>
                                    )}
                                    {grandchildren.filter(nestId => pagesContent[nestId]?.isDeleted !== true).map((nestId, idxNest) => {
                                      const nestPage = pagesContent[nestId];
                                      return (
                                        <div key={nestId} className="space-y-1 bg-gray-50/60 p-2 rounded-lg border border-gray-100/50">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <FolderPlus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                              <span className="text-[10px] font-bold uppercase text-gray-700">
                                                {nestPage?.title?.[language] || t(nestId)} 
                                                <span className="text-[9px] font-mono text-gray-400 normal-case font-normal ml-1">({nestId})</span>
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                              <button 
                                                onClick={() => {
                                                  setCurrentPage(nestId as any);
                                                  setIsOpenTOCEditor(false);
                                                }}
                                                type="button"
                                                className="p-1 hover:bg-gray-100 rounded text-red-600"
                                                title={language === 'lt' ? 'Eiti į puslapį' : 'Go to page'}
                                              >
                                                <Globe className="w-2.5 h-2.5" />
                                              </button>
                                              <button 
                                                onClick={() => handleMoveItem(subId, nestId, 'up')}
                                                disabled={idxNest === 0}
                                                type="button"
                                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                              >
                                                <ArrowUp className="w-2.5 h-2.5 text-gray-500" />
                                              </button>
                                              <button 
                                                onClick={() => handleMoveItem(subId, nestId, 'down')}
                                                disabled={idxNest === grandchildren.length - 1}
                                                type="button"
                                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                              >
                                                <ArrowDown className="w-2.5 h-2.5 text-gray-500" />
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  setEditingItemId(nestId);
                                                  setEditItemTitleLt(nestPage?.title?.lt || t(nestId));
                                                  setEditItemTitleEn(nestPage?.title?.en || t(nestId));
                                                  setEditItemTitleDe(nestPage?.title?.de || t(nestId));
                                                  setEditItemTitleUk(nestPage?.title?.uk || t(nestId));
                                                }}
                                                type="button"
                                                className="p-1 hover:bg-gray-100 rounded text-blue-600"
                                              >
                                                <Edit2 className="w-2.5 h-2.5" />
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  const data = pagesContent[nestId];
                                                  setIsEditingPage(nestId);
                                                  setPageEditForm(data || {
                                                    id: nestId,
                                                    title: { lt: t(nestId), en: t(nestId), de: t(nestId), uk: t(nestId) },
                                                    content: { lt: '', en: '', de: '', uk: '' },
                                                    imageUrls: [],
                                                    parentId: subId
                                                  });
                                                }}
                                                type="button"
                                                className="p-1 hover:bg-gray-100 rounded text-amber-500 font-bold"
                                                title={language === 'lt' ? "Redaguoti puslapio turinį (aprašymą, nuotraukas)" : "Edit page content"}
                                              >
                                                <Settings className="w-2.5 h-2.5" />
                                              </button>
                                              <button 
                                                onClick={() => handleDeleteCategoryItem(subId, nestId)}
                                                type="button"
                                                className="p-1 hover:bg-gray-100 rounded text-red-500"
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Inline Renamer form for nested Level 3 item */}
                                          {editingItemId === nestId && (
                                            <div className="mt-2 p-2 bg-white border border-gray-150 rounded-md space-y-2 w-full text-left">
                                              <div className="text-[9px] font-black uppercase text-gray-400">Keisti pavadinimą ({nestId})</div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <span className="text-[8px] font-bold text-gray-400 block mb-1">LT</span>
                                                  <input 
                                                    type="text" 
                                                    value={editItemTitleLt} 
                                                    onChange={e => setEditItemTitleLt(e.target.value)}
                                                    className="w-full px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-semibold"
                                                  />
                                                </div>
                                                <div>
                                                  <span className="text-[8px] font-bold text-gray-400 block mb-1">EN</span>
                                                  <input 
                                                    type="text" 
                                                    value={editItemTitleEn} 
                                                    onChange={e => setEditItemTitleEn(e.target.value)}
                                                    className="w-full px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-semibold"
                                                  />
                                                </div>
                                              </div>
                                              <div className="flex justify-end gap-1.5 mt-2">
                                                <button 
                                                  onClick={() => setEditingItemId(null)}
                                                  className="px-2 py-0.5 bg-white text-gray-500 border border-gray-200 text-[9px] font-bold rounded"
                                                >
                                                  Atšaukti
                                                </button>
                                                <button 
                                                  onClick={() => handleSaveTitleEdit(nestId)}
                                                  className="px-2.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded"
                                                >
                                                  Išsaugoti
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {deleteConfirmCategory && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[120] flex flex-col justify-center items-center p-6 text-center animate-fade-in">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-wider mb-2 text-gray-900 font-sans">
                    {language === 'lt' ? 'Ar tikrai norite ištrinti?' : 'Confirm Delete?'}
                  </h4>
                  <p className="text-[11px] text-gray-500 mb-6 font-sans leading-relaxed max-w-xs">
                    {language === 'lt' 
                      ? 'Šis veiksmas ištrins kortelę iš svetainės turinio ir pašalins ją iš visų navigacijos medžių.' 
                      : 'This action will delete the card from site content and remove it from all navigation.'}
                  </p>
                  <div className="flex gap-3 w-full max-w-[240px]">
                    <button
                      onClick={async () => {
                        const { itemId } = deleteConfirmCategory;
                        await handleDeletePage(itemId);
                        setDeleteConfirmCategory(null);
                      }}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors font-sans"
                    >
                      {language === 'lt' ? 'Taip, ištrinti' : t('yes')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmCategory(null)}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors font-sans"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Categories Add Subcategory form popup */}
        {showAddForm && (
          <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h4 className="text-sm font-black uppercase text-gray-900">
                  Pridėti naują subkategoriją
                </h4>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubcategory} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                    Tėvinis skyrius:
                  </label>
                  <div className="bg-gray-50 border border-gray-200 text-xs font-bold px-3 py-2 text-gray-700 rounded-lg uppercase">
                    {t(newSubParentId)} ({newSubParentId})
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                    Unikalus ID (kodas):
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="pvz: pipeline_shutoff_valves"
                    value={newSubId}
                    onChange={e => setNewSubId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 text-xs rounded-xl focus:ring-2 focus:ring-red-600 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                    LT pavadinimas (Lithuanian Title):
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="pvz: Uždaromoji armatūra"
                    value={newSubTitleLt}
                    onChange={e => setNewSubTitleLt(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 text-xs rounded-xl focus:ring-2 focus:ring-red-600 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                    EN pavadinimas (English Title):
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="pvz: Shut-off valves"
                    value={newSubTitleEn}
                    onChange={e => setNewSubTitleEn(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 text-xs rounded-xl focus:ring-2 focus:ring-red-600 outline-none font-bold"
                  />
                </div>

                {tocError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-[11px] font-medium leading-relaxed p-3.5 rounded-xl flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse mt-1.5 shrink-0" />
                    <span>{tocError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 border border-gray-100 font-bold text-xs uppercase text-gray-500 rounded-xl hover:bg-gray-50"
                  >
                    Atšaukti
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-red-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200/50"
                  >
                    Sukurti
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isEditingPage && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingPage(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-600 text-white rounded-lg">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight uppercase">
                    {t('editPage')}: {t(isEditingPage)}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsEditingPage(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('pageTitleLabel')} ({language.toUpperCase()})</label>
                    <input 
                      type="text"
                      value={pageEditForm.title?.[language] || ''}
                      onChange={e => setPageEditForm({
                        ...pageEditForm, 
                        title: { ...pageEditForm.title, [language]: e.target.value } as any
                      })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" /> {t('pageImagesLabel')}
                    </label>
                    <FileUploader 
                      images={pageEditForm.imageUrls || []} 
                      onChange={urls => setPageEditForm({...pageEditForm, imageUrls: urls})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('aspectRatioLabel')}</label>
                    <div className="flex flex-wrap gap-2">
                       {ASPECT_RATIOS.map(ratio => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setPageEditForm({ ...pageEditForm, aspectRatio: ratio })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            pageEditForm.aspectRatio === ratio 
                              ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200" 
                              : "bg-white border-gray-100 text-gray-400 hover:border-red-600"
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(!isStaticPage(isEditingPage || '')) && (
                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">
                        {language === 'lt' ? 'Kategorija / Tėvinis puslapis' : 'Category / Parent Page'}
                      </label>
                      <select
                        value={pageEditForm.parentId || currentPage}
                        onChange={e => setPageEditForm({ ...pageEditForm, parentId: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all font-bold text-sm text-gray-700"
                      >
                        <optgroup label={language === 'lt' ? 'Srauto matuokliai' : 'Flow Meters'}>
                          <option value="flow_meters_volumetric">Tūriniai (Volumetric)</option>
                          <option value="flow_meters_gear">Krumpliaratiniai (Gear)</option>
                          <option value="flow_meters_turbine">Turbininiai (Turbine)</option>
                          <option value="flow_meters_coriolis">Koriolio masės (Coriolis)</option>
                        </optgroup>
                        <optgroup label={language === 'lt' ? 'Kiti produktai' : 'Other Products'}>
                          <option value="level_meters">Lygio matuokliai</option>
                          <option value="industrial_pumps">Pramoniniai siurbliai</option>
                          <option value="tanker_equipment">Autocisternų įranga</option>
                          <option value="pipeline_fittings">Vamzdynų armatūra</option>
                          <option value="tank_fittings">Rezervuarų armatūra</option>
                          <option value="loading_arms">Užpylimo rankovės</option>
                          <option value="terminal_equipment">Terminalų įranga</option>
                          <option value="dry_disconnect">Sauso atjungimo movos</option>
                        </optgroup>
                        <optgroup label={language === 'lt' ? 'Sprendimai' : 'Solutions'}>
                          <option value="aviation">Aviacija</option>
                          <option value="chemical_terminals">Chemijos terminalai</option>
                          <option value="lpg_terminals">SND terminalai</option>
                          <option value="oil_terminals">Naftos produktų terminalai</option>
                          <option value="oil_production">Alyvų ir tepalų gamyba</option>
                          <option value="product_blending">Produktų maišymas</option>
                          <option value="railway">Geležinkelis</option>
                          <option value="pipeline_cleaning">Vamzdynų išvalymo sistemos</option>
                        </optgroup>
                        <optgroup label={language === 'lt' ? 'Paslaugos' : 'Services'}>
                          <option value="design">Projektavimas</option>
                          <option value="engineering_consulting">Inžinerinės konsultacijos</option>
                          <option value="technical_service">Techninis aptarnavimas</option>
                          <option value="training">Apmokymai</option>
                          <option value="spare_parts">Atsarginių dalių tiekimas</option>
                        </optgroup>
                      </select>
                    </div>
                  )}
                </div>

                {currentPage === 'about' && (
                  <div className="space-y-4 pt-8 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('companyStatsLabel')}</label>
                      <button 
                        onClick={() => setPageEditForm({
                          ...pageEditForm,
                          stats: [...(pageEditForm.stats || []), { 
                            value: { lt: '', en: '', de: '', uk: '' }, 
                            label: { lt: '', en: '', de: '', uk: '' } 
                          }]
                        })}
                        className="text-[10px] font-black uppercase text-red-600 hover:bg-red-50 px-3 py-1 rounded"
                      >
                        {t('addStatButton')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(pageEditForm.stats || []).map((stat, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-2xl space-y-3 relative group">
                          <button 
                            onClick={() => {
                              const newStats = [...(pageEditForm.stats || [])];
                              newStats.splice(idx, 1);
                              setPageEditForm({...pageEditForm, stats: newStats});
                            }}
                            className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <input 
                            placeholder={t('statValuePlaceholder')}
                            value={stat.value[language] || ''}
                            onChange={e => {
                              const newStats = [...(pageEditForm.stats || [])];
                              newStats[idx].value[language] = e.target.value;
                              setPageEditForm({...pageEditForm, stats: newStats});
                            }}
                            className="w-full px-3 py-2 text-sm font-black text-red-600 bg-white border border-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                          />
                          <input 
                            placeholder={t('statLabelPlaceholder')}
                            value={stat.label[language] || ''}
                            onChange={e => {
                              const newStats = [...(pageEditForm.stats || [])];
                              newStats[idx].label[language] = e.target.value;
                              setPageEditForm({...pageEditForm, stats: newStats});
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-gray-400 bg-white border border-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Left Column: Input and Toolbar */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('contentLabel')} ({language.toUpperCase()})</label>
                    <MarkdownToolbar onInsert={(prefix, suffix) => {
                      const textarea = document.getElementById(`page-content-edit`) as HTMLTextAreaElement;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const currentContent = pageEditForm.content || {};
                      const text = (currentContent[language] as string) || '';
                      const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
                      setPageEditForm({
                        ...pageEditForm,
                        content: { ...currentContent, [language]: newText } as any
                      });
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
                      }, 10);
                    }} />
                    <textarea 
                      id="page-content-edit"
                      value={pageEditForm.content?.[language] || ''}
                      onChange={e => setPageEditForm({
                        ...pageEditForm, 
                        content: { ...pageEditForm.content, [language]: e.target.value } as any
                      })}
                      placeholder={t('pageContentPlaceholder')}
                      className="w-full min-h-[420px] px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all font-medium text-sm leading-relaxed"
                    />
                  </div>

                  {/* Right Column: Word-like Live Preview */}
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        {t('livePreview')}
                      </label>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">{t('wordStyle')}</span>
                    </div>
                    <div className="w-full h-[460px] bg-gray-50 border border-gray-200 rounded-2xl p-4 overflow-y-auto shadow-inner">
                      <div className="border border-gray-100 p-8 shadow-md bg-white min-h-[400px] relative rounded-lg">
                        <div className="absolute top-0 right-0 p-3 text-[8px] font-mono text-gray-300 pointer-events-none uppercase tracking-widest">{t('documentHeader')}</div>
                        <div className="prose prose-sm prose-red max-w-none text-gray-700 leading-relaxed font-medium selection:bg-red-100">
                          {pageEditForm.content?.[language] ? (
                            <Markdown rehypePlugins={[rehypeRaw]}>{pageEditForm.content[language]}</Markdown>
                          ) : (
                            <span className="italic text-gray-300 text-xs">{t('previewPrompt')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                <button 
                  onClick={() => setIsEditingPage(null)}
                  className="px-6 py-3 font-bold text-gray-500 hover:text-black transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSavePage}
                  className="px-10 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95"
                >
                  {t('savePage')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Editor Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-600 text-white rounded-lg">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight uppercase">
                    {isEditing === 'new' ? t('createPost') : t('editPostForm')}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsEditing(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('titleLabel')} ({language.toUpperCase()})</label>
                  <input 
                    type="text"
                    // @ts-ignore
                    value={editForm.title?.[language] || ''}
                    onChange={e => {
                      const newTitle = typeof editForm.title === 'object' ? { ...editForm.title } : { lt: editForm.title || '', en: '', de: '', uk: '' };
                      // @ts-ignore
                      newTitle[language] = e.target.value;
                      setEditForm({...editForm, title: newTitle});
                    }}
                    placeholder={t('titlePlaceholder')}
                    className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-gray-200 p-0"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" /> {t('postImagesLabel')}
                    </label>
                    <FileUploader 
                      images={editForm.imageUrls || []} 
                      onChange={urls => setEditForm({...editForm, imageUrls: urls})} 
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('aspectRatioLabel')}</label>
                    <div className="flex flex-wrap gap-2">
                      {ASPECT_RATIOS.map(ratio => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, aspectRatio: ratio })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            editForm.aspectRatio === ratio 
                              ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200" 
                              : "bg-white border-gray-100 text-gray-400 hover:border-red-600"
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('visibilityLabel')}</label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setEditForm({...editForm, isPublished: true})}
                        className={cn(
                          "flex-1 h-[50px] flex items-center justify-center gap-2 rounded-xl border-2 transition-all font-bold text-sm",
                          editForm.isPublished ? "bg-green-50 border-green-600 text-green-700" : "bg-white border-gray-100 text-gray-400"
                        )}
                      >
                        <Check className="w-4 h-4" /> {t('published')}
                      </button>
                      <button 
                        onClick={() => setEditForm({...editForm, isPublished: false})}
                        className={cn(
                          "flex-1 h-[50px] flex items-center justify-center gap-2 rounded-xl border-2 transition-all font-bold text-sm",
                          !editForm.isPublished ? "bg-yellow-50 border-yellow-500 text-yellow-700" : "bg-white border-gray-100 text-gray-400"
                        )}
                      >
                        <Clock className="w-4 h-4" /> {t('draft')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 italic">{t('pinToTop')}</label>
                    <button 
                      onClick={() => setEditForm({...editForm, isPinned: !editForm.isPinned})}
                      className={cn(
                        "w-full h-[50px] flex items-center justify-center gap-2 rounded-xl border-2 transition-all font-bold text-sm",
                        editForm.isPinned ? "bg-red-50 border-red-600 text-red-700" : "bg-white border-gray-100 text-gray-400"
                      )}
                    >
                      <Shield className="w-4 h-4" /> {editForm.isPinned ? t('pinnedToTop') : t('pinToTop')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Left Column: Input and Toolbar */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('contentLabel')} ({language.toUpperCase()})</label>
                    <MarkdownToolbar onInsert={(prefix, suffix) => {
                      const textarea = document.getElementById(`news-content-edit`) as HTMLTextAreaElement;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const currentContent = typeof editForm.content === 'object' ? { ...editForm.content } : { lt: editForm.content || '', en: '', de: '', uk: '' };
                      // @ts-ignore
                      const text = (currentContent[language] as string) || '';
                      const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
                      // @ts-ignore
                      currentContent[language] = newText;
                      setEditForm({...editForm, content: currentContent});
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
                      }, 10);
                    }} />
                    <textarea 
                      id="news-content-edit"
                      // @ts-ignore
                      value={editForm.content?.[language] || ''}
                      onChange={e => {
                        const newContent = typeof editForm.content === 'object' ? { ...editForm.content } : { lt: editForm.content || '', en: '', de: '', uk: '' };
                        // @ts-ignore
                        newContent[language] = e.target.value;
                        setEditForm({...editForm, content: newContent});
                      }}
                      placeholder={t('storyPlaceholder')}
                      className="w-full min-h-[420px] px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all font-mono text-sm leading-relaxed"
                    />
                  </div>

                  {/* Right Column: Word-like Live Preview */}
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        {t('livePreview')}
                      </label>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">{t('wordStyle')}</span>
                    </div>
                    <div className="w-full h-[460px] bg-gray-50 border border-gray-200 rounded-2xl p-4 overflow-y-auto shadow-inner">
                      <div className="border border-gray-100 p-8 shadow-md bg-white min-h-[400px] relative rounded-lg">
                        <div className="absolute top-0 right-0 p-3 text-[8px] font-mono text-gray-300 pointer-events-none uppercase tracking-widest">{t('documentHeader')}</div>
                        <div className="prose prose-sm prose-red max-w-none text-gray-700 leading-relaxed font-medium selection:bg-red-100">
                          {getPostContent(editForm as NewsPost, language) ? (
                            <Markdown rehypePlugins={[rehypeRaw]}>{getPostContent(editForm as NewsPost, language)}</Markdown>
                          ) : (
                            <span className="italic text-gray-300 text-xs">{t('documentPlaceholder')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                <button 
                  onClick={() => setIsEditing(null)}
                  className="px-6 py-3 font-bold text-gray-500 hover:text-black transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSavePost}
                  disabled={!getPostTitle(editForm as NewsPost, language) || !getPostContent(editForm as NewsPost, language)}
                  className="px-10 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {t('savePostButton')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-black text-white py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <img src="./logotipas_spt.png" alt="SPT logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
                <div>
                  <h1 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">{language === 'lt' ? 'UAB „Skysčių perpylimo technologijos“' : 'UAB Liquid Transfer Technologies'}</h1>
                </div>
              </div>
              <p className="text-gray-400 max-w-sm leading-relaxed font-medium">
                {t('footerDesc')}
              </p>
            </div>
            
            <div>
              <h5 className="font-black mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-500 italic">{t('quickLinks')}</h5>
              <ul className="space-y-4 text-xs font-black uppercase tracking-widest">
                <li><button onClick={() => setCurrentPage('solutions')} className="hover:text-red-600 transition-colors">{t('solutions')}</button></li>
                <li><button onClick={() => setCurrentPage('services')} className="hover:text-red-600 transition-colors">{t('services')}</button></li>
                <li><button onClick={() => setCurrentPage('products')} className="hover:text-red-600 transition-colors">{t('products')}</button></li>
                <li><button onClick={() => setCurrentPage('about')} className="hover:text-red-600 transition-colors">{t('about')}</button></li>
                <li><button onClick={() => setCurrentPage('contact')} className="hover:text-red-600 transition-colors">{t('contact')}</button></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-500 italic">{t('contact')}</h5>
              <ul className="space-y-4 text-sm font-medium text-gray-400">
                <li className="flex items-center gap-2"><Mail className="w-3 h-3 text-red-600" /> dgarmus@spt.lt</li>
                <li className="flex items-center gap-2"><Phone className="w-3 h-3 text-red-600" /> +370 37 407277</li>
                <li className="flex items-center gap-2"><MapPin className="w-3 h-3 text-red-600" /> T. Masiulio g. 18b, Kaunas</li>
              </ul>
              <div className="mt-12">
                <button 
                  onClick={() => navigate('/admin')}
                  className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 hover:text-red-600 transition-colors flex items-center gap-2 py-2 px-4 border border-gray-900 rounded-lg"
                >
                  <Shield className="w-3 h-3" /> Admin Portal
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">
            <p>© {new Date().getFullYear()} SPT. {t('allRightsReserved')}</p>
            {/* <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">{t('privacyPolicy')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('termsOfService')}</a>
            </div> */}
          </div>
        </div>
      </footer>
    </div>
  } />
</Routes>
  );
}
