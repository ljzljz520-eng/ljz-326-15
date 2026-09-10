'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, X, Pin, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  announcementApi,
  AnnouncementPayload,
  AnnouncementPosition,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  isPinned: boolean;
  publishAt: string | null;
  endAt: string | null;
  positions: string;
  createdAt: string;
}

const TYPE_OPTIONS = [
  { value: 'info', label: '普通', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'warning', label: '提醒', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'success', label: '好消息', color: 'bg-green-500/20 text-green-400' },
  { value: 'error', label: '紧急', color: 'bg-red-500/20 text-red-400' },
] as const;

const POSITION_OPTIONS: { value: AnnouncementPosition; label: string; hint: string }[] = [
  { value: 'home', label: '首页公告区', hint: '首页右侧"最新公告"列表' },
  { value: 'banner', label: '顶部横幅', hint: '全站顶部轮播横幅' },
  { value: 'page', label: '公告历史页', hint: '/announcements 公告页' },
];

/** 把 ISO 时间转成 datetime-local 输入框需要的格式 */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** 取有效发布时间用于列表展示与排序参照 */
function effectivePublishAt(a: Announcement): Date {
  return a.publishAt ? new Date(a.publishAt) : new Date(a.createdAt);
}

function positionList(raw: string): AnnouncementPosition[] {
  return (raw || '')
    .split(',')
    .filter(Boolean)
    .map((p) => p.trim()) as AnnouncementPosition[];
}

const POSITION_LABELS: Record<AnnouncementPosition, string> = {
  home: '首页',
  banner: '横幅',
  page: '公告页',
};

export default function AnnouncementManager() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 表单字段
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Announcement['type']>('info');
  const [isPinned, setIsPinned] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [publishAt, setPublishAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [positions, setPositions] = useState<AnnouncementPosition[]>(['home']);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await announcementApi.getAllForAdmin();
      setList(data || []);
    } catch {
      toast.error('获取公告列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType('info');
    setIsPinned(false);
    setIsActive(true);
    setPublishAt('');
    setEndAt('');
    setPositions(['home']);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setType(item.type);
    setIsPinned(item.isPinned);
    setIsActive(item.isActive);
    setPublishAt(toLocalInput(item.publishAt));
    setEndAt(toLocalInput(item.endAt));
    const ps = positionList(item.positions);
    setPositions(ps.length ? ps : ['home']);
    setFormOpen(true);
  };

  const togglePosition = (p: AnnouncementPosition) => {
    setPositions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('请填写标题');
    if (!content.trim()) return toast.error('请填写正文');
    if (positions.length === 0) return toast.error('请至少选择一个展示位置');
    if (publishAt && endAt && new Date(publishAt) > new Date(endAt)) {
      return toast.error('下架时间不能早于发布时间');
    }

    const payload: AnnouncementPayload = {
      title: title.trim(),
      content: content.trim(),
      type,
      isPinned,
      isActive,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      endAt: endAt ? new Date(endAt).toISOString() : null,
      positions,
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        await announcementApi.update(editingId, payload);
        toast.success('公告已更新');
      } else {
        await announcementApi.create(payload);
        toast.success('公告已发布');
      }
      setFormOpen(false);
      resetForm();
      fetchList();
    } catch {
      // 403/401 等错误已由拦截器提示
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;
    try {
      await announcementApi.delete(deleteId);
      toast.success('已删除');
      fetchList();
    } catch {
      // ignore
    } finally {
      setDeleteId(null);
    }
  };

  const typeMeta = (t: string) =>
    TYPE_OPTIONS.find((o) => o.value === t) ?? TYPE_OPTIONS[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">共 {list.length} 条公告</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-minecraft-green hover:bg-minecraft-darkGreen text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          发布公告
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">暂无公告，点击右上角发布</div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => {
            const tm = typeMeta(item.type);
            const now = new Date();
            const pubDate = item.publishAt ? new Date(item.publishAt) : new Date(item.createdAt);
            const scheduled = item.isActive && pubDate > now;
            const expired = item.endAt ? new Date(item.endAt) < now : false;
            const status = !item.isActive
              ? { text: '未启用', cls: 'bg-gray-500/20 text-gray-400' }
              : scheduled
                ? { text: '定时发布', cls: 'bg-purple-500/20 text-purple-400' }
                : expired
                  ? { text: '已下架', cls: 'bg-gray-500/20 text-gray-400' }
                  : { text: '展示中', cls: 'bg-green-500/20 text-green-400' };

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 p-4 bg-black/20 rounded-lg"
              >
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.isPinned && (
                      <Pin size={14} className="text-yellow-400 flex-shrink-0" />
                    )}
                    <h4 className="text-white font-medium truncate">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs ${tm.color}`}>
                      {tm.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${status.cls}`}>
                      {status.text}
                    </span>
                    {positionList(item.positions).map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300"
                      >
                        {POSITION_LABELS[p]}
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    <Bell size={11} className="inline mr-1 -mt-0.5" />
                    发布时间：{formatDate(effectivePublishAt(item))}
                    {item.publishAt && new Date(item.publishAt) > now && '（待发布）'}
                    {item.endAt && ` · 下架：${formatDate(item.endAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="编辑"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 发布/编辑弹窗 */}
      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-gray-900 z-10">
              <h3 className="text-lg font-bold text-white">
                {editingId !== null ? '编辑公告' : '发布公告'}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  标题 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入公告标题"
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-minecraft-green"
                />
              </div>

              {/* 正文 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  正文 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="请输入公告正文"
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-minecraft-green resize-y"
                />
              </div>

              {/* 类型 + 发布时间 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    公告类型
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Announcement['type'])}
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-minecraft-green"
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    发布时间（留空=立即发布）
                  </label>
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-minecraft-green [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* 下架时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  下架时间（可选）
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full md:w-1/2 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-minecraft-green [color-scheme:dark]"
                />
              </div>

              {/* 展示位置 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  展示位置 <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {POSITION_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        positions.includes(opt.value)
                          ? 'border-minecraft-green bg-minecraft-green/10'
                          : 'border-white/10 bg-black/20 hover:border-white/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={positions.includes(opt.value)}
                        onChange={() => togglePosition(opt.value)}
                        className="w-4 h-4 accent-minecraft-green"
                      />
                      <div>
                        <span className="text-white text-sm font-medium">{opt.label}</span>
                        <span className="text-gray-500 text-xs ml-2">{opt.hint}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 开关项 */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 accent-minecraft-green"
                  />
                  <span className="text-sm text-gray-300 flex items-center gap-1">
                    <Pin size={13} /> 置顶显示
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-minecraft-green"
                  />
                  <span className="text-sm text-gray-300">启用该公告</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-gray-900">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 text-gray-300 hover:bg-white/10 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 bg-minecraft-green hover:bg-minecraft-darkGreen disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              >
                {saving ? '保存中…' : editingId !== null ? '保存修改' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="确认删除"
        message="确定要删除这条公告吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
