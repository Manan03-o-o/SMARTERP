'use client';

import React from 'react';

export interface ShortcutItem {
  key: string;      // e.g., 'F1', 'ESC', 'Alt+L'
  label: string;    // e.g., 'Select Company', 'Go Back', 'Create Ledger'
  isAvailable?: boolean;
}

interface KeyboardGuideProps {
  shortcuts: ShortcutItem[];
  onShortcutClick?: (key: string) => void;
}

export default function KeyboardGuide({ shortcuts, onShortcutClick }: KeyboardGuideProps) {
  return (
    <div className="bg-tally-header border-t border-tally-border fixed bottom-0 left-0 right-0 h-10 px-4 flex items-center justify-between text-xs font-mono z-40 overflow-x-auto select-none">
      <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0 pr-4">
        <span className="text-tally-muted mr-2 uppercase tracking-wider text-[10px]">Shortcuts:</span>
        {shortcuts.map((shortcut, idx) => {
          const isAvail = shortcut.isAvailable !== false;
          return (
            <button
              key={idx}
              disabled={!isAvail}
              onClick={() => onShortcutClick && onShortcutClick(shortcut.key)}
              className={`flex items-center gap-1 px-2.5 py-1 border rounded transition-all select-none text-[11px] ${
                isAvail
                  ? 'border-tally-border bg-tally-panel hover:bg-tally-teal/20 text-tally-text hover:border-tally-teal-light cursor-pointer active:scale-95'
                  : 'border-tally-border/20 text-tally-muted/40 cursor-not-allowed'
              }`}
            >
              <span className={`font-bold ${isAvail ? 'text-tally-amber' : 'text-tally-muted/40'}`}>
                {shortcut.key}
              </span>
              <span className="text-tally-muted">|</span>
              <span>{shortcut.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Brand Watermark */}
      <div className="hidden md:flex items-center gap-1 text-[10px] text-tally-teal-light/50 font-bold tracking-widest uppercase pl-4 border-l border-tally-border/30">
        SmartERP <span className="text-tally-amber font-mono font-normal">v1.0.0</span>
      </div>
    </div>
  );
}
