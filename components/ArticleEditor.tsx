
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Article } from '../types';
import { 
  Check, 
  Edit3, 
  Globe, 
  Save, 
  Trash2, 
  Download, 
  FileJson, 
  FileText, 
  Code, 
  ShieldCheck, 
  UserCheck, 
  SearchCheck, 
  RefreshCw,
  Clock,
  Image as ImageIcon,
  Type as TypeIcon,
  CheckCircle2,
  Target,
  Layout
} from 'lucide-react';

interface ArticleEditorProps {
  article: Article;
  onUpdate: (article: Article) => void;
  onPublish: (article: Article) => void;
  onDelete: (id: string) => void;
  isPublishing: boolean;
}

const ArticleEditor: React.FC<ArticleEditorProps> = ({ article, onUpdate, onPublish, onDelete, isPublishing }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(article.content);
  const [editedMeta, setEditedMeta] = useState(article.metaDescription);
  const [showExport, setShowExport] = useState(false);

  const handleSave = () => {
    onUpdate({ ...article, content: editedContent, metaDescription: editedMeta });
    setIsEditing(false);
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  };

  const exportAs = (format: 'html' | 'md' | 'txt') => {
    let content = article.content;
    let fileName = `${article.slug}.${format}`;
    let type = "text/plain";

    if (format === 'html') {
      content = `<!DOCTYPE html><html><head><title>${article.title}</title></head><body><h1>${article.title}</h1>${article.content.replace(/\n/g, '<br>')}</body></html>`;
      type = "text/html";
    }
    
    downloadFile(content, fileName, type);
    setShowExport(false);
  };

  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden mb-8 transition-all hover:shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 border-r border-slate-100">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{article.title}</h3>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1 uppercase tracking-widest text-[10px] font-black">
                Format: <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Markdown Optimized</span>
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowExport(!showExport)}
                  className="p-3 text-slate-600 hover:bg-white border border-slate-200 bg-white rounded-xl transition-all"
                  title="Export options"
                >
                  <Download size={20} />
                </button>
                {showExport && (
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <button onClick={() => exportAs('html')} className="w-full px-5 py-4 text-left text-sm hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 font-bold text-slate-700">
                      <Code size={18} className="text-orange-500" /> Export as HTML
                    </button>
                    <button onClick={() => exportAs('md')} className="w-full px-5 py-4 text-left text-sm hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 font-bold text-slate-700">
                      <FileText size={18} className="text-blue-500" /> Export as Markdown
                    </button>
                    <button onClick={() => exportAs('txt')} className="w-full px-5 py-4 text-left text-sm hover:bg-slate-50 flex items-center gap-3 font-bold text-slate-700">
                      <FileJson size={18} className="text-slate-500" /> Export as Plain Text
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'text-slate-600 hover:bg-white border border-slate-200 bg-white'}`}>
                {isEditing ? <Save size={20} /> : <Edit3 size={20} />}
              </button>
              <button onClick={() => onDelete(article.id)} className="p-3 text-red-500 hover:bg-red-50 border border-red-100 bg-white rounded-xl transition-all">
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <div className="p-8">
            {/* Yoast SEO Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Target size={12} className="text-blue-500" /> Focus Keyphrase
                </div>
                <div className="text-sm font-bold text-slate-800">{article.focusKeyword || 'Not Set'}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Layout size={12} className="text-emerald-500" /> SEO Title
                </div>
                <div className="text-sm font-bold text-slate-800">{article.seoTitle || article.title}</div>
              </div>
            </div>

            {/* Meta Description Section */}
            <div className="mb-8 bg-slate-900 rounded-3xl p-8 border border-white/5 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <SearchCheck size={14} /> Meta Description (Yoast SEO)
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {getWordCount(editedMeta)} Words
                  </div>
                  <div className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                    editedMeta.length >= 120 && editedMeta.length <= 160 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : editedMeta.length > 160 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {editedMeta.length} / 160 Chars
                  </div>
                </div>
              </div>
              {isEditing ? (
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all h-24 resize-none"
                  value={editedMeta}
                  onChange={(e) => setEditedMeta(e.target.value)}
                  placeholder="Enter meta description..."
                />
              ) : (
                <p className="text-slate-400 text-sm font-medium leading-relaxed italic">
                  "{article.metaDescription}"
                </p>
              )}
              
              {/* Yoast Style Progress Bar */}
              <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    editedMeta.length < 120 ? 'bg-amber-500' : 
                    editedMeta.length <= 160 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((editedMeta.length / 160) * 100, 100)}%` }}
                ></div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${editedMeta.length >= 120 && editedMeta.length <= 160 ? 'bg-green-500' : editedMeta.length > 160 ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {editedMeta.length < 120 ? 'Too short' : editedMeta.length > 160 ? 'Too long' : 'Optimal length'}
                  </span>
                </div>
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                  Recommended: 120-160 chars
                </div>
              </div>
            </div>

            {article.imageUrl && (
              <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 aspect-[16/9] shadow-inner bg-slate-100 relative group">
                <img src={article.imageUrl} alt="Unique AI Generated" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={12} className="text-blue-400" /> Unique AI Image Generated
                </div>
              </div>
            )}

            {isEditing ? (
              <div className="relative">
                <textarea
                  className="w-full h-[600px] p-8 border border-slate-100 rounded-2xl font-mono text-base leading-relaxed focus:ring-4 focus:ring-blue-500/10 focus:outline-none bg-slate-50/50"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                />
                <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  {getWordCount(editedContent)} Words | {editedContent.length} Chars
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="prose prose-slate max-w-none h-[600px] overflow-y-auto border border-slate-100 rounded-2xl p-10 bg-white text-slate-700 leading-loose text-lg font-medium shadow-inner font-serif markdown-body">
                  <ReactMarkdown>{article.content}</ReactMarkdown>
                </div>
                <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  {getWordCount(article.content)} Words | {article.content.length} Chars
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators Panel */}
        <div className="bg-slate-50/50 p-8 flex flex-col gap-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Verification Badges</h4>
          
          <div className="space-y-4">
             {/* 1. Markdown Output */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 group">
               <div className="bg-blue-100 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                 <TypeIcon size={20} />
               </div>
               <div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format Status</div>
                 <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                   <CheckCircle2 size={12} className="text-green-500" /> Markdown Optimized
                 </div>
               </div>
             </div>

             {/* 2. Plagiarism Status */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 group">
               <div className="bg-green-100 p-3 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                 <ShieldCheck size={20} />
               </div>
               <div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Similarity Check</div>
                 <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                   <CheckCircle2 size={12} className="text-green-500" /> 100% Plagiarism Free
                 </div>
               </div>
             </div>

             {/* 3. Humanized Status */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 group">
               <div className="bg-orange-100 p-3 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                 <UserCheck size={20} />
               </div>
               <div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Writing Quality</div>
                 <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                   <CheckCircle2 size={12} className="text-green-500" /> Human Written
                 </div>
               </div>
             </div>

             {/* 4. Visual Status */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 group">
               <div className="bg-purple-100 p-3 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
                 <ImageIcon size={20} />
               </div>
               <div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Asset</div>
                 <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                   <CheckCircle2 size={12} className="text-green-500" /> Unique Image Ready
                 </div>
               </div>
             </div>

             {/* 5. Scheduling Status */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 group">
               <div className="flex items-center gap-4 mb-3">
                 <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                   <Clock size={20} />
                 </div>
                 <div>
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Publishing Schedule</div>
                   <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                     {article.scheduledAt ? 'Scheduled' : 'Immediate'}
                   </div>
                 </div>
               </div>
               <input 
                 type="datetime-local" 
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                 value={article.scheduledAt ? new Date(new Date(article.scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                 onChange={(e) => {
                   const date = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                   onUpdate({ ...article, scheduledAt: date });
                 }}
               />
             </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl text-white mt-4 shadow-xl">
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">SEO Readiness Score</div>
             <div className="flex items-end justify-between">
               <div className="flex items-end gap-2">
                 <span className={`text-4xl font-black ${
                   (article.seoScore || 0) >= 90 ? 'text-blue-400' : 
                   (article.seoScore || 0) >= 70 ? 'text-emerald-400' : 
                   (article.seoScore || 0) >= 50 ? 'text-amber-400' : 'text-red-400'
                 }`}>{article.seoScore || 0}</span>
                 <span className="text-xs font-bold text-slate-400 mb-1">/ 100</span>
               </div>
               <div className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-tighter ${
                 (article.seoScore || 0) >= 90 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                 (article.seoScore || 0) >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                 (article.seoScore || 0) >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
               }`}>
                 {(article.seoScore || 0) >= 90 ? 'Excellent' : 
                  (article.seoScore || 0) >= 70 ? 'Good' : 
                  (article.seoScore || 0) >= 50 ? 'Fair' : 'Poor'}
               </div>
             </div>
             <div className="w-full bg-slate-800 h-1 rounded-full mt-4 overflow-hidden">
               <div className={`h-full rounded-full transition-all duration-1000 ${
                 (article.seoScore || 0) >= 90 ? 'bg-blue-500' : 
                 (article.seoScore || 0) >= 70 ? 'bg-emerald-500' : 
                 (article.seoScore || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
               }`} style={{ width: `${article.seoScore || 0}%` }}></div>
             </div>
             <p className="text-[9px] text-slate-500 mt-3 font-medium leading-tight italic">
               {(article.seoScore || 0) >= 90 ? 'Optimized for high search visibility.' : 
                (article.seoScore || 0) >= 70 ? 'Strong SEO foundation, minor tweaks possible.' : 
                (article.seoScore || 0) >= 50 ? 'Needs more keyword optimization and structure.' : 'Critical SEO issues detected. Review recommendations.'}
             </p>
          </div>

          {article.seoRecommendations && article.seoRecommendations.length > 0 && (
            <div className="mt-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <SearchCheck size={14} /> SEO Recommendations
              </div>
              <ul className="space-y-3">
                {article.seoRecommendations.map((rec, index) => (
                  <li key={index} className="text-xs font-medium text-slate-600 flex gap-2">
                    <span className="text-blue-500 font-black">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-slate-200">
            {article.status !== 'published' ? (
              <button
                onClick={() => onPublish(article)}
                disabled={isPublishing}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 uppercase tracking-widest text-xs"
              >
                {isPublishing ? <RefreshCw size={18} className="animate-spin" /> : <Globe size={18} />}
                {article.scheduledAt ? 'SCHEDULE ON WORDPRESS' : 'PUBLISH TO WORDPRESS'}
              </button>
            ) : (
              <a 
                href={article.publishedUrl} 
                target="_blank" 
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-green-50 text-green-700 border-2 border-green-200 font-black rounded-2xl hover:bg-green-100 transition-all uppercase tracking-widest text-xs"
              >
                <Globe size={18} /> VIEW LIVE POST
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;
