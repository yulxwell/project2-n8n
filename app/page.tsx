'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, 
  RefreshCcw, 
  Send, 
  BookOpen, 
  AlertCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  PenTool
} from 'lucide-react';

interface Post {
  id: string;
  title_ko: string;
  summary_ko: string;
  status: string;
}

export default function Dashboard() {
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchDrafts = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title_ko, summary_ko, status')
        .eq('status', 'draft')
        .order('id', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
      
      if (data && data.length > 0 && !selectedPost) {
        setSelectedPost(data[0]);
      } else if (data && data.length === 0) {
        setSelectedPost(null);
      }
    } catch (err) {
      console.error('Error fetching drafts:', err);
      setMessage({ type: 'error', text: '데이터를 불러오는 중 오류가 발생했습니다.' });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleAction = async (action: 'publish' | 'revise') => {
    if (!selectedPost) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const body = action === 'publish' 
        ? { action: 'publish', post_id: selectedPost.id }
        : { 
            action: 'revise', 
            post_id: selectedPost.id, 
            title_ko: selectedPost.title_ko,
            summary_ko: selectedPost.summary_ko,
            feedback 
          };

      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook request failed: ${errorText}`);
      }

      setMessage({ 
        type: 'success', 
        text: action === 'publish' ? '발행 승인이 완료되었습니다. (데이터 처리 중...)' : '수정 지시가 전달되었습니다.' 
      });

      setFeedback('');
      
      // Give n8n a small buffer to complete its DB update before refreshing list
      setTimeout(async () => {
        await fetchDrafts();
        setMessage(null);
      }, 2500);
    } catch (err: any) {
      console.error(`Error during ${action}:`, err);
      setMessage({ 
        type: 'error', 
        text: `요청 처리 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#020617] overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/50 backdrop-blur-xl z-10 shadow-sm">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-indigo-500/20 shadow-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent">
              AI Editor
            </h1>
          </div>
        </div>
        
        <div className="px-4 mb-4">
          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          <div className="px-2 mb-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Pending Drafts ({drafts.length})
          </div>
          
          {isFetching ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
              <AlertCircle className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">모든 초안이 처리되었습니다.</p>
            </div>
          ) : (
            drafts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                  selectedPost?.id === post.id
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent border'
                }`}
              >
                {selectedPost?.id === post.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
                )}
                <div className={`text-sm font-bold mb-1.5 line-clamp-1 transition-colors ${
                  selectedPost?.id === post.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {post.title_ko}
                </div>
                <div className="line-clamp-2 text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                  {post.summary_ko}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={fetchDrafts}
            className="w-full py-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-xl"
          >
            <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            데이터 동기화
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        {selectedPost ? (
          <div className="max-w-4xl mx-auto p-10 lg:p-16 min-h-full flex flex-col pt-12">
            {/* Action Indicators */}
            {message && (
              <div className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl flex items-center gap-3 border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold tracking-tight">{message.text}</p>
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-6 w-1 bg-indigo-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/80 dark:text-indigo-400/80">
                  AI Editorial Post-Process
                </span>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-black mb-10 leading-[1.1] tracking-tight text-slate-900 dark:text-white float-animation">
                {selectedPost.title_ko}
              </h2>
              
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-2xl shadow-indigo-500/5 leading-relaxed text-xl font-medium text-slate-700 dark:text-slate-300">
                  {selectedPost.summary_ko}
                </div>
              </div>
            </div>

            {/* Revised Action Panel */}
            <div className="mt-16 bg-white dark:bg-slate-950/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-2xl shadow-indigo-900/5 flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <PenTool className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    수정 및 피드백 지시
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase">
                    Revision Note
                  </span>
                </div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="AI를 깨우는 구체적인 피드백을 적어주세요..."
                  className="w-full h-36 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all text-sm font-medium resize-none shadow-inner"
                />
              </div>

              <div className="flex gap-4">
                <button
                  disabled={isLoading}
                  onClick={() => handleAction('revise')}
                  className="flex-1 group py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50 hover:shadow-lg"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500 text-slate-500" />}
                  재작성 요청
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => handleAction('publish')}
                  className="flex-[1.8] py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  최종 발행 승인
                </button>
              </div>
            </div>
          </div>
        ) : !isFetching && (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-[#020617]">
            <div className="p-12 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl mb-6 float-animation">
              <BookOpen className="w-16 h-16 text-slate-200 dark:text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editor Desk Ready</h3>
            <p className="text-sm text-slate-500 max-w-[240px] text-center leading-relaxed">
              검토할 초안을 사이드바에서 선택하여 AI 편집을 시작하세요.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
