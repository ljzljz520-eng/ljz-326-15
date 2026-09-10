'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Pin, Info, AlertTriangle, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Inbox,
} from 'lucide-react';
import { announcementApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isPinned: boolean;
  publishAt: string | null;
  createdAt: string;
}

const typeConfig = {
  info: { icon: Info, border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', label: '通知' },
  warning: { icon: AlertTriangle, border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: '提醒' },
  success: { icon: CheckCircle, border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400', label: '好消息' },
  error: { icon: AlertCircle, border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400', label: '紧急' },
};

const PAGE_SIZE = 8;

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    (async () => {
      try {
        // 只取选择了“公告历史页”展示位置的已发布公告
        const data = await announcementApi.getAll('page');
        setList(data || []);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shown = list.slice(0, visibleCount);

  return (
    <div className="min-h-screen py-20 bg-grid">
      <div className="container-custom">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Bell className="text-minecraft-green" />
            公告中心
          </h1>
          <p className="text-gray-400 mb-8">查看服务器的全部历史公告</p>

          {loading ? (
            <div className="flex justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : shown.length === 0 ? (
            <GlassCard className="p-16 text-center" hover={false}>
              <Inbox className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">暂无公告</p>
            </GlassCard>
          ) : (
            <>
              <div className="space-y-4">
                {shown.map((item, idx) => {
                  const cfg = typeConfig[item.type] || typeConfig.info;
                  const Icon = cfg.icon;
                  const isOpen = expanded.has(item.id);
                  const pub = item.publishAt || item.createdAt;

                  return (
                    <GlassCard key={item.id} className="p-0 overflow-hidden" delay={Math.min(idx * 0.05, 0.3)} hover={false}>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className={`w-full text-left border-l-4 ${cfg.border} ${cfg.bg} p-5 flex items-start gap-4`}
                      >
                        <Icon className={`w-5 h-5 ${cfg.text} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.isPinned && (
                              <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                                <Pin size={11} /> 置顶
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded bg-white/10 ${cfg.text}`}>
                              {cfg.label}
                            </span>
                            <h3 className="text-white font-semibold">{item.title}</h3>
                          </div>
                          {!isOpen && (
                            <p className="text-gray-400 text-sm mt-2 line-clamp-2 whitespace-pre-line">
                              {item.content}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">{formatDate(pub)}</span>
                          {isOpen ? (
                            <ChevronUp size={16} className="text-gray-500" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-500" />
                          )}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pt-4 bg-black/20">
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                            {item.content}
                          </p>
                          <p className="text-gray-600 text-xs mt-4">发布于 {formatDate(pub)}</p>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>

              {visibleCount < list.length && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    加载更多（剩余 {list.length - visibleCount} 条）
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
