"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type Lesson = {
  id: number;
  subjectName: string;
  roomName: string;
  days: number[];
  startPeriod: number;
  endPeriod: number;
  colorCode: string;
};

const DAYS = ['월', '화', '수', '목', '금'];
const PERIODS = [
  { id: 1, label: '1교시', time: '09:00 - 09:50' },
  { id: 2, label: '2교시', time: '10:00 - 10:50' },
  { id: 3, label: '3교시', time: '11:00 - 11:50' },
  { id: 4, label: '4교시', time: '12:00 - 12:50' },
  { id: 5, label: '점심', time: '12:50 - 14:00', isLunch: true },
  { id: 6, label: '6교시', time: '14:00 - 14:50' },
  { id: 7, label: '7교시', time: '15:00 - 15:50' },
  { id: 8, label: '8교시', time: '16:00 - 16:50' },
  { id: 9, label: '9교시', time: '17:00 - 17:50' },
];

const COLORS = [
  'bg-red-200 text-red-900', 'bg-orange-200 text-orange-900',
  'bg-yellow-200 text-yellow-900', 'bg-green-200 text-green-900',
  'bg-blue-200 text-blue-900', 'bg-indigo-200 text-indigo-900',
  'bg-purple-200 text-purple-900', 'bg-pink-200 text-pink-900',
];

export default function Home() {
  const { data: session } = useSession();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  
  // 모달 및 폼 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null); // 핵심: 수정 모드인지 판별
  
  const [formData, setFormData] = useState({
    subjectName: '', roomName: '', days: [] as number[],
    startPeriod: 1, endPeriod: 1, colorCode: COLORS[5],
  });

  // DB에서 시간표 불러오기 (로그인 상태가 변할 때마다 실행)
  useEffect(() => {
    // 세션 정보를 아직 가져오는 중(undefined)이면 아무것도 안 하고 기다리기
    if (session === undefined) return; 

    // 확실하게 로그아웃 된 상태(null)라면 화면을 초기화
    if (session === null) {
      setLessons([]);
      setBlockedSlots(new Set());
      return;
    }

    // 로그인 된 상태라면 DB에서 데이터를 불러오기
    const fetchTimetable = async () => {
      try {
        const userId = (session.user as any).id;
        const res = await fetch(`/api/timetable?userId=${userId}`);
        
        if (res.ok) {
          const data = await res.json();
          setLessons(data.lessons);
          setBlockedSlots(new Set(data.blockedSlots));
        }
      } catch (error) {
        console.error("시간표 로드 실패:", error);
      }
    };

    fetchTimetable();
  }, [session]); // 
  
  const handleSaveToServer = async () => {
    if (!session?.user) {
      alert("로그인이 필요합니다!");
      return;
    }

    if (lessons.length === 0 && blockedSlots.size === 0) {
      alert("저장할 시간표 데이터가 없습니다.");
      return;
    }

    // 백엔드 전송 데이터
    const payload = {
      userId: Number((session.user as any).id),
      lessons: lessons,
      blockedSlots: Array.from(blockedSlots),
    };

    try {
      // 백엔드로 시간표 데이터 전송, 저장.
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("시간표가 DB에 성공적으로 저장되었습니다! 🎉");
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };
  
  // 1. 빈칸 클릭 시 (새로 추가 모드)
  const handleEmptyCellClick = (periodId: number, dayIndex: number) => {
    const slotKey = `${periodId}-${dayIndex}`;
    
    // 막힌 칸 풀기
    if (blockedSlots.has(slotKey)) {
      const newSet = new Set(blockedSlots);
      newSet.delete(slotKey);
      setBlockedSlots(newSet);
      return;
    }

    setEditingLessonId(null); // 새 일정이므로 ID 초기화
    setFormData({
      subjectName: '', roomName: '', days: [dayIndex],
      startPeriod: periodId, endPeriod: periodId,
      colorCode: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    setIsModalOpen(true);
  };

  // 2. 등록된 수업 클릭 시 (수정 모드)
  const handleLessonCellClick = (lesson: Lesson) => {
    setEditingLessonId(lesson.id); // 어떤 수업을 수정하는지 기억
    setFormData({
      subjectName: lesson.subjectName, roomName: lesson.roomName, days: [...lesson.days],
      startPeriod: lesson.startPeriod, endPeriod: lesson.endPeriod, colorCode: lesson.colorCode,
    });
    setIsModalOpen(true);
  };

  const toggleDay = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev, days: prev.days.includes(dayIndex) ? prev.days.filter(d => d !== dayIndex) : [...prev.days, dayIndex]
    }));
  };

  // 3. 저장 및 수정 처리
  const handleSaveLesson = () => {
    if (!formData.subjectName.trim()) return alert("과목명을 입력해주세요!");
    if (formData.days.length === 0) return alert("최소 하나의 요일을 선택해주세요!");
    if (formData.startPeriod > formData.endPeriod) return alert("시작 교시가 종료 교시보다 늦을 수 없습니다!");

    if (editingLessonId) {
      // 수정 모드: 기존 배열에서 ID가 일치하는 것만 갈아끼움
      setLessons(lessons.map(l => l.id === editingLessonId ? { ...formData, id: editingLessonId } : l));
    } else {
      // 추가 모드
      setLessons([...lessons, { id: Date.now(), ...formData }]);
    }
    closeModal();
  };

  // 4. 삭제 처리
  const handleDeleteLesson = () => {
    if (editingLessonId) {
      setLessons(lessons.filter(l => l.id !== editingLessonId));
    }
    closeModal();
  };

  const handleBlockTime = () => {
    const newBlocked = new Set(blockedSlots);
    formData.days.forEach(day => {
      for (let p = formData.startPeriod; p <= formData.endPeriod; p++) newBlocked.add(`${p}-${day}`);
    });
    setBlockedSlots(newBlocked);
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLessonId(null);
  };

return (
    <main className="min-h-screen p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {/* 로그인 여부와 별명 여부에 따라 표시 변경 */}
            {session ? `${(session.user as any)?.alias || session.user?.email?.split('@')[0]}님의 시간표` : '내 시간표'} 
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {session ? '수업을 모두 구성한 뒤 우측의 저장 버튼을 눌러 확정해주세요.' : '시간표를 저장하려면 먼저 로그인해주세요.'}
          </p>
        </div>
        
        <button 
          onClick={handleSaveToServer}
          className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          시간표 저장
        </button>
      </div>

      <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200 select-none">
        
        {/* 헤더 */}
        <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-50">
          <div className="p-3 text-center text-sm font-bold text-gray-400 border-r border-gray-200">시간</div>
          {DAYS.map((day, index) => <div key={index} className="p-3 text-center font-bold text-gray-700 border-r border-gray-200 last:border-r-0">{day}</div>)}
        </div>

        {/* 본문 격자 */}
        {PERIODS.map((period) => (
          <div key={period.id} className="grid grid-cols-6 border-b border-gray-100 last:border-b-0">
            <div className="p-2 border-r border-gray-200 bg-gray-50 flex flex-col justify-center items-center pointer-events-none">
              <span className="font-semibold text-gray-700">{period.label}</span>
              <span className="text-[10px] text-gray-400">{period.time}</span>
            </div>

            {period.isLunch ? (
              <div className="col-span-5 bg-amber-50 flex items-center justify-center text-amber-600/70 text-sm font-bold tracking-widest border-y border-amber-100">
                점심시간 (학생식당 11:30 ~ 13:30)
              </div>
            ) : (
              DAYS.map((_, dayIndex) => {
                const slotKey = `${period.id}-${dayIndex}`;
                const isBlocked = blockedSlots.has(slotKey);
                const activeLesson = lessons.find(l => l.days.includes(dayIndex) && period.id >= l.startPeriod && period.id <= l.endPeriod);
 // 연달아 있는 수업의 첫 번째 칸과 마지막 칸인지 확인
                const isFirstCell = activeLesson && activeLesson.startPeriod === period.id;
                const isLastCell = activeLesson && activeLesson.endPeriod === period.id;

                if (activeLesson) {
                  return (
                    <div 
                      key={slotKey} 
                      onClick={() => handleLessonCellClick(activeLesson)}
                      // 마지막 칸이 아닐 경우, z-10과 h-[calc(100%+1px)]을 줘서 아래쪽 흰색 가로줄을 덮어버립니다.
                      className={`border-r border-gray-100 last:border-r-0 relative p-2 flex flex-col justify-start cursor-pointer transition-all hover:brightness-90 ${activeLesson.colorCode} ${!isFirstCell ? 'border-t-0' : ''} ${!isLastCell ? 'z-10 h-[calc(100%+1px)]' : ''}`}
                    >
                      {isFirstCell && (
                        <>
                          <span className="font-bold text-sm leading-tight">{activeLesson.subjectName}</span>
                          <span className="text-xs opacity-80 mt-0.5">{activeLesson.roomName}</span>
                        </>
                      )}
                    </div>
                  );
                }

                // 빈칸 또는 막힌 칸 렌더링 (클릭 시 추가/해제)
                return (
                  <div 
                    key={slotKey} onClick={() => handleEmptyCellClick(period.id, dayIndex)}
                    className={`h-16 border-r border-gray-100 last:border-r-0 relative cursor-pointer transition-all duration-200
                      ${isBlocked ? 'bg-gray-100 hover:bg-gray-200/80' : 'bg-white hover:bg-indigo-50/50'}`}
                  >
                    {isBlocked && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200">
            {/* 타이틀 변경 로직 */}
            <h2 className="text-xl font-bold text-gray-800 mb-5">{editingLessonId ? '일정 수정' : '새로운 일정 추가'}</h2>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">과목명 / 일정</label>
                  <input type="text" autoFocus className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 영화와 문학" value={formData.subjectName} onChange={e => setFormData({...formData, subjectName: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">장소 / 강의실</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 교407" value={formData.roomName} onChange={e => setFormData({...formData, roomName: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">요일 다중 선택</label>
                <div className="flex gap-2">
                  {DAYS.map((day, i) => (
                    <button key={i} onClick={() => toggleDay(i)} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors border ${formData.days.includes(i) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{day}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">교시 묶기 (연속 범위)</label>
                <div className="flex items-center gap-3">
                  <select className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={formData.startPeriod} onChange={e => setFormData({...formData, startPeriod: Number(e.target.value)})}>
                    {PERIODS.filter(p => !p.isLunch).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <span className="text-gray-400">~</span>
                  <select className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={formData.endPeriod} onChange={e => setFormData({...formData, endPeriod: Number(e.target.value)})}>
                    {PERIODS.filter(p => !p.isLunch).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">색상 지정</label>
                <div className="flex gap-2">
                  {COLORS.map(color => {
                    const bgColorClass = color.split(' ')[0];
                    const isSelected = formData.colorCode === color;
                    return (
                      <button key={color} onClick={() => setFormData({...formData, colorCode: color})} className={`w-8 h-8 rounded-full ${bgColorClass} transition-transform ${isSelected ? 'ring-2 ring-gray-900 ring-offset-2 scale-110' : 'hover:scale-110'}`} />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              {/* 수정 모드면 삭제 버튼, 추가 모드면 막기 버튼 표시 */}
              {editingLessonId ? (
                <button onClick={handleDeleteLesson} className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                  🗑️ 삭제하기
                </button>
              ) : (
                <button onClick={handleBlockTime} className="text-sm text-gray-500 hover:text-gray-800 font-medium px-2">
                  🚫 이 시간 막기
                </button>
              )}
              
              <div className="flex gap-2">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">취소</button>
                <button onClick={handleSaveLesson} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                  {editingLessonId ? '수정하기' : '저장하기'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}