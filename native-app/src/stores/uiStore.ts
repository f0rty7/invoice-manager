import { create } from 'zustand';

type ActiveTab = 'invoices' | 'items';

interface UiState {
  activeTab: ActiveTab;
  isFilterSheetOpen: boolean;
  isUploadSheetOpen: boolean;

  setActiveTab: (tab: ActiveTab) => void;
  openFilterSheet: () => void;
  closeFilterSheet: () => void;
  openUploadSheet: () => void;
  closeUploadSheet: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'invoices',
  isFilterSheetOpen: false,
  isUploadSheetOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  openFilterSheet: () => set({ isFilterSheetOpen: true }),
  closeFilterSheet: () => set({ isFilterSheetOpen: false }),
  openUploadSheet: () => set({ isUploadSheetOpen: true }),
  closeUploadSheet: () => set({ isUploadSheetOpen: false }),
}));
