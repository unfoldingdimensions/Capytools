// API Request/Response Types

import { NextApiRequest } from 'next';

// Extended Next.js API Request with user info
export interface AuthenticatedApiRequest extends NextApiRequest {
    userId: string;
    clerkUserId: string;
}

// Standard API Response structure
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    statusCode: number;
}

// Pagination
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

// Upload
export interface FileUploadRequest {
    file: File;
    userId: string;
}

export interface FileUploadResponse {
    fileId: string;
    fileName: string;
    fileSize: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Resume parsing
export interface ParsedResumeData {
    personalInfo?: Partial<import('./resume.types').PersonalInfo>;
    workExperience?: Array<Partial<import('./resume.types').WorkExperience>>;
    education?: Array<Partial<import('./resume.types').Education>>;
    projects?: Array<Partial<import('./resume.types').Project>>;
    skills?: Array<Partial<import('./resume.types').Skill>>;
    certifications?: Array<Partial<import('./resume.types').Certification>>;
}

