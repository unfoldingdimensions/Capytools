'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ATSScoreResult } from '@/types/ai.types';

interface ATSScoringReportProps {
    score: ATSScoreResult;
    resumeId?: string;
    jobDescriptionId?: string;
}

export default function ATSScoringReport({ score, resumeId, jobDescriptionId }: ATSScoringReportProps) {
    const getScoreColor = (value: number) => {
        if (value >= 80) return 'text-green-600';
        if (value >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBgColor = (value: number) => {
        if (value >= 80) return 'bg-green-100';
        if (value >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    const getScoreLabel = (value: number) => {
        if (value >= 80) return 'Excellent';
        if (value >= 60) return 'Good';
        if (value >= 40) return 'Fair';
        return 'Needs Improvement';
    };

    return (
        <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        ATS Compatibility Score
                    </h3>
                    <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBgColor(score.overallScore)}`}>
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${getScoreColor(score.overallScore)}`}>
                                {score.overallScore}
                            </div>
                            <div className="text-sm text-gray-600">/ 100</div>
                        </div>
                    </div>
                    <p className={`mt-4 text-lg font-medium ${getScoreColor(score.overallScore)}`}>
                        {getScoreLabel(score.overallScore)}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                        Analyzed on {new Date(score.analysisDate).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Category Scores */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Category Breakdown
                </h4>
                <div className="space-y-4">
                    {Object.entries(score.categoryScores).map(([category, value]) => (
                        <div key={category}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                    {category}
                                </span>
                                <span className={`text-sm font-bold ${getScoreColor(value)}`}>
                                    {value}/100
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${value >= 80
                                        ? 'bg-green-500'
                                        : value >= 60
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                        }`}
                                    style={{ width: `${value}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Matched Requirements */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                    Job Match Analysis
                </h4>
                <div className="flex items-center">
                    <div className="flex-1">
                        <p className="text-sm text-gray-600">Requirements Matched</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {score.matchedRequirements}
                        </p>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-600">Missing Keywords</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {score.missingKeywords.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Missing Keywords */}
            {score.missingKeywords.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Missing Keywords
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                        Consider adding these keywords to improve your resume's ATS compatibility:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {score.missingKeywords.slice(0, 15).map((keyword, index) => (
                            <span
                                key={index}
                                className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-200"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>
                    {score.missingKeywords.length > 15 && (
                        <p className="mt-3 text-sm text-gray-500">
                            + {score.missingKeywords.length - 15} more keywords
                        </p>
                    )}
                </div>
            )}

            {/* Improvement Suggestions */}
            {score.suggestions.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Improvement Suggestions
                    </h4>
                    <ul className="space-y-3">
                        {score.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start">
                                <svg
                                    className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span className="text-sm text-gray-700">{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Action Button */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-3">
                    💡 <strong>Pro Tip:</strong> Use our AI Resume Tailoring feature to automatically
                    optimize your resume based on these recommendations.
                </p>
                {resumeId && jobDescriptionId && (
                    <Link href={`/ai/tailor-resume?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}`}>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Tailor Your Resume with AI
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}

