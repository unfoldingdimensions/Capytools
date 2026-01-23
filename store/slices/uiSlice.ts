import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
    id: string;
    title: string;
    description?: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

interface UIState {
    isSidebarOpen: boolean;
    activeSection: string | null;
    toasts: Toast[];
    isExporting: boolean;
    exportProgress: number;
    isUploading: boolean;
    uploadProgress: number;
}

const initialState: UIState = {
    isSidebarOpen: true,
    activeSection: 'personalInfo',
    toasts: [],
    isExporting: false,
    exportProgress: 0,
    isUploading: false,
    uploadProgress: 0,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.isSidebarOpen = action.payload;
        },
        setActiveSection: (state, action: PayloadAction<string | null>) => {
            state.activeSection = action.payload;
        },
        addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
            const toast: Toast = {
                ...action.payload,
                id: Date.now().toString(),
            };
            state.toasts.push(toast);
        },
        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
        },
        clearToasts: (state) => {
            state.toasts = [];
        },
        setExporting: (state, action: PayloadAction<boolean>) => {
            state.isExporting = action.payload;
            if (!action.payload) {
                state.exportProgress = 0;
            }
        },
        setExportProgress: (state, action: PayloadAction<number>) => {
            state.exportProgress = action.payload;
        },
        setUploading: (state, action: PayloadAction<boolean>) => {
            state.isUploading = action.payload;
            if (!action.payload) {
                state.uploadProgress = 0;
            }
        },
        setUploadProgress: (state, action: PayloadAction<number>) => {
            state.uploadProgress = action.payload;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarOpen,
    setActiveSection,
    addToast,
    removeToast,
    clearToasts,
    setExporting,
    setExportProgress,
    setUploading,
    setUploadProgress,
} = uiSlice.actions;

export default uiSlice.reducer;

