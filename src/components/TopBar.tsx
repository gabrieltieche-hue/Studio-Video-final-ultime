import React from 'react';
import { Download } from 'lucide-react';

export type AppTab = 'player' | 'analysis' | 'repo' | 'script';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onExportKit: () => void;
}

const NAV_ITEMS: Array<{ id: AppTab; label: string }> = [
  { id: 'player', label: 'Aperçu Short' },
  { id: 'analysis', label: 'Analyse @melvynxdev' },
  { id: 'repo', label: 'Architecture Repo' },
  { id: 'script', label: 'Script & Timeline' },
];

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onSelectTab, onExportKit }) => {
  return (
    <header className="w-full border-b border-[#E3DED3] bg-[#FCFBF8]">
      <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('player')}
          className="text-lg font-extrabold tracking-tight text-[#14161B] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#258EFF]"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          Studio Short
        </button>

        {/* Zone 2: 4 single-line navigation links */}
        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#258EFF] ${
                  active ? 'text-[#14161B]' : 'text-[#5C5F68] hover:text-[#14161B]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-[2px] bg-[#258EFF]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportKit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14161B] text-white text-xs font-semibold hover:bg-[#258EFF] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#258EFF]"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Exporter Kit
          </button>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <nav aria-label="Navigation mobile" className="flex md:hidden items-center gap-4 px-4 pb-3 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`text-xs font-medium whitespace-nowrap shrink-0 pb-1 border-b-2 cursor-pointer ${
                active ? 'text-[#14161B] border-[#258EFF]' : 'text-[#5C5F68] border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
