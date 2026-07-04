'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Delete, Copy, Trash2 } from 'lucide-react';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Calculator({ isOpen, onClose }: CalculatorProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCalculate = () => {
    if (!input.trim()) return;
    try {
      // Safe evaluation of mathematical expressions only
      // Replace any invalid characters (only allow digits, space, +, -, *, /, ., (, ))
      const sanitized = input.replace(/[^0-9+\-*/(). ]/g, '');
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      
      const roundedResult = Number(Number(result).toFixed(4)).toString();
      
      setHistory((prev) => [...prev, { expr: input, result: roundedResult }]);
      setInput(roundedResult);

      // Copy result to clipboard
      navigator.clipboard.writeText(roundedResult).catch(() => {});
    } catch (e) {
      setInput('Error');
      setTimeout(() => setInput(''), 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCalculate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const appendChar = (char: string) => {
    setInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  const clearCalc = () => {
    setInput('');
    inputRef.current?.focus();
  };

  const backspace = () => {
    setInput((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end items-end p-6 z-50 animate-fade-in pointer-events-none">
      <div
        ref={containerRef}
        className="w-80 bg-tally-panel border border-tally-border rounded-lg shadow-2xl flex flex-col pointer-events-auto animate-slide-up overflow-hidden"
      >
        {/* Header */}
        <div className="bg-tally-header px-4 py-2 flex items-center justify-between border-b border-tally-border">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-tally-amber rounded-full animate-pulse"></span>
            <h3 className="font-mono text-sm font-semibold tracking-wider text-tally-text">
              CALCULATOR <span className="text-[10px] text-tally-amber">[F4]</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-tally-muted hover:text-tally-text transition-colors p-0.5 rounded"
            title="Close [ESC]"
          >
            <X size={16} />
          </button>
        </div>

        {/* History / Tape */}
        <div className="h-44 overflow-y-auto p-4 flex flex-col gap-2 font-mono text-xs bg-tally-bg/60 border-b border-tally-border/50">
          {history.length === 0 ? (
            <div className="text-tally-muted text-center italic mt-12">
              Type math and press Enter
              <br />
              Result copies to clipboard!
            </div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="flex flex-col items-end border-b border-tally-border/20 pb-1">
                <span className="text-tally-muted">{item.expr}</span>
                <span className="text-tally-teal-light font-bold font-mono">
                  = {item.result}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Screen/Input */}
        <div className="p-3 bg-tally-bg flex items-center border-b border-tally-border">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent font-mono text-lg text-right text-tally-text outline-hidden"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="0"
          />
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-tally-panel font-mono text-sm">
          <button
            onClick={() => setHistory([])}
            className="py-2 bg-tally-bg/40 hover:bg-tally-teal/20 text-tally-rose rounded transition-all active:scale-95"
            title="Clear History"
          >
            <Trash2 size={16} className="mx-auto" />
          </button>
          <button
            onClick={clearCalc}
            className="py-2 bg-tally-bg/40 hover:bg-tally-teal/20 text-tally-amber rounded transition-all active:scale-95"
          >
            C
          </button>
          <button
            onClick={backspace}
            className="py-2 bg-tally-bg/40 hover:bg-tally-teal/20 text-tally-muted rounded transition-all active:scale-95"
          >
            <Delete size={16} className="mx-auto" />
          </button>
          <button
            onClick={() => appendChar('/')}
            className="py-2 bg-tally-bg/40 hover:bg-tally-teal/40 text-tally-teal-light rounded transition-all active:scale-95 font-bold"
          >
            /
          </button>

          {['7', '8', '9'].map((n) => (
            <button
              key={n}
              onClick={() => appendChar(n)}
              className="py-2 bg-tally-bg/80 hover:bg-tally-border text-tally-text rounded transition-all active:scale-95"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => appendChar('*')}
            className="py-2 bg-tally-bg/40 hover:bg-tally-teal/40 text-tally-teal-light rounded transition-all active:scale-95 font-bold"
          >
            *
          </button>

          {['4', '5', '6'].map((n) => (
            <button
              key={n}
              onClick={() => appendChar(n)}
              className="py-2 bg-tally-bg/80 hover:bg-tally-border text-tally-text rounded transition-all active:scale-95"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => appendChar('-')}
            className="py-2 bg-tally-bg/40 hover:bg-tally-teal/40 text-tally-teal-light rounded transition-all active:scale-95 font-bold"
          >
            -
          </button>

          {['1', '2', '3'].map((n) => (
            <button
              key={n}
              onClick={() => appendChar(n)}
              className="py-2 bg-tally-bg/80 hover:bg-tally-border text-tally-text rounded transition-all active:scale-95"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => appendChar('+')}
            className="py-2 bg-tally-bg/40 hover:bg-tally-teal/40 text-tally-teal-light rounded transition-all active:scale-95 font-bold"
          >
            +
          </button>

          <button
            onClick={() => appendChar('0')}
            className="col-span-2 py-2 bg-tally-bg/80 hover:bg-tally-border text-tally-text rounded transition-all active:scale-95"
          >
            0
          </button>
          <button
            onClick={() => appendChar('.')}
            className="py-2 bg-tally-bg/80 hover:bg-tally-border text-tally-text rounded transition-all active:scale-95"
          >
            .
          </button>
          <button
            onClick={handleCalculate}
            className="py-2 bg-tally-teal hover:bg-tally-teal-light text-white font-bold rounded transition-all active:scale-95"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}
