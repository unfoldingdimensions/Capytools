'use client';

import { useState } from 'react';
import { InterviewQuestion } from '@/types/ai.types';
import { Button } from '@/components/ui/button';

interface InterviewQuestionsListProps {
    questions: InterviewQuestion[];
}

export default function InterviewQuestionsList({
    questions,
}: InterviewQuestionsListProps) {
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
        new Set()
    );

    const toggleQuestion = (index: number) => {
        const newExpanded = new Set(expandedQuestions);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedQuestions(newExpanded);
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'behavioral':
                return 'bg-blue-100 text-blue-800';
            case 'technical':
                return 'bg-purple-100 text-purple-800';
            case 'situational':
                return 'bg-green-100 text-green-800';
            case 'experience-based':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return 'text-green-600';
            case 'medium':
                return 'text-yellow-600';
            case 'hard':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Generated Interview Questions
                </h3>
                <p className="text-sm text-gray-600">
                    Practice these {questions.length} questions to prepare for your interview.
                    Click on any question to see suggested answers and tips.
                </p>
            </div>

            {questions.map((question, index) => (
                <div
                    key={index}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                    <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleQuestion(index)}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(
                                            question.category
                                        )}`}
                                    >
                                        {question.category}
                                    </span>
                                    <span
                                        className={`text-xs font-medium capitalize ${getDifficultyColor(
                                            question.difficulty
                                        )}`}
                                    >
                                        {question.difficulty}
                                    </span>
                                </div>
                                <p className="text-gray-900 font-medium">
                                    {index + 1}. {question.question}
                                </p>
                            </div>
                            <svg
                                className={`w-5 h-5 text-gray-400 ml-2 transition-transform ${expandedQuestions.has(index) ? 'transform rotate-180' : ''
                                    }`}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </div>

                    {expandedQuestions.has(index) && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                            {/* Suggested Answer */}
                            {question.suggestedAnswer && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                        Suggested Answer:
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {question.suggestedAnswer}
                                    </p>
                                </div>
                            )}

                            {/* Key Points */}
                            {question.keyPoints && question.keyPoints.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                        Key Points to Cover:
                                    </h4>
                                    <ul className="space-y-1">
                                        {question.keyPoints.map((point, idx) => (
                                            <li key={idx} className="flex items-start">
                                                <svg
                                                    className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                <span className="text-sm text-gray-600">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Tips Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    💡 Interview Preparation Tips
                </h4>
                <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Practice answering each question out loud</li>
                    <li>• Use the STAR method (Situation, Task, Action, Result) for behavioral questions</li>
                    <li>• Prepare specific examples from your experience</li>
                    <li>• Research the company and role thoroughly</li>
                </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button
                    onClick={() => {
                        const questionText = questions
                            .map((q, i) => `${i + 1}. ${q.question}`)
                            .join('\n\n');
                        navigator.clipboard.writeText(questionText);
                    }}
                    variant="outline"
                    className="flex-1"
                >
                    Copy Questions
                </Button>
                <Button
                    onClick={() => {
                        const expandAll = expandedQuestions.size !== questions.length;
                        if (expandAll) {
                            setExpandedQuestions(new Set(questions.map((_, i) => i)));
                        } else {
                            setExpandedQuestions(new Set());
                        }
                    }}
                    variant="outline"
                    className="flex-1"
                >
                    {expandedQuestions.size === questions.length
                        ? 'Collapse All'
                        : 'Expand All'}
                </Button>
            </div>
        </div>
    );
}

