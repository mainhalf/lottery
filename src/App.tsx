/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Play, RotateCcw, Trophy, AlertCircle, X, ChevronLeft, Save, Sparkles } from 'lucide-react';

interface Prize {
  id: string;
  name: string;
  count: number;
  probability: number;
  color: string;
}

const THEME_COLORS = {
  bg: '#FDF5E6', // Cream background
  bgGradient: 'linear-gradient(to bottom, #FDF5E6, #F5DEB3)',
  accent: '#D2691E', // Chocolate/Bronze text
  gold: '#FF8C00', // Dark Orange/Gold
  goldLight: '#FFB84D',
  cardBg: 'rgba(255, 255, 255, 0.6)',
  border: '#E6C9A8',
};

const PRIZE_COLORS = [
  '#FFB84D', // Orange
  '#BA55D3', // Purple
  '#6495ED', // Blue
  '#3CB371', // Green
  '#F4A460', // Sandy Brown
];

type View = 'wheel' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('wheel');
  const [inputText, setInputText] = useState<string>(
    '今天吃什么？, 1, 1\n家务谁来做？, 1, 1\n抽奖小游戏！, 1, 1\n今天谁买单？, 1, 1\n玩法多样自由设置, 1, 1'
  );
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; name: string; time: string }[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parse input text into prizes
  const parsePrizes = (text: string) => {
    try {
      const lines = text.trim().split('\n');
      const newPrizes: Prize[] = lines.map((line, index) => {
        const parts = line.split(',').map(s => s.trim());
        const name = parts[0];
        const count = parts[1];
        const prob = parts[2];

        if (!name || isNaN(Number(count)) || isNaN(Number(prob))) {
          throw new Error(`第 ${index + 1} 行格式错误。请使用: 奖项名称, 数量, 权重`);
        }
        return {
          id: Math.random().toString(36).substr(2, 9),
          name,
          count: parseInt(count),
          probability: parseFloat(prob),
          color: PRIZE_COLORS[index % PRIZE_COLORS.length]
        };
      });

      setError(null);
      setPrizes(newPrizes);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  // Initialize prizes on mount
  useEffect(() => {
    parsePrizes(inputText);
  }, []);

  // Draw the wheel
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 35;

    ctx.clearRect(0, 0, size, size);

    // Draw outer border (Warm Gold with Lights)
    ctx.beginPath();
    ctx.arc(center, center, center - 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFB84D'; 
    ctx.fill();
    ctx.strokeStyle = '#F5DEB3';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw "Lights" around the edge
    for (let i = 0; i < 16; i++) {
      const angle = (i * (360 / 16)) * (Math.PI / 180);
      const lx = center + (center - 20) * Math.cos(angle);
      const ly = center + (center - 20) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(lx, ly, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFF';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FFF';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const sliceAngle = (2 * Math.PI) / prizes.length;

    prizes.forEach((prize, index) => {
      const startAngle = index * sliceAngle;
      
      // Draw slice (White background as per image)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = '#FFF';
      ctx.fill();
      
      // Slice border (Dashed as per image)
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#E6C9A8';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5D3A1A';
      ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
      // Position text in the middle of the slice radius
      ctx.fillText(prize.name, radius / 1.6, 5);
      
      ctx.restore();
    });

    // Draw center hub - REMOVED from canvas to be handled in DOM for better layering
  };

  // Redraw when prizes change or view changes to wheel
  useEffect(() => {
    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;

    const attemptDraw = () => {
      if (view === 'wheel' && canvasRef.current) {
        drawWheel();
      } else if (view === 'wheel') {
        animationFrameId = requestAnimationFrame(attemptDraw);
      }
    };

    if (view === 'wheel') {
      attemptDraw();
      timeoutId = setTimeout(drawWheel, 100);
      const longTimeoutId = setTimeout(drawWheel, 500);
      return () => {
        cancelAnimationFrame(animationFrameId);
        clearTimeout(timeoutId);
        clearTimeout(longTimeoutId);
      };
    }
  }, [prizes, view]);

  const spin = () => {
    if (isSpinning || prizes.length === 0) return;

    setIsSpinning(true);
    setWinner(null);
    setShowResult(false);

    const totalWeight = prizes.reduce((sum, p) => sum + p.probability, 0);
    const rand = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    let winnerIndex = prizes.length - 1;
    let foundWinner = prizes[winnerIndex];

    for (let i = 0; i < prizes.length; i++) {
      cumulativeWeight += prizes[i].probability;
      if (rand <= cumulativeWeight) {
        winnerIndex = i;
        foundWinner = prizes[i];
        break;
      }
    }

    const sliceSize = 360 / prizes.length;
    // Pointer is at the top (270 degrees)
    // We want the pointer to land on winnerIndex
    const targetAngle = winnerIndex * sliceSize + (Math.random() * (sliceSize - 10) + 5);
    
    // Pointer rotation is clockwise
    const newRotation = rotation + (360 - (rotation % 360)) + targetAngle + 2880; 
    setRotation(newRotation);

    setTimeout(() => {
      setWinner(foundWinner);
      setIsSpinning(false);
      setShowResult(true);
      setHistory(prev => [
        { 
          id: Math.random().toString(36).substr(2, 9), 
          name: foundWinner.name, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        },
        ...prev
      ]);
    }, 4000);
  };

  const handleSaveSettings = () => {
    if (parsePrizes(inputText)) {
      setView('wheel');
    }
  };

  return (
    <div className="h-screen bg-[#FDF5E6] text-[#5D3A1A] font-sans overflow-hidden relative flex flex-col items-center">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 1000, opacity: [0, 1, 0] }}
            transition={{ duration: 10 + Math.random() * 5, repeat: Infinity, delay: i * 2 }}
            className="absolute w-8 h-8 rounded-full bg-orange-400/20 blur-xl"
            style={{ left: `${Math.random() * 100}%` }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'wheel' ? (
          <motion.div
            key="wheel-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md mx-auto h-full flex flex-col items-center p-6 relative z-10 overflow-hidden"
          >
            {/* Header Section - Only Settings Button */}
            <div className="w-full flex justify-end mt-2 relative z-20">
              <button
                onClick={() => setView('settings')}
                className="p-2 text-[#5D3A1A]/40 hover:text-[#5D3A1A] bg-white/40 rounded-full border border-[#E6C9A8]/50"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Main Title */}
            <div className="mt-1 mb-2 text-center">
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-[#5D3A1A] drop-shadow-sm">
                裁决轮盘
              </h1>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <Sparkles size={12} className="text-[#FF8C00]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#5D3A1A]/40">Decision Wheel</span>
                <Sparkles size={12} className="text-[#FF8C00]" />
              </div>
            </div>

            {/* Wheel Container */}
            <div className="relative my-4 flex flex-col items-center shrink-0">
              <div className="relative">
                {/* The Wheel */}
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={500}
                  className="max-w-full h-auto drop-shadow-2xl"
                />

                {/* Rotating Pointer and Hub in Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                  <motion.div
                    animate={{ rotate: rotation }}
                    transition={{ duration: 4, ease: [0.15, 0, 0.15, 1] }}
                    className="relative flex items-center justify-center w-24 h-24"
                  >
                    {/* The Needle (Tucked under the hub) */}
                    <div className="absolute top-[-45px] flex flex-col items-center z-0">
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[65px] border-b-[#FF8C00] drop-shadow-md"></div>
                      <div className="w-[1px] h-[20px] bg-white/40 -mt-[65px]"></div>
                    </div>
                    
                    {/* The Hub (Orange Circle) - Now in DOM to cover the needle base */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFB84D] via-[#FF8C00] to-[#D2691E] border-4 border-white shadow-lg flex items-center justify-center z-10">
                      <div className="text-white font-black text-2xl drop-shadow-md">GO</div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Spin Button (Invisible over the GO area) */}
              <button
                onClick={spin}
                disabled={isSpinning}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full z-40 cursor-pointer"
              />
            </div>

            {/* Winner List Panel */}
            <div className="w-full bg-white/40 backdrop-blur-md border border-[#E6C9A8] rounded-[40px] p-6 shadow-xl flex flex-col flex-1 min-h-0 mb-4 overflow-hidden">
              <div className="text-center text-sm font-black text-[#5D3A1A]/60 mb-4 tracking-widest uppercase flex items-center justify-center gap-2 shrink-0">
                <Trophy size={14} />
                中奖记录
              </div>
              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {history.length > 0 ? (
                  history.map((record, i) => (
                    <motion.div 
                      key={record.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex justify-between items-center text-xs font-medium text-[#5D3A1A]/70 py-2 border-b border-[#E6C9A8]/20 last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-[#D2691E]">奖项: {record.name}</span>
                        <span className="text-[10px] opacity-50">{record.time}</span>
                      </div>
                      <span className="bg-[#FF8C00]/10 px-2 py-1 rounded-lg text-[#FF8C00] font-bold">
                        数量: 1
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#5D3A1A]/30 text-xs italic">
                    暂无中奖记录，快去抽奖吧！
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 md:p-8 max-w-2xl mx-auto h-screen flex flex-col relative z-10 w-full no-scrollbar overflow-hidden"
          >
            <header className="mb-8 flex items-center gap-4">
              <button
                onClick={() => setView('wheel')}
                className="p-2 bg-white text-[#5D3A1A] rounded-full hover:bg-gray-100 transition-colors border border-[#E6C9A8]"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-3xl font-black tracking-tighter uppercase italic text-[#5D3A1A]">设置</h2>
            </header>

            <div className="bg-white border-2 border-[#E6C9A8] rounded-[40px] p-8 shadow-2xl flex-1 flex flex-col">
              <div className="flex flex-col mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[#5D3A1A]">
                    <Settings size={18} />
                    <span className="font-bold uppercase tracking-tight text-sm">奖项配置</span>
                  </div>
                </div>
                <div className="bg-[#FDF5E6] p-4 rounded-2xl border border-[#E6C9A8]/50 text-[11px] text-[#5D3A1A]/70 leading-relaxed">
                  <p className="font-bold mb-1 text-[#D2691E]">输入规则：</p>
                  <p>每行一个奖项，格式为：<span className="font-mono bg-white px-1 rounded border border-[#E6C9A8]">奖项名称, 数量, 权重</span></p>
                  <p className="mt-1 opacity-60">例如：一等奖, 1, 10 (权重越大中奖概率越高)</p>
                </div>
              </div>

              <div className="flex-1 relative mb-6 overflow-hidden">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-full p-6 bg-[#FDF5E6] rounded-3xl border border-[#E6C9A8]/50 focus:border-[#FF8C00] focus:ring-0 transition-all font-mono text-sm leading-relaxed text-[#5D3A1A] resize-none no-scrollbar"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-xs mb-6 border border-red-100">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setView('wheel')}
                  className="py-4 border border-[#E6C9A8] rounded-2xl font-bold uppercase tracking-widest text-xs text-[#5D3A1A]/50 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="py-4 bg-[#FF8C00] text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-[#FFB84D] transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Save size={14} />
                  保存修改
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-[#FF8C00] rounded-[50px] p-12 max-w-md w-full text-center relative overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setShowResult(false)}
                className="absolute top-6 right-6 p-2 hover:bg-black/5 rounded-full transition-colors text-gray-400"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <div className="w-24 h-24 bg-[#FDF5E6] rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#FF8C00] shadow-inner">
                  <Trophy size={48} className="text-[#FF8C00]" />
                </div>
                <h3 className="text-4xl font-black tracking-tighter uppercase italic mb-2 text-[#5D3A1A]">
                  中奖了！
                </h3>
                <p className="text-[#5D3A1A]/60 text-sm font-medium uppercase tracking-widest">
                  恭喜你
                </p>
              </div>

              <div className="p-8 rounded-[30px] mb-8 bg-[#FDF5E6] text-[#5D3A1A] shadow-inner border-2 border-[#E6C9A8] flex flex-col gap-2">
                <span className="text-3xl font-black uppercase tracking-tighter">
                  {winner.name}
                </span>
                <span className="text-sm font-bold text-[#FF8C00] bg-[#FF8C00]/10 py-1 px-4 rounded-full self-center">
                  数量: 1
                </span>
              </div>

              <button
                onClick={() => setShowResult(false)}
                className="w-full py-5 bg-[#FF8C00] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#FFB84D] transition-all shadow-xl active:scale-95"
              >
                领取奖励
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
