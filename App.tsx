
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppState, 
  Trend, 
  Article, 
  WordPressConfig,
  Keyword,
  COUNTRIES,
  CATEGORIES,
  Member,
  SystemConfig
} from './types';
import { 
  fetchTrendingTopics, 
  generateArticle, 
  auditAndRewrite,
  findKeywords,
  generateBlogImage,
  fetchSmartSuggestions
} from './services/gemini';
import { publishToWordPress } from './services/wordpress';
import { authApi } from './services/auth';
import ArticleEditor from './components/ArticleEditor';
import AdminSection from './components/AdminSection';
import { 
  PenTool, 
  Settings as SettingsIcon, 
  TrendingUp, 
  Search,
  AlertCircle,
  FileText,
  Clock,
  History,
  CheckCircle2,
  Menu,
  X,
  RefreshCw,
  RotateCcw,
  Plus,
  Compass,
  Zap,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  MapPin,
  Flame,
  LayoutGrid,
  ShieldCheck,
  Lock,
  User,
  Share2,
  Lightbulb,
  ArrowUpRight
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppState>(AppState.DASHBOARD);
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('US');
  const [category, setCategory] = useState('All categories');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<{ topic: string, reason: string, potential: string, keywords: string[] }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [logs, setLogs] = useState<{msg: string, time: string, type: 'info'|'success'|'error'}[]>([]);
  
  // Date Range State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Auth & Admin State
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [enteredKey, setEnteredKey] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [tempGeminiKey, setTempGeminiKey] = useState('');
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem('as_system_config');
      return saved ? JSON.parse(saved) : { isPrivateMode: true, adminPasswordHash: 'admin123', defaultNiche: '' };
    } catch (e) {
      console.error("Failed to load system config:", e);
      return { isPrivateMode: true, adminPasswordHash: 'admin123', defaultNiche: '' };
    }
  });

  const [wpConfig, setWpConfig] = useState<WordPressConfig>(() => {
    try {
      const saved = localStorage.getItem('wp_config');
      return saved ? JSON.parse(saved) : { url: '', username: '', appPassword: '' };
    } catch (e) {
      console.error("Failed to load WP config:", e);
      return { url: '', username: '', appPassword: '' };
    }
  });
  const [sessionGeminiKey, setSessionGeminiKey] = useState<string>(() => localStorage.getItem('as_session_gemini_key') || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [seedKeyword, setSeedKeyword] = useState('');
  const [hasError, setHasError] = useState(false);

  // Global error listener to catch crashes
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Handle mobile detection and sidebar initial state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const refreshIntervalRef = useRef<number | null>(null);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial Data Sync & Magic Link Check
  useEffect(() => {
    const init = async () => {
      const data = await authApi.getMembers();
      setMembers(data);

      // Check for Magic Link (?key=XXXX)
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('key');
      if (urlKey) {
        const member = data.find(m => m.accessKey === urlKey && m.status === 'Active');
        if (member) {
          setIsAccessGranted(true);
          setCurrentUser(member);
          if (member.geminiApiKey) {
            setSessionGeminiKey(member.geminiApiKey);
            setTempGeminiKey(member.geminiApiKey);
          }
          setEnteredKey(urlKey);
          addLog(`Magic Link detected. Welcome back, ${member.name}!`, 'success');
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    init();
  }, []);

  const handleUpdateGeminiKey = async () => {
    if (!tempGeminiKey) {
      alert("Please enter a valid Gemini API Key.");
      return;
    }
    
    if (currentUser) {
      const success = await authApi.updateMemberGeminiKey(currentUser.id, tempGeminiKey);
      if (success) {
        setSessionGeminiKey(tempGeminiKey);
        addLog("Gemini API Key updated successfully.", "success");
        const updatedMembers = await authApi.getMembers();
        setMembers(updatedMembers);
        const updatedUser = updatedMembers.find(m => m.id === currentUser.id);
        if (updatedUser) setCurrentUser(updatedUser);
      } else {
        addLog("Failed to update Gemini API Key.", "error");
      }
    } else {
      setSessionGeminiKey(tempGeminiKey);
      try {
        localStorage.setItem('as_session_gemini_key', tempGeminiKey);
      } catch (e) {
        console.error("Failed to save session key:", e);
      }
      addLog("Gemini API Key saved for this session.", "success");
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('wp_config', JSON.stringify(wpConfig));
    } catch (e) {
      console.error("Failed to save WP config:", e);
    }
  }, [wpConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('as_system_config', JSON.stringify(systemConfig));
    } catch (e) {
      console.error("Failed to save system config:", e);
    }
  }, [systemConfig]);

  useEffect(() => {
    if (autoRefresh && isAccessGranted) {
      addLog(`Auto-refresh enabled. Syncing every 5 minutes...`, 'info');
      refreshIntervalRef.current = window.setInterval(() => {
        handleFetchTrends();
      }, 300000); 
    } else {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh, isAccessGranted]);

  const addLog = useCallback((msg: string, type: 'info'|'success'|'error' = 'info') => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev]);
  }, []);

  const handleAccessCheck = () => {
    if (!systemConfig.isPrivateMode) {
      setIsAccessGranted(true);
      return;
    }
    const member = members.find(m => m.accessKey === enteredKey && m.status === 'Active');
    if (member) {
      setIsAccessGranted(true);
      setCurrentUser(member);
      if (member.geminiApiKey) {
        setSessionGeminiKey(member.geminiApiKey);
        setTempGeminiKey(member.geminiApiKey);
      }
      addLog(`Access granted to ${member.name} (${member.role})`, 'success');
    } else {
      alert("Invalid Access Key or Account Suspended.");
    }
  };

  const performTrendSync = async (currentNiche: string, currentCountry: string, currentCategory: string) => {
    setIsLoading(true);
    setTrends([]);
    const countryName = COUNTRIES.find(c => c.code === currentCountry)?.name || currentCountry;
    addLog(`Initiating Manual Scan: ${currentNiche} | ${countryName} | ${currentCategory}`);
    try {
      const results = await fetchTrendingTopics(currentNiche, currentCountry, currentCategory, sessionGeminiKey);
      setTrends(results);
      if (results.length > 0) {
        addLog(`Success: Found ${results.length} breakout topics.`, 'success');
      } else {
        addLog(`No trending topics found for this selection. Try broader parameters.`, 'info');
      }
    } catch (e: any) {
      addLog(`Sync Error: ${e.message}`, 'error');
      setTrends([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchTrends = () => {
    performTrendSync(niche, country, category);
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountry(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
  };

  const handleKeywordSearch = async () => {
    if (!seedKeyword) return;
    setIsLoading(true);
    addLog(`Keyword Research: Analyzing "${seedKeyword}" ${startDate ? `from ${startDate}` : ''} ${endDate ? `to ${endDate}` : ''}...`);
    addLog(`Engine: Connecting to search breakouts (this may take up to 60 seconds)...`, 'info');
    try {
      const results = await findKeywords(seedKeyword, startDate, endDate, sessionGeminiKey);
      setKeywords(results);
      if (results.length > 0) {
        addLog(`Success: Found ${results.length} actionable keywords.`, 'success');
      } else {
        addLog(`Notice: No keywords found for this topic. Try a broader term.`, 'info');
      }
      if (currentUser) {
        const updated = await authApi.updateUsage(currentUser.id, 'keywords');
        if (updated) setCurrentUser(updated);
      }
    } catch (e: any) {
      addLog(`Error: ${e.message || e}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchSuggestions = async () => {
    setIsSuggesting(true);
    const countryName = COUNTRIES.find(c => c.code === country)?.name || country;
    addLog(`AI Engine: Fetching rising low-competition topics for "${niche}" in ${countryName}...`);
    try {
      const results = await fetchSmartSuggestions(niche, country, sessionGeminiKey);
      setSuggestedTopics(results);
      addLog(`AI suggested ${results.length} high-potential topics.`, 'success');
    } catch (e: any) {
      addLog(`Suggestion Error: ${e.message || e}`, 'error');
    } finally {
      setIsSuggesting(false);
    }
  };

  // Auto-fetch suggestions when niche/country changes or tab is opened
  useEffect(() => {
    if (activeTab === AppState.IDEAS && suggestedTopics.length === 0 && isAccessGranted) {
      handleFetchSuggestions();
    }
  }, [activeTab, isAccessGranted]);

  const handleWriteArticle = async (topic: string, intent: string = "Informational") => {
    setIsLoading(true);
    addLog(`Engine: Starting generation for "${topic}"...`);
    try {
      addLog(`Step 1/3: Generating human-like draft...`);
      let data = await generateArticle(topic, intent, sessionGeminiKey);
      
      addLog(`Step 2/3: Running humanization and SEO audit...`);
      let audit = await auditAndRewrite(data.content || '', data.title || topic, data.keywords || [], sessionGeminiKey);
      
      addLog(`Step 3/3: Generating professional featured image...`);
      const imageUrl = await generateBlogImage(topic, sessionGeminiKey);
      
      const newArticle: Article = {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title || topic,
        seoTitle: data.seoTitle,
        focusKeyword: data.focusKeyword,
        content: audit.rewritten || data.content || '',
        status: 'ready',
        slug: data.slug || topic.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        metaDescription: data.metaDescription || '',
        keywords: data.keywords || [],
        createdAt: Date.now(),
        similarityScore: audit.similarity,
        humanScore: audit.humanScore || 95,
        seoReady: audit.seoScore > 80,
        seoScore: audit.seoScore,
        seoRecommendations: audit.seoRecommendations,
        imageUrl: imageUrl
      };

      setArticles(prev => [newArticle, ...prev]);
      addLog(`Success: Article generated and audited.`, 'success');
      if (currentUser) {
        await authApi.updateUsage(currentUser.id, 'articles');
        const updated = await authApi.updateUsage(currentUser.id, 'images');
        if (updated) setCurrentUser(updated);
      }
      setActiveTab(AppState.WRITER);
    } catch (e: any) {
      addLog(`Failure: ${e.message || e}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (article: Article) => {
    if (!wpConfig.url || !wpConfig.appPassword) {
      addLog("WP Error: Configuration missing!", "error");
      setActiveTab(AppState.SETTINGS);
      return;
    }
    
    setIsPublishing(true);
    const action = article.scheduledAt ? 'Scheduling' : 'Publishing';
    addLog(`${action} "${article.title}" to WordPress...`);
    try {
      const url = await publishToWordPress(article, wpConfig);
      const status = article.scheduledAt ? 'ready' : 'published';
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: status, publishedUrl: url } : a));
      const successMsg = article.scheduledAt ? `Success: Post scheduled for ${new Date(article.scheduledAt).toLocaleString()}` : `Success: Post live at ${url}`;
      addLog(successMsg, 'success');
    } catch (e) {
      addLog(`WP Error: ${e}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const deleteArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id));
    addLog("Cleanup: Draft deleted.");
  };

  const updateArticle = (article: Article) => {
    setArticles(prev => prev.map(a => a.id === article.id ? article : a));
  };

  const handleResetApp = () => {
    if (confirm("Are you sure you want to reset the application? This will clear all local data, including articles and settings.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 rounded-[3rem] p-12 border border-slate-800 text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-8" />
          <h1 className="text-2xl font-black text-white mb-4 uppercase italic">System Crash Detected</h1>
          <p className="text-slate-400 mb-10">A critical error occurred. This might be due to corrupted local data or browser restrictions.</p>
          <button onClick={handleResetApp} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all uppercase tracking-widest text-xs">Reset Application</button>
        </div>
      </div>
    );
  }

  if (!isAccessGranted && systemConfig.isPrivateMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-12 border border-slate-800 shadow-2xl animate-in zoom-in-95 my-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-600/20 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] text-blue-500 mb-6 sm:mb-8 border border-blue-500/20 shadow-xl shadow-blue-500/10">
              <Lock size={32} className="sm:w-12 sm:h-12" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tighter uppercase italic">Protected Studio</h1>
            <p className="text-slate-400 text-[10px] sm:text-sm font-medium mb-8 sm:mb-10 leading-relaxed px-2">This SaaS instance is in Private Mode. Please enter your member access key to proceed.</p>
            
            <input 
              type="password"
              className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-800/50 border border-slate-700 rounded-2xl text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:outline-none mb-4 sm:mb-6 text-center tracking-widest placeholder:tracking-normal placeholder:font-normal text-sm sm:text-base"
              placeholder="Enter Access Key..."
              value={enteredKey}
              onChange={(e) => setEnteredKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAccessCheck()}
            />
            
            <button 
              onClick={handleAccessCheck}
              className="w-full py-4 sm:py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/40 uppercase tracking-widest text-xs sm:text-sm"
            >
              Unlock Access
            </button>
            <p className="mt-6 sm:mt-8 text-[9px] sm:text-[10px] text-slate-600 font-black uppercase tracking-widest">AutoStudio v2.5 Enterprise</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionGeminiKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
        <div className="absolute -top-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-lg w-full bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-16 border border-white/5 shadow-2xl animate-in zoom-in-95 relative z-10 my-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] text-white mb-8 sm:mb-10 shadow-2xl shadow-blue-500/20 border border-white/10">
              <Zap size={32} className="sm:w-12 sm:h-12 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white mb-3 sm:mb-4 tracking-tighter uppercase italic">Engine Activation</h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium mb-8 sm:mb-12 leading-relaxed px-2">
              To use the AutoStudio tools, you must connect your own <span className="text-blue-400 font-bold">Google Gemini API Key</span>. 
            </p>
            
            <div className="w-full space-y-4 sm:space-y-6">
              <div className="relative">
                <ShieldCheck className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 sm:w-6 sm:h-6" />
                <input 
                  type="password"
                  className="w-full pl-12 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-6 bg-slate-800/50 border border-slate-700 rounded-2xl text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:outline-none placeholder:font-normal text-sm sm:text-base"
                  placeholder="Enter Gemini API Key..."
                  value={tempGeminiKey}
                  onChange={(e) => setTempGeminiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateGeminiKey()}
                />
              </div>
              
              <button 
                onClick={handleUpdateGeminiKey}
                className="w-full py-4 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-2xl shadow-blue-900/40 uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm border border-white/10"
              >
                Activate Studio
              </button>
              
              <div className="pt-4 sm:pt-6 flex flex-col items-center gap-3 sm:gap-4">
                <a 
                  href="https://ai.google.dev/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] sm:text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors"
                >
                  Get your free API Key here <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                </a>
                <p className="text-[9px] sm:text-[10px] text-slate-600 font-black uppercase tracking-widest">AutoStudio v2.5 Neural Engine</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 selection:bg-blue-100 font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-24'} 
        bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col fixed lg:sticky top-0 h-screen z-[70] border-r border-slate-800 shadow-2xl
      `}>
        <div className="p-6 lg:p-8 flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-500/30">
            <PenTool size={24} />
          </div>
          {(isSidebarOpen || !isMobile) && <span className="font-black text-white text-xl tracking-tighter">AutoStudio <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded ml-1 uppercase">Free</span></span>}
        </div>

        <nav className="flex-1 px-4 lg:px-5 py-4 lg:py-6 space-y-2 overflow-y-auto">
          {[
            { id: AppState.DASHBOARD, label: 'Analytics & Trends', icon: TrendingUp },
            { id: AppState.IDEAS, label: 'Content Ideas', icon: Lightbulb },
            { id: AppState.KEYWORDS, label: 'SEO Keywords', icon: Compass },
            { id: AppState.WRITER, label: 'Article Studio', icon: FileText },
            { id: AppState.LOGS, label: 'Process Logs', icon: History },
            { id: AppState.SETTINGS, label: 'Configurations', icon: SettingsIcon },
            { id: AppState.ADMIN, label: 'Admin Control', icon: ShieldCheck },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/50 translate-x-2' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={22} />
              {(isSidebarOpen || !isMobile) && <span className="font-bold">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-5 mt-auto border-t border-slate-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-4 rounded-2xl hover:bg-slate-800 transition-all bg-slate-900 border border-slate-800"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full min-w-0">
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-slate-200 px-6 lg:px-10 py-4 lg:py-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg lg:text-2xl font-black text-slate-800 uppercase tracking-tighter truncate max-w-[150px] md:max-w-none">
              {activeTab.replace('_', ' ')}
            </h1>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <p className="text-[10px] text-slate-400 font-black hidden md:block tracking-widest uppercase">Content OS</p>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
             <div className="flex items-center gap-3 text-[9px] lg:text-[10px] font-black px-3 lg:px-4 py-2 bg-green-500/5 text-green-600 rounded-xl border border-green-500/10 uppercase tracking-widest shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              <span className="hidden xs:inline">Engines: Gemini 3</span>
              <span className="xs:hidden">G3</span>
            </div>
            {systemConfig.isPrivateMode && (
              <button 
                onClick={() => {
                  setIsAccessGranted(false);
                  setCurrentUser(null);
                  setSessionGeminiKey('');
                  setTempGeminiKey('');
                }} 
                className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase flex items-center gap-2 px-2 lg:px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg"
              >
                <Lock size={12} /> <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-4 lg:p-10 max-w-7xl mx-auto">
          {activeTab === AppState.DASHBOARD && (
            <div className="space-y-10">
              {/* Usage Stats Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-6">
                  <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                    <Search size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Keywords Today</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-800">{currentUser?.usage?.keywords || 0}</span>
                      <span className="text-xs font-bold text-slate-400">/ 1500</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-6">
                  <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                    <PenTool size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Articles Today</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-800">{currentUser?.usage?.articles || 0}</span>
                      <span className="text-xs font-bold text-slate-400">/ 500</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-6">
                  <div className="bg-purple-50 p-4 rounded-2xl text-purple-600">
                    <Zap size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Images Today</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-800">{currentUser?.usage?.images || 0}</span>
                      <span className="text-xs font-bold text-slate-400">/ 100</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <TrendingUp size={200} />
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
                  <div className="max-w-xl">
                    <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Trends discovery</h2>
                    <p className="text-slate-500 text-lg font-medium leading-relaxed">Fetch high-momentum breakout topics from Google Trends using region and category filters.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                      <MapPin size={16} className="text-slate-400 ml-2" />
                      <select 
                        value={country} 
                        onChange={handleRegionChange}
                        className="bg-transparent border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                      <LayoutGrid size={16} className="text-slate-400 ml-2" />
                      <select 
                        value={category} 
                        onChange={handleCategoryChange}
                        className="bg-transparent border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-5 relative z-10">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                    <input 
                      type="text"
                      className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all text-xl font-bold placeholder:font-medium shadow-inner"
                      placeholder="Enter your niche or keyword (e.g. Health, Finance)..."
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchTrends()}
                    />
                  </div>
                  <button
                    onClick={handleFetchTrends}
                    disabled={isLoading}
                    className="px-12 py-6 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-slate-800 transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl shadow-slate-300 group active:scale-95"
                  >
                    {isLoading ? <RefreshCw className="animate-spin" /> : <TrendingUp size={24} className="group-hover:translate-y-[-2px] transition-transform" />}
                    SCAN BREAKOUTS
                  </button>
                </div>
              </div>

              {trends.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {trends.map((trend, idx) => (
                      <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-2xl transition-all group flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-lg tracking-widest border border-blue-100 w-fit">{trend.category}</span>
                          <div className={`text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase ${trend.trendType === 'Realtime' ? 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse' : 'bg-green-50 text-green-600 border-green-100'}`}>{trend.trendType}</div>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-4 group-hover:text-blue-600 transition-colors">{trend.topic}</h3>
                        <p className="text-sm text-slate-500 mb-8 flex-1 italic line-clamp-2">Intent: {trend.searchIntent}</p>
                        <div className="pt-6 border-t border-slate-100 mt-auto flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Competition</span>
                            <span className="text-xs font-black text-amber-600">{trend.competition}</span>
                          </div>
                          <button onClick={() => handleWriteArticle(trend.topic, trend.searchIntent)} className="px-6 py-3 bg-blue-600 text-white font-black rounded-[1.5rem] hover:bg-blue-700 text-xs transition-all shadow-xl shadow-blue-100">WRITE NOW</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                !isLoading && (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 flex flex-col items-center text-center shadow-inner">
                    <Search size={48} className="text-slate-200 mb-6" />
                    <h3 className="text-xl font-bold text-slate-800">Ready to Discover Trends?</h3>
                    <p className="text-slate-500 max-sm mt-2">Pick a region and category, then hit "Scan Breakouts" to find what's trending globally right now.</p>
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === AppState.IDEAS && (
            <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
              {/* Smart Suggestions Section */}
              <div className="bg-slate-950 p-12 rounded-[3rem] shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Zap size={200} className="text-blue-500" />
                </div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                      <h2 className="text-5xl font-black text-white mb-3 tracking-tighter flex items-center gap-4">
                        <Flame className="text-orange-500 animate-pulse" size={40} /> AI Smart Suggestions
                      </h2>
                      <p className="text-slate-400 text-xl font-medium max-w-2xl">Rising low-competition topics identified by our neural engine across global markets.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <LayoutGrid size={16} className="text-blue-400 ml-2" />
                        <select 
                          className="bg-transparent border-none rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none cursor-pointer"
                          value={niche}
                          onChange={(e) => setNiche(e.target.value)}
                        >
                          {CATEGORIES.map(n => (
                            <option key={n} value={n} className="bg-slate-900">{n}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <MapPin size={16} className="text-blue-400 ml-2" />
                        <select 
                          className="bg-transparent border-none rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none cursor-pointer"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                        >
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.code} className="bg-slate-900">{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <button 
                        onClick={handleFetchSuggestions}
                        disabled={isSuggesting}
                        className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-[2rem] hover:from-blue-500 hover:to-indigo-500 transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-3 disabled:opacity-50 active:scale-95 border border-white/10"
                      >
                        {isSuggesting ? <RefreshCw className="animate-spin" /> : <Zap size={20} />}
                        REFRESH ENGINE
                      </button>
                    </div>
                  </div>

                  {suggestedTopics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {suggestedTopics.map((item, i) => (
                        <div key={i} className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] hover:bg-white/10 hover:border-blue-500/50 hover:shadow-[0_20px_60px_rgba(59,130,246,0.2)] transition-all duration-500 group flex flex-col relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
                              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">
                                {item.potential} Potential
                              </span>
                            </div>
                          </div>

                          <h3 className="text-2xl font-black text-white mb-4 group-hover:text-blue-400 transition-colors leading-tight tracking-tight">{item.topic}</h3>
                          
                          <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/5 group-hover:bg-white/10 transition-colors">
                            <p className="text-sm text-slate-300 leading-relaxed line-clamp-4 font-medium italic">
                              "{item.reason}"
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-8">
                            {item.keywords?.map((kw, ki) => (
                              <span key={ki} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-blue-200 uppercase tracking-wider group-hover:border-blue-500/30 transition-all">
                                #{kw}
                              </span>
                            ))}
                          </div>

                          <button 
                            onClick={() => handleWriteArticle(item.topic)}
                            className="mt-auto w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/40 transition-all active:scale-95 border border-white/10"
                          >
                            Craft Article
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-32 text-center border-2 border-dashed border-white/10 rounded-[3rem] bg-white/5">
                      <HelpCircle size={60} className="text-slate-700 mx-auto mb-6" />
                      <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-sm">Engine Standby. Click Refresh to Initialize.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Keyword Suggestions Section */}
              <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
                    <Compass size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Keyword Suggestions</h3>
                    <p className="text-slate-500 text-sm font-medium">Quick keywords to target for maximum visibility.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {keywords.length > 0 ? (
                    keywords.map((kw, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleWriteArticle(kw.phrase)}
                        className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700 group-hover:text-blue-700">{kw.phrase}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kw.volume}</span>
                        </div>
                      </button>
                    ))
                  ) : suggestedTopics.length > 0 ? (
                    suggestedTopics.flatMap(t => t.keywords).filter((v, i, a) => a.indexOf(v) === i).map((kw, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleWriteArticle(kw)}
                        className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700 group-hover:text-blue-700">{kw}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rising</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="w-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Perform a keyword search or refresh ideas to see suggestions.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === AppState.KEYWORDS && (
            <div className="space-y-10">
              <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-200">
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Keyword Engine</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Start Date</label>
                    <input 
                      type="date" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">End Date</label>
                    <input 
                      type="date" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-5">
                  <input 
                    type="text"
                    className="flex-1 px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:outline-none transition-all text-xl font-bold shadow-inner"
                    placeholder="Enter seed keyword (e.g. cloud computing)..."
                    value={seedKeyword}
                    onChange={(e) => setSeedKeyword(e.target.value)}
                  />
                  <button onClick={handleKeywordSearch} className="px-12 py-6 bg-emerald-600 text-white font-black rounded-[2rem] hover:bg-emerald-700 transition-all flex items-center justify-center gap-4">EXPAND TOPIC</button>
                </div>
              </div>
              {keywords.length > 0 ? (
                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Query</th><th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume</th><th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Competition</th><th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Intent</th><th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {keywords.map((kw, i) => (
                        <tr key={i} className="hover:bg-slate-50/30">
                          <td className="px-10 py-8"><span className="font-black text-slate-800 text-lg">{kw.phrase}</span></td>
                          <td className="px-10 py-8 text-center"><span className="text-sm font-bold text-slate-600">{kw.volume}</span></td>
                          <td className="px-10 py-8 text-center"><span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase ${kw.competition === 'Low' ? 'bg-green-50 text-green-600 border-green-100' : kw.competition === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{kw.competition}</span></td>
                          <td className="px-10 py-8 text-center"><span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 uppercase">{kw.intent}</span></td>
                          <td className="px-10 py-8 text-right"><button onClick={() => handleWriteArticle(kw.phrase, kw.intent)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 uppercase">WRITE NOW</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !isLoading && seedKeyword && (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 flex flex-col items-center text-center shadow-inner">
                    <AlertCircle size={48} className="text-amber-400 mb-6" />
                    <h3 className="text-xl font-bold text-slate-800">No Keywords Found</h3>
                    <p className="text-slate-500 max-sm mt-2">Try a different seed keyword or broader niche. Sometimes the AI needs a more specific topic to expand.</p>
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === AppState.WRITER && (
            <div className="animate-in slide-in-from-bottom-6 duration-500">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Article studio</h2>
                  <p className="text-slate-500 text-lg font-medium mt-2">Professional humanized editor with live plagiarism auditing.</p>
                </div>
              </div>
              {articles.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[4rem] p-32 flex flex-col items-center text-center">
                  <FileText size={100} className="text-slate-200 mb-10" />
                  <h3 className="text-3xl font-black text-slate-800">Your studio is idle.</h3>
                  <button onClick={() => setActiveTab(AppState.DASHBOARD)} className="mt-12 px-12 py-5 bg-slate-900 text-white font-black rounded-[2rem]">Go to Trends</button>
                </div>
              ) : (
                <div className="space-y-12">
                  {articles.map(article => (
                    <ArticleEditor 
                      key={article.id} article={article} onUpdate={updateArticle} onPublish={handlePublish} onDelete={deleteArticle} isPublishing={isPublishing} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === AppState.LOGS && (
            <div className="bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-900">
               <div className="p-10 border-b border-slate-900 flex justify-between items-center bg-slate-950/80 backdrop-blur-xl">
                <h2 className="text-xl font-black text-white flex items-center gap-4"><Clock size={24} className="text-emerald-500" /> SYSTEM ACTIVITY MONITOR</h2>
                <button onClick={() => setLogs([])} className="text-[10px] text-slate-600 hover:text-white uppercase tracking-[0.25em] font-black border border-slate-900 px-6 py-3 rounded-2xl">Wipe History</button>
              </div>
              <div className="p-10 h-[650px] overflow-y-auto font-mono text-sm space-y-4">
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-5 p-5 rounded-[1.5rem] border ${log.type === 'error' ? 'bg-red-500/5 text-red-400 border-red-500/10' : log.type === 'success' ? 'bg-green-50 text-green-400 border-green-500/10' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                    <span className="text-[10px] font-black opacity-30 shrinkage-0 mt-1">[{log.time}]</span>
                    <span className="flex-1 leading-relaxed font-bold tracking-tight">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === AppState.SETTINGS && (
            <div className="space-y-10">
              {/* Gemini API Key Configuration */}
              <div className="bg-white p-16 rounded-[4rem] shadow-sm border border-slate-200">
                <div className="max-w-4xl">
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Gemini API Configuration</h2>
                  <p className="text-slate-500 text-lg font-medium mb-10">Connect your personal Gemini API key to power the content engine.</p>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-2">Personal API Key</label>
                      <div className="relative">
                        <Zap size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="password" 
                          className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none" 
                          placeholder="Enter your Gemini API Key..." 
                          value={tempGeminiKey} 
                          onChange={(e) => setTempGeminiKey(e.target.value)} 
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 ml-4">Get your key from <a href="https://ai.google.dev/" target="_blank" className="text-emerald-500 hover:underline">Google AI Studio</a>. It's free for most users.</p>
                    </div>
                    
                    <div className="pt-6 flex items-center justify-between border-t border-slate-100">
                      <div className={`text-xs font-black uppercase tracking-widest ${sessionGeminiKey ? 'text-green-600' : 'text-amber-600'}`}>
                        {sessionGeminiKey ? '✓ KEY CONNECTED' : '⚠ KEY REQUIRED'}
                      </div>
                      <button onClick={handleUpdateGeminiKey} className="px-12 py-5 bg-emerald-600 text-white font-black rounded-[2rem] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">UPDATE ENGINE KEY</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* WordPress Configuration */}
              <div className="bg-white p-16 rounded-[4rem] shadow-sm border border-slate-200">
                <div className="max-w-4xl">
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">WordPress configuration</h2>
                  <div className="space-y-10 mt-12">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-2">Endpoint URL</label>
                      <input type="url" className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-slate-800" placeholder="https://your-site.com" value={wpConfig.url} onChange={(e) => setWpConfig(prev => ({ ...prev, url: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-2">Username</label>
                        <input type="text" className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-slate-800" placeholder="admin" value={wpConfig.username} onChange={(e) => setWpConfig(prev => ({ ...prev, username: e.target.value }))} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-2">App Password</label>
                        <input type="password" className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-slate-800" placeholder="xxxx xxxx xxxx xxxx" value={wpConfig.appPassword} onChange={(e) => setWpConfig(prev => ({ ...prev, appPassword: e.target.value }))} />
                      </div>
                    </div>
                    <div className="pt-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 mt-6 gap-6">
                      <div className="text-green-600 font-black text-sm uppercase tracking-widest">{wpConfig.url ? 'READY' : 'PENDING'}</div>
                      <div className="flex gap-4 w-full sm:w-auto">
                        <button onClick={handleResetApp} className="flex-1 sm:flex-none px-6 py-5 bg-red-50 text-red-600 font-black rounded-[2rem] border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                          <RotateCcw size={18} /> RESET APP
                        </button>
                        <button onClick={() => addLog("Settings saved.", "success")} className="flex-1 sm:flex-none px-12 py-5 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-blue-600 transition-all">SAVE VAULT</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === AppState.ADMIN && (
            <AdminSection 
              members={members} 
              onUpdateMembers={setMembers} 
              config={systemConfig} 
              onUpdateConfig={setSystemConfig}
              addLog={addLog}
            />
          )}
        </div>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-8">
          <div className="bg-white p-16 rounded-[4rem] shadow-2xl flex flex-col items-center max-w-xl w-full">
            <RefreshCw size={48} className="animate-spin text-emerald-600 mb-8" />
            <h3 className="text-4xl font-black text-slate-900 text-center tracking-tight mb-4 uppercase italic">Syncing Data</h3>
            <p className="text-slate-500 text-center text-xl font-medium leading-relaxed">Orchestrating AI models to process search breakouts.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
