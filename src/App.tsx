/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Circle, 
  Bell, 
  X, 
  Calendar as CalendarIcon,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Filter,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ko } from 'date-fns/locale';

// Types
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('taskflow_todos');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Migrate old data that might not have dueDate
      return parsed.map((todo: any) => ({
        ...todo,
        dueDate: todo.dueDate || format(new Date(todo.createdAt || Date.now()), 'yyyy-MM-dd'),
        priority: todo.priority || 'medium'
      }));
    } catch (e) {
      console.error('Failed to parse todos', e);
      return [];
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [inputDate, setInputDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  // Calendar States
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('taskflow_todos', JSON.stringify(todos));
  }, [todos]);

  // Notification helper
  const addNotification = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Handlers
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newTodo: Todo = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputValue.trim(),
      completed: false,
      createdAt: Date.now(),
      dueDate: inputDate,
      priority: 'medium'
    };

    setTodos([newTodo, ...todos]);
    setInputValue('');
    addNotification('새로운 할일이 등록되었습니다.', 'success');
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
    addNotification('할일이 삭제되었습니다.', 'warning');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const newStatus = !todo.completed;
        if (newStatus) addNotification('할일을 완료했습니다!', 'success');
        return { ...todo, completed: newStatus };
      }
      return todo;
    }));
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditValue(todo.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setTodos(todos.map(todo => 
      todo.id === editingId ? { ...todo, text: editValue } : todo
    ));
    setEditingId(null);
    addNotification('할일이 수정되었습니다.', 'info');
  };

  // Filtered and Searched Todos
  const filteredTodos = useMemo(() => {
    return todos
      .filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
      })
      .filter(todo => 
        todo.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(todo => {
        if (selectedCalendarDate) {
          return todo.dueDate === format(selectedCalendarDate, 'yyyy-MM-dd');
        }
        return true;
      });
  }, [todos, filter, searchQuery, selectedCalendarDate]);

  // Calendar Logic
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const hasTasksOnDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return todos.some(t => t.dueDate === dateStr);
  };

  const incompleteTasksOnDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return todos.some(t => t.dueDate === dateStr && !t.completed);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TaskFlow</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={`p-2 rounded-xl transition-all ${showCalendar ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}
              title="달력 보기"
            >
              <CalendarDays className="w-6 h-6" />
            </button>
            <div className="relative group">
              <Bell className="w-6 h-6 text-gray-400 cursor-pointer hover:text-indigo-600 transition-colors" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Calendar (Conditional) */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="lg:col-span-5 space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">
                    {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                  </h2>
                  <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase py-2">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const isSelected = selectedCalendarDate && isSameDay(day, selectedCalendarDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const hasTasks = hasTasksOnDate(day);
                    const hasIncomplete = incompleteTasksOnDate(day);

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedCalendarDate(isSelected ? null : day)}
                        className={`
                          relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all
                          ${!isCurrentMonth ? 'text-gray-200' : 'text-gray-700'}
                          ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105 z-10' : 'hover:bg-gray-50'}
                        `}
                      >
                        {format(day, 'd')}
                        {hasTasks && !isSelected && (
                          <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${hasIncomplete ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {selectedCalendarDate && (
                  <button 
                    onClick={() => setSelectedCalendarDate(null)}
                    className="mt-4 w-full py-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    전체 날짜 보기
                  </button>
                )}
              </div>

              <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
                <h3 className="font-bold mb-2">오늘의 요약</h3>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  오늘 완료해야 할 할일이 {todos.filter(t => !t.completed && t.dueDate === format(new Date(), 'yyyy-MM-dd')).length}개 있습니다.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Column: Todo List */}
        <div className={`${showCalendar ? 'lg:col-span-7' : 'lg:col-span-8 lg:col-start-3'} space-y-6`}>
          
          {/* Search & Stats */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="할일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-2">
                {(['all', 'active', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full capitalize transition-all ${
                      filter === f 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                    }`}
                  >
                    {f === 'all' ? '전체' : f === 'active' ? '진행중' : '완료'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-gray-400 font-medium">
                {selectedCalendarDate && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-600">
                    {format(selectedCalendarDate, 'MM/dd')}
                  </span>
                )}
                <span>{todos.filter(t => !t.completed).length}개 남음</span>
              </div>
            </div>
          </div>

          {/* Add Input */}
          <form onSubmit={addTodo} className="bg-white p-2 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="새로운 할일을 입력하세요..."
                className="flex-1 px-5 py-3 bg-transparent border-none focus:ring-0 text-lg"
              />
              <div className="flex items-center gap-2 px-2">
                <input 
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border-none focus:ring-0 cursor-pointer"
                />
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          </form>

          {/* Todo List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTodos.length > 0 ? (
                filteredTodos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-all ${
                      todo.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <button 
                      onClick={() => toggleTodo(todo.id)}
                      className={`transition-colors ${todo.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-indigo-500'}`}
                    >
                      {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === todo.id ? (
                        <input 
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          className="w-full bg-gray-50 border-none focus:ring-0 p-0 text-lg"
                        />
                      ) : (
                        <p className={`text-lg truncate ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {todo.text}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 ${
                          isSameDay(parseISO(todo.dueDate), new Date()) ? 'text-amber-500' : 'text-gray-400'
                        }`}>
                          <CalendarIcon className="w-3 h-3" />
                          {todo.dueDate === format(new Date(), 'yyyy-MM-dd') ? '오늘' : todo.dueDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(todo)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteTodo(todo.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="text-gray-300 w-8 h-8" />
                  </div>
                  <p className="text-gray-400 font-medium">
                    {selectedCalendarDate ? `${format(selectedCalendarDate, 'M월 d일')}에 할일이 없습니다.` : '할일이 없습니다.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Notifications Toast */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border ${
                n.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                n.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                'bg-indigo-50 border-indigo-100 text-indigo-800'
              }`}
            >
              {n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
               n.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : 
               <Bell className="w-5 h-5" />}
              <p className="text-sm font-medium">{n.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
